# OmniRoute GitHub Research

Research date: 11 August 2026

## Clarification: developer tool versus product integration

OmniRoute should not be embedded into the deployed Erna product, but it **is a valid local developer-tool fallback for the Codex CLI**. This distinction corrects the interpretation in the original review.

- Product integration: not currently required by the Erna PRD.
- Local coding-agent gateway: suitable after the Codex plan allowance is exhausted, provided it routes to non-Codex providers.

The complete machine-specific setup and security plan is in `OMNIROUTE_CODEX_FALLBACK.md`.

## Result

The canonical repository is [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute).

OmniRoute is an **AI/LLM gateway**, not a WhatsApp or customer-notification router. It exposes an OpenAI-compatible API and routes requests across multiple AI providers and models using priorities, fallback, cost, latency, quota and other strategies. It also includes a dashboard, MCP/A2A support, prompt compression and desktop/PWA packaging.

It must not be confused with OpenWA. The two products have different responsibilities:

| Product | Responsibility in Erna |
| --- | --- |
| OpenWA | WhatsApp delivery for opted-in, non-financial notifications |
| OmniRoute or another AI gateway | Optional future routing for AI models |
| Supabase | Authentication, database, storage, RLS and server-side application state |
| Paystack | Payments, subscriptions and transfers |

## Canonical repository verification

- Repository: <https://github.com/diegosouzapw/OmniRoute>
- Package name: `omniroute`
- Package version inspected: `3.8.49`
- License: MIT
- Runtime declared by the package: Node.js 22.22.2 or compatible Node.js 24–26 versions
- Repository state inspected: active `3.8.x` development, thousands of commits, open issues and pull requests, security policy, tests and release tooling
- Supported versions stated in its security policy: `3.8.x` active and `3.7.x` receiving security support

The similarly named repositories returned by GitHub search include forks and copies. Use the canonical owner above as the source of truth and do not install a random fork.

## Erna product fit

The current Erna PRD and implementation do not require an LLM gateway. No present payment, wallet, authentication, marketplace, task-proof, WhatsApp or Phase 4 requirement needs OmniRoute.

Potential future uses are limited to non-authoritative assistance, for example:

- Drafting a customer-support reply for a human agent to approve
- Classifying support tickets for routing
- Flagging task or listing text for human moderation
- Summarizing an appeal for an administrator
- Producing internal analytics summaries from carefully minimized data

AI output must never directly:

- Approve or reject a withdrawal
- Move wallet funds
- Decide KYC or compliance status
- Approve task proof without deterministic controls and the required review workflow
- Receive OTPs, passwords, full bank details, Paystack secrets or Supabase service credentials
- Override database authorization, RLS or admin permissions

## Security observations

OmniRoute has useful controls, including scoped API keys, authorization tiers, rate limiting, circuit breaking and optional credential/PII filtering. Its security documentation also states important boundaries that matter to Erna:

1. Stored credentials use AES-256-GCM only when `STORAGE_ENCRYPTION_KEY` is configured. Its documented fallback is plaintext passthrough when the key is absent. A production deployment must fail closed during startup if this key is missing.
2. Built-in guardrails are documented as fail-open when a guardrail throws an exception.
3. Guardrails can be disabled per request with a request header. An Erna-facing proxy must strip that header and enforce mandatory policies outside the gateway.
4. Prompt-injection detection is explicitly best-effort and can produce both false positives and false negatives. It is not a financial or moderation authorization control.
5. The gateway holds powerful third-party provider credentials and therefore must run as an isolated private service, not inside the public Next.js process and not directly exposed to browsers.
6. Requests may be sent to different third-party AI providers. Erna would need a data-processing review, provider allow-list, retention policy, redaction, audit trail and consent/privacy updates before sending user data.

## Comparable AI gateway repositories

### 1. LiteLLM

Repository: <https://github.com/BerriAI/litellm>

Best fit if Erna later needs a mature, centralized AI gateway with virtual keys, spend tracking, load balancing, guardrails, cost controls and broad provider support. It is operationally larger and introduces Python/Rust infrastructure, so it should be a separately deployed service.

### 2. Portkey AI Gateway

Repository: <https://github.com/Portkey-AI/gateway>

Best fit when a lightweight TypeScript gateway and integrated guardrail ecosystem are preferred. It offers retries, fallbacks, load balancing and an OpenAI-compatible interface. Licensing and the boundary between open-source and enterprise features must be rechecked against the exact version before adoption.

### 3. Helicone AI Gateway

Repository: <https://github.com/Helicone/ai-gateway>

Best fit when routing performance, caching, rate limits, spend limits and observability are the main goals. It is Rust-based and should also be operated separately. Recheck the exact repository license because GitHub metadata and README summaries have shown inconsistent license labels.

## If “OmniRoute” meant omnichannel customer messaging

The closer repositories are:

- [Dittofeed](https://github.com/dittofeed/dittofeed): customer journeys across email, SMS, push, WhatsApp and other channels.
- [Tercela](https://github.com/tags-dev/tercela): shared inbox and WhatsApp Cloud API communication with contacts, templates and agent assignment.
- [WaSphere](https://github.com/wasphere/wasphere): self-hosted WhatsApp API with signed webhooks and scoped API keys; its provider model and WhatsApp terms need careful review.

Erna already has the narrower OpenWA outbox, consent, signed webhook, retry and email-fallback architecture. Adding a full omnichannel platform now would duplicate that work and materially expand the security and operational surface.

## Product-integration recommendation

Do **not** integrate OmniRoute into the deployed Erna application at this stage. Using it separately on the developer's computer as the model gateway for Codex CLI is appropriate and does not add an AI feature to the Erna product.

If an AI feature is added to the PRD later, run a short proof of concept with **LiteLLM or Portkey** behind a private server-only adapter. Keep all AI activity advisory, redact user data before routing, use a strict provider allow-list, enforce a per-user and global budget, log model decisions, and retain a deterministic human-controlled path for every financial or moderation action.

## Action taken

Research only. No repository was cloned, no dependency was installed and no Erna production code was changed as part of this review.
