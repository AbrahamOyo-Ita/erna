# Supabase Setup Execution Audit

Audited against `SUPABASE_SETUP.md` on 2026-08-10.

> Historical Phase 1 Auth audit. For the current full-platform security, live QA, migration, and blocker status as of 11 August 2026, use `PRODUCTION_SECURITY_QA_REPORT.md`.

## Completed automatically

- Linked hosted project is active and healthy: `erna-web`, project ref `uwebxmccflvijepbvqlj`, region `eu-west-1`.
- `.env.local` contains the linked project URL and a publishable key. The application now reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` while retaining legacy anon-key compatibility.
- All four migrations are applied locally and remotely:
  - Phase 1 Auth schema
  - Data API grants, RLS optimization, and foreign-key indexes
  - Internal trigger-function execution revocation
  - Schema-qualified referral-code generation fix
- `profiles` and `referrals` exist with RLS enabled.
- Anonymous table access is denied. Authenticated access is limited by table/column grants and ownership policies.
- Internal trigger functions cannot be called by `anon` or `authenticated` as RPC functions.
- Rolled-back production-schema functional test passed:
  - Signup creates a matching profile.
  - Referral codes are eight uppercase hexadecimal characters.
  - Valid referral signup links `referred_by` and creates an unpaid referral row.
  - Invalid referral codes reject signup.
  - Test transaction left zero test users or profiles behind.
- Historical result: the database security advisor had no warnings at the time of this Auth-only audit. The current full advisor reports `auth_leaked_password_protection`; see `PRODUCTION_SECURITY_QA_REPORT.md`.
- Supabase performance advisor: no warnings.
- Email/password provider is enabled, email confirmation is required, and anonymous signup is disabled.
- Frontend hCaptcha support is implemented for signup, login, password reset, phone OTP requests, and OTP resends. It remains dormant until a site key is configured.
- Logged-out route checks passed:
  - `/signup`, `/verify`, `/login`, `/forgot-password`, and `/reset-password` return `200`.
  - `/app` redirects to `/login?next=%2Fapp`.
- Direct TypeScript check passes.
- Next.js production build passes.
- Installed npm dependency audit reports zero known vulnerabilities.

## Manual work still required

These items require provider credentials, domain ownership, a real delivery destination, a production host, or access to hosted dashboard controls that are not exposed by the authenticated CLI.

1. Set `NEXT_PUBLIC_SUPPORT_EMAIL` in `.env.local` and every deployment environment to the real Erna support address.
2. In Supabase Auth URL Configuration, verify the localhost redirects from the guide. Add the real production origin only after the production domain is confirmed.
3. Configure custom SMTP. Verify the sending domain and its SPF, DKIM, and DMARC records. New free-tier projects cannot customize Auth templates while using Supabase's default sender.
4. After SMTP is active, set the signup template to include `{{ .Token }}` and the recovery template to include `{{ .ConfirmationURL }}` using the guide's subjects and HTML.
5. Create the Google OAuth client, supply its Client ID and secret in Supabase, and enable Google. It is currently disabled.
6. Configure an SMS provider, fund Nigerian delivery, supply its credentials in Supabase, and enable Phone Auth. It is currently disabled.
7. Create an hCaptcha site, add `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` to local and deployed environments, deploy it, then enable hCaptcha in Supabase using the matching secret.
8. Review hosted Auth rate limits after SMTP and SMS capacity are known. Do not raise them broadly.
9. Configure the three public environment variables on the chosen production host and redeploy. No hosting project is connected in this workspace.
10. Complete real-user delivery and consent tests from sections 15–19: email signup/OTP, referral with two accounts, correct and incorrect login, Google consent, email recovery, and phone recovery.
11. Monitor Supabase Auth logs plus SMTP/SMS provider delivery logs while running those real-user tests.

The historical Auth foundation was code- and database-ready. Public launch remains blocked; the current report contains the authoritative evidence and remaining actions.
