# Canonical Architecture Decisions v2 (2026-02-12)

## Executive Summary
This is the active architecture decision record for the next MVP build sprint. It supersedes ambiguous assumptions in earlier docs by adding confidence-scored, date-stamped decisions.

Primary change from v1:
- CDP pricing assumptions and competitor-fee assumptions are now explicitly marked by confidence and verification quality.

## Decision Table

| ID | Decision | Status | Confidence | Effective Date |
| - | - | - | - | - |
| D1 | MVP payment rail is x402 only | Locked | High | 2026-02-12 |
| D2 | MVP production facilitator default is CDP x402 endpoint (`https://api.cdp.coinbase.com/platform/v2/x402`) | Locked | High | 2026-02-12 |
| D3 | Test/demo facilitator (`https://x402.org/facilitator`) is test-only and blocked in `prod` | Locked | High | 2026-02-12 |
| D4 | MVP network policy: `prod` on Base mainnet (`eip155:8453`), `test` on Base Sepolia (`eip155:84532`) | Locked | High | 2026-02-12 |
| D5 | Runtime is Cloudflare Workers for Platforms with mandatory per-tenant dispatch limits (`cpuMs`, `subRequests`) | Locked | High | 2026-02-12 |
| D6 | Stripe machine-payments/x402 path is optional and deferred until post-MVP | Locked | High | 2026-02-12 |
| D7 | Competitor fee comparisons must always include date + source confidence | Locked | High | 2026-02-12 |
| D8 | CDP usage/cost modeling uses latest docs signal (1,000 tx/month free, then $0.001/tx), reviewed before public pricing copy | Locked | Medium | 2026-02-12 |

## Detailed Decisions

### D1-D4: Payments And Environment Safety
- Keep one payment rail for MVP to reduce failure surface.
- Enforce environment policy at startup:
  - `prod` must not use `x402.org/facilitator`.
  - `prod` with CDP endpoint must require `FACILITATOR_API_KEY`.
- Keep Base-only for MVP to simplify operations and support.

### D5: Runtime Safety And Unit Economics
- Cloudflare provider limits are not sufficient safety controls by themselves.
- 402claw must apply stricter per-plan limits at dispatch time:
  - control CPU exposure,
  - cap fanout/subrequests,
  - isolate abuse quickly.

### D6: Stripe Scope Control
- Stripe machine payments validates direction but stays private preview.
- Do not couple MVP ship criteria to Stripe availability or preview contract terms.

### D7: Benchmark Hygiene
- No external-facing "we are X times cheaper" claims unless:
  1. source link is present,
  2. date is explicit,
  3. confidence level is declared.

### D8: CDP Cost Assumptions
- Treat current CDP pricing signal as medium confidence due dynamic docs rendering.
- Re-verify before:
  - landing-page claims,
  - public calculator assumptions,
  - partner sales decks.

## Implementation Requirements

### Required In Code
- env-aware facilitator resolver.
- env-aware network resolver.
- `prod` guardrails for facilitator URL and required auth.
- request-level telemetry including `runtimeEnv` and `facilitatorUrl`.

### Required In Docs/Product Copy
- fee benchmark footnotes with date.
- pricing comparison confidence notes.
- changelog process for assumption changes.

## Sources
- `/Users/Shared/Projects/402claw/research/codex-research/deep-dives/canonical-research-baseline-2026-02-12.md`
- `/Users/Shared/Projects/402claw/research/codex-research/deep-dives/2026-platform-payments-market-refresh.md`
- https://github.com/coinbase/x402
- https://www.x402.org/facilitator/supported
- https://api.cdp.coinbase.com/platform/v2/x402/supported
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/custom-limits/
- https://developers.cloudflare.com/changelog/2025-10-01-workers-paid-plans-updated-subrequests/
- https://docs.stripe.com/payments/machine/supported-protocols/x402

## Relationship To v1
- Keep `canonical-architecture-decisions-v1.md` as historical context.
- Use this v2 file for active implementation and planning.
