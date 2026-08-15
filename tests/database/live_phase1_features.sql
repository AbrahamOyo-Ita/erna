begin;
set local statement_timeout = '30s';

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'QA assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) select
  '00000000-0000-0000-0000-000000000000'::uuid,
  u.id, 'authenticated', 'authenticated', u.email, now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name), now(), now()
from (values
  ('66666666-6666-4666-8666-666666666666'::uuid, 'qa-phase1@erna.invalid', 'QA Phase One'),
  ('77777777-7777-4777-8777-777777777777'::uuid, 'qa-phase1-attacker@erna.invalid', 'QA Phase One Attacker'),
  ('88888888-8888-4888-8888-888888888888'::uuid, 'qa-phase1-admin@erna.invalid', 'QA Phase One Admin')
) as u(id, email, full_name);

update public.profiles set is_admin = true
where id = '88888888-8888-4888-8888-888888888888';

-- Establish a real first paid withdrawal so subscription eligibility and the
-- subsequent-withdrawal threshold are exercised rather than manually toggled.
insert into public.payment_intents(user_id, reference, amount)
values ('66666666-6666-4666-8666-666666666666', 'qa_phase1_funding_001', 10000);
select public.credit_verified_funding(
  '66666666-6666-4666-8666-666666666666',
  'qa_phase1_funding_001', 10000, '{"qa":"phase1"}'::jsonb
);
select public.request_withdrawal(
  '66666666-6666-4666-8666-666666666666', 1000, '058', '1234',
  'QA Phase One', 'RCP_QAPHASEONE', 'qa_phase1_withdrawal_first'
);
select public.finalize_withdrawal(
  'qa_phase1_withdrawal_first', 'success', 'TRF_QAPHASEONE', null
);
select pg_temp.assert_true(
  (select first_paid_withdrawal_at is not null
   from public.profiles where id = '66666666-6666-4666-8666-666666666666'),
  'a successful first withdrawal must unlock subscription eligibility'
);

-- Activate recurring billing from a provider-owned reference and verify that
-- the profile, subscription, payment history, cancellation, and idempotent
-- renewal state remain server-owned.
select public.activate_subscription(
  '66666666-6666-4666-8666-666666666666', 'plus',
  'erna-sub-66666666-6666-4666-8666-666666666666',
  'SUB_QAPHASEONE', 'email_token_qa', now() + interval '1 month', 'PLN_QAPLUS'
);
select pg_temp.assert_true(
  (select plan = 'plus' and plan_expires_at > now()
   from public.profiles where id = '66666666-6666-4666-8666-666666666666'),
  'subscription activation must set the server-side effective plan'
);

do $$
begin
  begin
    perform public.request_withdrawal(
      '66666666-6666-4666-8666-666666666666', 2999, '058', '1234',
      'QA Phase One', 'RCP_QAPHASEONE', 'qa_phase1_withdrawal_too_small'
    );
    raise exception 'QA assertion failed: a subsequent withdrawal below 3000 was accepted';
  exception when others then
    if sqlerrm <> 'Minimum withdrawal is 3000' then raise; end if;
  end;
end;
$$;

select public.request_withdrawal(
  '66666666-6666-4666-8666-666666666666', 3000, '058', '1234',
  'QA Phase One', 'RCP_QAPHASEONE', 'qa_phase1_withdrawal_second'
);
select pg_temp.assert_true(
  (select plan_at_request = 'plus'
      and sla_due_at between requested_at + interval '35 hours 59 minutes'
                         and requested_at + interval '36 hours 1 minute'
   from public.withdrawals where reference = 'qa_phase1_withdrawal_second'),
  'Plus must change the withdrawal SLA without lowering the 3000 threshold'
);
select public.finalize_withdrawal(
  'qa_phase1_withdrawal_second', 'failed', null, 'QA simulated failure'
);

select public.renew_subscription(
  'SUB_QAPHASEONE', 'qa_phase1_invoice_001', 500, now() + interval '2 months'
);
select public.renew_subscription(
  'SUB_QAPHASEONE', 'qa_phase1_invoice_001', 500, now() + interval '2 months'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.subscription_payments
   where provider_reference = 'qa_phase1_invoice_001'),
  'a replayed subscription invoice must create one payment record'
);
select public.cancel_subscription_event('SUB_QAPHASEONE', false);
select pg_temp.assert_true(
  (select plan = 'plus' from public.profiles
   where id = '66666666-6666-4666-8666-666666666666'),
  'non-renewing cancellation must preserve benefits through the paid period'
);
select public.cancel_subscription_event('SUB_QAPHASEONE', true);
select pg_temp.assert_true(
  (select plan = 'free' and plan_expires_at is null from public.profiles
   where id = '66666666-6666-4666-8666-666666666666'),
  'immediate provider cancellation must return the profile to Free'
);

-- Provider webhook claims are signature-keyed and cannot be processed twice.
select pg_temp.assert_true(
  public.claim_provider_webhook_event(
    repeat('a', 128), 'charge.success', 'qa_phase1_provider_reference'
  ),
  'the first valid provider event claim must succeed'
);
select pg_temp.assert_true(
  not public.claim_provider_webhook_event(
    repeat('a', 128), 'charge.success', 'qa_phase1_provider_reference'
  ),
  'an in-flight provider event replay must be rejected'
);
select public.complete_provider_webhook_event(repeat('a', 128));
select pg_temp.assert_true(
  not public.claim_provider_webhook_event(
    repeat('a', 128), 'charge.success', 'qa_phase1_provider_reference'
  ),
  'a completed provider event replay must be rejected'
);

-- Listing creation and boosts stay server-owned and atomically use the task
-- engine's escrow pricing. The listing lock rejects competing active boosts.
create temporary table qa_phase1_ids(kind text primary key, id uuid not null) on commit drop;

-- Advertiser rejection, one worker appeal, and admin resolution all operate on
-- the same locked submission and leave an actor-attributed audit trail.
insert into public.referrals(referrer_id, referred_id)
values (
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
);
select public.activate_subscription(
  '66666666-6666-4666-8666-666666666666', 'pro',
  'erna-sub-88888888-8888-4888-8888-888888888888',
  'SUB_QAPHASEONEPRO', 'email_token_qa_pro', now() + interval '1 month', 'PLN_QAPRO'
);
insert into qa_phase1_ids(kind, id)
select 'appeal_task', public.create_funded_task(
  '66666666-6666-4666-8666-666666666666',
  'facebook', 'like', 'https://example.com/phase-one-appeal',
  'Like the linked QA post and upload a clear proof screenshot.', 1, 'manual'
);
update public.tasks set priority_at = now()
where id = (select id from qa_phase1_ids where kind = 'appeal_task');
insert into qa_phase1_ids(kind, id)
select 'appeal_submission', public.submit_task_proof(
  '77777777-7777-4777-8777-777777777777',
  (select id from qa_phase1_ids where kind = 'appeal_task'),
  '77777777-7777-4777-8777-777777777777/qa/appeal-proof.webp'
);
select public.review_submission(
  '66666666-6666-4666-8666-666666666666',
  (select id from qa_phase1_ids where kind = 'appeal_submission'),
  'rejected', 'proof_invalid', 'The screenshot did not show the requested account.'
);
insert into qa_phase1_ids(kind, id)
select 'dispute', public.appeal_submission(
  '77777777-7777-4777-8777-777777777777',
  (select id from qa_phase1_ids where kind = 'appeal_submission'),
  'The screenshot shows the requested action and should be reviewed again.'
);
select public.moderate_submission(
  '88888888-8888-4888-8888-888888888888',
  (select id from qa_phase1_ids where kind = 'appeal_submission'),
  'approved', null, 'Admin verified the proof during appeal review.'
);
select pg_temp.assert_true(
  (select status = 'resolved_worker'
      and resolved_by = '88888888-8888-4888-8888-888888888888'
      and resolved_at is not null
   from public.disputes where id = (select id from qa_phase1_ids where kind = 'dispute')),
  'admin approval of an appeal must resolve the dispute for the worker'
);
select pg_temp.assert_true(
  (select available_balance = 10 and task_earnings = 10
   from public.wallets where user_id = '77777777-7777-4777-8777-777777777777'),
  'appeal approval must credit the worker exactly once'
);
select pg_temp.assert_true(
  (select referral_earnings = 400
   from public.wallets where user_id = '66666666-6666-4666-8666-666666666666'),
  'a Pro referrer must receive the server-side 400 first-task bonus'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.admin_audit_log
   where entity_id = (select id from qa_phase1_ids where kind = 'appeal_submission')
     and actor_id = '66666666-6666-4666-8666-666666666666'
     and action = 'advertiser_submission_rejected'),
  'advertiser rejection must be actor-attributed in the audit log'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.admin_audit_log
   where entity_id = (select id from qa_phase1_ids where kind = 'appeal_submission')
     and actor_id = '88888888-8888-4888-8888-888888888888'
     and action = 'submission_approved'),
  'admin appeal resolution must be actor-attributed in the audit log'
);

insert into qa_phase1_ids(kind, id)
select 'listing', public.create_listing(
  '66666666-6666-4666-8666-666666666666',
  'QA phase-one listing',
  'A rollback-only listing used to verify server-owned boosts.',
  'Services', 2500, 'Cross River', 'Calabar', '2348012345678',
  array['66666666-6666-4666-8666-666666666666/qa/phase-one.webp']
);
insert into qa_phase1_ids(kind, id)
select 'boost_task', public.create_listing_boost(
  '66666666-6666-4666-8666-666666666666',
  (select id from qa_phase1_ids where kind = 'listing'),
  10, 'https://example.com/marketplace/qa-phase-one'
);
select pg_temp.assert_true(
  (select t.status = 'active' and t.funded_at is not null
      and t.escrow_remaining = 160 and b.active
   from public.listing_boosts b
   join public.tasks t on t.id = b.task_id
   where b.listing_id = (select id from qa_phase1_ids where kind = 'listing')),
  'a listing boost must create one funded active marketplace task'
);
do $$
begin
  begin
    perform public.create_listing_boost(
      '66666666-6666-4666-8666-666666666666',
      (select id from qa_phase1_ids where kind = 'listing'),
      10, 'https://example.com/marketplace/qa-phase-one'
    );
    raise exception 'QA assertion failed: a duplicate active listing boost was accepted';
  exception when others then
    if sqlerrm <> 'This listing already has an active boost' then raise; end if;
  end;
end;
$$;

select pg_temp.assert_true(
  (select count(*) >= 1 from public.email_outbox
   where user_id = '66666666-6666-4666-8666-666666666666'
     and template = 'subscription_active'),
  'subscription activation must enqueue a transactional email'
);

insert into public.email_outbox(
  id, user_id, recipient, template, payload, status, available_at, created_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '66666666-6666-4666-8666-666666666666',
  'qa-outbox@erna.invalid', 'welcome', '{}'::jsonb,
  'queued', now() - interval '1 minute', timestamptz '2000-01-01 00:00:00+00'
);
create temporary table qa_first_email_claim on commit drop as
select * from public.claim_email_outbox(1);
select pg_temp.assert_true(
  (select id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and status = 'sending' and attempts = 1 and available_at > now()
   from qa_first_email_claim),
  'email claim must lease exactly one oldest queued message'
);
update public.email_outbox
set available_at = now() - interval '1 minute'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
create temporary table qa_stale_email_reclaim on commit drop as
select * from public.claim_email_outbox(1);
select pg_temp.assert_true(
  (select id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and status = 'sending' and attempts = 2
   from qa_stale_email_reclaim),
  'an expired sending lease must be reclaimable after a worker crash'
);

-- Authenticated clients cannot call privileged feature RPCs, read provider
-- events, mutate wallets, or bypass the sanitized server upload path.
select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated', 'public.create_listing_boost(uuid,uuid,integer,text)', 'EXECUTE'
  ),
  'listing boost RPC must remain service-role only'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.wallets', 'UPDATE'),
  'authenticated clients must not update wallet rows directly'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.provider_webhook_events', 'SELECT'),
  'authenticated clients must not read provider webhook state'
);
select pg_temp.assert_true(
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'INSERT'
      and policyname in ('task_proofs_owner_upload', 'listing_images_owner_upload_storage')
  ),
  'browser storage upload policies must remain removed so sanitation cannot be bypassed'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
do $$
begin
  begin
    perform 1 from public.subscription_payments limit 1;
    raise exception 'QA assertion failed: subscription payment history was exposed to the browser role';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select jsonb_build_object(
  'status', 'passed',
  'scope', jsonb_build_array(
    'first_and_subsequent_withdrawal_thresholds',
    'plan_sla_snapshot',
    'subscription_activation',
    'subscription_renewal_idempotency',
    'subscription_cancellation',
    'provider_webhook_replay',
    'advertiser_rejection_worker_appeal_admin_resolution',
    'plan_dependent_referral_bonus',
    'listing_creation_and_boost',
    'transactional_email_enqueue',
    'transactional_email_stale_claim_recovery',
    'privileged_rpc_and_storage_controls'
  )
) as live_phase1_feature_result;

rollback;
