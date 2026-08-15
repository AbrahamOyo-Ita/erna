-- Erna production hardening: atomic money movement, task lifecycle, trivia,
-- subscription state, email outbox, rate limiting, and least-privilege access.

do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_plan_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_plan_check check (plan in ('free','plus','pro'));
  end if;
end $$;

alter table public.withdrawals drop constraint if exists withdrawals_status_check;
alter table public.withdrawals add constraint withdrawals_status_check check (status in ('requested','processing','paid','failed','reversed','cancelled'));
alter table public.withdrawals add column if not exists risk_reasons text[] not null default '{}', add column if not exists reviewed_by uuid references public.profiles(id), add column if not exists reviewed_at timestamptz;
alter table public.admin_audit_log alter column actor_id drop not null;
alter table public.subscriptions add column if not exists reference text unique, add column if not exists provider_plan_code text, add column if not exists next_payment_at timestamptz, add column if not exists cancel_at_period_end boolean not null default false, add column if not exists updated_at timestamptz not null default now();

create table if not exists public.task_prices (
  platform text not null,
  task_type text not null,
  worker_payout numeric(14,2) not null check(worker_payout>0),
  advertiser_price numeric(14,2) not null check(advertiser_price>=worker_payout),
  active boolean not null default true,
  primary key(platform,task_type)
);
alter table public.task_prices enable row level security;
create policy task_prices_public_read on public.task_prices for select to anon,authenticated using(active);
grant select on public.task_prices to anon,authenticated;
insert into public.task_prices(platform,task_type,worker_payout,advertiser_price) values
 ('facebook','follow',10,16),('facebook','like',10,16),('facebook','share',15,23),('facebook','comment',20,31),
 ('tiktok','follow',10,16),('tiktok','like',10,16),('tiktok','share',15,23),('tiktok','comment',20,31),
 ('instagram','follow',15,23),('instagram','like',12,19),('instagram','share',20,31),('instagram','comment',25,39),
 ('x','follow',15,23),('x','like',12,19),('x','share',20,31),('x','comment',25,39),
 ('linkedin','follow',15,23),('linkedin','like',12,19),('linkedin','share',20,31),('linkedin','comment',25,39),
 ('youtube','like',50,77),('youtube','comment',100,154),('youtube','subscribe',150,231),
 ('play_store','review',100,154),('app_store','review',200,308),('marketplace','engage',10,16)
on conflict(platform,task_type) do update set worker_payout=excluded.worker_payout,advertiser_price=excluded.advertiser_price,active=true;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  recipient text not null, template text not null, payload jsonb not null default '{}',
  status text not null default 'queued' check(status in('queued','sending','sent','failed')),
  attempts smallint not null default 0 check(attempts between 0 and 20), available_at timestamptz not null default now(),
  provider_id text, last_error text, created_at timestamptz not null default now(), sent_at timestamptz
);
alter table public.email_outbox enable row level security;
create index if not exists email_outbox_queue_idx on public.email_outbox(status,available_at) where status in('queued','failed');

create table if not exists private.api_rate_events(
  id bigint generated always as identity primary key, user_id uuid not null, action text not null, created_at timestamptz not null default now()
);
create index if not exists api_rate_events_lookup_idx on private.api_rate_events(user_id,action,created_at desc);

-- Close direct-write bypasses. All integrity-sensitive mutations go through
-- authenticated server handlers and service-role-only atomic functions.
revoke insert on public.tasks,public.task_submissions,public.disputes,public.listings,public.listing_images from authenticated;
drop policy if exists tasks_owner_insert on public.tasks;
drop policy if exists submissions_worker_insert on public.task_submissions;
drop policy if exists disputes_worker_insert on public.disputes;
drop policy if exists listings_owner_insert on public.listings;
drop policy if exists listing_images_owner_insert on public.listing_images;
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;

-- Never expose the answer key through PostgREST.
revoke select on public.daily_questions from authenticated;
drop policy if exists daily_questions_published_read on public.daily_questions;

create or replace function private.current_plan() returns text language sql stable security definer set search_path='' as $$
  select coalesce((select case when p.plan_expires_at is null or p.plan_expires_at>now() then p.plan else 'free' end from public.profiles p where p.id=(select auth.uid())),'free')
$$;
revoke all on function private.current_plan() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.current_plan() to authenticated;

drop policy if exists tasks_active_read on public.tasks;
create policy tasks_active_read on public.tasks for select to authenticated using(
 advertiser_id=(select auth.uid()) or
 (status='active' and (priority_at is null or priority_at<=now() or (select private.current_plan()) in('plus','pro')))
);

-- Users may only read their own listing drafts or public active listings; service
-- routes own creation so image sanitation cannot be bypassed.
drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings for select to anon,authenticated using(status='active' or seller_id=(select auth.uid()));

create index if not exists task_submissions_reviewed_by_idx on public.task_submissions(reviewed_by) where reviewed_by is not null;
create index if not exists disputes_submission_id_idx on public.disputes(submission_id);
create index if not exists disputes_resolved_by_idx on public.disputes(resolved_by) where resolved_by is not null;
create index if not exists daily_answers_question_id_idx on public.daily_answers(question_id);
create index if not exists seller_ratings_listing_id_idx on public.seller_ratings(listing_id);
create index if not exists seller_ratings_buyer_id_idx on public.seller_ratings(buyer_id);
create index if not exists withdrawals_reviewed_by_idx on public.withdrawals(reviewed_by) where reviewed_by is not null;

create or replace function private.is_admin(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=p_user and is_admin and not is_suspended)
$$;
revoke all on function private.is_admin(uuid) from public,anon,authenticated;

create or replace function public.consume_rate_limit(p_user uuid,p_action text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if p_user is null or p_action!~'^[a-z0-9:_-]{2,80}$' or p_limit not between 1 and 1000 or p_window_seconds not between 1 and 86400 then raise exception 'Invalid rate limit request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_action,0));
 delete from private.api_rate_events where created_at<now()-interval '2 days';
 select count(*) into v_count from private.api_rate_events where user_id=p_user and action=p_action and created_at>now()-make_interval(secs=>p_window_seconds);
 if v_count>=p_limit then return false; end if;
 insert into private.api_rate_events(user_id,action) values(p_user,p_action); return true;
end $$;
revoke all on function public.consume_rate_limit(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(uuid,text,integer,integer) to service_role;

create or replace function public.create_funded_task(p_user uuid,p_platform text,p_task_type text,p_target_url text,p_instructions text,p_quantity integer,p_review_mode text default 'manual')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_price public.task_prices%rowtype; v_wallet public.wallets%rowtype; v_task uuid; v_name text; v_total numeric;
begin
 if p_target_url!~'^https://[^[:space:]]+$' or char_length(p_target_url)>2000 then raise exception 'A valid HTTPS target URL is required'; end if;
 if char_length(trim(p_instructions)) not between 10 and 3000 or p_quantity not between 1 and 100000 or p_review_mode not in('manual','auto_spot_check') then raise exception 'Invalid task details'; end if;
 select * into strict v_price from public.task_prices where platform=p_platform and task_type=p_task_type and active;
 select full_name into strict v_name from public.profiles where id=p_user and not is_suspended;
 select * into strict v_wallet from public.wallets where user_id=p_user for update;
 v_total:=v_price.advertiser_price*p_quantity;
 if v_wallet.available_balance<v_total then raise exception 'Insufficient wallet balance'; end if;
 insert into public.tasks(advertiser_id,advertiser_name,platform,task_type,target_url,instructions,worker_payout,advertiser_price,quantity,escrow_remaining,status,review_mode,priority_at,funded_at)
 values(p_user,v_name,p_platform,p_task_type,p_target_url,trim(p_instructions),v_price.worker_payout,v_price.advertiser_price,p_quantity,v_total,'active',p_review_mode,now()+interval '30 minutes',now()) returning id into v_task;
 update public.wallets set available_balance=available_balance-v_total,escrow_balance=escrow_balance+v_total,version=version+1,updated_at=now() where user_id=p_user;
 insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description,metadata) values(p_user,'debit','task_funding',v_total,'completed','task:'||v_task,'Funded task escrow',jsonb_build_object('task_id',v_task));
 return v_task;
end $$;
revoke all on function public.create_funded_task(uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.create_funded_task(uuid,text,text,text,text,integer,text) to service_role;

create or replace function public.submit_task_proof(p_user uuid,p_task uuid,p_proof_path text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_task public.tasks%rowtype; v_submission uuid;
begin
 if p_proof_path!~('^'||p_user::text||'/[a-zA-Z0-9/_-]+\.(jpg|webp)$') then raise exception 'Invalid proof path'; end if;
 select * into strict v_task from public.tasks where id=p_task for update;
 if v_task.status<>'active' or v_task.advertiser_id=p_user then raise exception 'Task is unavailable'; end if;
 if v_task.approved_count+v_task.reserved_count>=v_task.quantity then raise exception 'Task has no remaining slots'; end if;
 if exists(select 1 from public.task_submissions where task_id=p_task and worker_id=p_user) then raise exception 'You already submitted this task'; end if;
 if (select count(*) from public.task_submissions where worker_id=p_user and submitted_at>now()-interval '1 hour')>=20 then raise exception 'Hourly submission limit reached'; end if;
 insert into public.task_submissions(task_id,worker_id,proof_path) values(p_task,p_user,p_proof_path) returning id into v_submission;
 update public.tasks set reserved_count=reserved_count+1,updated_at=now() where id=p_task;
 return v_submission;
end $$;
revoke all on function public.submit_task_proof(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.submit_task_proof(uuid,uuid,text) to service_role;

create or replace function public.answer_daily_question(p_user uuid,p_question uuid,p_selected smallint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_question public.daily_questions%rowtype; v_correct boolean; v_today date:=timezone('Africa/Lagos',now())::date; v_answer uuid;
begin
 select * into strict v_question from public.daily_questions where id=p_question and is_published and question_date=v_today for update;
 if p_selected<0 or p_selected>=jsonb_array_length(v_question.options) then raise exception 'Invalid answer'; end if;
 if not exists(select 1 from public.task_submissions where worker_id=p_user and status='approved' and timezone('Africa/Lagos',coalesce(reviewed_at,submitted_at))::date=v_today) then raise exception 'Complete an approved task today first'; end if;
 v_correct:=p_selected=v_question.correct_index;
 insert into public.daily_answers(question_id,user_id,selected_index,is_correct,reward_amount) values(p_question,p_user,p_selected,v_correct,case when v_correct then 20 else 0 end) returning id into v_answer;
 if v_correct then
   insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description) values(p_user,'credit','daily_question',20,'completed','trivia:'||v_today||':'||p_user,'Correct daily answer') on conflict(reference) do nothing;
   if found then update public.wallets set available_balance=available_balance+20,daily_question_earnings=daily_question_earnings+20,version=version+1,updated_at=now() where user_id=p_user; end if;
 end if;
 return jsonb_build_object('correct',v_correct,'reward',case when v_correct then 20 else 0 end,'explanation',v_question.explanation);
exception when unique_violation then raise exception 'Today''s question has already been answered';
end $$;
revoke all on function public.answer_daily_question(uuid,uuid,smallint) from public,anon,authenticated;
grant execute on function public.answer_daily_question(uuid,uuid,smallint) to service_role;

create or replace function public.get_daily_question_state(p_user uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((
  select jsonb_build_object(
   'id',q.id,'question',q.question,'options',q.options,'question_date',q.question_date,
   'eligible',exists(select 1 from public.task_submissions s where s.worker_id=p_user and s.status='approved' and timezone('Africa/Lagos',coalesce(s.reviewed_at,s.submitted_at))::date=q.question_date),
   'answered',exists(select 1 from public.daily_answers a where a.question_id=q.id and a.user_id=p_user)
  ) from public.daily_questions q where q.is_published and q.question_date=timezone('Africa/Lagos',now())::date
 ),'null'::jsonb)
$$;
revoke all on function public.get_daily_question_state(uuid) from public,anon,authenticated;
grant execute on function public.get_daily_question_state(uuid) to service_role;

create or replace function public.moderate_submission(p_admin uuid,p_submission uuid,p_decision text,p_reason text default null,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sub public.task_submissions%rowtype; v_task public.tasks%rowtype; v_ref public.referrals%rowtype; v_bonus numeric; v_first boolean;
begin
 if p_admin is not null and not private.is_admin(p_admin) then raise exception 'Admin authorization required'; end if;
 if p_decision not in('approved','rejected') then raise exception 'Invalid decision'; end if;
 if p_decision='rejected' and (p_reason not in('proof_invalid','action_not_detected','duplicate_submission','other') or coalesce(char_length(trim(p_note)),0)>1000) then raise exception 'A valid rejection reason is required'; end if;
 select * into strict v_sub from public.task_submissions where id=p_submission for update;
 if v_sub.status not in('pending','appealed') then raise exception 'Submission is already resolved'; end if;
 select * into strict v_task from public.tasks where id=v_sub.task_id for update;
 if p_decision='approved' then
   if v_task.approved_count>=v_task.quantity or v_task.escrow_remaining<v_task.advertiser_price then raise exception 'Task escrow is exhausted'; end if;
   v_first:=not exists(select 1 from public.task_submissions where worker_id=v_sub.worker_id and status='approved' and id<>v_sub.id);
   update public.task_submissions set status='approved',rejection_reason=null,rejection_note=null,reviewed_by=p_admin,reviewed_at=now() where id=p_submission;
   update public.tasks set approved_count=approved_count+1,reserved_count=greatest(reserved_count-1,0),escrow_remaining=escrow_remaining-advertiser_price,status=case when approved_count+1>=quantity then 'completed' else status end,updated_at=now() where id=v_task.id;
   update public.wallets set escrow_balance=greatest(escrow_balance-v_task.advertiser_price,0),version=version+1,updated_at=now() where user_id=v_task.advertiser_id;
   update public.wallets set available_balance=available_balance+v_task.worker_payout,task_earnings=task_earnings+v_task.worker_payout,version=version+1,updated_at=now() where user_id=v_sub.worker_id;
   insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description,metadata) values(v_sub.worker_id,'credit','task_earning',v_task.worker_payout,'completed','submission:'||v_sub.id,'Approved task earning',jsonb_build_object('task_id',v_task.id));
   if v_first then
    select * into v_ref from public.referrals where referred_id=v_sub.worker_id and not bonus_paid for update;
    if found then
     select case when plan='pro' and (plan_expires_at is null or plan_expires_at>now()) then 400 else 300 end into v_bonus from public.profiles where id=v_ref.referrer_id;
     update public.referrals set bonus_paid=true where id=v_ref.id;
     update public.wallets set available_balance=available_balance+v_bonus,referral_earnings=referral_earnings+v_bonus,version=version+1,updated_at=now() where user_id=v_ref.referrer_id;
     insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description) values(v_ref.referrer_id,'credit','referral',v_bonus,'completed','referral:'||v_ref.id,'Activated referral bonus');
     insert into public.notifications(user_id,kind,title,body,href) values(v_ref.referrer_id,'referral_bonus','Referral reward earned','Your referral completed their first approved task.','/app');
    end if;
   end if;
   insert into public.notifications(user_id,kind,title,body,href) values(v_sub.worker_id,'task_approved','Task approved','Your proof was approved and your wallet was credited.','/app');
   insert into public.email_outbox(user_id,recipient,template,payload) select v_sub.worker_id,email,'task_approved',jsonb_build_object('payout',v_task.worker_payout,'task',v_task.task_type) from public.profiles where id=v_sub.worker_id and email is not null;
 else
   update public.task_submissions set status='rejected',rejection_reason=p_reason,rejection_note=trim(p_note),reviewed_by=p_admin,reviewed_at=now() where id=p_submission;
   update public.tasks set reserved_count=greatest(reserved_count-1,0),updated_at=now() where id=v_task.id;
   insert into public.notifications(user_id,kind,title,body,href) values(v_sub.worker_id,'task_rejected','Task needs attention','Your submission was rejected. You may appeal once.','/app');
   insert into public.email_outbox(user_id,recipient,template,payload) select v_sub.worker_id,email,'task_rejected',jsonb_build_object('reason',p_reason,'note',p_note) from public.profiles where id=v_sub.worker_id and email is not null;
 end if;
 insert into public.admin_audit_log(actor_id,action,entity_type,entity_id,before_state,after_state) values(p_admin,'submission_'||p_decision,'task_submission',p_submission,to_jsonb(v_sub),jsonb_build_object('status',p_decision,'reason',p_reason));
 if v_sub.status='appealed' then update public.disputes set status=case when p_decision='approved' then 'resolved_worker' else 'resolved_advertiser' end,admin_decision=coalesce(p_note,p_reason),resolved_by=p_admin,resolved_at=now() where submission_id=p_submission and status in('open','under_review');end if;
 return jsonb_build_object('submission_id',p_submission,'status',p_decision,'worker_id',v_sub.worker_id,'payout',case when p_decision='approved' then v_task.worker_payout else 0 end);
end $$;
revoke all on function public.moderate_submission(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.moderate_submission(uuid,uuid,text,text,text) to service_role;

create or replace function public.appeal_submission(p_user uuid,p_submission uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_sub public.task_submissions%rowtype; v_task public.tasks%rowtype; v_dispute uuid;
begin
 if char_length(trim(p_reason)) not between 10 and 1000 then raise exception 'Appeal reason must be 10 to 1000 characters'; end if;
 select * into strict v_sub from public.task_submissions where id=p_submission and worker_id=p_user for update;
 if v_sub.status<>'rejected' or v_sub.appealed_at is not null then raise exception 'This submission cannot be appealed'; end if;
 select * into strict v_task from public.tasks where id=v_sub.task_id for update;
 if v_task.approved_count+v_task.reserved_count>=v_task.quantity then raise exception 'Task has no slot available for an appeal'; end if;
 update public.task_submissions set status='appealed',appealed_at=now() where id=p_submission;
 update public.tasks set reserved_count=reserved_count+1,updated_at=now() where id=v_task.id;
 insert into public.disputes(submission_id,raised_by,reason,status) values(p_submission,p_user,trim(p_reason),'open') returning id into v_dispute;
 return v_dispute;
end $$;
revoke all on function public.appeal_submission(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.appeal_submission(uuid,uuid,text) to service_role;

create or replace function public.create_listing(p_user uuid,p_title text,p_description text,p_category text,p_price numeric,p_state text,p_city text,p_whatsapp text,p_images text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_path text; v_order smallint:=0;
begin
 if char_length(trim(p_title)) not between 3 and 120 or char_length(trim(p_description)) not between 10 and 4000 or char_length(trim(p_category)) not between 2 and 80 or char_length(trim(p_state)) not between 2 and 80 or char_length(trim(p_city)) not between 2 and 80 then raise exception 'Invalid listing details';end if;
 if p_price<0 or p_price>100000000 or p_price<>round(p_price,2) or p_whatsapp!~'^234[789][0-9]{9}$' then raise exception 'Invalid price or WhatsApp number';end if;
 if coalesce(array_length(p_images,1),0) not between 1 and 6 then raise exception 'One to six images are required';end if;
 foreach v_path in array p_images loop if v_path!~('^'||p_user::text||'/[a-zA-Z0-9/_-]+\.webp$') then raise exception 'Invalid listing image path';end if;end loop;
 if not exists(select 1 from public.profiles where id=p_user and not is_suspended) then raise exception 'Account unavailable';end if;
 insert into public.listings(seller_id,title,description,category,price,state,city,whatsapp_phone,status) values(p_user,trim(p_title),trim(p_description),trim(p_category),p_price,trim(p_state),trim(p_city),p_whatsapp,'active') returning id into v_id;
 foreach v_path in array p_images loop insert into public.listing_images(listing_id,storage_path,sort_order) values(v_id,v_path,v_order);v_order:=v_order+1;end loop;
 return v_id;
end $$;
revoke all on function public.create_listing(uuid,text,text,text,numeric,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.create_listing(uuid,text,text,text,numeric,text,text,text,text[]) to service_role;

create or replace function public.request_withdrawal(p_user uuid,p_amount numeric,p_bank_code text,p_last4 text,p_account_name text,p_recipient text,p_reference text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_wallet public.wallets%rowtype; v_profile public.profiles%rowtype; v_min numeric; v_flag boolean:=false; v_reasons text[]:='{}'; v_id uuid;
begin
 if p_amount<>round(p_amount,2) or p_amount<=0 or p_bank_code!~'^[0-9]{2,10}$' or p_last4!~'^[0-9]{4}$' or p_recipient!~'^RCP_[a-zA-Z0-9]+$' or p_reference!~'^[a-z0-9_-]{16,50}$' then raise exception 'Invalid withdrawal request'; end if;
 select * into strict v_profile from public.profiles where id=p_user and not is_suspended for update;
 select * into strict v_wallet from public.wallets where user_id=p_user for update;
 v_min:=case when v_profile.first_paid_withdrawal_at is null then 1000 when v_profile.plan='plus' and (v_profile.plan_expires_at is null or v_profile.plan_expires_at>now()) then 2500 when v_profile.plan='pro' and (v_profile.plan_expires_at is null or v_profile.plan_expires_at>now()) then 2000 else 3000 end;
 if p_amount<v_min then raise exception 'Minimum withdrawal is %',v_min; end if;
 if v_wallet.available_balance<p_amount then raise exception 'Insufficient wallet balance'; end if;
 if p_amount>=100000 then v_flag:=true;v_reasons:=array_append(v_reasons,'high_value');end if;
 if v_profile.created_at>now()-interval '7 days' and p_amount>=20000 then v_flag:=true;v_reasons:=array_append(v_reasons,'new_account_high_value');end if;
 if (select count(*) from public.withdrawals where user_id=p_user and requested_at>now()-interval '24 hours')>=2 then v_flag:=true;v_reasons:=array_append(v_reasons,'high_velocity');end if;
 insert into public.withdrawals(user_id,amount,bank_code,account_number_last4,account_name,recipient_code,reference,status,flagged,risk_reasons) values(p_user,p_amount,p_bank_code,p_last4,trim(p_account_name),p_recipient,p_reference,'requested',v_flag,v_reasons) returning id into v_id;
 update public.wallets set available_balance=available_balance-p_amount,version=version+1,updated_at=now() where user_id=p_user;
 insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description,metadata) values(p_user,'debit','withdrawal',p_amount,'pending',p_reference,'Withdrawal requested',jsonb_build_object('withdrawal_id',v_id));
 insert into public.notifications(user_id,kind,title,body,href) values(p_user,'withdrawal_requested','Withdrawal requested','Your request is queued for review.','/app');
 return jsonb_build_object('id',v_id,'reference',p_reference,'minimum',v_min,'flagged',v_flag,'risk_reasons',v_reasons);
end $$;
revoke all on function public.request_withdrawal(uuid,numeric,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.request_withdrawal(uuid,numeric,text,text,text,text,text) to service_role;

create or replace function public.prepare_withdrawal_transfer(p_admin uuid,p_withdrawal uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.withdrawals%rowtype;
begin
 if not private.is_admin(p_admin) then raise exception 'Admin authorization required';end if;
 select * into strict v from public.withdrawals where id=p_withdrawal for update;
 if v.status<>'requested' then raise exception 'Withdrawal is not awaiting review';end if;
 update public.withdrawals set status='processing',reviewed_by=p_admin,reviewed_at=now() where id=p_withdrawal;
 insert into public.admin_audit_log(actor_id,action,entity_type,entity_id,before_state,after_state) values(p_admin,'withdrawal_processing','withdrawal',p_withdrawal,to_jsonb(v),jsonb_build_object('status','processing'));
 return jsonb_build_object('id',v.id,'user_id',v.user_id,'amount',v.amount,'recipient_code',v.recipient_code,'reference',v.reference);
end $$;
revoke all on function public.prepare_withdrawal_transfer(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_withdrawal_transfer(uuid,uuid) to service_role;

create or replace function public.reject_withdrawal(p_admin uuid,p_withdrawal uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.withdrawals%rowtype;v_result jsonb;
begin
 if not private.is_admin(p_admin) then raise exception 'Admin authorization required';end if;
 if char_length(trim(p_reason)) not between 5 and 500 then raise exception 'A rejection reason is required';end if;
 select * into strict v from public.withdrawals where id=p_withdrawal for update;
 if v.status<>'requested' then raise exception 'Only requested withdrawals can be rejected';end if;
 select public.finalize_withdrawal(v.reference,'failed',null,trim(p_reason)) into v_result;
 update public.withdrawals set reviewed_by=p_admin,reviewed_at=now() where id=p_withdrawal;
 insert into public.admin_audit_log(actor_id,action,entity_type,entity_id,before_state,after_state) values(p_admin,'withdrawal_rejected','withdrawal',p_withdrawal,to_jsonb(v),jsonb_build_object('status','failed','reason',p_reason));
 return v_result;
end $$;
revoke all on function public.reject_withdrawal(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reject_withdrawal(uuid,uuid,text) to service_role;

create or replace function public.admin_update_user(p_admin uuid,p_user uuid,p_suspended boolean default null,p_kyc_tier smallint default null)
returns void language plpgsql security definer set search_path='' as $$
declare v public.profiles%rowtype;
begin
 if not private.is_admin(p_admin) or p_admin=p_user then raise exception 'Admin authorization required';end if;
 if p_kyc_tier is not null and p_kyc_tier not between 0 and 3 then raise exception 'Invalid KYC tier';end if;
 select * into strict v from public.profiles where id=p_user for update;
 update public.profiles set is_suspended=coalesce(p_suspended,is_suspended),kyc_tier=coalesce(p_kyc_tier,kyc_tier),updated_at=now() where id=p_user;
 insert into public.admin_audit_log(actor_id,action,entity_type,entity_id,before_state,after_state) values(p_admin,'user_updated','profile',p_user,to_jsonb(v),jsonb_build_object('is_suspended',p_suspended,'kyc_tier',p_kyc_tier));
end $$;
revoke all on function public.admin_update_user(uuid,uuid,boolean,smallint) from public,anon,authenticated;
grant execute on function public.admin_update_user(uuid,uuid,boolean,smallint) to service_role;

create or replace function public.attach_transfer_code(p_withdrawal uuid,p_transfer_code text)
returns void language plpgsql security definer set search_path='' as $$ begin
 if p_transfer_code!~'^TRF_[a-zA-Z0-9]+$' then raise exception 'Invalid transfer code';end if;
 update public.withdrawals set transfer_code=p_transfer_code where id=p_withdrawal and status='processing'; if not found then raise exception 'Withdrawal is not processing';end if;
end $$;
revoke all on function public.attach_transfer_code(uuid,text) from public,anon,authenticated;
grant execute on function public.attach_transfer_code(uuid,text) to service_role;

create or replace function public.finalize_withdrawal(p_reference text,p_event text,p_transfer_code text default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.withdrawals%rowtype; v_refund text;
begin
 if p_event not in('success','failed','reversed') then raise exception 'Invalid transfer event';end if;
 select * into strict v from public.withdrawals where reference=p_reference for update;
 if p_event='success' then
  if v.status='paid' then return jsonb_build_object('duplicate',true,'status','paid');end if;
  if v.status not in('processing','requested') then raise exception 'Withdrawal cannot become paid from %',v.status;end if;
  update public.withdrawals set status='paid',transfer_code=coalesce(p_transfer_code,transfer_code),processed_at=now(),failure_reason=null where id=v.id;
  update public.wallet_transactions set status='completed' where reference=v.reference and category='withdrawal';
  update public.profiles set first_paid_withdrawal_at=coalesce(first_paid_withdrawal_at,now()) where id=v.user_id;
  insert into public.notifications(user_id,kind,title,body,href) values(v.user_id,'withdrawal_paid','Withdrawal paid','Your bank transfer has been completed.','/app');
  insert into public.email_outbox(user_id,recipient,template,payload) select v.user_id,email,'withdrawal_paid',jsonb_build_object('amount',v.amount,'reference',v.reference) from public.profiles where id=v.user_id and email is not null;
 else
  if v.status in('failed','reversed','cancelled') then return jsonb_build_object('duplicate',true,'status',v.status);end if;
  if v.status not in('processing','paid','requested') then raise exception 'Withdrawal cannot be refunded from %',v.status;end if;
  update public.withdrawals set status=case when p_event='reversed' then 'reversed' else 'failed' end,transfer_code=coalesce(p_transfer_code,transfer_code),processed_at=now(),failure_reason=left(coalesce(p_reason,'Transfer not completed'),500) where id=v.id;
  v_refund:=v.reference||':refund';
  insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description,metadata) values(v.user_id,'credit','adjustment',v.amount,'completed',v_refund,'Withdrawal refund',jsonb_build_object('withdrawal_id',v.id,'event',p_event)) on conflict(reference) do nothing;
  if found then update public.wallets set available_balance=available_balance+v.amount,version=version+1,updated_at=now() where user_id=v.user_id;end if;
  update public.wallet_transactions set status=case when p_event='reversed' then 'reversed' else 'failed' end where reference=v.reference and category='withdrawal';
  insert into public.notifications(user_id,kind,title,body,href) values(v.user_id,'withdrawal_failed','Withdrawal not completed','The amount has been returned to your Erna wallet.','/app');
  insert into public.email_outbox(user_id,recipient,template,payload) select v.user_id,email,'withdrawal_failed',jsonb_build_object('amount',v.amount,'reference',v.reference,'reason',p_reason) from public.profiles where id=v.user_id and email is not null;
 end if;
 return jsonb_build_object('duplicate',false,'status',case when p_event='success' then 'paid' else p_event end,'user_id',v.user_id);
end $$;
revoke all on function public.finalize_withdrawal(text,text,text,text) from public,anon,authenticated;
grant execute on function public.finalize_withdrawal(text,text,text,text) to service_role;

create or replace function public.activate_subscription(p_user uuid,p_plan text,p_reference text,p_subscription_code text default null,p_email_token text default null,p_period_end timestamptz default null,p_plan_code text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_amount numeric;
begin
 if p_plan not in('plus','pro') then raise exception 'Invalid plan';end if; v_amount:=case when p_plan='plus' then 500 else 1000 end;
 if not exists(select 1 from public.profiles where id=p_user and first_paid_withdrawal_at is not null) then raise exception 'Plans unlock after the first paid withdrawal';end if;
 update public.subscriptions set status='expired',updated_at=now() where user_id=p_user and status='active';
 insert into public.subscriptions(user_id,plan,provider_subscription_code,provider_email_token,status,amount,current_period_start,current_period_end,reference,provider_plan_code,updated_at)
 values(p_user,p_plan,p_subscription_code,p_email_token,'active',v_amount,now(),coalesce(p_period_end,now()+interval '1 month'),p_reference,p_plan_code,now())
 on conflict(reference) do update set provider_subscription_code=coalesce(excluded.provider_subscription_code,public.subscriptions.provider_subscription_code),provider_email_token=coalesce(excluded.provider_email_token,public.subscriptions.provider_email_token),status='active',current_period_end=excluded.current_period_end,updated_at=now();
 update public.profiles set plan=p_plan,plan_expires_at=coalesce(p_period_end,now()+interval '1 month') where id=p_user;
 insert into public.notifications(user_id,kind,title,body,href) values(p_user,'subscription_active','Erna plan active','Your '||initcap(p_plan)||' benefits are now active.','/app');
 insert into public.email_outbox(user_id,recipient,template,payload) select p_user,email,'subscription_active',jsonb_build_object('plan',p_plan,'period_end',coalesce(p_period_end,now()+interval '1 month')) from public.profiles where id=p_user and email is not null;
end $$;
revoke all on function public.activate_subscription(uuid,text,text,text,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.activate_subscription(uuid,text,text,text,text,timestamptz,text) to service_role;

create or replace function public.cancel_subscription_event(p_subscription_code text,p_immediate boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v public.subscriptions%rowtype;
begin
 select * into strict v from public.subscriptions where provider_subscription_code=p_subscription_code for update;
 update public.subscriptions set status=case when p_immediate then 'cancelled' else status end,cancel_at_period_end=true,updated_at=now() where id=v.id;
 if p_immediate or v.current_period_end<=now() then update public.profiles set plan='free',plan_expires_at=null where id=v.user_id;end if;
 insert into public.notifications(user_id,kind,title,body,href) values(v.user_id,'subscription_cancelled','Subscription updated',case when p_immediate then 'Your account is now on Free.' else 'Your plan will remain active until the billing period ends.' end,'/app');
 return v.user_id;
end $$;
revoke all on function public.cancel_subscription_event(text,boolean) from public,anon,authenticated;
grant execute on function public.cancel_subscription_event(text,boolean) to service_role;

-- Welcome/product email outbox trigger. Auth OTP and recovery remain Supabase Auth responsibilities.
create or replace function private.enqueue_welcome_email() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.email is not null then insert into public.email_outbox(user_id,recipient,template,payload) values(new.id,new.email,'welcome',jsonb_build_object('name',new.full_name));end if;return new;end $$;
revoke all on function private.enqueue_welcome_email() from public,anon,authenticated;
drop trigger if exists enqueue_profile_welcome_email on public.profiles;
create trigger enqueue_profile_welcome_email after insert on public.profiles for each row execute function private.enqueue_welcome_email();

-- Storage is server-write-only so image decoding/re-encoding cannot be bypassed.
drop policy if exists task_proofs_owner_upload on storage.objects;
drop policy if exists listing_images_owner_upload_storage on storage.objects;

-- Replace the earlier funding helper with a version that also locks and verifies
-- the server-created payment intent before any balance mutation.
create or replace function public.credit_verified_funding(p_user uuid,p_reference text,p_amount numeric,p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v public.payment_intents%rowtype;
begin
 select * into strict v from public.payment_intents where reference=p_reference for update;
 if v.user_id<>p_user or v.amount<>p_amount then raise exception 'Funding event does not match its payment intent';end if;
 if v.status='paid' then return;end if;
 if v.status<>'pending' then raise exception 'Payment intent is not pending';end if;
 insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description,metadata) values(p_user,'credit','funding',p_amount,'completed',p_reference,'Wallet funding',p_payload);
 update public.wallets set available_balance=available_balance+p_amount,version=version+1,updated_at=now() where user_id=p_user;
 update public.payment_intents set status='paid',verified_at=now(),provider_payload=p_payload where id=v.id;
end $$;
revoke all on function public.credit_verified_funding(uuid,text,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.credit_verified_funding(uuid,text,numeric,jsonb) to service_role;
