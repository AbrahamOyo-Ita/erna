-- Resolve plpgsql_check findings from the production-hardening migration.
create or replace function public.answer_daily_question(p_user uuid,p_question uuid,p_selected smallint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_question public.daily_questions%rowtype; v_correct boolean; v_today date:=timezone('Africa/Lagos',now())::date;
begin
 select * into strict v_question from public.daily_questions where id=p_question and is_published and question_date=v_today for update;
 if p_selected<0 or p_selected>=jsonb_array_length(v_question.options) then raise exception 'Invalid answer'; end if;
 if not exists(select 1 from public.task_submissions where worker_id=p_user and status='approved' and timezone('Africa/Lagos',coalesce(reviewed_at,submitted_at))::date=v_today) then raise exception 'Complete an approved task today first'; end if;
 v_correct:=p_selected=v_question.correct_index;
 insert into public.daily_answers(question_id,user_id,selected_index,is_correct,reward_amount) values(p_question,p_user,p_selected,v_correct,case when v_correct then 20 else 0 end);
 if v_correct then
   insert into public.wallet_transactions(user_id,direction,category,amount,status,reference,description) values(p_user,'credit','daily_question',20,'completed','trivia:'||v_today||':'||p_user,'Correct daily answer') on conflict(reference) do nothing;
   if found then update public.wallets set available_balance=available_balance+20,daily_question_earnings=daily_question_earnings+20,version=version+1,updated_at=now() where user_id=p_user; end if;
 end if;
 return jsonb_build_object('correct',v_correct,'reward',case when v_correct then 20 else 0 end,'explanation',v_question.explanation);
exception when unique_violation then raise exception 'Today''s question has already been answered';
end $$;
revoke all on function public.answer_daily_question(uuid,uuid,smallint) from public,anon,authenticated;
grant execute on function public.answer_daily_question(uuid,uuid,smallint) to service_role;

create or replace function public.request_withdrawal(p_user uuid,p_amount numeric,p_bank_code text,p_last4 text,p_account_name text,p_recipient text,p_reference text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_wallet public.wallets%rowtype; v_profile public.profiles%rowtype; v_min numeric; v_flag boolean:=false; v_reasons text[]:=array[]::text[]; v_id uuid;
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
