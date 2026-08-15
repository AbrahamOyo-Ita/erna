-- Treat `available_at` as a short claim lease while a message is sending.
-- A crashed worker's row becomes claimable again after five minutes, while
-- SKIP LOCKED still prevents concurrent delivery by healthy workers.
create or replace function public.claim_email_outbox(p_limit integer default 20)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 100 then
    raise exception 'Invalid outbox claim limit';
  end if;

  return query
  with candidates as (
    select id
    from public.email_outbox
    where status in ('queued', 'failed', 'sending')
      and available_at <= now()
      and attempts < 20
    order by created_at
    limit p_limit
    for update skip locked
  )
  update public.email_outbox o
  set status = 'sending',
      attempts = attempts + 1,
      available_at = now() + interval '5 minutes'
  from candidates c
  where o.id = c.id
  returning o.*;
end
$$;
revoke all on function public.claim_email_outbox(integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_outbox(integer)
  to service_role;
