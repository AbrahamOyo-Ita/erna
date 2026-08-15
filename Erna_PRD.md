# Erna — Product Requirements Document (PRD)

### Micro-Task Earning & Marketplace Platform for Nigeria

**Brand name:** Erna (confirmed) **Version:** 1.1 — Multi-platform (iOS \+ Android via Expo/React Native, Web/PWA) **Prepared by:** Abraham Oyo-Ita **Date:** August 2026

---

## 1\. Executive Summary

Erna is a Nigeria-focused platform where **advertisers pay to get real social media engagement and marketplace exposure**, and **everyday users earn money by completing verified micro-tasks** (likes, follows, comments, shares, reviews) and by listing/selling products and services. It is inspired by the demand Hawkit has proven exists in the Nigerian market, but corrects the two structural problems that have damaged Hawkit's reputation:

1. **No pay-to-participate fee.** Users never pay to start earning. Revenue comes entirely from advertisers/task posters and optional marketplace promotion fees.  
2. **Transparent, fast withdrawals.** Withdrawal requests are processed on a published SLA (e.g., 24–48 hours), with visible status tracking — not indefinite "processing."

VTU/airtime reselling is explicitly **out of scope for v1** per direct instruction — this removes third-party VTU API dependency, integration cost, and float/liquidity risk, and lets the MVP ship faster.

---

## 2\. Problem Statement

Nigerians — particularly students, informal workers, and social-media-savvy youth — actively look for legitimate ways to earn small amounts of money online. Existing platforms (Hawkit being the dominant example) have proven the demand but have eroded trust through:

- Charging an upfront "activation fee" before users can earn  
- Delayed or indefinitely "processing" withdrawals  
- Shrinking task volume with no communication  
- No dispute resolution process between task posters and workers

**Opportunity:** Build a platform that captures the same demand with a trust-first model — free to join and earn, fast payouts, transparent task/dispute handling — positioned as the credible alternative in a market where the incumbent is actively losing user trust.

---

## 3\. Goals & Non-Goals

### Goals (v1 / MVP)

- Let advertisers post and fund micro-tasks (social engagement, app reviews, marketplace promotion)  
- Let users browse, complete, and submit proof for tasks, and get paid on approval  
- Let users buy/sell products and services in a marketplace  
- Provide a wallet system with Paystack funding and withdrawal  
- Provide an admin panel for task moderation, dispute resolution, and payout approval  
- Build a referral system to drive organic growth

### Non-Goals (explicitly excluded from v1)

- ❌ VTU / airtime & data reselling (removed per instruction — revisit in a later phase if desired)  
- ❌ Multi-level/tiered referral commissions (avoid anything resembling pyramid structures)  
- ❌ Any mandatory fee to activate earning features  
- ❌ Native mobile apps (v1 is a responsive web app; native wrap can come later)

---

## 4\. Target Users / Personas

**1\. The Task Worker ("Earner") — Chidinma, 22, Uyo** Undergraduate, has a smartphone and data, wants to earn ₦2,000–₦5,000/week doing small tasks between classes. Price-sensitive, distrustful after hearing bad Hawkit stories from friends. Needs: fast payout proof, low task friction, no upfront cost.

**2\. The Advertiser ("Task Poster") — Emeka, 29, Lagos** Runs a small brand or manages social accounts for a client. Wants fast, affordable engagement (likes/follows/comments) and app reviews. Needs: predictable pricing, proof of completion, ability to flag fraudulent submissions.

**3\. The Marketplace Seller — Ngozi, 34, Calabar** Sells handmade goods or services locally. Wants a free/cheap way to list products to a ready audience without building her own storefront. Needs: simple listing flow, buyer messaging, safe payment handling.

**4\. The Admin/Moderator — Platform Operator** Abraham or a hired ops person. Needs: task approval queue, dispute resolution tools, withdrawal approval dashboard, fraud flags (duplicate task submissions, bot behavior).

---

## 5\. Core Feature Set

### 5.1 Authentication & Onboarding

- Email/phone \+ password signup, OTP verification (via Supabase Auth)  
- No paid activation step — users can browse and start earning immediately after verification  
- Optional KYC tier (BVN/NIN) unlocked later for higher withdrawal limits — not required to start  
- Referral code capture at signup (optional field)

### 5.2 Task Engine (core module)

**Supported platforms:** Facebook, Instagram, TikTok, X (Twitter), LinkedIn — plus YouTube subscribe and App/Play Store reviews as standalone task types.

**Task types:**

- Social follow / connect (Instagram, TikTok, X/Twitter, Facebook, LinkedIn, YouTube subscribe)  
- Social like / react  
- Social comment (advertiser can provide 2–3 suggested comment templates to reduce spam-looking submissions)  
- Social share / repost  
- LinkedIn-specific: post engagement (like/comment), company page follow, post share — no automated connection requests, since LinkedIn actively detects and penalizes bulk connection-request behavior; keep LinkedIn tasks limited to engagement, not networking spam  
- App/Play Store review  
- Marketplace task (visit a listing, "engage" to boost visibility)

**Task lifecycle:**

1. Advertiser creates task → selects type, target URL, quantity of completions needed, price per completion, sets budget → funds task from wallet (held in escrow)  
2. Task appears in the public task feed once funded  
3. Worker opens task → performs action → submits proof (screenshot upload, required for all non-API-verifiable tasks)  
4. Task enters **pending review** queue  
5. Auto-approval option for advertisers who trust volume (with spot-check sampling) OR manual approval per submission  
6. On approval → worker's wallet is credited instantly; advertiser's escrow balance decreases  
7. On rejection → reason required (dropdown: "proof invalid," "action not detected," "duplicate submission," "other" \+ note); worker can appeal once → goes to admin review

**Anti-fraud controls:**

- One submission per user per task (device fingerprint \+ account check)  
- Screenshot metadata/timestamp check  
- Rate-limiting on task completions per hour to deter bot farms  
- Advertiser dispute window (48 hrs) before funds are released to worker permanently

### 5.3 Wallet & Payments

- Single wallet per user (Naira-denominated ledger in Supabase, source of truth server-side, never trust client balance)  
- **Fund wallet:** Paystack (card, bank transfer, USSD)  
- **Withdraw:** Bank transfer via Paystack Transfers API  
  - **First withdrawal threshold: ₦1,000–1,500** (kept deliberately low so new, skeptical users experience a fast, real payout early — this is the single moment that converts a skeptical first-time user into a believer, and is the direct fix for Hawkit's \#1 trust complaint)  
  - **Subsequent withdrawal threshold: ₦3,000** (standard, once trust is established)  
  - Published processing SLA: 24–48 hrs on Free tier, 12–24 hrs on Erna Pro (see Section 9.4 for plan tiers)  
  - Visible status tracking: Requested → Processing → Paid / Failed, shown in-app at every stage  
- Full transaction history, broken into three labeled sub-totals feeding one overall balance: **Task Earnings**, **Referral Earnings**, **Daily Question Earnings** (see Section 5.8)  
- No fee to fund wallet for the purpose of *earning*; platform commission (\~35%, see Section 9.2) is taken from **advertiser task budgets only**, never from worker payouts, never as a fee to join or withdraw

### 5.8 Daily Question & Answer (Trivia) Feature

- **Access gate:** unlocks only after the user completes at least 1 micro-task that day — this drives daily task-completion volume while giving users a reason to open the app even on light task-availability days  
- One question per day, auto-served from a rotating question bank (thought-provoking/general knowledge; curated weekly by admin or an AI-generated bank reviewed before publishing)  
- Multiple choice, instant correct/incorrect check against the database  
- Correct answer \= **₦20 credited to wallet immediately** (not held to end of week — instant micro-credit reinforces the "fast payout" trust story better than a lump sum)  
- End-of-week is a **recap/streak celebration**, not a separate payout event (e.g., "You earned ₦140 this week from Daily Questions\!") — simpler to build, same psychological reward  
- Capped at 1 question/day (max \~₦140/week per user) so it stays a retention hook, not a competing income stream to task completion  
- Reward paid to wallet directly — no recharge card/data fulfillment in v1 (that requires the VTU integration explicitly out of scope for now; revisit if/when VTU ships in a later phase)

### 5.4 Marketplace

- Sellers create listings: title, category, price, images, description, location (state/city — Calabar-first taxonomy, expandable nationally)  
- Buyers browse/search/filter by category and location  
- In-app chat or WhatsApp deep-link for buyer-seller negotiation (v1: WhatsApp deep-link is faster to ship)  
- Optional "boost" — seller pays to have listing featured/get engagement tasks run against it (bridges marketplace \+ task engine)  
- Seller rating system (post-transaction, buyer-submitted)

### 5.5 Referral Program

- Single-tier only (referrer earns a flat ₦300 bonus when a referred user completes their first approved task) — explicitly avoids multi-level structures to stay clear of pyramid-scheme optics  
- Referral dashboard: link/code, signups, conversions, earnings

### 5.6 Admin Panel

- Task moderation queue (pending submissions, flagged tasks)  
- Dispute resolution interface (advertiser vs. worker claims, admin decision \+ audit log)  
- Withdrawal approval queue with fraud flags (unusual velocity, new account \+ immediate high-value withdrawal)  
- User management (suspend, verify, view activity)  
- Basic analytics: active users, task volume, GMV, take rate revenue

### 5.7 Notifications

- In-app \+ email (Supabase \+ Resend/SendGrid) for: task approved/rejected, withdrawal status change, new marketplace message, referral bonus earned

---

## 6\. Information Architecture / Key Screens

1. **Landing/Marketing page** — value prop, "how it works," trust signals (fast payout proof, no activation fee messaging as a direct differentiator vs. incumbents)  
2. **Sign up / Login / OTP verify**  
3. **Home/Task Feed** — filterable by task type, payout amount, time to complete  
4. **Task Detail** — instructions, proof upload, submit button  
5. **My Tasks** — submitted, pending, approved, rejected (with appeal option)  
6. **Wallet** — balance, fund, withdraw, transaction history  
7. **Marketplace Home** — categories, search, featured listings  
8. **Listing Detail** — images, description, seller info/rating, contact/chat button  
9. **Create Listing (Seller)**  
10. **Post a Task (Advertiser)** — task builder \+ budget/escrow funding flow  
11. **Referral Dashboard**  
12. **Profile/Settings** — KYC upload, notification prefs  
13. **Admin Dashboard** (separate role-gated app or route)

---

## 7\. Data Model (high-level entities)

- `users` (id, name, phone, email, role\[worker/advertiser/both\], kyc\_tier, referral\_code, referred\_by, created\_at)  
- `wallets` (user\_id, balance, updated\_at)  
- `wallet_transactions` (id, user\_id, type\[credit/debit/withdrawal/refund\], amount, reference, status, created\_at)  
- `tasks` (id, advertiser\_id, type, target\_url, price\_per\_completion, quantity, budget\_remaining, status\[active/paused/completed\], instructions, created\_at)  
- `task_submissions` (id, task\_id, worker\_id, proof\_url, status\[pending/approved/rejected/appealed\], rejection\_reason, reviewed\_by, created\_at)  
- `listings` (id, seller\_id, title, description, category, price, images\[\], location, status, created\_at)  
- `listing_boosts` (id, listing\_id, task\_id, active)  
- `referrals` (id, referrer\_id, referred\_id, bonus\_paid, created\_at)  
- `disputes` (id, submission\_id, raised\_by, reason, admin\_decision, resolved\_at)

---

## 8\. Tech Stack — Two-Repo Architecture

Two independent repositories, one shared Supabase backend:

**8.1 Repo 1 — Native mobile app (`erna-mobile`)**

- **Framework:** React Native with Expo (managed workflow, EAS Build for release binaries)  
- **iOS:** built and archived through Xcode (Expo prebuild → open in Xcode for signing, provisioning, TestFlight, and App Store submission)  
- **Android:** Expo EAS Build → Google Play — in scope from day one alongside iOS  
- **Auth/session storage:** `@supabase/supabase-js` \+ `@react-native-async-storage/async-storage`  
- **Release cadence:** App Store / Play Store review cycles — slower, versioned releases

**8.2 Repo 2 — Web app (`erna-web`)**

- **Framework:** React \+ TypeScript \+ Tailwind CSS (standalone build, not `react-native-web` — chosen specifically so the marketing/landing page and product UI can hit the polished, minimal design bar you want, matched pixel-for-pixel in layout mechanics against modern SMM-panel-style references without RN-web's styling constraints)  
- **PWA layer:** Web app manifest \+ service worker (adds "Add to Home Screen" install prompt on Android and iOS Safari)  
- **Hosting:** Vercel or Lovable-hosted, custom domain  
- **Release cadence:** Continuous deploy — fast iteration, ships same day

**8.3 Shared backend (used by both repos)**

- **Backend/DB/Auth:** Supabase (Postgres, Row-Level Security for wallet integrity, Supabase Auth for OTP — shared auth session logic across both repos)  
- **Payments:** Paystack (Charge API for funding, Transfers API for withdrawals, webhook verification server-side — never trust client-confirmed payment status)  
- **File storage:** Supabase Storage for proof screenshots and listing images  
- **Notifications:** Resend or SendGrid for email; push notifications via Expo Push Notifications service for the native app; in-app notification table shared across both clients

**8.4 Build sequencing** Ship `erna-web` first as the PWA, validate task/wallet flows with real users, then build `erna-mobile` against the same validated Supabase backend and API contracts once the web product is stable.

**8.5 Design direction for `erna-web`** Visual language target: minimal, modern SMM-panel-style aesthetic — soft gradient background, floating stat-card overlays on the hero section, pill-shaped trust-badge row (ratings, platform icons, starting price), generous whitespace, blue accent-on-neutral-white palette, rounded card system with soft shadows. This should be built as **Erna's own original execution of that visual pattern language** — own copy, own iconography, own imagery, own component details — not a literal asset-for-asset clone of any specific existing product, to avoid design-IP exposure once Erna is live.

---

## 9\. Monetization Model & Pricing Structure

### 9.1 Pricing philosophy

Erna's pricing is deliberately **not a copy of Hawkit's rates** — Hawkit's ₦3-per-task pricing is the single most-cited complaint in its reviews ("costs more in data than it pays"). Erna prices by platform effort/value tier, with a ₦10 floor, so no task ever pays less than it costs the worker to complete it.

### 9.2 Task pricing by platform tier

**Tier 1 — Facebook & TikTok (floor tier)** | Task | Worker payout | Advertiser price | Platform commission | |---|---|---|---| | Follow | ₦10 | ₦16 | \~37% | | Like | ₦10 | ₦16 | \~37% | | Share/Repost | ₦15 | ₦23 | \~35% | | Comment | ₦20 | ₦31 | \~35% |

**Tier 2 — Instagram, X & LinkedIn (mid tier)** | Task | Worker payout | Advertiser price | Platform commission | |---|---|---|---| | Follow/Connect | ₦15 | ₦23 | \~35% | | Like/React | ₦12 | ₦19 | \~37% | | Share/Repost | ₦20 | ₦31 | \~35% | | Comment | ₦25 | ₦39 | \~36% |

**Tier 3 — YouTube (premium tier)** | Task | Worker payout | Advertiser price | Platform commission | |---|---|---|---| | Like | ₦50 | ₦77 | \~35% | | Comment | ₦100 | ₦154 | \~35% | | Subscribe | ₦150 | ₦231 | \~35% |

**Other task types** | Task | Worker payout | Advertiser price | |---|---|---| | Google Play Store review | ₦100 | ₦154 | | Apple App Store review | ₦200 | ₦308 |

Platform commission is held consistent at **\~35% across every task type** — this is the core revenue engine, taken automatically when a task is funded (deducted from advertiser's escrow budget, not from worker payout).

### 9.3 Revenue streams

| Revenue stream | Mechanism |
| :---- | :---- |
| Task commission (primary) | \~35% margin built into every task price, per tiered table above — charged to advertiser at task-funding time, never deducted from worker earnings |
| In-app advertising (tiered by user plan — see 9.4) | Third-party companies/brands run display and rewarded-video ads inside Erna; Erna earns per-impression ad revenue from an ad network (e.g., AdMob) — exposure is tiered by which user plan is viewing |
| Worker subscription plans (see 9.5) | Optional ₦500/₦1,000 monthly plans for power users — recurring revenue, separate from task commission |
| Listing boost fees | Sellers pay to run engagement tasks against their marketplace listing (uses the same task-pricing engine) |
| Featured placement | Flat fee for homepage/category featured slots |
| Referral bonus cost center | ₦300 flat bonus per activated referral (₦400 for Erna Pro subscribers — see 9.5) — single-tier only, no multi-level structure, to avoid pyramid-scheme optics |
| (Future) Premium advertiser tools | Bulk task creation, analytics dashboard, API access |

**Explicitly not monetized:** account activation, task access, or withdrawal processing — this remains the core trust differentiator from Hawkit.

### 9.4 In-App Advertising Model (tiered by plan)

Erna sells ad space inside the platform to third-party advertisers/brands (via an ad network such as AdMob) — this is separate from the task-commission advertisers who pay for engagement. Ad exposure is **inversely tied to subscription tier**, which does double duty: it generates ad revenue from Free-tier users while giving a genuine, tangible reason to upgrade to Plus or Pro.

| Plan | Ad exposure |
| :---- | :---- |
| **Free** | Full ad exposure — banner ads on task feed/wallet/marketplace screens, occasional interstitial ads between actions, optional rewarded-video ads (user opts in for a bonus) |
| **Erna Plus (₦500/mo)** | Reduced ad exposure — banner ads only, shown occasionally (not on every screen), no interstitials |
| **Erna Pro (₦1,000/mo)** | Ad-free — no ads shown anywhere in the app |

**Realistic revenue expectation** (Nigeria is a lower-eCPM market than US/UK benchmarks — do not use global average figures when projecting this): at \~5,000 monthly active Free-tier users, a blended eCPM of \~$1.50 (mix of banner \+ rewarded video), and \~3 ad impressions per session across \~15 sessions/month, this is roughly **$300–350/month (\~₦500,000/month)** at current exchange rates. This scales close to linearly with active Free-tier user count — treat it as a genuine supplementary revenue layer, not a primary one, and re-forecast once real usage data exists.

### 9.5 Worker Subscription Plans

Optional, paid **after** a user has already completed their first successful withdrawal — never a gate to earning. This distinction must be preserved in every part of the product and every piece of marketing copy: these plans are a paid upgrade for engaged, already-trusting users, not a fee to access the platform.

**Erna Plus — ₦500/month**

- Priority access to newly posted tasks (visible before Free-tier users see them)  
- Reduced ad exposure (see 9.4)  
- Slightly reduced minimum withdrawal threshold

**Erna Pro — ₦1,000/month**

- Everything in Plus  
- Fully ad-free experience  
- First access to YouTube-tier (highest-paying) tasks  
- Faster withdrawal SLA: 12–24 hrs instead of 24–48 hrs  
- Boosted referral bonus: ₦400 instead of ₦300 per activated referral

### 9.6 Pre-Launch Cold-Start Seeding Budget

Before onboarding paying advertisers, Erna needs a genuine pool of active workers and real completed-task proof to show at launch and at conference pitches. Recommended self-funded seed budget (using the platform's own pricing table):

| Item | Est. cost |
| :---- | :---- |
| \~500 seed tasks, Facebook/TikTok tier (₦10–20 avg payout) | \~₦8,000–10,000 |
| \~200 seed tasks, Instagram/X tier (₦15–25 avg payout) | \~₦4,000–5,000 |
| \~50 seed tasks, YouTube tier (₦50–150 avg payout) | \~₦5,000–7,500 |
| **Total recommended pre-launch pool** | **\~₦17,000–22,500** (fits within a ₦30,000 self-funding budget with room for buffer/reserve) |

**Critical guardrail on where seed tasks point to:** self-funded tasks must only target accounts Erna (or Abraham) legitimately owns or has explicit permission to run engagement on — Erna's own official social pages, Abraham's personal/brand pages, his mentee's accounts, and consenting friends'/local business pages from his existing freelance network. **Do not point tasks at random third-party accounts without their knowledge or consent.** This isn't just an ethics point — most platforms' terms of service treat unsolicited inorganic engagement to an account that didn't request it as spam/platform manipulation, which risks those accounts (and Erna's own official accounts, if used as the source) being flagged or restricted. Legitimate seed targets also do double duty as **pre-launch marketing**: growing Erna's own social presence through Erna's own early users is authentic, testable, and gives you real before/after growth numbers to show advertisers and pitch at Calabar Tech Week.

---

## 10\. Compliance & Trust Considerations

- No fee-to-earn structure — removes the single biggest reputational and regulatory red flag associated with platforms like Hawkit  
- Escrow model (advertiser funds held before task goes live) protects workers from unfunded/fake tasks  
- Published withdrawal SLA \+ visible status tracking directly addresses the \#1 complaint in Hawkit's reviews  
- Terms of Service should explicitly state: platform is a task marketplace, not an investment product, and earnings are for completed work only (avoid any language resembling "returns" or "investment")  
- Consider a maximum daily task-earning cap per user to reduce bot-farm incentive and fraud exposure  
- KYC tiering (optional light KYC, mandatory before high-value withdrawal) helps with AML basics and dispute resolution

---

## 11\. Success Metrics (v1)

- Time from task submission to approval decision (target: \<24 hrs)  
- Time from withdrawal request to payment (target: \<48 hrs, published and honored)  
- Advertiser task-completion fill rate (% of posted tasks fully completed)  
- Worker retention (7-day, 30-day)  
- GMV through marketplace \+ task budgets funded  
- Dispute rate (% of submissions disputed) — should trend down as fraud controls mature

---

## 12\. Build Phases

**Phase 1 — MVP (4–6 weeks solo-build pace)**

- Auth, wallet (fund/withdraw via Paystack), task engine (create/complete/approve/reject), basic admin queue

**Phase 2**

- Marketplace listings \+ boosts, referral program, disputes flow, notifications

**Phase 3**

- KYC tiering, analytics dashboard for advertisers, fraud detection improvements, native app wrapper

**Phase 4 (optional, later)**

- Revisit VTU/airtime reselling as an add-on once core trust and volume are established — only with a vetted VTU API partner and proper float management

---

## 13\. Open Questions for You

1. Final brand name — lock before design/dev starts  
2. Launch geography: Calabar-first (like CalabarStay) or national from day one?  
3. Who reviews task submissions at launch — manual admin (you) or auto-approval with spot-checks?  
4. Take-rate: confirm 10–15% or a different number for advertiser commission  
5. Minimum withdrawal amount and SLA — confirm ₦1,000 / 24–48 hrs or adjust

---

## 14\. Explicit Build Scope — What's In, What's Out (v1)

**✅ Built in v1:**

- Auth (signup, OTP, login), referral capture  
- Task engine (create/fund/complete/approve/reject/appeal) across Facebook, Instagram, TikTok, X, LinkedIn, YouTube, App Store/Play Store reviews  
- Tiered task pricing (Section 9.2)  
- Wallet (fund, withdraw, tiered withdrawal thresholds, transaction history with sub-totals)  
- Marketplace (listings, boosts, WhatsApp deep-link contact)  
- Referral program (single-tier, flat bonus)  
- Daily Question/Trivia feature (Section 5.8)  
- Worker subscription plans — Erna Plus / Erna Pro (Section 9.5)  
- Tiered in-app advertising (Section 9.4)  
- Admin panel (task moderation, disputes, withdrawal approval, user management, analytics)  
- Web app (React/Tailwind) \+ installable PWA  
- Native app (React Native/Expo, iOS via Xcode \+ Android)

**❌ Explicitly out of scope for v1 (do not build):**

- VTU / airtime & data reselling  
- Recharge-card or data-plan fulfillment for trivia rewards (paid to wallet instead)  
- Multi-level/tiered referral commissions  
- Any mandatory fee to activate earning features  
- Worker leaderboards (optional future addition, opt-in only if added)

---

## 15\. Go-to-Market & Launch Workflow

### 15.1 Current status

- ✅ Logo complete  
- ✅ Color scheme complete  
- ✅ Custom font selected  
- ⬜ Full brand guidelines document (next step)  
- ⬜ Promotional/campaign flyers  
- ⬜ Product build (web app first, per Section 8.4)  
- ⬜ Worker \+ advertiser pool building  
- ⬜ Conference pitches: Calabar Tech Week, National Youth Conference (Mount Zion Church) — both before December

### 15.2 Recommended sequence (now → December)

**Step 1 — Finish brand foundation (this week)** Build the full brand guidelines document: logo usage rules, color codes (hex/RGB), typography hierarchy, spacing/logo clear-space rules, do's/don'ts, voice & tone reference (already drafted in the ChatGPT brand brief). This becomes the single reference your VA and any future designer works from — nothing gets designed off-brief from here on.

**Step 2 — Build core promotional assets** Using the brand guidelines: a pitch-deck template, 3–5 flyer templates (announcement, "how it works," "join as an earner," "join as an advertiser"), and a one-pager for conference handouts. Keep these as reusable templates (Canva or Figma), not one-off designs, since you'll need variations for each conference and campaign phase.

**Step 3 — Build anticipation before the product is live**

- Start posting under the Erna brand now, even pre-launch: "building in public" content (progress updates, the problem you're solving, screenshots as they're ready) builds an audience before you need one  
- Waitlist/landing page with email or WhatsApp capture — this becomes your pre-seeded worker pool before the app is even live  
- Tease the "no activation fee, fast payout" differentiator early and often — this is your sharpest hook against the incumbent's bad reputation, and it's genuinely newsworthy for a local tech audience

**Step 4 — Self-fund seed tasks (\~₦17,000–22,500, see Section 9.6)** Run this once the task engine is live but before your first paying advertiser — gives you real payout proof and growth numbers to show at conferences.

**Step 5 — Conference pitches**

- **Calabar Tech Week:** pitch as a Calabar-built, nationally-scalable product — lean into your existing local credibility (CalabarStay, your freelance track record) as proof you ship  
- **National Youth Conference (Mount Zion):** frame around the earning/opportunity angle for young people — this audience is closer to your actual early-worker persona than a pure tech audience, so this is also a genuine worker-recruitment opportunity, not just a pitch  
- For both: bring a working demo (even a Phase 1–2 build is enough), your seed-task payout proof, and a clear ask (early sign-ups, advertiser interest, or investor/mentor introductions)

**Step 6 — Mentor conversation** Bring the PRD and this workflow section into that conversation directly — a mentor can pressure-test your pricing, your cold-start plan, and your conference pitch before you're in front of an audience.

### 15.3 Virtual Assistant Onboarding Brief

Since your VA is building her portfolio on this, give her a scoped, documented brief rather than open-ended tasks — better for her portfolio (she can point to defined deliverables) and better for you (clear accountability).

**Suggested initial scope:**

- Social media content calendar and posting across Twitter/X, Instagram, TikTok (using the brand guidelines and flyer templates from Steps 1–2)  
- Community management: responding to comments/DMs, early waitlist follow-up  
- Basic analytics tracking (follower growth, engagement rate, waitlist sign-ups) — reported weekly  
- Conference logistics support (flyer printing coordination, social coverage of the events)

**What to give her:**

- The brand guidelines doc \+ this PRD (relevant sections only — Sections 9 and 15 are most relevant to her role)  
- A content calendar template she can own and fill in for your review  
- Clear weekly check-in cadence

**Portfolio framing for her:** she should keep a running record of what she built/managed (posting cadence, engagement growth, campaign results) — this becomes her case study, the same way Twothumbs Creation and CalabarStay are yours.

---

## 16\. Ownership & Multi-Product Payment Architecture

**Company:** Erna is a product of **Aphiva Technologies Limited** (Nigerian company, CAC registration required before moving to a live Paystack business account).

**Paystack architecture:** One Paystack business account, owned by Aphiva Technologies Limited, used across Erna and any future Aphiva products. This is a single set of live API keys (public \+ secret) — not a separate Paystack account per product, and not a separate account per user.

**How per-user wallets actually work:** user wallets are a **ledger construct inside Erna's own database**, not literal Paystack sub-accounts. Paystack confirms real money movement (charges in, transfers out); Erna's Supabase `wallets` and `wallet_transactions` tables are the source of truth for who owns what balance internally. This is the standard architecture for marketplace/earning apps (the same pattern Uber Wallet, Bolt, and similar platforms use).

**Multi-product separation:** every ledger entry is scoped by `product_id` so that Erna's wallets never mix with a future Aphiva product's wallets, even though both settle through the same Paystack account and the same Aphiva bank account. Each Aphiva product should keep its own database/schema; only the Paystack API keys and the parent company entity are shared.

**Compliance note:** because peer-to-peer-style payout platforms sometimes receive extra scrutiny during Paystack's business verification, have this PRD's Section 10 (Compliance & Trust Considerations) ready to reference if Paystack's compliance team requests clarification on the business model during KYC.

## 17\. Notification Architecture

**Primary channel — WhatsApp via OpenWA (self-hosted, MIT-licensed, zero marginal cost):** used for task-approved/rejected notifications, new-task-available alerts, general reminders, and daily-question nudges.

- **Critical setup requirement:** OpenWA connects via reverse-engineered WhatsApp clients (not Meta's official API), which carries a real risk of number restriction/ban if flagged by WhatsApp's anti-abuse systems. Use a **dedicated number**, never Erna's primary support/brand number, specifically to contain that risk.  
- Self-hosted via Docker alongside existing infrastructure — no per-message cost.

**Fallback channel — Email (Resend/SendGrid, per Section 8.3):** every notification type sent via WhatsApp is also queued via email, so no user misses a critical update (task status, withdrawal status) if the WhatsApp channel is ever disrupted.

**Reserved for future consideration — Meta Cloud API (official):** if/when budget allows or if WhatsApp-channel reliability becomes business-critical, withdrawal/payment-related notifications specifically could migrate to Meta's official Cloud API (very low cost in Nigeria — utility/authentication conversations run a few cents each, with service-window replies free) to remove ban risk from anything touching money movement. Not required for v1 given the zero-budget constraint, but flagged here as the natural next step.  
