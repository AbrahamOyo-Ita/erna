create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (
      select 1
      from public.profiles
      where referral_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.generate_referral_code() from public, anon, authenticated;
