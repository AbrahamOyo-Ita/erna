delete from auth.users where id = '55555555-5555-4555-8555-555555555555';
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-4555-8555-555555555555',
  'authenticated', 'authenticated', 'qa-race@erna.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"QA Race Worker"}'::jsonb, now(), now()
);
insert into public.payment_intents(user_id, reference, amount)
values ('55555555-5555-4555-8555-555555555555', 'qa_race_funding_001', 1000);
select public.credit_verified_funding(
  '55555555-5555-4555-8555-555555555555',
  'qa_race_funding_001', 1000, '{"qa":"concurrency"}'::jsonb
);
