begin;
set local statement_timeout = '30s';

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'QA assertion failed: %', message; end if;
end;
$$;

insert into auth.users(instance_id,id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','99999999-9999-4999-8999-999999999999','authenticated','authenticated','qa-openwa@erna.invalid',now(),'{}','{"full_name":"OpenWA QA"}',now(),now());

update public.profiles
set whatsapp_phone='2348162851706',
    whatsapp_opted_in_at=now(),
    notification_preferences=notification_preferences || '{"whatsapp":true}'::jsonb
where id='99999999-9999-4999-8999-999999999999';

insert into public.notifications(user_id,kind,title,body,href)
values('99999999-9999-4999-8999-999999999999','task_approved','Task approved','Your proof was approved.','/app');

select pg_temp.assert_true(
  (select count(*)=1 and min(template)='task_approved' and min(status)='queued' from public.whatsapp_outbox where user_id='99999999-9999-4999-8999-999999999999'),
  'an opted-in task notification must enqueue exactly once'
);

insert into public.notifications(user_id,kind,title,body,href)
values('99999999-9999-4999-8999-999999999999','withdrawal_paid','Withdrawal paid','Your withdrawal was paid.','/app');

select pg_temp.assert_true(
  (select count(*)=1 from public.whatsapp_outbox where user_id='99999999-9999-4999-8999-999999999999'),
  'financial notifications must never enter the unofficial WhatsApp lane'
);

select pg_temp.assert_true(
  not has_table_privilege('authenticated','public.whatsapp_outbox','SELECT')
  and not has_table_privilege('authenticated','public.whatsapp_webhook_events','SELECT')
  and not has_function_privilege('authenticated','public.claim_whatsapp_outbox(integer)','EXECUTE')
  and not has_function_privilege('authenticated','public.apply_whatsapp_webhook(text,text,text,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.queue_new_task_notifications(uuid)','EXECUTE')
  and not has_function_privilege('authenticated','public.queue_scheduled_notifications()','EXECUTE'),
  'browser roles must not access the OpenWA queue or provider functions'
);

select pg_temp.assert_true(
  (select count(*)=1 from public.claim_whatsapp_outbox(10) where user_id='99999999-9999-4999-8999-999999999999' and status='processing' and attempts=1),
  'the service claim must lease a queued message once'
);

select pg_temp.assert_true(
  (select count(*)=0 from public.claim_whatsapp_outbox(10) where user_id='99999999-9999-4999-8999-999999999999'),
  'an active claim lease must prevent a duplicate concurrent claim'
);

update public.whatsapp_outbox set status='accepted',provider_message_id='qa-provider-message',accepted_at=now() where user_id='99999999-9999-4999-8999-999999999999';
select pg_temp.assert_true(public.apply_whatsapp_webhook('qa-delivery-1','message.ack','qa-provider-message','delivered'),'first signed provider event must apply');
select pg_temp.assert_true(not public.apply_whatsapp_webhook('qa-delivery-1','message.ack','qa-provider-message','delivered'),'replayed provider delivery ID must be ignored');
select pg_temp.assert_true((select delivered_at is not null from public.whatsapp_outbox where provider_message_id='qa-provider-message'),'delivery acknowledgement must be recorded');

insert into public.notifications(user_id,kind,title,body,href,source_key)
values('99999999-9999-4999-8999-999999999999','daily_question','Daily question ready','Answer today after an approved task.','/app','qa-daily:99999999-9999-4999-8999-999999999999');

select pg_temp.assert_true(
  (select count(*)=1 from public.whatsapp_outbox where user_id='99999999-9999-4999-8999-999999999999' and template='daily_question')
  and (select count(*)=1 from public.email_outbox where user_id='99999999-9999-4999-8999-999999999999' and template='daily_question'),
  'supplemental WhatsApp alerts must receive one email fallback'
);

rollback;
