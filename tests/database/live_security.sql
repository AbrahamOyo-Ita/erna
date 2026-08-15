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

-- Rollback-only test identities. The auth trigger creates profiles and wallets.
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid, u.id,
  'authenticated', 'authenticated', u.email, now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name), now(), now()
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'qa-advertiser@erna.invalid', 'QA Advertiser'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'qa-worker@erna.invalid', 'QA Worker'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'qa-attacker@erna.invalid', 'QA Attacker'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'qa-admin@erna.invalid', 'QA Admin')
) as u(id, email, full_name);

update public.profiles
set is_admin = true
where id = '44444444-4444-4444-8444-444444444444';

select pg_temp.assert_true(
  (select count(*) from public.wallets where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444'
  )) = 4,
  'auth provisioning must create one wallet per user'
);

-- Verified funding is exact, locked, and idempotent.
insert into public.payment_intents(user_id, reference, amount)
values ('11111111-1111-4111-8111-111111111111', 'qa_funding_idempotent_001', 5000);
select public.credit_verified_funding(
  '11111111-1111-4111-8111-111111111111',
  'qa_funding_idempotent_001', 5000, '{"qa":true}'::jsonb
);
select public.credit_verified_funding(
  '11111111-1111-4111-8111-111111111111',
  'qa_funding_idempotent_001', 5000, '{"replay":true}'::jsonb
);
select pg_temp.assert_true(
  (select available_balance = 5000 from public.wallets where user_id = '11111111-1111-4111-8111-111111111111'),
  'replayed funding must not credit twice'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.wallet_transactions where reference = 'qa_funding_idempotent_001'),
  'funding reference must have exactly one ledger row'
);

-- Funded task creation atomically moves the advertised total into escrow.
create temporary table qa_ids(kind text primary key, id uuid not null) on commit drop;
grant select on qa_ids to authenticated;
insert into qa_ids(kind, id)
select 'task', public.create_funded_task(
  '11111111-1111-4111-8111-111111111111', 'facebook', 'follow',
  'https://example.com/erna-qa', 'Follow the linked QA account and upload proof.', 2, 'manual'
);
select pg_temp.assert_true(
  (select available_balance = 4968 and escrow_balance = 32 from public.wallets where user_id = '11111111-1111-4111-8111-111111111111'),
  'task funding must debit available funds and reserve the full advertiser price'
);
select pg_temp.assert_true(
  (select status = 'active' and funded_at is not null and escrow_remaining = 32 from public.tasks where id = (select id from qa_ids where kind='task')),
  'only a funded task may become active'
);

-- Priority tasks remain hidden from Free users until the priority window ends.
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select pg_temp.assert_true(
  (select count(*) = 0 from public.tasks where id = (select id from qa_ids where kind='task')),
  'Free user must not see a priority-window task'
);
reset role;
do $$
begin
  begin
    perform public.submit_task_proof(
      '22222222-2222-4222-8222-222222222222',
      (select id from qa_ids where kind='task'),
      '22222222-2222-4222-8222-222222222222/qa/priority-bypass.webp'
    );
    raise exception 'QA assertion failed: Free user bypassed the priority window by task ID';
  exception when others then
    if sqlerrm <> 'Task is in the Plus and Pro priority access window' then raise; end if;
  end;
end;
$$;
update public.tasks set priority_at = now() where id = (select id from qa_ids where kind='task');

insert into qa_ids(kind, id)
select 'submission', public.submit_task_proof(
  '22222222-2222-4222-8222-222222222222',
  (select id from qa_ids where kind='task'),
  '22222222-2222-4222-8222-222222222222/qa/proof.webp'
);

select public.moderate_submission(
  '44444444-4444-4444-8444-444444444444',
  (select id from qa_ids where kind='submission'),
  'approved', null, null
);
select pg_temp.assert_true(
  (select available_balance = 10 and task_earnings = 10 from public.wallets where user_id = '22222222-2222-4222-8222-222222222222'),
  'approval must atomically credit the exact worker payout'
);
select pg_temp.assert_true(
  (select escrow_balance = 16 from public.wallets where user_id = '11111111-1111-4111-8111-111111111111'),
  'approval must deplete advertiser escrow by one advertiser unit price'
);
select pg_temp.assert_true(
  (select approved_count = 1 and reserved_count = 0 and escrow_remaining = 16 from public.tasks where id = (select id from qa_ids where kind='task')),
  'approval must update task counters exactly once'
);

-- A correct daily answer credits once; replay is rejected and cannot double-credit.
select public.ensure_daily_question();
insert into qa_ids(kind, id)
select 'question', id from public.daily_questions
where is_published and question_date = timezone('Africa/Lagos', now())::date
limit 1;
select pg_temp.assert_true((select count(*) = 1 from qa_ids where kind='question'), 'a current published question must exist');
select public.answer_daily_question(
  '22222222-2222-4222-8222-222222222222'::uuid,
  (select id from qa_ids where kind='question'),
  (select correct_index from public.daily_questions where id = (select id from qa_ids where kind='question'))
);
do $$
begin
  begin
    perform public.answer_daily_question(
      '22222222-2222-4222-8222-222222222222'::uuid,
      (select id from qa_ids where kind='question'),
      (select correct_index from public.daily_questions where id = (select id from qa_ids where kind='question'))
    );
    raise exception 'QA assertion failed: duplicate trivia answer was accepted';
  exception when others then
    if sqlerrm <> 'Today''s question has already been answered' then raise; end if;
  end;
end;
$$;
select pg_temp.assert_true(
  (select available_balance = 30 and daily_question_earnings = 20 from public.wallets where user_id = '22222222-2222-4222-8222-222222222222'),
  'trivia reward must be credited exactly once'
);

-- Withdrawal reservation prevents overspend; failure refunds exactly once.
insert into public.payment_intents(user_id, reference, amount)
values ('22222222-2222-4222-8222-222222222222', 'qa_worker_funding_001', 3000);
select public.credit_verified_funding(
  '22222222-2222-4222-8222-222222222222',
  'qa_worker_funding_001', 3000, '{"qa":true}'::jsonb
);
select public.request_withdrawal(
  '22222222-2222-4222-8222-222222222222', 1000, '058', '1234',
  'QA Worker', 'RCP_QAWORKER001', 'qa_withdrawal_ref_001'
);
do $$
begin
  begin
    perform public.request_withdrawal(
      '22222222-2222-4222-8222-222222222222', 3000, '058', '1234',
      'QA Worker', 'RCP_QAWORKER001', 'qa_withdrawal_ref_002'
    );
    raise exception 'QA assertion failed: overspending withdrawal was accepted';
  exception when check_violation then raise;
  when others then
    if sqlerrm <> 'Insufficient wallet balance' then raise; end if;
  end;
end;
$$;
select public.finalize_withdrawal('qa_withdrawal_ref_001', 'failed', null, 'QA simulated bank failure');
select public.finalize_withdrawal('qa_withdrawal_ref_001', 'failed', null, 'QA replay');
select pg_temp.assert_true(
  (select available_balance = 3030 from public.wallets where user_id = '22222222-2222-4222-8222-222222222222'),
  'failed withdrawal webhook replay must refund exactly once'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.wallet_transactions where reference = 'qa_withdrawal_ref_001:refund'),
  'withdrawal refund must have one idempotent ledger row'
);

-- Listing creation is server-owned and normalized into listing/image rows.
insert into qa_ids(kind, id)
select 'listing', public.create_listing(
  '22222222-2222-4222-8222-222222222222', 'QA listing',
  'A rollback-only listing used for Erna access-control verification.',
  'Services', 1500, 'Cross River', 'Calabar', '2348012345678',
  array['22222222-2222-4222-8222-222222222222/qa/listing.webp']
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.listing_images where listing_id = (select id from qa_ids where kind='listing')),
  'listing creation must persist its sanitized image path'
);

-- RLS and grants: an unrelated authenticated session sees only its own private rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select pg_temp.assert_true((select count(*) = 1 from public.wallets), 'RLS must expose only the caller wallet');
select pg_temp.assert_true((select count(*) = 0 from public.task_submissions), 'RLS must hide unrelated submissions');
select pg_temp.assert_true((select count(*) = 0 from public.withdrawals), 'RLS must hide unrelated withdrawals');
do $$
begin
  begin
    perform 1 from public.daily_answers limit 1;
    raise exception 'QA assertion failed: daily answer history was exposed to the browser role';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.credit_verified_funding(
      '33333333-3333-4333-8333-333333333333', 'forged', 5000, '{}'::jsonb
    );
    raise exception 'QA assertion failed: authenticated user executed funding RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.moderate_submission(
      '33333333-3333-4333-8333-333333333333',
      (select id from qa_ids where kind='submission'), 'approved', null, null
    );
    raise exception 'QA assertion failed: authenticated user executed moderation RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform correct_index from public.daily_questions limit 1;
    raise exception 'QA assertion failed: daily answer key was readable';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.tasks(
      advertiser_id, advertiser_name, platform, task_type, target_url, instructions,
      worker_payout, advertiser_price, quantity, escrow_remaining, status
    ) values (
      '33333333-3333-4333-8333-333333333333', 'Attacker', 'facebook', 'like',
      'https://example.com/forged', 'A forged unfunded active task.', 10, 16, 1, 16, 'active'
    );
    raise exception 'QA assertion failed: authenticated user inserted an unfunded task';
  exception when insufficient_privilege then null;
  end;
end;
$$;
do $$
begin
  begin
    update public.listings
    set status = 'removed'
    where id = (select id from qa_ids where kind='listing');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;
select pg_temp.assert_true(
  (select status = 'active' from public.listings where id = (select id from qa_ids where kind='listing')),
  'RLS must prevent an unrelated user from modifying a listing'
);

-- The API limiter is server-only and returns false once the configured budget is spent.
select pg_temp.assert_true(public.consume_rate_limit(
  '33333333-3333-4333-8333-333333333333', 'qa:limit', 3, 60
), 'rate-limit event 1 should pass');
select pg_temp.assert_true(public.consume_rate_limit(
  '33333333-3333-4333-8333-333333333333', 'qa:limit', 3, 60
), 'rate-limit event 2 should pass');
select pg_temp.assert_true(public.consume_rate_limit(
  '33333333-3333-4333-8333-333333333333', 'qa:limit', 3, 60
), 'rate-limit event 3 should pass');
select pg_temp.assert_true(not public.consume_rate_limit(
  '33333333-3333-4333-8333-333333333333', 'qa:limit', 3, 60
), 'rate-limit event 4 should be blocked');

select jsonb_build_object(
  'status', 'passed',
  'scope', jsonb_build_array(
    'funding_idempotency', 'task_escrow', 'moderation_credit', 'trivia_idempotency',
    'withdrawal_refund_idempotency', 'rls_isolation', 'rpc_privileges',
    'answer_key_confidentiality', 'listing_ownership', 'api_rate_limit'
  )
) as live_security_test_result;

rollback;
