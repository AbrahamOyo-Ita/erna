alter table public.notifications
  add column if not exists source_key text;

create unique index if not exists notifications_source_key_idx
  on public.notifications(source_key)
  where source_key is not null;

create or replace function private.enqueue_supplemental_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind not in ('new_task_available','task_reminder','daily_question') then
    return new;
  end if;

  insert into public.email_outbox(user_id, recipient, template, payload)
  select p.id,
         p.email,
         new.kind,
         jsonb_build_object('title',new.title,'body',new.body,'href',new.href,'notification_id',new.id)
    from public.profiles p
   where p.id = new.user_id
     and p.email is not null
     and coalesce(p.notification_preferences -> 'email', 'true'::jsonb) = 'true'::jsonb;

  return new;
end
$$;

revoke all on function private.enqueue_supplemental_notification_email() from public, anon, authenticated;
drop trigger if exists enqueue_supplemental_notification_email on public.notifications;
create trigger enqueue_supplemental_notification_email
after insert on public.notifications
for each row execute function private.enqueue_supplemental_notification_email();

create or replace function public.queue_new_task_notifications(p_task uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_count integer;
  v_day date := timezone('Africa/Lagos', now())::date;
begin
  select * into strict v_task
    from public.tasks
   where id = p_task
     and status = 'active'
     and funded_at is not null;

  insert into public.notifications(user_id, kind, title, body, href, source_key)
  select p.id,
         'new_task_available',
         'New task available',
         'A new ' || replace(v_task.platform, '_', ' ') || ' ' || replace(v_task.task_type, '_', ' ') || ' task is available for ₦' || trim(to_char(v_task.worker_payout, 'FM999999999990.00')) || '.',
         '/app',
         'new-task:' || v_day::text || ':' || p.id::text
    from public.profiles p
   where p.id <> v_task.advertiser_id
     and p.whatsapp_opted_in_at is not null
     and p.notification_preferences -> 'whatsapp' = 'true'::jsonb
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.queue_new_task_notifications(uuid) from public, anon, authenticated;
grant execute on function public.queue_new_task_notifications(uuid) to service_role;

create or replace function public.queue_scheduled_notifications()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := timezone('Africa/Lagos', now())::date;
  v_daily integer := 0;
  v_reviews integer := 0;
begin
  insert into public.notifications(user_id, kind, title, body, href, source_key)
  select p.id,
         'daily_question',
         'Today''s question is ready',
         'You completed an approved task today. Answer the daily question once for a chance to earn ₦20.',
         '/app',
         'daily-question:' || v_day::text || ':' || p.id::text
    from public.profiles p
   where p.whatsapp_opted_in_at is not null
     and p.notification_preferences -> 'whatsapp' = 'true'::jsonb
     and exists (
       select 1 from public.task_submissions s
        where s.worker_id = p.id
          and s.status = 'approved'
          and timezone('Africa/Lagos', s.reviewed_at)::date = v_day
     )
     and exists (
       select 1 from public.daily_questions q
        where q.question_date = v_day and q.is_published
     )
     and not exists (
       select 1 from public.daily_answers a
       join public.daily_questions q on q.id = a.question_id
        where a.user_id = p.id and q.question_date = v_day
     )
  on conflict do nothing;
  get diagnostics v_daily = row_count;

  insert into public.notifications(user_id, kind, title, body, href, source_key)
  select t.advertiser_id,
         'task_reminder',
         'Proofs are waiting for review',
         'A funded campaign has proof submissions waiting for your decision.',
         '/app',
         'review-reminder:' || v_day::text || ':' || t.id::text || ':' || t.advertiser_id::text
    from public.tasks t
    join public.profiles p on p.id = t.advertiser_id
   where p.whatsapp_opted_in_at is not null
     and p.notification_preferences -> 'whatsapp' = 'true'::jsonb
     and exists (
       select 1 from public.task_submissions s
        where s.task_id = t.id
          and s.status = 'pending'
          and s.submitted_at <= now() - interval '2 hours'
     )
  on conflict do nothing;
  get diagnostics v_reviews = row_count;

  return jsonb_build_object('daily_question',v_daily,'review_reminders',v_reviews);
end
$$;

revoke all on function public.queue_scheduled_notifications() from public, anon, authenticated;
grant execute on function public.queue_scheduled_notifications() to service_role;
