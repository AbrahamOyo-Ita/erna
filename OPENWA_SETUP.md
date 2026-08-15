# Erna OpenWA deployment

Erna integrates with the MIT-licensed [rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA) gateway as a separate self-hosted service. It is not embedded in the Next.js process.

## Safety boundary

- `08162851706` is the dedicated Erna notification sender. Do not connect Erna's primary support or founder number.
- The channel is opt-in and limited to task approvals, task rejections, task reminders, new-task alerts and daily-question nudges.
- OTP, wallet funding, subscription, payment and withdrawal messages remain on Supabase Auth, email or a future official Meta WhatsApp Cloud API integration.
- OpenWA uses reverse-engineered WhatsApp clients and carries an account restriction or ban risk. Use opted-in recipients only, warm the number gradually and keep email fallback operational.

## Production setup

1. Deploy the official OpenWA Docker stack on an isolated host or private network. Pin and test a specific release before production rollout.
2. Choose the `whatsapp-web.js` engine for the lower stated ban-risk profile unless deployment memory makes that impossible.
3. Create one session for `08162851706`, scan the QR code and wait until the session reports ready.
4. Create a session-scoped operator API key. Erna does not need an admin key.
5. Configure a webhook for `message.sent`, `message.ack` and `message.failed` pointing to `https://YOUR_ERNA_DOMAIN/api/openwa/webhook`. Set a long independent HMAC secret.
6. Put the variables documented in `.env.example` into the production secret store. Keep `OPENWA_ENABLED=false` until the session, HTTPS and webhook test all pass.
7. Schedule `/api/cron/notification-fanout` periodically to create idempotent daily-question and advertiser-review reminders. Schedule `/api/cron/whatsapp-outbox` every minute to deliver queued messages. Both require `Authorization: Bearer $CRON_SECRET`.

OpenWA returning HTTP 201 means the gateway accepted a message, not that WhatsApp delivered it. Erna records delivery and read acknowledgements from signed webhooks.
