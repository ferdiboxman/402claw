# Canonical Research Baseline (2026-02-12)

## Executive Summary
This document is the current source of truth for the 402claw research phase as of **2026-02-12**. It consolidates local-repo code analysis, live endpoint checks, and public documentation scans into one baseline that is safe to build from.

The core thesis is still valid:
- **Runtime**: Cloudflare Workers for Platforms
- **Payment protocol**: x402
- **Initial network focus**: Base
- **Product wedge**: "Upload CSV/JSON -> ship paid API quickly"

What changed versus older assumptions is operational detail:
- use strict environment separation for facilitators,
- treat competitor fee claims as time-bound and confidence-scored,
- implement cost/abuse guardrails in dispatcher from day 1,
- avoid making Stripe a hard dependency while machine payments remain private preview.

---

## Scope And Method
Research in this pass included:
- full read-through of existing `research/codex-research` docs and findings,
- code-level inspection of upstream repositories:
  - `coinbase/x402` (latest local pull at commit `2536820`)
  - `serenorg/seren-desktop` (latest local pull at commit `03fa201`)
- live endpoint checks with `curl`:
  - `https://www.x402.org/facilitator/supported`
  - `https://api.cdp.coinbase.com/platform/v2/x402/supported`
- market-signal extraction:
  - HN Algolia API (`search` and `search_by_date` for `x402`)
  - GitHub search API for `x402` repositories
- doc/source verification for Cloudflare, Coinbase CDP, Stripe, RapidAPI, Val Town, Seren.

---

## Evidence Matrix (Verified 2026-02-12)

| Area | Claim | Confidence | Notes |
| - | - | - | - |
| x402 core SDK | `HTTPFacilitatorClient` defaults to `https://x402.org/facilitator` | High | Verified in source code (`typescript/packages/core/src/http/httpFacilitatorClient.ts`) |
| x402 core SDK | `getSupported()` retries on `429` with exponential backoff | High | Verified in source code |
| x402 resource server | `initialize()` gives earlier facilitators precedence and continues on facilitator errors | High | Verified in source code |
| x402 server flow | verify/settle both have fallback path that tries all facilitators | High | Verified in source code |
| x402 HTTP adapter | `permit2_allowance_required` maps to HTTP `412` | High | Verified in source code |
| x402 fetch/axios wrappers | explicit retry-loop protections exist | High | Verified in source code |
| x402 test facilitator | `/supported` returns testnet/devnet kinds and signer set | High | Live `curl` check |
| CDP facilitator endpoint | `/supported` returns `401` without API key | High | Live `curl` check |
| Cloudflare Workers limits | Paid subrequest ceiling increased from 1,000 to 10,000 | High | Cloudflare changelog entry |
| Cloudflare W4P architecture | Dynamic dispatch + custom per-call limits are first-class | High | Cloudflare W4P docs |
| CDP x402 pricing | 1,000 tx/month free then $0.001/tx | Medium | CDP docs/search summaries are consistent; page parsing is dynamic |
| Stripe machine payments | x402 support is private preview | High | Stripe docs metadata/summaries consistently mark private preview |
| RapidAPI provider fee | 25% platform fee for new providers in late 2025 | Medium/Low | Search snippets indicate this; direct support article was blocked by anti-bot |
| Val Town pricing | Free / Pro / Teams / Enterprise tiering | Medium | Search snippets + pricing page metadata, but full dynamic extraction is noisy |
| Seren pricing claims | "pay per call", "no subscriptions", "USDC on Base" claims | Medium | Search snippets + limited page extraction + code-level corroboration of billing primitives |

---

## x402 Deep Dive (Code-Verified)

### 1. Facilitator Defaults And Auth Surface
In `coinbase/x402` TypeScript core:
- `DEFAULT_FACILITATOR_URL` is `https://x402.org/facilitator`.
- `FacilitatorConfig` supports a `createAuthHeaders()` function returning separate header maps for:
  - `verify`
  - `settle`
  - `supported`

Implication for 402claw:
- default behavior is demo-friendly, not production-safe by itself,
- production configuration must be explicit and fail-closed.

### 2. Capability Discovery And Resilience
`HTTPFacilitatorClient.getSupported()`:
- retries on `429` up to three attempts,
- uses exponential backoff,
- fails hard on non-retryable errors.

`x402ResourceServer.initialize()`:
- loads supported kinds from all configured facilitators,
- preserves precedence for earlier facilitators in the array,
- warns and continues if one facilitator fails.

Implication:
- we can support multi-facilitator topologies without hard outages from one failing provider,
- but we still need health scoring and explicit ordering in 402claw config.

### 3. Payment Verification And Settlement Behavior
`x402ResourceServer` behavior from source:
- `verifyPayment()`:
  - uses mapped facilitator if available,
  - otherwise tries all facilitators in order.
- `settlePayment()`:
  - same fallback strategy.
- both phases expose lifecycle hooks:
  - `onBeforeVerify`, `onAfterVerify`, `onVerifyFailure`
  - `onBeforeSettle`, `onAfterSettle`, `onSettleFailure`

Implication:
- 402claw can add robust telemetry, circuit-breakers, and recovery behavior without forking upstream protocol semantics.

### 4. HTTP Semantics And Edge Cases
`x402HTTPResourceServer` confirms:
- payment extraction is header-based (`PAYMENT-SIGNATURE`),
- unpaid responses include `PAYMENT-REQUIRED`,
- successful settlement returns `PAYMENT-RESPONSE`,
- `permit2_allowance_required` produces HTTP `412`.

Implication:
- client tooling should distinguish:
  - `402` -> "create/sign payment and retry",
  - `412` -> "allowance/precondition flow before retry".

### 5. Retry Loop Protection In Client Wrappers
`@x402/fetch` and `@x402/axios` both guard against infinite retries:
- fetch wrapper rejects if payment header already exists,
- axios wrapper sets internal retry marker (`__is402Retry`).

Implication:
- 402claw SDK/CLI wrappers should keep this pattern intact and add request-id tracing.

### 6. Live Facilitator Checks
On 2026-02-12:
- `https://www.x402.org/facilitator/supported` returned HTTP 200 with test/dev supported kinds.
- `https://api.cdp.coinbase.com/platform/v2/x402/supported` returned HTTP 401 without credentials.

Implication:
- test and production flows are operationally distinct by design.
- prod path must require API key configuration in tooling and deployment validation.

---

## Cloudflare Workers For Platforms Deep Dive

### 1. Why W4P Still Fits 402claw
Cloudflare W4P still maps directly to our needs:
- run untrusted customer code in isolated Workers,
- route through a dispatcher,
- deploy/update tenant workers programmatically,
- enforce per-tenant limits in dispatch calls.

The key primitive is dynamic dispatch with explicit per-call limits.

### 2. Important Limits Update
Cloudflare changelog indicates the paid subrequest ceiling was raised:
- from **1,000** to **10,000** subrequests per request,
- effective November 1, 2025.

Design impact:
- provider ceilings are no longer the practical bottleneck,
- our own plan limits become the primary safety mechanism.

### 3. Cost Control Pattern For MVP
Use custom limits at dispatch layer (`cpuMs`, `subRequests`) tied to creator plan:
- free/entry tiers: strict,
- paid tiers: higher but bounded,
- abuse quarantine tier: very low hard caps.

This prevents denial-of-wallet scenarios and keeps economics predictable.

### 4. Multi-Tenant Runtime Pattern
Recommended architecture:
1. Public ingress -> dispatcher.
2. Dispatcher resolves tenant + API.
3. Dispatcher applies auth, rate limits, x402 gate, and policy checks.
4. Dispatcher calls tenant worker with plan limits.
5. Tenant worker handles business logic.
6. Optional egress controls applied for outbound calls.

### 5. Observability Requirements
Minimum event dimensions for incident response and payout disputes:
- `request_id`, `tenant_id`, `api_id`
- `status_code`, `payment_required`, `payment_verified`, `settlement_success`
- `facilitator_url`, `runtime_env`
- `cpu_ms`, `subrequests`
- error category (`protocol`, `facilitator`, `tenant_code`, `platform_policy`)

---

## Coinbase, Stripe, And Base Landscape

### 1. Coinbase CDP x402 (Current Read)
Current docs/search signals consistently indicate:
- CDP x402 endpoint path: `https://api.cdp.coinbase.com/platform/v2/x402`
- test facilitator endpoint remains public for demos (`x402.org`)
- pricing model references:
  - first 1,000 transactions/month free,
  - then $0.001 per transaction.

Live check confirms production endpoint requires authentication.

### 2. Stripe Machine Payments
Current Stripe docs indicate:
- machine payments support x402 path,
- status is **private preview**,
- preview documentation has referenced zero Stripe fees in preview context.

Strategy impact:
- treat Stripe as strategic validation, not MVP dependency.

### 3. Base Position
Base remains the pragmatic default chain for MVP:
- strong ecosystem overlap with x402 and CDP tooling,
- explicit presence in current payment/platform narratives.

Practical choice:
- MVP paid production: Base mainnet (`eip155:8453`)
- MVP test: Base Sepolia (`eip155:84532`)

---

## Competitive Landscape (RapidAPI, Val Town, Seren)

### 1. RapidAPI
What is clear:
- still the nearest benchmark for API monetization marketplaces,
- provider payout/fee messaging has changed over time.

Current issue:
- direct support article verification was blocked by anti-bot in this environment.
- docs pages also showed some path drift/404 behavior.

Working assumption (medium/low confidence until manually re-verified):
- late-2025 model for new providers appears to be 25% platform fee.

Decision consequence:
- keep positioning language date-bound and evidence-qualified.
- avoid hard "X is always 25%" claims in marketing copy until direct page capture is stable.

### 2. Val Town
Val Town remains the best benchmark for:
- speed of developer feedback loop,
- low-friction deployment UX.

Even when monetization model differs, their UX bar is relevant to us.

### 3. Seren
Seren is the most direct directional competitor to our longer-term vision:
- agent-native paid tooling narrative,
- marketplace framing,
- codebase includes explicit billing model primitives:
  - `x402_per_request`
  - `prepaid_credits`

For 402claw:
- short-term differentiation: easier file-to-paid-API path.
- medium-term requirement: marketplace metadata and billing primitives in schema from day one.

---

## Community And Ecosystem Signals

### 1. HN Signal
Using HN Algolia:
- many recent x402-related posts have low points/comments,
- one core x402 launch story had high engagement (hundreds of points/comments).

Inference:
- ecosystem is active and interesting, but still early and uneven.
- execution quality and reliability will outperform protocol-only messaging.

### 2. GitHub Signal
GitHub search (2026-02-12 snapshot):
- `coinbase/x402` is high-star and actively updated.
- many adjacent repos are recent and experimental.

Inference:
- strong innovation velocity,
- variable durability,
- we should optimize for robust production behavior, not ecosystem hype.

---

## Canonical Architecture Decisions (Build-Safe)

1. **Payment rail (MVP)**: x402 only.
2. **Facilitator policy**:
   - `test`: allow `https://x402.org/facilitator`
   - `prod`: default to CDP endpoint, block test facilitator by policy
3. **Network policy**:
   - `test`: Base Sepolia
   - `prod`: Base mainnet
4. **Runtime policy**:
   - Cloudflare W4P dispatcher + per-tenant limits mandatory from day 1.
5. **Stripe policy**:
   - keep as pluggable post-MVP integration.
6. **Positioning policy**:
   - fee benchmark claims must include source date and confidence note.

---

## Immediate Build Implications

### 1. Configuration Guards (Must-Have)
- fail startup if `prod` + test facilitator URL,
- fail startup if `prod` + CDP facilitator without API key,
- include explicit `runtimeEnv` in logs and receipts.

### 2. Dispatcher Guardrails (Must-Have)
- plan-based `cpuMs` and `subRequests` limits,
- anti-abuse quotas and request burst controls,
- canonical request-id propagation.

### 3. Payment Reliability (Must-Have)
- idempotent settlement handling,
- retry policy with bounded attempts,
- clear error taxonomy for `402`, `412`, facilitator errors, and policy rejects.

### 4. Product UX (Must-Have)
- preserve "one-command" experience,
- provide clear remediation when payment preconditions fail,
- expose payment/debug headers in developer tooling.

---

## Research Gaps Still Open

1. **Legal/compliance**: platform-fee + withdrawals framing by jurisdiction.
2. **Competitive pricing certainty**: direct, crawl-proof capture of RapidAPI payout docs.
3. **Stripe go-live readiness**: post-preview constraints and production commitments.
4. **Unit economics**: measured CPU/subrequest distribution under realistic workload mixes.
5. **Cross-chain roadmap**: explicit criteria for when to add Solana or other networks.

---

## Recommended Next 2-Week Execution

### Week 1
1. Merge this baseline into all active planning docs.
2. Lock env/facilitator/network guards in prototype and CLI.
3. Add dispatcher-level limits and telemetry schema.
4. Build settlement idempotency tests.

### Week 2
1. Run staging load tests with 3 traffic profiles:
   - low-latency simple reads,
   - high-subrequest fanout,
   - heavy CSV filtered queries.
2. Produce cost model from measured `cpu_ms` and `subrequests`.
3. Add onboarding UX for payment failure categories (`402`, `412`, auth missing).
4. Prepare beta checklist and incident playbook draft.

---

## Sources

### Primary Code Sources
- https://github.com/coinbase/x402
- https://github.com/serenorg/seren-desktop

### Cloudflare
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/dynamic-dispatch/
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/custom-limits/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/changelog/2025-10-01-workers-paid-plans-updated-subrequests/

### x402 / Coinbase CDP / Stripe
- https://www.x402.org/facilitator/supported
- https://api.cdp.coinbase.com/platform/v2/x402/supported
- https://docs.cdp.coinbase.com/paymaster/docs/x402
- https://docs.cdp.coinbase.com/paymaster/docs/x402-supported-networks
- https://docs.cdp.coinbase.com/paymaster/docs/pricing
- https://docs.stripe.com/payments/machine
- https://docs.stripe.com/payments/machine/supported-protocols/x402

### Competitors
- https://support.rapidapi.com/hc/en-us/articles/23316742102679-How-does-Rapid-API-calculate-the-providers-payout
- https://docs.rapidapi.com/docs/provider-portal/monetization/pricing/
- https://www.val.town/pricing
- https://www.seren.ai/pricing

### Ecosystem Signal APIs
- https://hn.algolia.com/api/v1/search_by_date?query=x402&tags=story
- https://hn.algolia.com/api/v1/search?query=x402&tags=story
- https://api.github.com/search/repositories?q=x402&sort=stars&order=desc&per_page=20

### Notes On Verification Quality
- Some competitor and product pages are JS-heavy or anti-bot protected in this environment.
- Where direct extraction was blocked, claims are marked medium/low confidence and should be manually re-verified before external-facing copy.
