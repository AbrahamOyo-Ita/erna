-- Keep the daily-question journey available without relying on an external
-- scheduler. Reviewed templates live in the private schema; a service-only
-- function materializes exactly one published question for the current Lagos
-- date on first read.

create table if not exists private.daily_question_templates (
  template_key text primary key,
  question text not null check (char_length(question) between 10 and 300),
  options jsonb not null check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 3 and 4
  ),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null check (char_length(explanation) between 10 and 500),
  active boolean not null default true
);

alter table private.daily_question_templates enable row level security;
revoke all on table private.daily_question_templates from public, anon, authenticated;

insert into private.daily_question_templates (
  template_key, question, options, correct_index, explanation
) values
  (
    'calabar-canaan-city',
    'Which Nigerian city is widely known as the Canaan City?',
    '["Calabar", "Lagos", "Kano", "Enugu"]'::jsonb,
    0,
    'Calabar, the capital of Cross River State, is widely known as the Canaan City.'
  ),
  (
    'nigeria-capital',
    'What is the capital city of Nigeria?',
    '["Lagos", "Abuja", "Calabar", "Kano"]'::jsonb,
    1,
    'Abuja has served as Nigeria''s capital since 1991.'
  ),
  (
    'nigeria-currency-code',
    'What is the three-letter currency code for the Nigerian naira?',
    '["NGN", "NGR", "NRA", "NIG"]'::jsonb,
    0,
    'NGN is the ISO 4217 currency code for the Nigerian naira.'
  ),
  (
    'nigeria-independence',
    'In which year did Nigeria gain independence?',
    '["1957", "1960", "1963", "1970"]'::jsonb,
    1,
    'Nigeria gained independence on 1 October 1960.'
  ),
  (
    'calabar-state',
    'Calabar is the capital of which Nigerian state?',
    '["Akwa Ibom", "Rivers", "Cross River", "Abia"]'::jsonb,
    2,
    'Calabar is the capital city of Cross River State.'
  ),
  (
    'nigeria-country-code',
    'Which international calling code belongs to Nigeria?',
    '["+233", "+234", "+235", "+254"]'::jsonb,
    1,
    'Nigeria''s international telephone calling code is +234.'
  ),
  (
    'nigeria-flag-colours',
    'Which two colours appear on Nigeria''s national flag?',
    '["Green and white", "Red and white", "Blue and white", "Green and gold"]'::jsonb,
    0,
    'Nigeria''s national flag uses green and white vertical bands.'
  )
on conflict (template_key) do update
set question = excluded.question,
    options = excluded.options,
    correct_index = excluded.correct_index,
    explanation = excluded.explanation;

create or replace function public.ensure_daily_question()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := timezone('Africa/Lagos', now())::date;
  v_id uuid;
  v_count integer;
  v_offset integer;
  v_template private.daily_question_templates%rowtype;
begin
  select id into v_id
  from public.daily_questions
  where question_date = v_today and is_published;
  if found then return v_id; end if;

  select count(*) into v_count
  from private.daily_question_templates
  where active;
  if v_count = 0 then raise exception 'No daily question templates are active'; end if;

  v_offset := mod(v_today - date '2026-01-01', v_count);
  select * into strict v_template
  from private.daily_question_templates
  where active
  order by template_key
  offset v_offset
  limit 1;

  insert into public.daily_questions (
    question_date, question, options, correct_index, explanation, is_published
  ) values (
    v_today, v_template.question, v_template.options,
    v_template.correct_index, v_template.explanation, true
  )
  on conflict (question_date) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.daily_questions
    where question_date = v_today and is_published;
  end if;
  if v_id is null then
    raise exception 'Today''s question exists but is not published';
  end if;
  return v_id;
end
$$;
revoke all on function public.ensure_daily_question() from public, anon, authenticated;
grant execute on function public.ensure_daily_question() to service_role;

create or replace function public.get_daily_question_state(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question uuid;
  v_state jsonb;
begin
  if not exists (
    select 1 from public.profiles where id = p_user and not is_suspended
  ) then
    raise exception 'Account unavailable';
  end if;

  v_question := public.ensure_daily_question();
  select jsonb_build_object(
    'id', q.id,
    'question', q.question,
    'options', q.options,
    'question_date', q.question_date,
    'eligible', exists (
      select 1
      from public.task_submissions s
      where s.worker_id = p_user
        and s.status = 'approved'
        and timezone('Africa/Lagos', coalesce(s.reviewed_at, s.submitted_at))::date = q.question_date
    ),
    'answered', exists (
      select 1
      from public.daily_answers a
      where a.question_id = q.id and a.user_id = p_user
    )
  ) into v_state
  from public.daily_questions q
  where q.id = v_question;
  return v_state;
end
$$;
revoke all on function public.get_daily_question_state(uuid) from public, anon, authenticated;
grant execute on function public.get_daily_question_state(uuid) to service_role;

-- Materialize the current question during deployment as well as on first read.
select public.ensure_daily_question();

-- Preserve the listing row lock that serializes competing boost requests while
-- avoiding an unused whole-row variable flagged by plpgsql_check.
create or replace function public.create_listing_boost(
  p_user uuid,
  p_listing uuid,
  p_quantity integer,
  p_target_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task uuid;
begin
  perform l.id
  from public.listings l
  where l.id = p_listing and l.seller_id = p_user and l.status = 'active'
  for update;
  if not found then raise exception 'Active listing not found'; end if;

  if exists (
    select 1
    from public.listing_boosts b
    join public.tasks t on t.id = b.task_id
    where b.listing_id = p_listing
      and b.active
      and t.status in ('active', 'paused')
  ) then
    raise exception 'This listing already has an active boost';
  end if;

  v_task := public.create_funded_task(
    p_user, 'marketplace', 'engage', p_target_url,
    'Open the Erna listing and review the product or service details.',
    p_quantity, 'auto_spot_check'
  );
  insert into public.listing_boosts (listing_id, task_id, active)
  values (p_listing, v_task, true);
  return v_task;
end
$$;
revoke all on function public.create_listing_boost(uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.create_listing_boost(uuid, uuid, integer, text)
  to service_role;
