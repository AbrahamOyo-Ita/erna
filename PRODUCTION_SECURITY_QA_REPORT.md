# Erna Production Security and QA Report

Review date: 11 August 2026  
Linked Supabase project: `erna-web` (`uwebxmccflvijepbvqlj`)

## Release status

The repository, linked database, and rollback-only security suites are substantially hardened and currently pass their available automated gates. Production launch is **not approved yet** because the workspace does not contain the provider credentials, verified domains, production host, real inbox/phone destinations, or ad publisher IDs required to execute real Paystack, Resend, Auth-delivery, and advertising acceptance tests.

Phase 4 was intentionally not started. The master review requires Phases 1-3 to be genuinely complete first, including live provider and real-user delivery evidence.

## Phase 1 functional checklist

| Item | Implemented | Verified evidence | Remaining external evidence |
|---|---|---|---|
| Withdrawals / Paystack Transfers | Yes: account resolution, recipient creation, atomic balance reservation, admin review, transfer initiation/reconciliation, signed success/failure/reversal handling, refund idempotency, risk flags, SLA snapshot | Live database tests passed first `1000` and subsequent `3000` minimums, Plus 36-hour SLA, failure refund replay, and simultaneous double-spend rejection | A real Paystack test transfer has not run; `PAYSTACK_SECRET_KEY` and an approved transfer account are absent |
| Plus / Pro subscriptions | Yes: Paystack plan checkout, server plan state, renewals, cancellation-at-period-end, past-due state, server gates for ads/priority/SLA/referrals | Live database activation, renewal replay, cancellation, Plus SLA, Pro referral bonus; local server ad policy test | Real recurring charge/webhook cycle not run; Paystack plan codes and secret are absent |
| Proof submission | Yes: same-origin authenticated route, API and DB rate limits, server decode/re-encode, EXIF stripping, private bucket upload, atomic submission, manual or 10% spot-check workflow | Local malformed/oversize/MIME/metadata tests; live submission, priority gate, moderation and RLS tests | Actual Storage file upload through an authenticated real-user session not run; server secret and real login session are absent |
| Daily question | Yes: approved-task gate, database answer validation, atomic `20` credit, one answer per day, on-demand Lagos-date rollover from private reviewed templates | Live gate, correct credit, replay rejection, and current-question rollover passed | Real browser journey remains part of acceptance testing |
| Moderation and appeals | Yes: advertiser approve/reject, reason capture, one appeal, admin resolution, wallet credit, dispute and actor-attributed audit log | Full rejection -> appeal -> admin approval transaction passed live | Real signed-in admin browser journey remains unrun |
| Marketplace listing creation | Yes: 1-6 sanitized server uploads, persisted listing/image rows, WhatsApp contact, atomic funded boosts, public listing-detail destination | Local upload validation; live listing/boost transaction; cleanup-safe public Next route test returned 200 from linked data | Real multi-image upload and WhatsApp click with a real account remain unrun |
| Transactional email | Yes: Resend API with idempotency key, transactional templates, bearer-protected GET/POST cron endpoint, exponential retry, lease-based stale-claim recovery | Live enqueue, exclusive claim and crashed-worker reclaim tests passed | No Resend domain/key/from address is configured; no real email was delivered |
| Advertising integration | Yes: Google AdSense SDK component and server-computed exposure policy (Free all placements, Plus light placements, Pro none) | Local server policy test passed, including expired plan fallback | No AdSense client/slot IDs are configured; no real ad request or impression was verified |

## Phase 2 security findings

| Control | Result | Finding and fix |
|---|---|---|
| Wallet integrity | Pass | Atomic service-only functions, unique ledger references, row locks, and concurrent withdrawal test prevent client balance writes and double-spend |
| Database access control | Pass | Live audit found inherited broad Data API grants. Fixed by revoking all public-table writes from `anon`/`authenticated`, revoking anonymous private reads, and regranting only the exact public/owner read contract and safe column updates |
| Webhook validation and replay | Pass for code/database | Raw-body HMAC-SHA512 tests pass; signature-keyed provider claim and reference-keyed financial functions reject replay. Real Paystack webhook delivery is still untested |
| Authentication and sessions | Partial | Sensitive APIs, `/app`, and `/admin` validate the JWT session ID against `auth.sessions`; global logout is implemented; unsafe callback/router redirects were fixed and regression-tested. Supabase advisor still reports leaked-password protection disabled; real OTP lockout and post-logout browser reuse need provider/dashboard testing |
| Object authorization | Pass | Proof reads are scoped to worker, advertiser or admin; listing/task/submission mutations use server identity; live unrelated-user RLS tests pass |
| Role authorization | Pass | Admin routes call the active-session admin guard; privileged functions are not executable by `anon` or `authenticated`; live function privilege audit passed |
| Upload validation | Pass for code | JPEG/PNG/WebP decode, dimension bounds, size limits, WebP re-encode and metadata stripping are server-side. Direct Storage write policies and grants were removed |
| Rate limiting | Pass | Atomic database limiter plus route limits cover task submission, trivia, funding, withdrawals, subscription actions, moderation and bank lookup |
| Escrow integrity | Pass | Only atomic funded-task creation can publish a task; live test confirms balance-to-escrow movement. Priority visibility and submission now enforce the same plan boundary |

### Findings fixed during this continuation

1. Final hardening migration existed locally but had not been deployed.
2. Daily trivia had no question after launch day; added concurrency-safe daily rollover.
3. Plus/Pro incorrectly lowered the required subsequent withdrawal minimum; standardized it to `3000`.
4. Broad inherited Data API grants exposed unnecessary read/write capabilities; replaced them with least-privilege grants.
5. Protocol-relative and unsafe post-auth redirects were accepted; centralized strict internal-path validation.
6. `/app` and `/admin` did not validate the active database session at the point of sensitive data access; both now do.
7. Free users could bypass the priority window by submitting a known task UUID; the atomic RPC now repeats the plan check.
8. Subscription disable webhooks removed paid benefits immediately; cancellation now preserves benefits through period end.
9. Claimed email rows could remain in `sending` forever after a worker crash; claims now use a five-minute lease.
10. Listing boosts targeted a nonexistent public route; `/marketplace/[id]` now renders linked-project listing data.

## Phase 3 QA evidence

Verified with rollback-only linked-database tests:

- Funding reference idempotency and exact wallet credit.
- Funded task publication and escrow accounting.
- Free/Plus/Pro priority and monetary plan gates.
- Proof submission, rejection, appeal, admin resolution, audit trail and single worker credit.
- Daily question eligibility, `20` reward and replay prevention.
- First and subsequent withdrawal thresholds, SLA snapshot, failure refund replay and concurrent request safety.
- Subscription activation, renewal replay, cancellation and Pro referral bonus.
- Listing creation and funded boost.
- Transactional email enqueue and stale-claim recovery.
- Cross-user RLS isolation and privileged-function denial.

Verified against the local Next server:

- `/` returns 200.
- Logged-out `/app` redirects to `/login?next=%2Fapp`.
- Logged-out `/admin` is redirected away from admin data.
- Unauthenticated `/api/paystack/banks` returns 401.
- Malformed marketplace IDs return 404.
- A cleanup-safe listing created in the linked database rendered at `/marketplace/[id]` with HTTP 200 and was removed afterward.

Not yet verifiable in this workspace:

- Real email/phone OTP delivery, Google consent and recovery.
- Real Paystack funding, recurring billing, transfer, failure and reversal events.
- Real Resend delivery and provider logs.
- Real Supabase Storage uploads through browser sessions.
- Slow/interrupted-network and mid-flow session expiry through a connected browser.
- Real AdSense requests/impressions and consent behavior.
- Production-domain routing, HTTPS, cron scheduling and deployment environment variables.

## Automated gate results

- `npm.cmd run test`: 8/8 passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed on Next.js 16.3.0; 29 static pages generated and dynamic routes compiled.
- `tests/database/live_security.sql`: passed.
- `tests/database/live_phase1_features.sql`: passed.
- `tests/database/run_concurrency.ps1`: passed; exactly one competing withdrawal succeeded.
- `tests/database/run_marketplace_route.ps1`: passed; linked listing route returned 200 and cleanup ran.
- Supabase database lint: no schema errors.
- Local and remote migration histories match.
- Supabase advisor: one unresolved warning, `auth_leaked_password_protection`.

## Required owner/provider actions before sign-off

1. Connect a browser or open Supabase Dashboard and enable leaked-password protection; rerun the advisor.
2. Supply server-only `SUPABASE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, Paystack Plus/Pro plan codes, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` in a secure local/deployment environment.
3. Supply the production origin and configure the Paystack webhook URL.
4. Complete Paystack business/transfer approval and execute test-mode funding, subscription and transfer scenarios including replay, failure and reversal.
5. Verify a Resend domain and run real delivery tests.
6. Configure Supabase SMTP/templates, Google OAuth, Twilio Phone Auth, hCaptcha, Auth rate limits and real-user acceptance tests.
7. Supply AdSense publisher/slot IDs and verify Free/Plus/Pro exposure with consent behavior.
8. Connect a production host/domain and run browser-based slow-network, expiry, responsive and visual QA.

Only after these items pass should Phase 4 polish/SEO work begin.
