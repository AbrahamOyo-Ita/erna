# Erna 🇳🇬

> **Trust-First Micro-Task Earning & Peer-to-Peer Marketplace Platform for Nigeria**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Paystack](https://img.shields.io/badge/Paystack-Payments-00C3F7?style=for-the-badge)](https://paystack.com/)

---

## 📖 Overview

**Erna** is a full-stack platform built for the Nigerian market where:
- **Advertisers** fund and launch verified social media engagement campaigns (likes, follows, shares, reviews) and promote listings.
- **Earners** complete micro-tasks, participate in daily trivia, and earn real money with zero upfront sign-up fees and fast, transparent bank withdrawals.
- **Sellers & Buyers** connect in a local marketplace for products and services with optional visibility boosts.

Designed as a modern, trust-first alternative to legacy reward platforms, Erna eliminates predatory pay-to-earn barriers, guarantees transparent payout tracking, and enforces strict security and concurrency controls across wallets, tasks, and proofs.

---

## ✨ Key Features

### 💼 1. Micro-Task Engine & Campaigns
- **Multi-Platform Campaigns:** Support for X (Twitter), Instagram, TikTok, Facebook, YouTube, and Google Play Store reviews.
- **Proof Verification:** Earners upload screenshots or evidence via drag-and-drop file upload with validation.
- **Automated / Manual Review:** Support for automatic auto-approval timers or manual campaign manager review.
- **Dispute & Appeal Workflow:** Transparent dispute mechanisms for rejected task submissions.

### 🛍️ 2. Peer-to-Peer Marketplace
- **Listings:** Create, edit, and browse products and services with image uploads and category filtering.
- **Location Filtering:** Filter deals by state/region across Nigeria.
- **Listing Boosts:** Promote items for enhanced visibility using wallet balances or direct payment.
- **Direct Engagement:** Contact sellers directly via WhatsApp, phone, or email.

### 💰 3. Nigerian Wallet & Banking Infrastructure
- **Paystack Integration:** Direct debit card funding, Paystack bank list resolution, and bank account name verification.
- **Automated Webhooks:** Idempotent, HMAC-verified webhook processing for real-time wallet funding.
- **Fast Withdrawals:** Automated or admin-approved bank transfer requests with transparent status tracking.
- **Atomic Ledger Transactions:** Strict PostgreSQL transaction isolation and balance concurrency guards to eliminate double-spend risks.

### 🔔 4. Notifications & WhatsApp (OpenWA) Outbox
- **In-App Notifications:** Real-time bell notification drawer with unread tracking and click-to-read actions.
- **Email Outbox Queue:** Background claim-based worker for transactional and notification emails.
- **OpenWA WhatsApp Fanout:** Reliable asynchronous WhatsApp notification dispatch using a database-backed claim queue.

### 🛡️ 5. Admin Console & Operations
- **Task & Submission Moderation:** Review, approve, reject, or manage appeals on task proof submissions.
- **Payout Approval:** Batch review, inspect, and approve user withdrawal requests.
- **User & Fraud Management:** Ban, unban, suspend, or promote users, inspect user ledgers, and manage dispute queues.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Components:** [React 19](https://react.dev/), [Base UI](https://base-ui.com/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL 15+, Auth, Row-Level Security, Storage)
- **Payments:** [Paystack](https://paystack.com/) (Cards, Bank Transfers, Webhooks)
- **Messaging:** OpenWA (WhatsApp API) & Transactional Email
- **Language:** TypeScript 5.7+

---

## 📁 Repository Structure

```
├── app/                        # Next.js 16 App Router pages and APIs
│   ├── (auth)/                 # Login, Signup, OTP, Password Reset
│   ├── admin/                  # Admin console dashboard & moderation
│   ├── api/                    # Server endpoints (Admin, Tasks, Paystack, Webhooks, Cron)
│   ├── app/                    # Authenticated user dashboard & wallet
│   ├── marketplace/            # Marketplace search, product details, create listing
│   └── ...                     # Marketing, trust, pricing, FAQ, SEO routes
├── components/                 # Reusable UI & Feature components
│   ├── admin/                  # Admin moderation panels
│   ├── analytics/              # Consent & analytics trackers
│   ├── app/                    # User dashboard components & ad slots
│   ├── auth/                   # Authentication forms and shells
│   ├── marketing/              # Landing page sections & marketing shells
│   └── ui/                     # Select, Button, FileUpload, Modals
├── lib/                        # Core utilities and services
│   ├── server/                 # Server validation, image sanitization, plans
│   ├── supabase/               # SSR client, Server client, Admin client, Proxy
│   ├── openwa.ts               # OpenWA WhatsApp integration
│   ├── paystack.ts             # Paystack API helper & bank resolution
│   └── utils.ts                # Formatting and styling utilities
├── supabase/                   # Supabase migrations & DB schemas
│   └── migrations/             # Versioned SQL migrations (RLS, Triggers, Functions)
├── tests/                      # Concurrency, security, and route tests
└── public/                     # Static brand assets, icons, and SVG illustrations
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or later
- **Package Manager**: `npm` or `pnpm`
- **Supabase CLI**: For managing migrations and local database development

### 1. Clone the repository
```bash
git clone https://github.com/AbrahamOyo-Ita/erna.git
cd erna
```

### 2. Install dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the required environment variables:
```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# OpenWA / WhatsApp (Optional)
OPENWA_API_URL=https://your-openwa-instance.com
OPENWA_API_KEY=your-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Apply Database Migrations
Link your Supabase project and push the migrations:
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Validation

```bash
# Run TypeScript compilation check
npm run typecheck

# Run linter
npm run lint

# Run security & server control tests
npm run test

# Run live database security audit queries (requires linked Supabase project)
npm run test:live-db
```

---

## 🔐 Security & Architecture Highlights

- **Row Level Security (RLS):** Every single database table is protected by granular PostgreSQL policies enforcing least-privilege access.
- **Session Management:** Secure proxy middleware preventing infinite redirect loops on revoked or expired sessions.
- **Double-Spend Protection:** High-concurrency wallet transactions use locking rows (`FOR UPDATE`) and database-level ledger constraints.
- **Signed Webhooks:** Paystack and OpenWA webhooks strictly enforce HMAC signature validation before handling payloads.

---

## 📄 Documentation

- [Product Requirements Document (PRD)](Erna_PRD.md)
- [Implementation & Status Report](ERNA_IMPLEMENTATION_STATUS.md)
- [Supabase Setup Guide](SUPABASE_SETUP.md)
- [OpenWA WhatsApp Setup](OPENWA_SETUP.md)
- [Production Security & QA Report](PRODUCTION_SECURITY_QA_REPORT.md)

---

## 👤 Author

**Abraham Oyo-Ita**  
- GitHub: [@AbrahamOyo-Ita](https://github.com/AbrahamOyo-Ita)

---

## ⚖️ License

Private & Proprietary. All rights reserved.
