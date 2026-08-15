delete from auth.users where id = '99999999-9999-4999-8999-999999999999';
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-4999-8999-999999999999',
  'authenticated', 'authenticated', 'qa-marketplace-route@erna.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"QA Marketplace Route"}'::jsonb, now(), now()
);
insert into public.listings (
  id, seller_id, title, description, category, price,
  state, city, whatsapp_phone, status
) values (
  '99999999-9999-4999-8999-999999999998',
  '99999999-9999-4999-8999-999999999999',
  'QA live marketplace listing',
  'A cleanup-safe listing used to verify the public Next.js detail route.',
  'Services', 2500, 'Cross River', 'Calabar', '2348012345678', 'active'
);
