-- Expose only the operations required by the Phase 1 application.
-- RLS still determines which rows an authenticated user can access.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.referrals from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;
grant select on table public.referrals to authenticated;

-- Cache auth.uid() once per statement instead of evaluating it per row.
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update safe profile fields" on public.profiles;
create policy "Users can update safe profile fields"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Referrers can view their direct referrals" on public.referrals;
create policy "Referrers can view their direct referrals"
on public.referrals
for select
to authenticated
using (
  (select auth.uid()) = referrer_id
  or (select auth.uid()) = referred_id
);

-- PostgreSQL does not automatically index foreign-key columns.
create index if not exists profiles_referred_by_idx
on public.profiles (referred_by)
where referred_by is not null;

create index if not exists referrals_referrer_id_idx
on public.referrals (referrer_id);
