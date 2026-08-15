-- Visibility and mutation must enforce the same plan boundary. A Free user who
-- learns a priority task UUID must not be able to bypass the feed policy by
-- calling the proof-submission route directly.
create or replace function public.submit_task_proof(
  p_user uuid,
  p_task uuid,
  p_proof_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_submission uuid;
  v_plan text;
begin
  if p_proof_path !~ ('^' || p_user::text || '/[a-zA-Z0-9/_-]+\.(jpg|webp)$') then
    raise exception 'Invalid proof path';
  end if;

  select case
    when plan in ('plus', 'pro')
      and (plan_expires_at is null or plan_expires_at > now()) then plan
    else 'free'
  end into strict v_plan
  from public.profiles
  where id = p_user and not is_suspended;

  select * into strict v_task
  from public.tasks
  where id = p_task
  for update;
  if v_task.status <> 'active' or v_task.advertiser_id = p_user then
    raise exception 'Task is unavailable';
  end if;
  if v_task.priority_at is not null and v_task.priority_at > now() and v_plan = 'free' then
    raise exception 'Task is in the Plus and Pro priority access window';
  end if;
  if v_task.approved_count + v_task.reserved_count >= v_task.quantity then
    raise exception 'Task has no remaining slots';
  end if;
  if exists (
    select 1 from public.task_submissions
    where task_id = p_task and worker_id = p_user
  ) then
    raise exception 'You already submitted this task';
  end if;
  if (
    select count(*) from public.task_submissions
    where worker_id = p_user and submitted_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Hourly submission limit reached';
  end if;

  insert into public.task_submissions (task_id, worker_id, proof_path)
  values (p_task, p_user, p_proof_path)
  returning id into v_submission;
  update public.tasks
  set reserved_count = reserved_count + 1, updated_at = now()
  where id = p_task;
  return v_submission;
end
$$;
revoke all on function public.submit_task_proof(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_task_proof(uuid, uuid, text)
  to service_role;
