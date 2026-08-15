-- Replace inherited Data API SELECT defaults with Erna's explicit read
-- contract. RLS remains the row-level boundary, while these grants determine
-- which datasets are exposed to each browser role at all.

do $$
declare
  v_table record;
begin
  for v_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke select on table %I.%I from anon, authenticated',
      v_table.schema_name,
      v_table.table_name
    );
  end loop;
end
$$;

alter default privileges in schema public
  revoke select on tables from anon, authenticated;

-- Anonymous visitors only need the public marketplace catalog and published
-- task pricing. No account, financial, moderation, or operational table is
-- exposed to the anonymous Data API role.
grant select on table
  public.listings,
  public.listing_images,
  public.seller_ratings,
  public.task_prices
to anon;

-- Authenticated browser reads are owner/party scoped by the existing RLS
-- policies. Server-only state (provider events, payment intents, answer keys,
-- email outbox, subscription invoices, and admin audit rows) stays unexposed.
grant select on table
  public.profiles,
  public.referrals,
  public.wallets,
  public.wallet_transactions,
  public.withdrawals,
  public.tasks,
  public.task_submissions,
  public.listings,
  public.listing_images,
  public.seller_ratings,
  public.subscriptions,
  public.notifications,
  public.task_prices
to authenticated;
