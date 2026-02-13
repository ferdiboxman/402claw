# Canonical Architecture Decisions v1 (2026-02-12)

> Historical snapshot. Use `canonical-architecture-decisions-v2.md` for active implementation decisions.

## Executive Summary
This document locks the architecture decisions that 402claw should treat as current source of truth for MVP implementation. It resolves drift across prior research docs and aligns build work to refreshed 2026 assumptions.

## Key Findings
- Core stack choice remains valid: Cloudflare Workers for Platforms + x402.
- Production safety requires explicit env separation (`test` vs `prod`) and facilitator policy.
- Market comparisons must use dated, source-linked assumptions (especially fee benchmarks).
- Stripe machine payments is strategically relevant but should remain optional post-MVP.

## Decision Table

| ID | Decision | Status | Effective Date |
| - | - | - | - |
| D1 | MVP payment rail is x402 only | Locked | 2026-02-12 |
| D2 | MVP production facilitator default is Coinbase CDP (`api.cdp.coinbase.com/platform/v2/x402`) | Locked | 2026-02-12 |
| D3 | Test/demo facilitator (`x402.org/facilitator`) is allowed only in test env | Locked | 2026-02-12 |
| D4 | MVP network is Base mainnet (`eip155:8453`) for production; Base Sepolia (`eip155:84532`) for test | Locked | 2026-02-12 |
| D5 | Runtime is Cloudflare Workers for Platforms with strict per-tenant custom limits from day 1 | Locked | 2026-02-12 |
| D6 | Pricing benchmark messaging uses RapidAPI provider payout docs indicating 75/25 split effective Nov 1, 2025 | Locked | 2026-02-12 |
| D7 | Stripe machine payments/x402 path is deferred to post-MVP as optional facilitator integration | Locked | 2026-02-12 |

## Detailed Analysis

### D1-D4: Payments and Environment
- Keep MVP narrow with one primary payment rail (x402) to reduce integration surface.
- Use clear environment policy:
  - `test`: x402.org facilitator + Base Sepolia
  - `prod`: CDP facilitator + Base mainnet
- Fail closed if production config attempts to use test facilitator endpoint.

### D5: Runtime and Cost Safety
- Keep Workers for Platforms as runtime baseline.
- Apply custom limits (`cpuMs`, `subRequests`) per tenant plan in dispatcher layer.
- Treat provider hard limits as ceiling, not as safe defaults.

### D6: Market Benchmarks
- Standardize positioning language to dated benchmark:
  - RapidAPI payout docs indicate providers receive 75% from Nov 1, 2025.
- Avoid mixed 20%/25%/30% claims without timeframe.

### D7: Stripe Strategy
- Stripe machine payments is in private preview and validates x402 direction.
- Do not make Stripe a dependency for MVP shipping.
- Keep abstraction points so Stripe path can be added later without rewiring core flow.

## Implementation Impact
- Required in MVP code:
  - env-aware facilitator resolver
  - env-aware network resolver
  - production guardrail against test facilitator
- Required in docs:
  - one benchmark source and date per market claim
  - explicit production vs test configuration examples

## Change Control
- Any change to D1-D7 must:
1. Include source links and date.
2. Update this file first.
3. Reference impacted implementation files.

## Sources
- `/Users/Shared/Projects/402claw/research/codex-research/findings/research-gap-audit-2026-02-12.md`
- `/Users/Shared/Projects/402claw/research/codex-research/deep-dives/2026-platform-payments-market-refresh.md`
- https://docs.cdp.coinbase.com/x402/docs/quickstart
- https://docs.stripe.com/payments/machine/x402
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
- https://support.rapidapi.com/hc/en-us/articles/23316742102679-How-does-Rapid-API-calculate-the-providers-payout
