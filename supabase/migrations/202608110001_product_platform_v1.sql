-- Erna v1 product platform: wallet ledger, escrow tasks, trivia, marketplace,
-- subscriptions, notifications, payouts and complete row-level security.
create schema if not exists private;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists whatsapp_phone text,
  add column if not exists roles text[] not null default array['worker']::text[],
  add column if not exists plan text not null default 'free',
  add column if not exists plan_expires_at timestamptz,
  add column if not exists first_paid_withdrawal_at timestamptz,
  add column if not exists is_admin boolean not null default false,
  add column if not exists notification_preferences jsonb not null default '{"in_app":true,"email":true}'::jsonb;

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_balance numeric(14,2) not null default 0 check (available_balance >= 0),
  escrow_balance numeric(14,2) not null default 0 check (escrow_balance >= 0),
  task_earnings numeric(14,2) not null default 0 check (task_earnings >= 0),
  referral_earnings numeric(14,2) not null default 0 check (referral_earnings >= 0),
  daily_question_earnings numeric(14,2) not null default 0 check (daily_question_earnings >= 0),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('credit','debit')),
  category text not null check (category in ('funding','task_earning','task_funding','task_refund','referral','daily_question','withdrawal','subscription','listing_boost','adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'completed' check (status in ('pending','completed','failed','reversed')),
  reference text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'paystack', reference text not null unique, amount numeric(14,2) not null check (amount >= 100),
  status text not null default 'pending' check (status in ('pending','paid','failed','abandoned')),
  authorization_url text, provider_payload jsonb not null default '{}'::jsonb, verified_at timestamptz, created_at timestamptz not null default now()
);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0), fee numeric(14,2) not null default 0 check (fee >= 0),
  bank_code text not null, account_number_last4 text not null, account_name text not null,
  recipient_code text, transfer_code text, reference text not null unique,
  status text not null default 'requested' check (status in ('requested','processing','paid','failed','cancelled')),
  failure_reason text, flagged boolean not null default false, requested_at timestamptz not null default now(), processed_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), advertiser_id uuid not null references public.profiles(id) on delete cascade,
  advertiser_name text not null, platform text not null check (platform in ('facebook','instagram','tiktok','x','linkedin','youtube','play_store','app_store','marketplace')),
  task_type text not null check (task_type in ('follow','like','share','comment','subscribe','review','engage')),
  target_url text not null check (target_url ~ '^https://'), instructions text not null check (char_length(instructions) between 10 and 3000),
  worker_payout numeric(14,2) not null check (worker_payout > 0), advertiser_price numeric(14,2) not null check (advertiser_price >= worker_payout),
  quantity integer not null check (quantity between 1 and 100000), approved_count integer not null default 0 check (approved_count >= 0),
  reserved_count integer not null default 0 check (reserved_count >= 0), escrow_remaining numeric(14,2) not null default 0 check (escrow_remaining >= 0),
  status text not null default 'draft' check (status in ('draft','active','paused','completed','cancelled')),
  review_mode text not null default 'manual' check (review_mode in ('manual','auto_spot_check')),
  is_seed boolean not null default false, priority_at timestamptz, funded_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (approved_count <= quantity and reserved_count <= quantity)
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade, proof_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','appealed')),
  rejection_reason text, rejection_note text, reviewed_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(), reviewed_at timestamptz, appealed_at timestamptz,
  unique (task_id, worker_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(), submission_id uuid not null unique references public.task_submissions(id) on delete cascade,
  raised_by uuid not null references public.profiles(id), reason text not null, status text not null default 'open' check (status in ('open','under_review','resolved_worker','resolved_advertiser')),
  admin_decision text, resolved_by uuid references public.profiles(id), created_at timestamptz not null default now(), resolved_at timestamptz
);

create table public.daily_questions (
  id uuid primary key default gen_random_uuid(), question_date date not null unique, question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 3 and 4),
  correct_index smallint not null check (correct_index between 0 and 3), explanation text, is_published boolean not null default false, created_at timestamptz not null default now()
);
create table public.daily_answers (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.daily_questions(id), user_id uuid not null references public.profiles(id) on delete cascade,
  selected_index smallint not null check (selected_index between 0 and 3), is_correct boolean not null, reward_amount numeric(14,2) not null default 0 check (reward_amount in (0,20)), answered_at timestamptz not null default now(), unique(question_id,user_id)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120), description text not null check (char_length(description) between 10 and 4000),
  category text not null, price numeric(14,2) not null check (price >= 0), state text not null, city text not null,
  whatsapp_phone text not null, status text not null default 'active' check (status in ('draft','active','sold','paused','removed')),
  featured_until timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.listing_images (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null, sort_order smallint not null default 0 check (sort_order between 0 and 9), unique(listing_id,storage_path)
);
create table public.seller_ratings (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id), seller_id uuid not null references public.profiles(id),
  buyer_id uuid not null references public.profiles(id), rating smallint not null check (rating between 1 and 5), review text,
  created_at timestamptz not null default now(), unique(listing_id,buyer_id), check (seller_id <> buyer_id)
);
create table public.listing_boosts (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade, active boolean not null default true, created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('plus','pro')), provider_subscription_code text unique, provider_email_token text,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','expired')),
  amount numeric(14,2) not null check (amount in (500,1000)), current_period_start timestamptz, current_period_end timestamptz, created_at timestamptz not null default now()
);
create unique index subscriptions_one_active_user_idx on public.subscriptions(user_id) where status = 'active';

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, title text not null, body text not null, href text, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id), action text not null,
  entity_type text not null, entity_id uuid, before_state jsonb, after_state jsonb, created_at timestamptz not null default now()
);

-- Every foreign key and common feed/filter path is indexed.
create index wallet_transactions_user_created_idx on public.wallet_transactions(user_id,created_at desc);
create index payment_intents_user_created_idx on public.payment_intents(user_id,created_at desc);
create index withdrawals_user_created_idx on public.withdrawals(user_id,requested_at desc);
create index withdrawals_status_idx on public.withdrawals(status,requested_at);
create index tasks_advertiser_idx on public.tasks(advertiser_id,created_at desc);
create index tasks_feed_idx on public.tasks(status,platform,worker_payout desc,created_at desc);
create index task_submissions_worker_idx on public.task_submissions(worker_id,status,submitted_at desc);
create index task_submissions_task_idx on public.task_submissions(task_id,status);
create index disputes_raised_by_idx on public.disputes(raised_by);
create index daily_answers_user_idx on public.daily_answers(user_id,answered_at desc);
create index listings_seller_idx on public.listings(seller_id,created_at desc);
create index listings_feed_idx on public.listings(status,category,state,created_at desc);
create index listing_images_listing_idx on public.listing_images(listing_id,sort_order);
create index seller_ratings_seller_idx on public.seller_ratings(seller_id,created_at desc);
create index listing_boosts_listing_idx on public.listing_boosts(listing_id);
create index subscriptions_user_idx on public.subscriptions(user_id,created_at desc);
create index notifications_user_idx on public.notifications(user_id,read_at,created_at desc);
create index admin_audit_actor_idx on public.admin_audit_log(actor_id,created_at desc);

-- Provision the wallet with every account, including existing users.
insert into public.wallets(user_id) select id from public.profiles on conflict do nothing;
create or replace function private.provision_wallet() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.wallets(user_id) values(new.id) on conflict do nothing; return new; end $$;
drop trigger if exists provision_profile_wallet on public.profiles;
create trigger provision_profile_wallet after insert on public.profiles for each row execute function private.provision_wallet();
revoke all on function private.provision_wallet() from public,anon,authenticated;

-- RLS: public catalog rows are readable; financial/private rows are owner-only.
do $$ declare t text; begin foreach t in array array['wallets','wallet_transactions','payment_intents','withdrawals','tasks','task_submissions','disputes','daily_questions','daily_answers','listings','listing_images','seller_ratings','listing_boosts','subscriptions','notifications','admin_audit_log'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy wallets_owner_read on public.wallets for select to authenticated using ((select auth.uid())=user_id);
create policy transactions_owner_read on public.wallet_transactions for select to authenticated using ((select auth.uid())=user_id);
create policy payment_intents_owner_read on public.payment_intents for select to authenticated using ((select auth.uid())=user_id);
create policy withdrawals_owner_read on public.withdrawals for select to authenticated using ((select auth.uid())=user_id);
create policy tasks_active_read on public.tasks for select to authenticated using (status='active' or advertiser_id=(select auth.uid()));
create policy tasks_owner_insert on public.tasks for insert to authenticated with check (advertiser_id=(select auth.uid()) and status='draft');
create policy submissions_party_read on public.task_submissions for select to authenticated using (worker_id=(select auth.uid()) or exists(select 1 from public.tasks t where t.id=task_id and t.advertiser_id=(select auth.uid())));
create policy submissions_worker_insert on public.task_submissions for insert to authenticated with check (worker_id=(select auth.uid()) and status='pending');
create policy disputes_party_read on public.disputes for select to authenticated using (raised_by=(select auth.uid()) or exists(select 1 from public.task_submissions s join public.tasks t on t.id=s.task_id where s.id=submission_id and (s.worker_id=(select auth.uid()) or t.advertiser_id=(select auth.uid()))));
create policy disputes_worker_insert on public.disputes for insert to authenticated with check (raised_by=(select auth.uid()));
create policy daily_questions_published_read on public.daily_questions for select to authenticated using (is_published and question_date=current_date);
create policy daily_answers_owner_read on public.daily_answers for select to authenticated using (user_id=(select auth.uid()));
create policy listings_public_read on public.listings for select to anon,authenticated using (status='active' or seller_id=(select auth.uid()));
create policy listings_owner_insert on public.listings for insert to authenticated with check (seller_id=(select auth.uid()));
create policy listings_owner_update on public.listings for update to authenticated using (seller_id=(select auth.uid())) with check (seller_id=(select auth.uid()));
create policy listing_images_public_read on public.listing_images for select to anon,authenticated using (exists(select 1 from public.listings l where l.id=listing_id and (l.status='active' or l.seller_id=(select auth.uid()))));
create policy listing_images_owner_insert on public.listing_images for insert to authenticated with check (exists(select 1 from public.listings l where l.id=listing_id and l.seller_id=(select auth.uid())));
create policy ratings_public_read on public.seller_ratings for select to anon,authenticated using (true);
create policy ratings_buyer_insert on public.seller_ratings for insert to authenticated with check (buyer_id=(select auth.uid()) and seller_id<>(select auth.uid()));
create policy boosts_owner_read on public.listing_boosts for select to authenticated using (exists(select 1 from public.listings l where l.id=listing_id and l.seller_id=(select auth.uid())));
create policy subscriptions_owner_read on public.subscriptions for select to authenticated using (user_id=(select auth.uid()));
create policy notifications_owner_read on public.notifications for select to authenticated using (user_id=(select auth.uid()));
create policy notifications_owner_update on public.notifications for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- The browser may read but cannot directly mutate money or moderation data.
grant select on public.wallets,public.wallet_transactions,public.payment_intents,public.withdrawals,public.tasks,public.task_submissions,public.disputes,public.daily_questions,public.daily_answers,public.listings,public.listing_images,public.seller_ratings,public.listing_boosts,public.subscriptions,public.notifications to authenticated;
grant select on public.listings,public.listing_images,public.seller_ratings to anon;
grant insert on public.tasks,public.task_submissions,public.disputes,public.listings,public.listing_images,public.seller_ratings to authenticated;
grant update on public.listings,public.notifications to authenticated;

-- Private buckets. Paths must begin with the authenticated user's UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('task-proofs','task-proofs',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('listing-images','listing-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy task_proofs_owner_upload on storage.objects for insert to authenticated with check (bucket_id='task-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy task_proofs_owner_read on storage.objects for select to authenticated using (bucket_id='task-proofs' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.task_submissions s join public.tasks t on t.id=s.task_id where s.proof_path=name and t.advertiser_id=(select auth.uid()))));
create policy listing_images_public_read_storage on storage.objects for select to anon,authenticated using (bucket_id='listing-images');
create policy listing_images_owner_upload_storage on storage.objects for insert to authenticated with check (bucket_id='listing-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Service-only atomic wallet credit used after verified Paystack webhooks.
create or replace function public.credit_verified_funding(p_user uuid,p_reference text,p_amount numeric,p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $$ begin
 if p_amount<100 then raise exception 'Funding amount too small'; end if;
 insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description,metadata)
 values(p_user,'credit','funding',p_amount,'completed',p_reference,'Wallet funding',p_payload) on conflict(reference) do nothing;
 if found then update public.wallets set available_balance=available_balance+p_amount,version=version+1,updated_at=now() where user_id=p_user; end if;
 update public.payment_intents set status='paid',verified_at=now(),provider_payload=p_payload where reference=p_reference and user_id=p_user;
end $$;
revoke all on function public.credit_verified_funding(uuid,text,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.credit_verified_funding(uuid,text,numeric,jsonb) to service_role;

-- Seed a launch-safe question; admins replace/curate future questions weekly.
insert into public.daily_questions(question_date,question,options,correct_index,explanation,is_published)
values(current_date,'Which Nigerian city is known as the Canaan City?','["Calabar","Lagos","Kano","Enugu"]',0,'Calabar is widely known as the Canaan City.',true)
on conflict(question_date) do nothing;
