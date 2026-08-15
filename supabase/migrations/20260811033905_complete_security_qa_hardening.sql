-- Complete the security and QA hardening pass. This migration adds provider
-- reconciliation, idempotent recurring billing, server-owned listing boosts,
-- active-session checks for sensitive routes, and a concurrency-safe email
-- outbox claim operation.

alter table public.withdrawals
  add column if not exists plan_at_request text not null default 'free',
  add column if not exists sla_due_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'withdrawals_plan_at_request_check'
      and conrelid = 'public.withdrawals'::regclass
  ) then
    alter table public.withdrawals
      add constraint withdrawals_plan_at_request_check
      check (plan_at_request in ('free', 'plus', 'pro'));
  end if;
end $$;

update public.withdrawals
set sla_due_at = requested_at + interval '48 hours'
where sla_due_at is null;

alter table public.withdrawals alter column sla_due_at set not null;

create index if not exists withdrawals_processing_reconcile_idx
on public.withdrawals(status, reviewed_at)
where status = 'processing';

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_reference text not null unique,
  amount numeric(14,2) not null check (amount in (500, 1000)),
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;
create policy subscription_payments_owner_read
on public.subscription_payments for select to authenticated
using ((select auth.uid()) = user_id);
grant select on public.subscription_payments to authenticated;
create index if not exists subscription_payments_user_created_idx
on public.subscription_payments(user_id, created_at desc);

create table if not exists public.provider_webhook_events (
  signature text primary key check (char_length(signature) = 128),
  event_type text not null,
  provider_reference text,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  claimed_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);
alter table public.provider_webhook_events enable row level security;

create or replace function public.claim_provider_webhook_event(
  p_signature text,
  p_event_type text,
  p_reference text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_signature text;
begin
  if p_signature !~ '^[a-f0-9]{128}$' or char_length(trim(p_event_type)) not between 1 and 120 then
    raise exception 'Invalid webhook event';
  end if;
  insert into public.provider_webhook_events(
    signature, event_type, provider_reference, status, attempts, claimed_at
  ) values (
    p_signature, trim(p_event_type), nullif(p_reference, ''), 'processing', 1, now()
  )
  on conflict(signature) do update
  set status = 'processing',
      attempts = public.provider_webhook_events.attempts + 1,
      claimed_at = now(),
      last_error = null
  where public.provider_webhook_events.status = 'failed'
     or (
       public.provider_webhook_events.status = 'processing'
       and public.provider_webhook_events.claimed_at < now() - interval '5 minutes'
     )
  returning signature into v_signature;
  return v_signature is not null;
end
$$;
revoke all on function public.claim_provider_webhook_event(text,text,text) from public, anon, authenticated;
grant execute on function public.claim_provider_webhook_event(text,text,text) to service_role;

create or replace function public.complete_provider_webhook_event(p_signature text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.provider_webhook_events
  set status = 'processed', processed_at = now(), last_error = null
  where signature = p_signature and status = 'processing';
  if not found then raise exception 'Webhook event is not processing'; end if;
end
$$;
revoke all on function public.complete_provider_webhook_event(text) from public, anon, authenticated;
grant execute on function public.complete_provider_webhook_event(text) to service_role;

create or replace function public.fail_provider_webhook_event(p_signature text, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.provider_webhook_events
  set status = 'failed', last_error = left(coalesce(p_error, 'Webhook processing failed'), 1000)
  where signature = p_signature and status = 'processing'
$$;
revoke all on function public.fail_provider_webhook_event(text,text) from public, anon, authenticated;
grant execute on function public.fail_provider_webhook_event(text,text) to service_role;

create or replace function public.is_active_auth_session(p_user uuid, p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = p_session and s.user_id = p_user
  )
$$;
revoke all on function public.is_active_auth_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_active_auth_session(uuid, uuid) to service_role;

create or replace function public.request_withdrawal(
  p_user uuid,
  p_amount numeric,
  p_bank_code text,
  p_last4 text,
  p_account_name text,
  p_recipient text,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets%rowtype;
  v_profile public.profiles%rowtype;
  v_min numeric;
  v_flag boolean := false;
  v_reasons text[] := array[]::text[];
  v_id uuid;
  v_plan text;
  v_sla interval;
begin
  if p_amount <> round(p_amount, 2)
    or p_amount <= 0
    or p_bank_code !~ '^[0-9]{2,10}$'
    or p_last4 !~ '^[0-9]{4}$'
    or p_recipient !~ '^RCP_[a-zA-Z0-9]+$'
    or p_reference !~ '^[a-z0-9_-]{16,50}$'
  then
    raise exception 'Invalid withdrawal request';
  end if;

  select * into strict v_profile
  from public.profiles
  where id = p_user and not is_suspended
  for update;

  select * into strict v_wallet
  from public.wallets
  where user_id = p_user
  for update;

  v_plan := case
    when v_profile.plan in ('plus', 'pro')
      and (v_profile.plan_expires_at is null or v_profile.plan_expires_at > now())
      then v_profile.plan
    else 'free'
  end;
  v_sla := case when v_plan = 'pro' then interval '24 hours'
                when v_plan = 'plus' then interval '36 hours'
                else interval '48 hours' end;
  v_min := case when v_profile.first_paid_withdrawal_at is null then 1000
                else 3000 end;

  if p_amount < v_min then raise exception 'Minimum withdrawal is %', v_min; end if;
  if v_wallet.available_balance < p_amount then raise exception 'Insufficient wallet balance'; end if;
  if p_amount >= 100000 then
    v_flag := true;
    v_reasons := array_append(v_reasons, 'high_value');
  end if;
  if v_profile.created_at > now() - interval '7 days' and p_amount >= 20000 then
    v_flag := true;
    v_reasons := array_append(v_reasons, 'new_account_high_value');
  end if;
  if (select count(*) from public.withdrawals where user_id = p_user and requested_at > now() - interval '24 hours') >= 2 then
    v_flag := true;
    v_reasons := array_append(v_reasons, 'high_velocity');
  end if;

  insert into public.withdrawals(
    user_id, amount, bank_code, account_number_last4, account_name,
    recipient_code, reference, status, flagged, risk_reasons,
    plan_at_request, sla_due_at
  ) values (
    p_user, p_amount, p_bank_code, p_last4, trim(p_account_name),
    p_recipient, p_reference, 'requested', v_flag, v_reasons,
    v_plan, now() + v_sla
  ) returning id into v_id;

  update public.wallets
  set available_balance = available_balance - p_amount,
      version = version + 1,
      updated_at = now()
  where user_id = p_user;

  insert into public.wallet_transactions(
    user_id, direction, category, amount, status, reference, description, metadata
  ) values (
    p_user, 'debit', 'withdrawal', p_amount, 'pending', p_reference,
    'Withdrawal requested', jsonb_build_object('withdrawal_id', v_id)
  );
  insert into public.notifications(user_id, kind, title, body, href)
  values (p_user, 'withdrawal_requested', 'Withdrawal requested',
    'Your request is queued for review.', '/app');

  return jsonb_build_object(
    'id', v_id,
    'reference', p_reference,
    'minimum', v_min,
    'flagged', v_flag,
    'risk_reasons', v_reasons,
    'plan', v_plan,
    'sla_due_at', now() + v_sla
  );
end
$$;
revoke all on function public.request_withdrawal(uuid,numeric,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.request_withdrawal(uuid,numeric,text,text,text,text,text) to service_role;

create or replace function public.activate_subscription(
  p_user uuid,
  p_plan text,
  p_reference text,
  p_subscription_code text default null,
  p_email_token text default null,
  p_period_end timestamptz default null,
  p_plan_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount numeric;
  v_existing public.subscriptions%rowtype;
  v_period_end timestamptz := coalesce(p_period_end, now() + interval '1 month');
begin
  if p_plan not in ('plus', 'pro') then raise exception 'Invalid plan'; end if;
  v_amount := case when p_plan = 'plus' then 500 else 1000 end;
  if not exists (
    select 1 from public.profiles
    where id = p_user and first_paid_withdrawal_at is not null and not is_suspended
  ) then
    raise exception 'Plans unlock after the first paid withdrawal';
  end if;

  select * into v_existing
  from public.subscriptions
  where reference = p_reference
  for update;

  if found and v_existing.status = 'active' then
    update public.subscriptions
    set provider_subscription_code = coalesce(p_subscription_code, provider_subscription_code),
        provider_email_token = coalesce(p_email_token, provider_email_token),
        provider_plan_code = coalesce(p_plan_code, provider_plan_code),
        current_period_end = greatest(coalesce(current_period_end, v_period_end), v_period_end),
        next_payment_at = greatest(coalesce(next_payment_at, v_period_end), v_period_end),
        updated_at = now()
    where id = v_existing.id;
    return;
  end if;

  update public.subscriptions
  set status = 'expired', updated_at = now()
  where user_id = p_user and status = 'active' and reference is distinct from p_reference;

  insert into public.subscriptions(
    user_id, plan, provider_subscription_code, provider_email_token, status,
    amount, current_period_start, current_period_end, next_payment_at,
    reference, provider_plan_code, updated_at
  ) values (
    p_user, p_plan, p_subscription_code, p_email_token, 'active',
    v_amount, now(), v_period_end, v_period_end,
    p_reference, p_plan_code, now()
  )
  on conflict(reference) do update
  set provider_subscription_code = coalesce(excluded.provider_subscription_code, public.subscriptions.provider_subscription_code),
      provider_email_token = coalesce(excluded.provider_email_token, public.subscriptions.provider_email_token),
      provider_plan_code = coalesce(excluded.provider_plan_code, public.subscriptions.provider_plan_code),
      status = 'active',
      current_period_start = coalesce(public.subscriptions.current_period_start, now()),
      current_period_end = excluded.current_period_end,
      next_payment_at = excluded.next_payment_at,
      updated_at = now();

  update public.profiles
  set plan = p_plan, plan_expires_at = v_period_end
  where id = p_user;

  insert into public.notifications(user_id, kind, title, body, href)
  values (p_user, 'subscription_active', 'Erna plan active',
    'Your ' || initcap(p_plan) || ' benefits are now active.', '/app');
  insert into public.email_outbox(user_id, recipient, template, payload)
  select p_user, email, 'subscription_active',
    jsonb_build_object('plan', p_plan, 'period_end', v_period_end)
  from public.profiles where id = p_user and email is not null;
end
$$;
revoke all on function public.activate_subscription(uuid,text,text,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid,text,text,text,text,timestamptz,text) to service_role;

create or replace function public.renew_subscription(
  p_subscription_code text,
  p_reference text,
  p_amount numeric,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.subscriptions%rowtype;
  v_inserted uuid;
begin
  if p_reference !~ '^[A-Za-z0-9._-]{6,100}$' or p_period_end is null then
    raise exception 'Invalid subscription payment';
  end if;
  select * into strict v
  from public.subscriptions
  where provider_subscription_code = p_subscription_code
  for update;
  if p_amount <> v.amount then raise exception 'Subscription amount mismatch'; end if;

  insert into public.subscription_payments(
    subscription_id, user_id, provider_reference, amount, period_end
  ) values (v.id, v.user_id, p_reference, p_amount, p_period_end)
  on conflict(provider_reference) do nothing
  returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('duplicate', true); end if;

  update public.subscriptions
  set status = 'active',
      current_period_end = greatest(coalesce(current_period_end, p_period_end), p_period_end),
      next_payment_at = greatest(coalesce(next_payment_at, p_period_end), p_period_end),
      cancel_at_period_end = false,
      updated_at = now()
  where id = v.id;
  update public.profiles
  set plan = v.plan,
      plan_expires_at = greatest(coalesce(plan_expires_at, p_period_end), p_period_end)
  where id = v.user_id;
  return jsonb_build_object('duplicate', false, 'user_id', v.user_id, 'plan', v.plan);
end
$$;
revoke all on function public.renew_subscription(text,text,numeric,timestamptz) from public, anon, authenticated;
grant execute on function public.renew_subscription(text,text,numeric,timestamptz) to service_role;

create or replace function public.mark_subscription_past_due(p_subscription_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid;
begin
  update public.subscriptions
  set status = 'past_due', updated_at = now()
  where provider_subscription_code = p_subscription_code and status = 'active'
  returning user_id into v_user;
  return v_user;
end
$$;
revoke all on function public.mark_subscription_past_due(text) from public, anon, authenticated;
grant execute on function public.mark_subscription_past_due(text) to service_role;

create or replace function public.cancel_subscription_event(
  p_subscription_code text,
  p_immediate boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.subscriptions%rowtype;
begin
  select * into strict v
  from public.subscriptions
  where provider_subscription_code = p_subscription_code
  for update;
  if (p_immediate and v.status = 'cancelled')
     or (not p_immediate and v.cancel_at_period_end) then
    return v.user_id;
  end if;

  update public.subscriptions
  set status = case when p_immediate then 'cancelled' else status end,
      cancel_at_period_end = true,
      updated_at = now()
  where id = v.id;
  if p_immediate or v.current_period_end <= now() then
    update public.profiles set plan = 'free', plan_expires_at = null where id = v.user_id;
  end if;
  insert into public.notifications(user_id, kind, title, body, href)
  values (
    v.user_id, 'subscription_cancelled', 'Subscription updated',
    case when p_immediate then 'Your account is now on Free.'
         else 'Your plan will remain active until the billing period ends.' end,
    '/app'
  );
  return v.user_id;
end
$$;
revoke all on function public.cancel_subscription_event(text,boolean) from public, anon, authenticated;
grant execute on function public.cancel_subscription_event(text,boolean) to service_role;

create or replace function public.review_submission(
  p_actor uuid,
  p_submission uuid,
  p_decision text,
  p_reason text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.task_submissions%rowtype;
  v_task public.tasks%rowtype;
  v_result jsonb;
begin
  select * into strict v_sub
  from public.task_submissions where id = p_submission for update;
  select * into strict v_task
  from public.tasks where id = v_sub.task_id for update;
  if v_task.advertiser_id <> p_actor then raise exception 'Advertiser authorization required'; end if;
  if v_sub.status <> 'pending' then raise exception 'Only pending submissions can be reviewed by the advertiser'; end if;
  select public.moderate_submission(null, p_submission, p_decision, p_reason, p_note)
  into v_result;
  update public.task_submissions set reviewed_by = p_actor where id = p_submission;
  update public.admin_audit_log
  set actor_id = p_actor, action = 'advertiser_submission_' || p_decision
  where id = (
    select id from public.admin_audit_log
    where entity_type = 'task_submission' and entity_id = p_submission and actor_id is null
    order by created_at desc limit 1
  );
  return v_result;
end
$$;
revoke all on function public.review_submission(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.review_submission(uuid,uuid,text,text,text) to service_role;

create or replace function public.create_listing_boost(
  p_user uuid,
  p_listing uuid,
  p_quantity integer,
  p_target_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings%rowtype;
  v_task uuid;
begin
  select * into strict v_listing
  from public.listings
  where id = p_listing and seller_id = p_user and status = 'active'
  for update;
  if exists (
    select 1 from public.listing_boosts b
    join public.tasks t on t.id = b.task_id
    where b.listing_id = p_listing and b.active and t.status in ('active', 'paused')
  ) then
    raise exception 'This listing already has an active boost';
  end if;
  v_task := public.create_funded_task(
    p_user, 'marketplace', 'engage', p_target_url,
    'Open the Erna listing and review the product or service details.',
    p_quantity, 'auto_spot_check'
  );
  insert into public.listing_boosts(listing_id, task_id, active)
  values (p_listing, v_task, true);
  return v_task;
end
$$;
revoke all on function public.create_listing_boost(uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.create_listing_boost(uuid,uuid,integer,text) to service_role;

create or replace function public.claim_email_outbox(p_limit integer default 20)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 100 then raise exception 'Invalid outbox claim limit'; end if;
  return query
  with candidates as (
    select id
    from public.email_outbox
    where status in ('queued', 'failed') and available_at <= now() and attempts < 20
    order by created_at
    limit p_limit
    for update skip locked
  )
  update public.email_outbox o
  set status = 'sending', attempts = attempts + 1
  from candidates c
  where o.id = c.id
  returning o.*;
end
$$;
revoke all on function public.claim_email_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(integer) to service_role;

-- Keep public execution rights narrow after creating or replacing functions.
revoke all on table public.subscription_payments, public.provider_webhook_events from anon;
revoke all on table public.provider_webhook_events from authenticated;
