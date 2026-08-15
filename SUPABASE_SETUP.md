# Erna Supabase Setup Guide

This guide configures the complete Erna v1 backend: authentication, task escrow and proofs, wallet ledger, Paystack funding/payout plumbing, daily questions, marketplace, referrals, subscriptions, notifications, and the admin console.

> Status on 11 August 2026: local and linked migration histories match, database lint is clean, and the rollback-only security suites pass. Production sign-off remains blocked by provider credentials, verified domains, real-user delivery tests, a production host, and the Supabase leaked-password-protection warning. See `PRODUCTION_SECURITY_QA_REPORT.md` for current evidence.

## 1. Create a Supabase account and project

1. Open https://supabase.com/dashboard and sign in.
2. Create an organization named `Erna` if needed.
3. Click **New project**.
4. Configure it:
   - Project name: `erna-web`
   - Database password: generate a strong password and save it securely.
   - Region: choose the closest available region to Nigeria.
5. Create the project and wait for provisioning to finish.

Never place the database password in Git, frontend code, screenshots, or `.env.local`. It is used for database administration and CLI linking only.

## 2. Copy the Supabase URL and publishable key

In the project dashboard, click **Connect**. Alternatively open **Project Settings > API Keys**.

Copy:

- Project URL, similar to `https://abcdefghijk.supabase.co`
- Publishable key, usually beginning with `sb_publishable_`

The legacy `anon` key also works, but Supabase recommends the newer publishable key. Never expose the secret key or legacy `service_role` key in browser code.

## 3. Create `.env.local`

Create `.env.local` in:

```text
C:\Users\HomePC\Downloads\Erna Saas
```

Add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://uwebxmccflvijepbvqlj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
```

The app also accepts the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name for existing deployments, but new environments should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Rules:

- Do not add quotes.
- Do not add spaces around `=`.
- Do not commit `.env.local`.
- Restart the development server after changing it.

## 4. Apply the Erna migration

The migration is located at:

```text
supabase/migrations/202608100001_phase_1_auth.sql
```

It creates:

- `profiles`
- `referrals`
- Referral-code generation and validation
- Automatic profile creation after signup
- Row-Level Security policies

### Recommended CLI method

Open PowerShell in the project directory and run:

```powershell
npx.cmd supabase login
```

Find the project reference in the project URL. For `https://abcdefghijk.supabase.co`, the reference is `abcdefghijk`.

Link the repository:

```powershell
npx.cmd supabase link --project-ref uwebxmccflvijepbvqlj
```

Enter the database password when prompted, then push the migration:

```powershell
npx.cmd supabase db push
```

Confirm application of `202608100001_phase_1_auth.sql`.

### SQL Editor alternative

If the CLI cannot be used:

1. Open **SQL Editor** in Supabase.
2. Create a new query.
3. Open `supabase/migrations/202608100001_phase_1_auth.sql` locally.
4. Copy its complete contents into the editor.
5. Click **Run**.

The CLI method is preferable because it records migration history.

## 5. Verify the migration

Open **Table Editor** and confirm these tables exist:

```text
profiles
referrals
```

Check that RLS is enabled for both tables. Authentication accounts are shown under **Authentication > Users**, not as a normal public table.

## 6. Configure authentication URLs

Open **Authentication > URL Configuration**.

During local development, set Site URL to:

```text
http://localhost:3000
```

Add these Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
http://localhost:3000/app
```

If using port 3005, also add:

```text
http://localhost:3005/auth/callback
http://localhost:3005/reset-password
http://localhost:3005/app
```

After production deployment, change the Site URL to the production origin, for example:

```text
https://erna.ng
```

Add:

```text
https://erna.ng/auth/callback
https://erna.ng/reset-password
https://erna.ng/app
```

Keep localhost URLs for development.

## 7. Enable email and password authentication

Open **Authentication > Sign In / Providers > Email**.

Enable:

- Email provider
- Email signup
- Confirm email

Keep anonymous signup disabled.

## 8. Configure the signup OTP email

Open **Authentication > Email Templates > Confirm signup**.

The Erna verification page expects a six-digit code, so the template must contain `{{ .Token }}`.

Suggested subject:

```text
{{ .Token }} is your Erna verification code
```

Suggested HTML:

```html
<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#f3f6f4;font-family:Arial,sans-serif;color:#101713">
    <div style="max-width:520px;margin:0 auto;padding:32px;border-radius:18px;background:#ffffff">
      <h1 style="margin:0 0 16px;color:#07371f">Verify your Erna account</h1>
      <p style="line-height:1.6;color:#455149">Enter this verification code on Erna:</p>
      <div style="margin:24px 0;padding:18px;border-radius:12px;background:#effcf3;color:#116c36;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center">
        {{ .Token }}
      </div>
      <p style="font-size:13px;line-height:1.6;color:#6d7972">If you did not create an Erna account, ignore this message.</p>
    </div>
  </body>
</html>
```

## 9. Configure the recovery email

Open **Authentication > Email Templates > Reset password**.

Suggested subject:

```text
Reset your Erna password
```

Suggested HTML:

```html
<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#f3f6f4;font-family:Arial,sans-serif;color:#101713">
    <div style="max-width:520px;margin:0 auto;padding:32px;border-radius:18px;background:#ffffff">
      <h1 style="margin:0 0 16px;color:#07371f">Reset your Erna password</h1>
      <p style="line-height:1.6;color:#455149">Use the button below to choose a new password.</p>
      <p style="margin:28px 0">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#116c36;color:#ffffff;font-weight:700;text-decoration:none">Reset password</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#6d7972">If you did not request this reset, ignore this message.</p>
    </div>
  </body>
</html>
```

Do not replace `{{ .ConfirmationURL }}` with a manually constructed URL.

## 10. Configure production email delivery

Supabase's built-in sender is for limited testing and may only deliver to members of your Supabase organization. Configure custom SMTP before accepting real users.

Supported options include Resend, Postmark, SendGrid, AWS SES, Brevo, and ZeptoMail.

### Example with Resend

1. Create a Resend account.
2. Add and verify a sending domain such as `auth.erna.ng`.
3. Add the provided DNS records.
4. Create an SMTP/API credential.
5. In Supabase, open **Authentication > Email > SMTP Settings**.
6. Enable custom SMTP.
7. Enter the settings supplied by Resend. Typical values are:

```text
Host: smtp.resend.com
Port: 465 or 587
Username: resend
Password: Resend API key
Sender email: no-reply@auth.erna.ng
Sender name: Erna
```

Use the exact values from the provider dashboard. Configure SPF, DKIM, and DMARC. Disable email link tracking if it modifies authentication links.

## 11. Configure Google OAuth

### In Supabase

Open **Authentication > Sign In / Providers > Google**. Copy the callback URL shown there. It looks like:

```text
https://uwebxmccflvijepbvqlj.supabase.co/auth/v1/callback
```

### In Google Cloud

1. Open https://console.cloud.google.com/.
2. Create a project named `Erna Authentication`.
3. Open **Google Auth Platform**.
4. Configure branding:
   - App name: `Erna`
   - User support email: your support email
   - App logo: official Erna logo
   - Developer contact email: your email
5. Choose an external audience for public users.
6. During testing, add your Gmail address as a test user.
7. Request only `openid`, `email`, and `profile` scopes.
8. Open **Clients** and create a **Web application** client named `Erna Web`.

Authorized JavaScript origins:

```text
http://localhost:3000
https://erna.ng
```

Authorized redirect URI:

```text
https://uwebxmccflvijepbvqlj.supabase.co/auth/v1/callback
```

Google must redirect to Supabase, not directly to Erna's `/auth/callback` route.

Copy the Google Client ID and Client Secret. Return to **Supabase > Authentication > Sign In / Providers > Google**, enter them, enable Google, and save.

The complete flow is:

```text
Erna -> Google -> Supabase callback -> Erna /auth/callback -> /app
```

## 12. Configure phone authentication

The Erna app converts `08012345678` to `+2348012345678`.

Open **Authentication > Sign In / Providers > Phone** and enable phone authentication. An SMS provider is required. Supported options include Twilio, MessageBird, Vonage, and TextLocal.

For Twilio, obtain:

- Account SID
- Auth token
- Messaging Service SID

Enter them into Supabase's Phone provider settings. Confirm Nigerian delivery is enabled and that the Twilio account has sufficient balance.

Use an SMS template such as:

```text
Your Erna verification code is {{ .Code }}
```

Keep phone confirmation enabled.

## 13. Review rate limits and abuse protection

Open **Authentication > Rate Limits** and review:

- Signup confirmations
- Password resets
- Email OTPs
- SMS OTPs
- OTP verification attempts
- Token refreshes

Do not raise limits excessively. Public authentication endpoints can be abused to spend SMS credit or damage email reputation.

The frontend hCaptcha integration is already included for signup, login, password reset, phone OTP requests, and OTP resends. To activate it, add the public site key to every deployment environment:

```env
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-hcaptcha-site-key
```

Then enable hCaptcha in **Authentication > Bot and Abuse Protection** using the matching secret key. Add the site key first; enabling CAPTCHA in Supabase before the frontend environment variable is deployed will block authentication requests.

## 14. Start the application

Run:

```powershell
cd "C:\Users\HomePC\Downloads\Erna Saas"
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Important routes:

```text
/signup
/verify
/login
/forgot-password
/reset-password
/app
```

## 15. Test email signup

1. Open `/signup`.
2. Select Email.
3. Enter name, email, password, and optionally a referral code.
4. Create the account.
5. Copy the six-digit code from the email.
6. Enter it on `/verify`.
7. Confirm the app redirects to `/app`.

Check **Authentication > Users** and **Table Editor > profiles**. The UUIDs should match and the profile should have a generated eight-character referral code.

## 16. Test referral capture

1. Copy the first user's `referral_code` from `profiles`.
2. Log out or use a private window.
3. Create a second account using that code.
4. Check the second profile's `referred_by` value.
5. Check the `referrals` table.

Expected referral row:

```text
referrer_id: first user
referred_id: second user
bonus_paid: false
```

The referral bonus is not paid at signup. It is paid only after the referred user completes their first approved task.

## 17. Test login and protected routes

1. Log out.
2. Open `/login`.
3. Enter correct credentials.
4. Confirm redirect to `/app`.
5. Test a wrong password and confirm login fails.
6. While logged out, open `/app` and confirm redirect to `/login?next=%2Fapp`.
7. While logged in, open `/login` and confirm redirect to `/app`.

## 18. Test Google login

1. Open `/login`.
2. Click **Continue with Google**.
3. Select the configured Google test account.
4. Complete consent.
5. Confirm redirect to `/app`.
6. Check both **Authentication > Users** and `profiles`.

For `redirect_uri_mismatch`, verify Google's authorized redirect URI exactly matches:

```text
https://uwebxmccflvijepbvqlj.supabase.co/auth/v1/callback
```

## 19. Test password recovery

### Email

1. Open `/forgot-password`.
2. Select Email and submit a verified email.
3. Click the recovery link.
4. Confirm it passes through `/auth/callback` and reaches `/reset-password`.
5. Save a new password.
6. Confirm the old password fails and the new password works.

### Phone

1. Select Phone on `/forgot-password`.
2. Submit the phone number.
3. Enter the SMS code.
4. Set the new password on `/reset-password`.

## 20. Useful database checks

Run these in the SQL Editor.

Count auth users:

```sql
select count(*) as auth_users from auth.users;
```

Count profiles:

```sql
select count(*) as profiles from public.profiles;
```

Find accounts missing profiles:

```sql
select u.id, u.email, u.phone, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

Expected result: zero rows.

Inspect referrals:

```sql
select
  r.created_at,
  referrer.full_name as referrer,
  referred.full_name as referred,
  r.bonus_paid
from public.referrals r
join public.profiles referrer on referrer.id = r.referrer_id
join public.profiles referred on referred.id = r.referred_id
order by r.created_at desc;
```

Confirm RLS:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'referrals');
```

Both rows should have `rowsecurity = true`.

## 21. Deploy environment variables

In Vercel or the chosen host, add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://uwebxmccflvijepbvqlj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_SUPPORT_EMAIL=support@erna.ng
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-public-hcaptcha-sitekey
```

Apply them to Production, Preview, and Development environments, then redeploy. Never place a Supabase secret key in a `NEXT_PUBLIC_` variable.

## 22. Production checklist

- Migration applied successfully
- `profiles` and `referrals` exist
- RLS enabled on every public table
- Only publishable key exposed to the browser
- Email and phone confirmation enabled
- Signup template includes `{{ .Token }}`
- Recovery template includes `{{ .ConfirmationURL }}`
- Custom SMTP configured
- SPF, DKIM, and DMARC configured
- SMS provider funded and tested with Nigerian numbers
- Google OAuth client configured
- Production URLs added to Supabase
- Auth rate limits reviewed
- CAPTCHA integrated before enabling it
- Logged-out `/app` requests redirect to login
- Signup creates a matching profile
- Invalid referral codes are rejected
- Referral signup does not immediately pay a bonus
- Email and phone password recovery tested
- Google signup creates an auth user and profile
- Supabase Auth logs and provider delivery logs monitored

Once every item passes, Phase 1 Supabase authentication is connected and ready for controlled testing.

## 23. Manual completion runbook for `erna-web`

Use this section to finish the items that require your accounts, credentials, domain ownership, production host, inbox, phone, or Google consent. Complete the sections in order. Do not enable a provider in Supabase until its frontend environment and provider credentials are ready.

Current linked project details:

```text
Project name: erna-web
Project reference: uwebxmccflvijepbvqlj
Project URL: https://uwebxmccflvijepbvqlj.supabase.co
Google callback URL: https://uwebxmccflvijepbvqlj.supabase.co/auth/v1/callback
```

Never paste database passwords, SMTP passwords, Google Client Secrets, Twilio Auth Tokens, hCaptcha Secret keys, Supabase secret keys, or `service_role` keys into this file, Git, chat messages, screenshots, or `NEXT_PUBLIC_` variables.

### 23.1 Decide the production domain and support address

You need the final public origin before completing production URLs, OAuth, CAPTCHA hostnames, and deployment.

1. Decide the canonical production origin. Use one origin consistently, for example `https://erna.ng` or `https://www.erna.ng`.
2. Configure the other hostname to redirect permanently to the canonical origin at your hosting or DNS provider.
3. Create or choose a monitored support mailbox, for example `support@erna.ng`.
4. Decide whether replies to Auth emails should go to the support mailbox. A `no-reply` sender may still need a monitored reply path or clear support link.
5. Edit `.env.local` and replace the current support placeholder:

```env
NEXT_PUBLIC_SUPPORT_EMAIL=support@erna.ng
```

6. Restart `npm.cmd run dev` after editing `.env.local`.
7. Open `/contact` and confirm that the visible support destination is the address you control.

Completion evidence:

- The production hostname loads over HTTPS.
- The support mailbox can receive a message and is monitored.
- `.env.local` contains no placeholder address such as `support@example.com`.

### 23.2 Configure Supabase Auth URLs

Supabase only redirects to URLs on the Auth allow list. The Site URL is the default when the application does not pass a redirect explicitly. See the [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

1. Sign in at `https://supabase.com/dashboard`.
2. Open the `erna-web` project.
3. Open **Authentication > URL Configuration**. If the sidebar wording changes, search the project settings for **Site URL**.
4. While only testing locally, set **Site URL** to:

```text
http://localhost:3000
```

5. Add these exact local Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
http://localhost:3000/app
```

6. If you actually run the app on port `3005`, add the three equivalent `http://localhost:3005/...` URLs. Do not add unused ports.
7. After production deployment works, change **Site URL** to the canonical production origin, without a trailing path. Example:

```text
https://erna.ng
```

8. Add these production Redirect URLs, replacing `https://erna.ng` if the canonical origin is different:

```text
https://erna.ng/auth/callback
https://erna.ng/reset-password
https://erna.ng/app
```

9. Keep the localhost URLs only if ongoing local OAuth and recovery testing is required.
10. Save, reload the page, and confirm every entry was persisted with the correct scheme, hostname, port, and path.

Do not add `*` or `**` wildcards for the production domain unless preview deployments genuinely require them. A narrow allow list is easier to audit.

### 23.3 Configure a sending domain and custom SMTP with Resend

Supabase's default sender is not a production email service. It normally only sends to project-team addresses and is heavily rate-limited. Supabase recommends custom SMTP for production. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction), and [Resend SMTP credentials](https://resend.com/docs/send-with-smtp).

The steps below use Resend. If you choose Postmark, SES, SendGrid, Brevo, or ZeptoMail, use that provider's exact host, port, username, password, and DNS records instead.

#### A. Verify the sending domain

1. Create or sign in to a Resend account.
2. Open **Domains** and add a dedicated Auth subdomain, preferably:

```text
auth.erna.ng
```

3. Resend will show DNS records for the subdomain. Open the DNS manager for `erna.ng` and copy every record exactly:
   - SPF/Return-Path records
   - DKIM record
   - Any provider-required verification record
4. Do not create a second SPF TXT record at the same hostname if one already exists. Merge authorized senders into a single valid SPF record or follow the DNS/provider guidance.
5. Add a DMARC TXT record for the organizational domain if one does not exist. Start with a monitoring policy while validating reports; move to an enforcement policy only after all legitimate senders align.
6. Return to Resend and click **Verify DNS Records**.
7. Wait until the sending capability reports **Verified**. DNS propagation can take time; repeatedly changing correct records usually delays diagnosis.
8. Disable click/open tracking for Auth mail if it rewrites links. Supabase warns that rewritten single-use recovery links may fail.

#### B. Create the SMTP credential

1. In Resend, open **API Keys** and create a key dedicated to Supabase Auth, for example `erna-supabase-auth`.
2. Give it only the sending permission and domain scope required for Auth mail when Resend offers those restrictions.
3. Copy the key once and store it in a password manager. It becomes the SMTP password.
4. Use these Resend SMTP values:

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: the dedicated Resend API key
Sender email: no-reply@auth.erna.ng
Sender name: Erna
```

Port `465` uses implicit TLS. Port `587` uses STARTTLS and is an acceptable alternative if the dashboard/provider requires it.

#### C. Enter SMTP settings in Supabase

1. In `erna-web`, open **Authentication > Email** or **Authentication > SMTP Settings**.
2. Enable **Custom SMTP**.
3. Enter the values above. Paste the API key only into the SMTP password field.
4. Keep the Email provider enabled.
5. Keep email signup enabled.
6. Keep email confirmation enabled. Do not enable automatic email confirmation.
7. Save.
8. Reopen the settings and confirm custom SMTP remains enabled. Password fields may appear masked or empty after saving; do not overwrite a stored password with a blank value.

Completion evidence:

- Resend domain status is verified for sending.
- Supabase shows custom SMTP enabled.
- A signup email sent to a non-team test address appears in Resend's email activity.
- The received message passes SPF and DKIM; DMARC should also pass once configured and aligned.

### 23.4 Apply the Auth email templates

For hosted projects, edit templates in the Supabase dashboard. `{{ .Token }}` is the six-digit signup OTP used by Erna's `/verify` page. `{{ .ConfirmationURL }}` is the complete single-use recovery link. See [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

New free-tier projects using Supabase's default SMTP cannot customize Auth templates. If editing is unavailable, complete custom SMTP first.

#### Confirm signup

1. Open **Authentication > Email Templates**.
2. Select **Confirm signup**.
3. Set the subject to:

```text
{{ .Token }} is your Erna verification code
```

4. Paste the complete Confirm signup HTML from section 8.
5. Confirm the HTML contains `{{ .Token }}` exactly, including capitalization and spaces inside the braces.
6. Save.

#### Reset password

1. Select **Reset password** or **Recovery**.
2. Set the subject to:

```text
Reset your Erna password
```

3. Paste the complete recovery HTML from section 9.
4. Confirm the button `href` is exactly `{{ .ConfirmationURL }}`.
5. Save.

#### Template test

1. Create a temporary email account you can receive mail at.
2. Submit `/signup` using that address.
3. Confirm the subject contains a six-digit token and the body displays the same token.
4. Verify the token at `/verify`.
5. Submit `/forgot-password` for the verified account.
6. Confirm the recovery button points first to the Supabase project's `/auth/v1/verify` endpoint and includes an encoded redirect back to an allowed Erna URL.
7. Click it once and complete password reset. Single-use links should not be expected to work twice.
8. Check Resend delivery activity and Supabase Auth logs for any failure.

### 23.5 Configure Google OAuth

Google OAuth requires a Google Cloud project, consent configuration, and a Web application OAuth client. Supabase's hosted callback is the Google redirect URI; Erna's `/auth/callback` belongs in Supabase's own redirect allow list. See [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google).

#### A. Configure Google Auth Platform

1. Sign in at `https://console.cloud.google.com/` using the Google account that should own Erna's OAuth configuration.
2. Create or select a project named `Erna Authentication`.
3. Open **Google Auth Platform**.
4. Under **Branding**, configure:
   - App name: `Erna`
   - User support email: the monitored support address
   - App logo: the official Erna logo
   - Authorized domain: the verified production domain
   - Developer contact email: an actively monitored owner/admin address
5. Under **Audience**, choose **External** for a public consumer application.
6. Keep the app in **Testing** until the flow passes end to end.
7. Add the Gmail accounts used for testing as test users.
8. Under **Data Access**, request only:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
9. Do not request Drive, Gmail, Calendar, or other sensitive scopes for basic sign-in.

#### B. Create the OAuth client

1. Under **Clients**, click **Create client**.
2. Choose **Web application**.
3. Name it `Erna Web`.
4. Add the local JavaScript origin while testing:

```text
http://localhost:3000
```

5. Add the canonical production origin after it is live:

```text
https://erna.ng
```

6. Under **Authorized redirect URIs**, add exactly:

```text
https://uwebxmccflvijepbvqlj.supabase.co/auth/v1/callback
```

7. Do not add `https://erna.ng/auth/callback` as Google's redirect URI. Google returns to Supabase first.
8. Create the client.
9. Copy the Client ID and Client Secret into a password manager. Never put the secret in `.env.local` or any `NEXT_PUBLIC_` variable.

#### C. Enable Google in Supabase

1. In `erna-web`, open **Authentication > Sign In / Providers > Google**.
2. Paste the Google Client ID and Client Secret.
3. Enable Google.
4. Leave nonce checks enabled unless a documented platform-specific reason requires otherwise.
5. Save.
6. Open the page again and confirm Google remains enabled.

#### D. Test Google

1. Use a private browser window and open `/login`.
2. Click **Continue with Google**.
3. Select a configured Google test user and approve the three basic scopes.
4. Confirm the browser returns through Supabase and then `/auth/callback`, finally landing on `/app`.
5. In Supabase, confirm one user exists under **Authentication > Users**.
6. In **Table Editor > profiles**, confirm a profile with the same UUID exists.
7. Log out and repeat Google login. It should reuse the same account rather than create a duplicate profile.
8. If Google reports `redirect_uri_mismatch`, compare the error URI character-for-character with the Supabase callback above, including `https`, project reference, and `/auth/v1/callback`.

Before public launch, change the Google app from Testing to Production as appropriate. Google brand verification can take time, so start that process before the launch date.

### 23.6 Configure Twilio SMS and Phone Auth

Phone Auth currently remains disabled because it needs funded provider credentials. Supabase supports Twilio and other providers. The steps below use Twilio. See [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login?showSmsProvider=Twilio) and [Twilio SMS Geo Permissions](https://www.twilio.com/docs/messaging/guides/sms-geo-permissions).

#### A. Prepare Twilio

1. Create or sign in to a Twilio account.
2. Complete account verification and billing setup. Trial accounts may only deliver to verified recipient numbers.
3. In Twilio Console, open **Messaging > Services** and create a Messaging Service named `Erna Auth`.
4. Add a sender that supports SMS delivery to Nigeria. Sender availability, registration, and display behavior vary by country; follow Twilio's current Nigeria guidelines.
5. Copy and securely store:
   - Account SID
   - Auth Token
   - Messaging Service SID
6. Open **Messaging > Settings > Geo Permissions**.
7. Enable Nigeria and disable destinations Erna does not serve. Only Twilio account owners/admins can change this setting.
8. Save Geo Permissions.
9. Configure a conservative Twilio usage trigger or spend alert so unexpected SMS traffic is detected quickly.
10. Fund enough balance for controlled testing without placing a large unrestricted balance in the account.

#### B. Enable Phone Auth in Supabase

1. In `erna-web`, open **Authentication > Sign In / Providers > Phone**.
2. Select Twilio as the SMS provider.
3. Enter the Account SID, Auth Token, and Messaging Service SID in their matching fields.
4. Set the SMS template to:

```text
Your Erna verification code is {{ .Code }}
```

5. Enable Phone Auth and phone confirmation.
6. Save.
7. Reopen the page and confirm Phone is enabled.

#### C. Test Nigerian delivery

1. Use a real Nigerian mobile number you control. Never use another person's number without permission.
2. On `/signup`, select Phone and enter the local format, for example `08012345678`. Erna converts it to `+2348012345678`.
3. Confirm an SMS arrives and contains a six-digit code.
4. Enter the code at `/verify` and confirm `/app` opens.
5. Check **Authentication > Users** and `profiles`; their UUIDs must match.
6. Log out and test phone/password login.
7. Test `/forgot-password` with the phone number, verify the SMS code, set a new password, and confirm the old password fails.
8. In Twilio, inspect the message log for `delivered`. If it fails, record the Twilio error code before changing settings.

### 23.7 Activate hCaptcha safely

The frontend hCaptcha integration is already present. Do not enable CAPTCHA in Supabase until the public site key is deployed; otherwise signup, login, password reset, and OTP requests will fail. See [Supabase CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha).

1. Create or sign in to an hCaptcha account at `https://dashboard.hcaptcha.com/`.
2. Create a site for Erna.
3. Add the canonical production hostname, for example `erna.ng`. Add `www.erna.ng` only if it directly serves the app rather than redirecting.
4. Copy the **Sitekey** and **Secret** separately.
5. Put the Sitekey in `.env.local`:

```env
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-public-sitekey
```

6. Add the same variable to the production host's Production, Preview, and Development environments as appropriate.
7. Restart local development and create a fresh deployment. Confirm the hCaptcha widget appears on signup, login, and password-reset forms.
8. Confirm solving the widget enables the submit button. Also check the resend control on `/verify`.
9. Only after that deployment is live, open `erna-web` in Supabase.
10. Open **Authentication > Bot and Abuse Protection**.
11. Enable CAPTCHA protection, choose **hCaptcha**, and paste the hCaptcha Secret—not the Sitekey.
12. Save.
13. Immediately test successful signup and a failed submission without completing hCaptcha.
14. If Auth becomes unusable, disable CAPTCHA in Supabase first, fix the frontend/site hostname configuration, deploy, and then re-enable it.

The Sitekey is public by design. The Secret must never be exposed in frontend code or a `NEXT_PUBLIC_` variable.

### 23.8 Review Auth rate limits and provider budgets

Supabase exposes Auth limits under **Authentication > Rate Limits**. Defaults can change, and custom SMTP is required before increasing the email limit. See the [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

1. Open **Authentication > Rate Limits**.
2. Record the current values and date in the project's private operations notes.
3. Review at least:
   - Total email sends per hour
   - Signup confirmation cooldown
   - Password recovery cooldown
   - OTP/magic-link sends per hour
   - SMS sends per hour
   - SMS cooldown
   - OTP verification attempts
   - Token refresh limits
4. During controlled testing, keep defaults unless they block a realistic test.
5. Do not increase email limits above the verified SMTP provider's safe throughput.
6. Do not increase SMS limits without CAPTCHA, Twilio Geo Permissions, a spend alert, and a tested incident response.
7. Test the resend cooldown once. Repeated clicks should not send unlimited email or SMS.
8. Check Supabase Auth logs for `429` responses and Twilio/Resend activity for unexpected volume.
9. Increase one limit at a time only when observed legitimate traffic requires it. Record the old value, new value, reason, approver, and date.

### 23.9 Configure deployment environment variables

No production host is linked in this workspace yet. The following uses Vercel because the app is Next.js; equivalent settings may be used on another host. Vercel applies changed environment variables only to new deployments. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

1. Create or open the Erna project in Vercel.
2. Connect the repository and confirm the framework is detected as Next.js.
3. Open **Project > Settings > Environment Variables**.
4. Add these values to **Production**, **Preview**, and **Development**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://uwebxmccflvijepbvqlj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=copy-the-sb_publishable-value-from-.env.local
NEXT_PUBLIC_SUPPORT_EMAIL=support@erna.ng
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-public-hcaptcha-sitekey
```

5. Replace the support email, hCaptcha Sitekey, and production-domain examples with the real values.
6. Do not add the database password, Supabase secret key, `service_role`, Google Client Secret, SMTP password, Twilio Auth Token, or hCaptcha Secret to frontend environment variables.
7. Trigger a new production deployment. Existing deployments do not receive newly changed variables.
8. Open the deployment and test `/`, `/signup`, `/login`, `/forgot-password`, `/reset-password`, and logged-out `/app`.
9. Add the final production domain in Vercel and wait for HTTPS provisioning.
10. Return to sections 23.2, 23.5, and 23.7 and verify the exact production hostname is present in Supabase redirects, Google origins, and hCaptcha hostnames.

### 23.10 Run the final end-to-end acceptance test

Use two email inboxes, one Google test user, and one Nigerian phone number you control. Record the test date and results without recording passwords, OTPs, recovery links, access tokens, or provider secrets.

#### Email account A

1. Sign up with no referral code.
2. Receive and verify the six-digit signup OTP.
3. Confirm redirect to `/app`.
4. Copy account A's referral code from its profile.
5. Log out and confirm `/app` redirects to `/login?next=%2Fapp`.
6. Confirm a wrong password fails and the correct password succeeds.

#### Email account B and referral

1. In a private window, sign up account B using account A's referral code.
2. Verify account B's OTP.
3. In Supabase, confirm B's `referred_by` equals A's profile ID.
4. Confirm exactly one referral row links A to B.
5. Confirm `bonus_paid = false`.
6. Attempt one signup with an invalid referral code and confirm the account is rejected and no orphan profile is created.

#### Google

1. Sign in with the configured Google test user.
2. Confirm `/app` opens.
3. Confirm the Auth user and profile UUIDs match.
4. Sign out and repeat Google login to confirm no duplicate profile is created.

#### Email recovery

1. Request recovery for verified account A.
2. Open the received recovery link.
3. Confirm the browser passes through `/auth/callback` to `/reset-password`.
4. Save a new password.
5. Confirm the old password fails and the new password succeeds.

#### Phone and phone recovery

1. Sign up with the controlled Nigerian phone number.
2. Verify the SMS code and confirm the profile exists.
3. Log out and test phone/password login.
4. Request phone recovery, verify the SMS code, and set a new password.
5. Confirm the old password fails and the new password succeeds.

#### Database integrity checks

Run the section 20 SQL checks after all acceptance tests:

- `auth_users` count equals the number of intentionally created Auth accounts.
- `missing_profiles` returns zero rows.
- Both public tables have RLS enabled.
- Referral rows match the expected direct referrals only.
- No invalid-referral test account exists.

### 23.11 Monitor logs during and after testing

Supabase automatically records Auth audit events such as signup, login, verification, logout, and password reset. See [Supabase Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs) and [Supabase Logs Explorer](https://supabase.com/docs/guides/telemetry/logs).

1. In `erna-web`, open **Authentication > Audit Logs** and confirm the expected signup, login, logout, verification, and recovery events are present.
2. Open **Logs Explorer** and select `auth_logs`.
3. Set a narrow time window covering the test.
4. Filter for failures, `4xx`, `5xx`, `429`, `captcha_failed`, invalid redirect, provider, SMTP, or SMS errors.
5. Correlate the timestamp with Resend email activity or Twilio message logs.
6. Do not copy OTPs, recovery URLs, access tokens, or full personal data into tickets or shared notes.
7. Confirm successful Resend delivery events and Twilio `delivered` status for the intended recipients.
8. Investigate repeated failures from one IP, repeated OTP requests, unusual countries, or unexpected SMS spending before public launch.
9. Repeat this review daily during controlled testing and establish alerts at the SMTP/SMS providers for bounces, complaints, and spend.

### 23.12 Final sign-off checklist

Mark an item only after observing its completion evidence:

- [ ] Canonical production domain is live over HTTPS.
- [ ] Monitored support mailbox is configured locally and in hosting.
- [ ] Supabase Site URL and redirect allow list match local and production origins.
- [ ] Resend sending domain is verified; SPF, DKIM, and DMARC pass.
- [ ] Supabase custom SMTP is enabled and delivers outside the project team.
- [ ] Confirm signup template sends `{{ .Token }}` as a usable six-digit OTP.
- [ ] Recovery template uses an unmodified `{{ .ConfirmationURL }}`.
- [ ] Google OAuth is enabled and passes the full callback flow.
- [ ] Twilio is funded, Nigeria Geo Permission is enabled, and Phone Auth delivers.
- [ ] hCaptcha Sitekey is deployed before Supabase CAPTCHA is enabled.
- [ ] Rate limits and provider spend controls have been reviewed and recorded.
- [ ] Production, Preview, and Development environments contain all four public variables.
- [ ] Email, referral, login, Google, email recovery, phone, and phone recovery tests pass.
- [ ] `auth.users` and `profiles` have matching UUIDs with no missing profiles.
- [ ] Invalid referral signup is rejected and referral bonus remains unpaid at signup.
- [ ] Supabase, Resend, and Twilio logs show expected delivery with no unexplained errors.

When every box is checked, rerun:

```powershell
npx.cmd supabase migration list --linked
npx.cmd supabase db advisors --linked --type security --level warn --fail-on warn
npx.cmd supabase db advisors --linked --type performance --level warn --fail-on warn
npm.cmd run build
```

All commands must succeed before Phase 1 production sign-off.

## 24. External keys and production endpoints (manual, required)

The app is intentionally safe when these credentials are absent: it renders the product but will not perform live funding, transfers, messaging, ads, or subscription billing. Never add secret values to source control. Put them in `.env.local` for local development and in the hosting provider's encrypted environment-variable settings for Production and Preview.

### 24.1 Required environment variables

Add this exact shape to `.env.local`; replace every placeholder locally:

```dotenv
# Public Supabase browser configuration
NEXT_PUBLIC_SUPABASE_URL=https://uwebxmccflvijepbvqlj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Server only: Supabase Project Settings > API Keys > Secret key
SUPABASE_SECRET_KEY=your_sb_secret_key

# Server only: Paystack Dashboard > Settings > API Keys & Webhooks
PAYSTACK_SECRET_KEY=sk_test_replace_then_sk_live_at_launch
PAYSTACK_PLUS_PLAN_CODE=PLN_replace_with_monthly_plus_plan
PAYSTACK_PRO_PLAN_CODE=PLN_replace_with_monthly_pro_plan

# Exact public origin; no trailing slash
NEXT_PUBLIC_APP_URL=https://your-production-domain.example

# Already used by authentication forms
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-production-domain.example

# Add when transactional application email is enabled
RESEND_API_KEY=re_replace
RESEND_FROM_EMAIL=Erna <notifications@your-production-domain.example>
CRON_SECRET=generate_a_long_random_secret

# Add after AdSense approval and placement creation
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-your-publisher-id
NEXT_PUBLIC_AD_TASK_FEED_SLOT=your_slot_id
NEXT_PUBLIC_AD_WALLET_SLOT=your_slot_id
NEXT_PUBLIC_AD_MARKETPLACE_SLOT=your_slot_id
```

Rules:

1. Variables beginning with `NEXT_PUBLIC_` are shipped to browsers and must never contain a secret.
2. `SUPABASE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, and `RESEND_API_KEY` are server-only.
3. Use Paystack test credentials and test plan codes until every test below passes. Move all three values to the matching live integration together.
4. Rotate any secret immediately if it is pasted into chat, committed, or shown in a screenshot.

### 24.2 Paystack setup, step by step

1. Sign in to the Paystack dashboard and complete business verification. Live transfers are unavailable until Paystack approves the business and settlements/bank details are configured.
2. Open **Settings > API Keys & Webhooks**.
3. Copy the test public and secret keys into local environment variables above.
4. In the **Webhook URL** field enter the production endpoint exactly:

   ```text
   https://YOUR-DOMAIN/api/paystack/webhook
   ```

5. The implemented callback URL is generated from `NEXT_PUBLIC_APP_URL`:

   ```text
   https://YOUR-DOMAIN/app?payment=callback
   ```

6. Do not credit a wallet from the callback page. The server endpoint verifies Paystack's `x-paystack-signature` with HMAC-SHA512 and the database uses the unique Paystack reference to make credits idempotent.
7. Send a test payment through the funding initializer and confirm the webhook responds HTTP 200, `payment_intents.status` becomes `paid`, exactly one `wallet_transactions` row exists, and the wallet increases exactly once.
8. In Paystack, configure Transfers and create transfer recipients only from server routes. Confirm recipient name against the resolved account name before storing the recipient code.
9. Enable Paystack subscriptions/plans after defining the ₦500 Plus and ₦1,000 Pro billing plans. Record the resulting Paystack plan codes in hosting secrets when subscription endpoints are activated.
10. Replace test keys with live keys only after business approval, test funding, duplicate-webhook testing, failed-payment testing, and transfer testing pass.

Implemented Paystack endpoints:

| Method | Erna endpoint | Purpose | Secret required |
|---|---|---|---|
| `POST` | `/api/paystack/initialize` | Authenticated wallet funding initialization | `PAYSTACK_SECRET_KEY` |
| `POST` | `/api/paystack/webhook` | Signed charge event verification and idempotent wallet credit | `PAYSTACK_SECRET_KEY`, `SUPABASE_SECRET_KEY` |

Paystack upstream endpoints called by Erna:

| Paystack endpoint | Use |
|---|---|
| `POST https://api.paystack.co/transaction/initialize` | Create hosted card/bank/USSD funding checkout |
| `GET https://api.paystack.co/transaction/verify/:reference` | Recommended reconciliation check for pending payments |
| `GET https://api.paystack.co/bank/resolve` | Resolve and confirm a Nigerian bank account |
| `POST https://api.paystack.co/transferrecipient` | Create a payout recipient server-side |
| `POST https://api.paystack.co/transfer` | Start an approved withdrawal |
| `POST https://api.paystack.co/plan` | Create Plus/Pro recurring billing plans if managed by API |
| `POST https://api.paystack.co/subscription` | Start a recurring subscription |

### 24.3 Supabase Storage and database checks

The migration created:

- Private `task-proofs` bucket: JPEG/PNG/WebP, maximum 5 MB, written only by the authenticated server route after decode/re-encode and metadata stripping.
- Public-readable `listing-images` bucket: JPEG/PNG/WebP, maximum 8 MB per source image, written only by the authenticated server route after sanitation.
- RLS on every product table.
- An immutable user-readable wallet ledger with no browser permission to edit balances.
- Atomic, service-only, idempotent funding credit function.

In **Storage**, verify both buckets exist. In **Table Editor**, verify `wallets`, `wallet_transactions`, `tasks`, `task_submissions`, `daily_questions`, `listings`, `subscriptions`, `notifications`, and `withdrawals` exist. Do not make task proofs public.

### 24.4 Admin access

Admin access is deliberately not self-service. After Abraham has signed up, run this once in Supabase SQL Editor, replacing the email:

```sql
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('YOUR-ADMIN-EMAIL');
```

Then sign out and back in and open:

```text
https://YOUR-DOMAIN/admin
```

Never add a browser button that can promote a user to admin.

### 24.5 Remaining provider and policy decisions

These cannot be safely invented in code and need your decision or provider account:

1. **Production domain:** buy/connect it, deploy over HTTPS, and replace every `YOUR-DOMAIN` value.
2. **Paystack business approval and payout bank account:** complete KYC/business review and accept the applicable pricing/transfer terms.
3. **Withdrawal minimum:** resolved by the master hardening requirement: `₦1,000` for the first withdrawal and `₦3,000` for every subsequent withdrawal. Plans change SLA, not the minimum.
4. **Withdrawal SLA:** Free is 48 hours, Plus is 36 hours, and Pro is 24 hours in server-owned state. Confirm operations can honor these published limits before launch.
5. **Marketplace transaction proof:** ratings require a credible completed-sale signal, but v1 uses WhatsApp off-platform. Decide whether ratings are honor-based or require seller/buyer confirmation.
6. **Ad network:** Google AdSense is integrated for web. Obtain an approved publisher ID and three web placement IDs; do not paste mobile AdMob IDs into the web variables.
7. **Rewarded ads:** define the reward and fraud rules before enabling them. The PRD says they are optional but does not define the bonus.
8. **Email:** verify a sending domain in Resend, then configure the from address and production email events.
9. **SMS/phone OTP:** fund Twilio, enable Nigerian delivery/geo permissions, and monitor spend as described earlier in this guide.
10. **Legal and compliance:** publish lawyer-reviewed Terms, Privacy Policy, task/content rules, marketplace disclaimer, refund/dispute policy, payout SLA, prohibited tasks, and KYC/AML thresholds before taking real money.
11. **Social-platform compliance:** engagement marketplaces can conflict with platform rules. Obtain legal/platform-policy review and restrict task types/targets accordingly before launch.
12. **Seed content:** add curated daily questions and permissioned seed tasks. Do not target accounts that did not consent.

### 24.6 Production acceptance checklist

- [ ] All environment variables exist in Production and Preview; secrets are server-only.
- [ ] Paystack test funding succeeds and duplicate webhooks do not double-credit.
- [ ] Invalid webhook signatures receive HTTP 401.
- [ ] Failed/abandoned charges never credit a wallet.
- [ ] Proof upload rejects wrong MIME type and files above 5 MB.
- [ ] A worker cannot see another worker's private proof.
- [ ] One worker cannot submit the same task twice.
- [ ] Concurrent final-slot submissions cannot exceed task quantity.
- [ ] Daily question stays locked until an approved task exists that day and rewards only once.
- [ ] First and subsequent withdrawal thresholds match the final business decisions.
- [ ] Subscription upsells remain hidden until `first_paid_withdrawal_at` is set.
- [ ] Free, Plus and Pro ad behavior is tested server-side.
- [ ] Admin route rejects non-admin users.
- [ ] Terms, privacy, dispute and prohibited-task policies are published.
- [ ] Security and performance advisors have no unexplained warnings.
- [ ] `npx.cmd tsc --noEmit` and `npm.cmd run build` both pass.
