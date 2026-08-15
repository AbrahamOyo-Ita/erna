do $$
begin
  if (select available_balance from public.wallets where user_id='55555555-5555-4555-8555-555555555555') <> 0 then
    raise exception 'QA assertion failed: concurrent withdrawal balance is not zero';
  end if;
  if (select count(*) from public.withdrawals where user_id='55555555-5555-4555-8555-555555555555' and reference in ('qa_race_withdrawal_a','qa_race_withdrawal_b')) <> 1 then
    raise exception 'QA assertion failed: concurrent requests created more than one withdrawal';
  end if;
  if (select count(*) from public.wallet_transactions where user_id='55555555-5555-4555-8555-555555555555' and category='withdrawal') <> 1 then
    raise exception 'QA assertion failed: concurrent requests created more than one debit';
  end if;
end;
$$;
select jsonb_build_object(
  'status','passed',
  'withdrawals',(select count(*) from public.withdrawals where user_id='55555555-5555-4555-8555-555555555555'),
  'balance',(select available_balance from public.wallets where user_id='55555555-5555-4555-8555-555555555555')
) as concurrent_withdrawal_result;
