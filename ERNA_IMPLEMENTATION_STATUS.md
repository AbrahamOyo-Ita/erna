# Erna Implementation Status

Last updated: August 15, 2026

This document is the persistent project handoff for the latest UI, OpenWA, responsiveness, security and Phase 4 work. Future substantial status reports should update this file because the project owner cannot reliably scroll through long chat responses.

## Repository & Deployment

The codebase is synced and tracking the upstream GitHub repository:
- Repository: [https://github.com/AbrahamOyo-Ita/erna](https://github.com/AbrahamOyo-Ita/erna)
- Branch: `main`
- Security: `.gitignore` hardened to ensure zero credential/env leakage.
- Vercel Deployment: Removed conflicting/stale `pnpm-lock.yaml` so Vercel uses `npm` and the up-to-date `package-lock.json`. Production build verified (`49/49` static & dynamic routes compiled successfully).


## Outcome

The requested implementation is complete in the codebase and passes the production build. API-dependent services remain safely disabled until their production credentials are configured.

## Login repair

The Login page failure was caused by a stale-session redirect loop:

1. The Supabase proxy redirected a browser that appeared authenticated from `/login` to `/app`.
2. The stricter application session check rejected the stale or revoked session and redirected back to `/login`.
3. This repeated until the browser displayed a page-not-working or too-many-redirects error.

The proxy now protects `/app` without redirecting users away from `/login`. Expired and revoked sessions can therefore reach the Login page and authenticate again.

Verified HTTP behavior:

- `/login`: `200`
- `/signup`: `200`
- Unauthenticated `/app`: `307` to `/login?next=%2Fapp`

## Reusable UI components

### Custom dropdown

A shared accessible dropdown component now replaces native selects in:

- Withdrawal bank selection
- Marketplace location filtering
- Advertiser platform selection
- Advertiser task-type selection
- Campaign review mode
- Customer-care topic selection

The component supports keyboard navigation, disabled options, required form values, focus states, selected indicators, mobile positioning and native form submission.

Primary file: `components/ui/select.tsx`

### File upload

The basic file inputs were replaced with a shared upload experience for task proofs and marketplace listing images.

Implemented behavior:

- Drag and drop
- Browse-device action
- Keyboard activation
- Image previews
- Individual file removal
- File-count validation
- MIME-type validation
- File-size validation
- Accessible error messages
- Responsive mobile layouts
- Native `FormData` compatibility

Client validation improves usability but is not treated as a security boundary. The existing API routes continue to decode, resize and re-encode images to WebP, reject malformed images and strip EXIF/ICC metadata before storage.

Primary file: `components/ui/file-upload.tsx`

## OpenWA integration

Erna integrates with the MIT-licensed `rmyndharis/OpenWA` self-hosted WhatsApp gateway. OpenWA runs as a separate service and is not embedded in the Next.js process.

Official references:

- Repository: https://github.com/rmyndharis/OpenWA
- API collection: https://github.com/rmyndharis/OpenWA/blob/main/docs/07-api-collection.md
- Webhook event documentation: https://github.com/rmyndharis/OpenWA/blob/main/docs/12-troubleshooting-faq.md

### Dedicated sender

The required Erna sender is:

- Local format: `08162851706`
- Normalized format: `2348162851706`

The delivery worker refuses to operate when `OPENWA_SENDER_NUMBER` does not normalize to this dedicated number.

This number must remain a dedicated notification sender. It should not be used as the founder's number or Erna's primary support number because OpenWA uses reverse-engineered WhatsApp clients and carries a restriction or ban risk.

### Allowed notification types

OpenWA is restricted to opted-in, non-financial product alerts:

- Task approved
- Task rejected
- One new-task alert per opted-in user per day
- Advertiser proof-review reminders
- Daily-question nudges for eligible workers

The following are deliberately excluded:

- OTP and authentication messages
- Wallet funding messages
- Payment messages
- Subscription payment messages
- Withdrawal requested, paid or failed messages

Those sensitive categories remain on Supabase Auth, transactional email or a future official Meta WhatsApp Cloud API integration.

### User consent

WhatsApp alerts are disabled by default. The Profile editor contains an explicit opt-in control and stores consent server-side with:

- Normalized WhatsApp phone number
- Notification preference
- Consent timestamp

Opting out clears the WhatsApp destination and consent timestamp.

### Queue and delivery protections

The implementation includes:

- Service-role-only outbox
- Row-Level Security with no browser policies
- Unique notification idempotency keys
- `FOR UPDATE SKIP LOCKED` worker claims
- Five-minute claim leases
- Exponential retry delay
- Six-attempt suppression cap
- Exact dedicated-number enforcement
- HTTPS enforcement outside local development
- Session-scoped OpenWA operator key support
- Accepted, delivered and read timestamps
- Provider message ID recording
- Email fallback for generated new-task, reminder and daily-question alerts

An OpenWA HTTP `201` response is recorded as gateway acceptance, not proof of WhatsApp delivery. Delivery and read state come from signed webhook events.

### Webhook security

The OpenWA webhook endpoint:

- Verifies `X-OpenWA-Signature` using HMAC-SHA256 over the exact raw body
- Requires the configured OpenWA session ID
- Accepts only `message.sent`, `message.ack` and `message.failed`
- Records unique delivery IDs
- Ignores replayed delivery events
- Updates accepted, delivered, read or failed state server-side

Endpoints:

- `/api/openwa/webhook`
- `/api/cron/notification-fanout`
- `/api/cron/whatsapp-outbox`

Both cron routes require `Authorization: Bearer $CRON_SECRET`.

### Alert fan-out controls

Newly funded tasks call a server-only database function that creates a maximum of one new-task notification per opted-in user per Lagos calendar day. This avoids an uncontrolled message blast.

The scheduled notification function creates:

- A daily-question nudge only when the user completed an approved task that day, the question is published and the user has not already answered.
- An advertiser reminder when a funded campaign has pending proof older than two hours.

All generated notifications use unique source keys, so repeated cron calls are idempotent.

### OpenWA setup

Detailed deployment steps are in `OPENWA_SETUP.md`.

Provider delivery is not marked live-verified because the OpenWA host, QR-linked session and API credentials have not been supplied yet.

## Responsive implementation

Responsive rules were added or strengthened for:

- Marketing navigation
- Public information pages
- Authentication pages
- Short-height phones and software keyboards
- App sidebar and bottom navigation
- App content gutters and safe areas
- Wallet controls
- Marketplace search and filters
- Listing grids
- Task grids
- Data and notification rows
- Profile cards and editor
- Modals
- Custom dropdown popups
- File-upload drop zones and previews
- Pricing tables
- FAQ layouts
- Consent panel
- Sticky calls to action

Important fixes include:

- Compact authentication pages now scroll on mobile instead of being trapped in a fixed-height, overflow-hidden layout.
- Marketplace custom dropdown buttons are no longer hidden by the previous mobile search-button rule.
- Modals use viewport-bounded height and internal scrolling.
- Mobile app content accounts for bottom navigation and device safe-area insets.
- Dense data rows can wrap instead of overflowing narrow screens.

The in-app visual browser was unavailable during the final check, so screenshot-based viewport approval is not claimed. Responsive source checks, route rendering and the production build passed.

## Phase 4 implementation

### Public pages

Implemented routes:

- `/how-it-works`
- `/pricing`
- `/faq`
- `/case-studies`
- `/marketplace`
- `/thank-you`

Existing About, Trust and Customer Care pages remain integrated into the marketing navigation.

### Custom 404

The generic error screen was replaced by an on-brand 404 with clear links to Home and Login/task feed.

### Thank-you journeys

The thank-you page supports:

- Verified signup
- First approved task
- First paid withdrawal

The client records conversion milestones once per user and routes the user to the appropriate confirmation message.

### Breadcrumbs and internal links

Implemented:

- Public-page breadcrumbs
- Marketplace Home to Marketplace to Category to Listing breadcrumbs
- Marketplace category links
- Seller's related listings
- Pricing to how-it-works cross-link
- Footer links across all new public routes

### Case studies

Three short scenarios cover:

- Worker journey
- Advertiser campaign journey
- Marketplace seller journey

Every scenario is explicitly labeled as illustrative. None is presented as a real testimonial or attributed to a real user.

### FAQ

The dedicated FAQ contains exactly the requested six topics:

1. How payouts work
2. Why there is no activation fee
3. Withdrawal timing
4. How task pricing is determined
5. How referrals work
6. How to become an advertiser

### Honest service-level copy

Published withdrawal targets match implemented server plan behavior:

- Free: 24 to 48 hours
- Plus: up to 36 hours
- Pro: 12 to 24 hours

The copy also states that bank and compliance delays may occur and remain visible in status updates.

### Sticky mobile CTA

Public marketing pages include an unobtrusive mobile CTA with page-appropriate text such as Start earning, Post a task or Create a listing.

### SEO and crawl controls

Implemented:

- `robots.txt`
- `sitemap.xml`
- Authenticated and API route exclusions
- Unique public-page titles
- Unique meta descriptions
- Canonical metadata foundation
- Open Graph metadata
- Twitter Card metadata
- Dynamic marketplace listing metadata

### Social images

Branded 1200 by 630 social images are generated for:

- Landing page
- How it works
- Pricing
- FAQ
- Case studies
- Marketplace
- About
- Trust and safety
- Customer care

### Image alternative text

Content images and marketplace images use descriptive alternative text. Intentionally decorative logo marks inside already-labeled controls remain hidden from assistive technology to avoid duplicate announcements.

### Structured data

The application publishes:

- `Organization`
- `WebApplication`
- Nigeria service area
- Aphiva Technologies Limited as the legal company name
- Free entry offer in NGN

`LocalBusiness` was not fabricated because the PRD does not contain a verified public street address. It should be added only after the real registered/public business address is supplied.

### Analytics and consent

GA4 support is environment-driven and does not load until the visitor accepts analytics.

The consent interface:

- Allows acceptance or decline
- Stores a SameSite preference cookie
- Uses `Secure` on HTTPS
- Does not enable advertising cookies
- Enables IP anonymization configuration

Implemented conversion events:

- `signup_complete`
- `first_task_completion`
- `first_withdrawal`
- `advertiser_task_funded`

Analytics remains inactive until `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured.

## Verification results

### Application checks

- TypeScript: passed
- ESLint: passed
- Security and unit tests: 10 of 10 passed
- Next.js production build: passed
- Generated routes: 49

### Live Supabase checks

Both new migrations were applied to the linked project:

- `20260811205127_add_openwa_notification_outbox.sql`
- `20260811212834_complete_openwa_notification_fanout.sql`

The rollback-only live OpenWA test passed and confirmed:

- An opted-in task alert queues once
- Financial notifications do not enter the OpenWA queue
- Supplemental WhatsApp alerts receive email fallback
- Authenticated browser users cannot read the queue
- Authenticated browser users cannot execute queue/provider RPCs
- Active message leases cannot be claimed twice
- Delivery acknowledgements are recorded
- Replayed webhook delivery IDs are ignored

Database verification:

- Local and remote migration histories match
- Database lint reports no schema errors
- One Supabase Auth advisor warning remains: leaked-password protection is disabled

### HTTP route checks

Verified:

- Landing page: `200`
- Login: `200`
- Signup: `200`
- How it works: `200`
- Pricing: `200`
- FAQ: `200`
- Case studies: `200`
- Marketplace: `200`
- Thank-you page: `200`
- `robots.txt`: `200 text/plain`
- `sitemap.xml`: `200 application/xml`
- Social image: `200 image/png`
- Unknown route: `404`
- Unauthenticated app route: `307` to Login
- Unauthorized OpenWA cron: `401`
- Unsigned OpenWA webhook: `401`

## Required production configuration

Place real values in the production secret store or local `.env.local`. Do not commit secrets and do not paste server secrets into chat.

### Core URL and analytics

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### OpenWA

- `OPENWA_ENABLED=true` only after deployment testing
- `OPENWA_BASE_URL`
- `OPENWA_API_KEY`
- `OPENWA_SESSION_ID`
- `OPENWA_SENDER_NUMBER=08162851706`
- `OPENWA_WEBHOOK_SECRET`
- `CRON_SECRET`

### Existing provider dependencies

- `SUPABASE_SECRET_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PLUS_PLAN_CODE`
- `PAYSTACK_PRO_PLAN_CODE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- AdSense placement IDs
- Optional hCaptcha key

All supported variables and descriptions are in `.env.example`.

## Remaining operational actions

1. Deploy and QR-link the dedicated OpenWA session.
2. Add the OpenWA operator key and webhook secret.
3. Register the signed OpenWA webhook events.
4. Schedule notification fan-out and outbox cron routes.
5. Configure the production domain and GA4 measurement ID.
6. Configure missing Paystack, Resend and AdSense credentials.
7. Enable leaked-password protection in the Supabase Auth dashboard.
8. Perform screenshot-based mobile, tablet and desktop QA when a visual browser is available.
9. Add `LocalBusiness` structured data only after the real public business address is confirmed.

## Persistent reporting instruction

For future substantial work, update this file with the complete report and keep the chat response short with a direct link to this document.

## OmniRoute GitHub research

The requested OmniRoute repository and comparable projects were reviewed on 11 August 2026. Clarification: OmniRoute is not required inside the deployed Erna product, but it is suitable as a local non-OpenAI model gateway for the Codex CLI when the user's Codex plan allowance ends. No installation was performed. The machine-specific fallback and security guide is in `OMNIROUTE_CODEX_FALLBACK.md`; the broader repository review is in `OMNIROUTE_GITHUB_RESEARCH.md`.
