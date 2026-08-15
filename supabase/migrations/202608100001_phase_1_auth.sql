-- Erna Phase 1: auth profiles and single-tier referral capture.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text unique,
  email text unique,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{8}$'),
  referred_by uuid references public.profiles(id) on delete set null,
  kyc_tier smallint not null default 0 check (kyc_tier between 0 and 3),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_referral check (referred_by is null or referred_by <> id)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  bonus_paid boolean not null default false,
  created_at timestamptz not null default now(),
  constraint no_self_referral_row check (referrer_id <> referred_id)
);

alter table public.profiles enable row level security;
alter table public.referrals enable row level security;

create policy "Users can read their own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can update safe profile fields" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Referrers can view their direct referrals" on public.referrals for select to authenticated using (auth.uid() = referrer_id or auth.uid() = referred_id);

create or replace function public.generate_referral_code()
returns text language plpgsql volatile set search_path = '' as $$
declare candidate text;
begin
  loop
    candidate := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare referrer uuid;
declare submitted_code text;
begin
  submitted_code := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));
  if submitted_code is not null then
    select id into referrer from public.profiles where referral_code = submitted_code;
    if referrer is null then raise exception 'Invalid referral code'; end if;
  end if;

  insert into public.profiles (id, full_name, phone, email, referral_code, referred_by)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Erna user'), new.phone, new.email, public.generate_referral_code(), referrer);

  if referrer is not null then insert into public.referrals (referrer_id, referred_id) values (referrer, new.id); end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public;
revoke all on function public.generate_referral_code() from public;
