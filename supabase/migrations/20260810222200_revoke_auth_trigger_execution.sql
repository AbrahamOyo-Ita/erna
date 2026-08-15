-- Trigger functions are internal database plumbing, not public RPC endpoints.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.generate_referral_code() from anon, authenticated;
