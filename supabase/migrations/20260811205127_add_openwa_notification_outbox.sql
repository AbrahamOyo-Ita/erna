-- OpenWA is an opt-in, non-financial notification channel. It is deliberately
-- isolated from withdrawal, funding, subscription and OTP messages.
alter table public.profiles
  add column if not exists whatsapp_opted_in_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_whatsapp_phone_format;
alter table public.profiles
  add constraint profiles_whatsapp_phone_format
  check (whatsapp_phone is null or whatsapp_phone ~ '^234[789][0-9]{9}$') not valid;

create table public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient text not null check (recipient ~ '^234[789][0-9]{9}$'),
  template text not null check (template in (
    'task_approved',
    'task_rejected',
    'new_task_available',
    'task_reminder',
    'daily_question'
  )),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 200),
  status text not null default 'queued' check (status in ('queued','processing','accepted','failed','suppressed')),
  attempts smallint not null default 0 check (attempts between 0 and 6),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now()
);

create index whatsapp_outbox_user_created_idx
  on public.whatsapp_outbox(user_id, created_at desc);
create index whatsapp_outbox_claim_idx
  on public.whatsapp_outbox(available_at, created_at)
  where status in ('queued','failed','processing') and attempts < 6;

alter table public.whatsapp_outbox enable row level security;
revoke all on table public.whatsapp_outbox from public, anon, authenticated;
grant select, insert, update on table public.whatsapp_outbox to service_role;

create table public.whatsapp_webhook_events (
  delivery_id text primary key check (char_length(delivery_id) between 1 and 200),
  event text not null check (event in ('message.sent','message.ack','message.failed')),
  provider_message_id text not null,
  received_at timestamptz not null default now()
);
alter table public.whatsapp_webhook_events enable row level security;
revoke all on table public.whatsapp_webhook_events from public, anon, authenticated;
grant select, insert on table public.whatsapp_webhook_events to service_role;

create or replace function private.enqueue_whatsapp_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient text;
begin
  if new.kind not in ('task_approved','task_rejected','new_task_available','task_reminder','daily_question') then
    return new;
  end if;

  select p.whatsapp_phone
    into v_recipient
    from public.profiles p
   where p.id = new.user_id
     and p.whatsapp_opted_in_at is not null
     and p.notification_preferences -> 'whatsapp' = 'true'::jsonb
     and p.whatsapp_phone ~ '^234[789][0-9]{9}$';

  if v_recipient is null then
    return new;
  end if;

  insert into public.whatsapp_outbox(
    user_id,
    recipient,
    template,
    payload,
    idempotency_key
  ) values (
    new.user_id,
    v_recipient,
    new.kind,
    jsonb_build_object(
      'notification_id', new.id,
      'title', new.title,
      'body', new.body,
      'href', new.href
    ),
    'notification:' || new.id::text
  ) on conflict (idempotency_key) do nothing;

  return new;
end
$$;

revoke all on function private.enqueue_whatsapp_notification() from public, anon, authenticated;
drop trigger if exists enqueue_whatsapp_notification on public.notifications;
create trigger enqueue_whatsapp_notification
after insert on public.notifications
for each row execute function private.enqueue_whatsapp_notification();

create or replace function public.claim_whatsapp_outbox(p_limit integer default 20)
returns setof public.whatsapp_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'Claim limit must be between 1 and 100';
  end if;

  return query
  update public.whatsapp_outbox as outbox
     set status = 'processing',
         attempts = outbox.attempts + 1,
         claimed_at = now(),
         last_error = null
    from (
      select candidate.id
        from public.whatsapp_outbox as candidate
       where candidate.attempts < 6
         and candidate.available_at <= now()
         and (
           candidate.status in ('queued','failed')
           or (candidate.status = 'processing' and candidate.claimed_at < now() - interval '5 minutes')
         )
       order by candidate.available_at, candidate.created_at
       for update skip locked
       limit p_limit
    ) as claimed
   where outbox.id = claimed.id
  returning outbox.*;
end
$$;

revoke all on function public.claim_whatsapp_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbox(integer) to service_role;

create or replace function public.apply_whatsapp_webhook(
  p_delivery_id text,
  p_event text,
  p_provider_message_id text,
  p_ack text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('message.sent','message.ack','message.failed')
     or char_length(p_delivery_id) not between 1 and 200
     or char_length(p_provider_message_id) not between 1 and 300 then
    raise exception 'Invalid OpenWA webhook event';
  end if;

  insert into public.whatsapp_webhook_events(delivery_id, event, provider_message_id)
  values (p_delivery_id, p_event, p_provider_message_id)
  on conflict (delivery_id) do nothing;

  if not found then
    return false;
  end if;

  if p_event = 'message.failed' then
    update public.whatsapp_outbox
       set status = case when attempts >= 6 then 'suppressed' else 'failed' end,
           available_at = now() + interval '5 minutes',
           last_error = 'OpenWA reported message delivery failure'
     where provider_message_id = p_provider_message_id
       and status in ('processing','accepted');
  elsif p_event = 'message.sent' then
    update public.whatsapp_outbox
       set accepted_at = coalesce(accepted_at, now())
     where provider_message_id = p_provider_message_id;
  elsif lower(coalesce(p_ack, '')) = 'read' then
    update public.whatsapp_outbox
       set delivered_at = coalesce(delivered_at, now()),
           read_at = coalesce(read_at, now())
     where provider_message_id = p_provider_message_id;
  elsif lower(coalesce(p_ack, '')) = 'delivered' then
    update public.whatsapp_outbox
       set delivered_at = coalesce(delivered_at, now())
     where provider_message_id = p_provider_message_id;
  end if;

  return true;
end
$$;

revoke all on function public.apply_whatsapp_webhook(text,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_whatsapp_webhook(text,text,text,text) to service_role;
