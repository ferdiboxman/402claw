# MVP Risk Register and Architecture Decisions

## Executive Summary
This document converts deep-dive findings into concrete MVP decisions. The immediate path is viable: W4P runtime, x402 v2 transport, facilitator abstraction, and a CLI-first deployment flow. The main execution risk is not protocol correctness but operational reliability (facilitator outages, settlement failures, and cost controls).

Decision authority note:
- Treat this file as risk/action tracking.
- Treat `research/codex-research/findings/canonical-architecture-decisions-v2.md` as the active decision contract for implementation.

## Key Findings
- x402 + W4P architecture is feasible now with low integration risk.
- Settlement and facilitator reliability are the critical unknowns.
- Cloudflare cost controls must be enforced per-tenant from first deployment.
- Competitor differentiation is strongest on onboarding speed + lower fee clarity.

## Detailed Analysis

### Decision 1: Protocol baseline
- Decision: x402 v2 headers first (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`).
- Rationale: aligns with active SDKs and migration guidance.
- Risk: v1 clients still exist.
- Mitigation: provide compatibility mode in SDK or gateway adapter.

### Decision 2: Runtime and tenant model
- Decision: Workers for Platforms with one namespace per environment.
- Rationale: native multi-tenant isolation and dynamic dispatch.
- Risk: routing errors can cross tenants if naming is weak.
- Mitigation: strict tenant ID mapping and dispatch key validation.

### Decision 3: Facilitator strategy
- Decision: configurable primary+fallback facilitator list.
- Rationale: ecosystem endpoint reliability is mixed.
- Risk: verify/settle outages break monetization path.
- Mitigation: health checks, cached supported kinds, circuit breakers, alerting.

### Decision 4: Cost containment
- Decision: enforce per-tenant `cpuMs` and `subRequests` limits in dispatcher.
- Rationale: prevents denial-of-wallet and accidental expensive workloads.
- Risk: false positives for legitimate workloads.
- Mitigation: plan-based limits + override workflow.

### Decision 5: Product scope
- Decision: CLI-first onboarding + API route generation from CSV/JSON.
- Rationale: fastest path to proof of value.
- Risk: weaker discovery/marketplace surface in first release.
- Mitigation: add lightweight catalog and usage analytics in v1.1.

## Risk Register
| ID | Risk | Severity | Likelihood | Owner | Mitigation |
| - | - | - | - | - | - |
| R1 | Facilitator outage / partial downtime | High | Medium | Backend | Multi-facilitator failover + health checks |
| R2 | Settlement fails after handler success | High | Medium | Backend | Buffer responses until settlement; idempotent settle |
| R3 | Runaway CPU/subrequests from tenant code | High | Medium | Platform | Custom limits + egress policy + alerts |
| R4 | Payment UX confusion on `402` vs `412` | Medium | Medium | SDK/UX | Dedicated error states and docs |
| R5 | Fee-positioning mismatch with market claims | Medium | Medium | GTM | Keep explicit, dated pricing docs |
| R6 | Slow first-time setup for creators | High | Low | Product | CLI wizard + sample dataset templates |

## Code Examples

### Example: decision-compliant dispatch skeleton
```js
const userWorker = env.DISPATCHER.get(tenant, {}, {
  limits: { cpuMs: plan.cpuMs, subRequests: plan.subRequests },
});
```

## Recommendations
- Freeze MVP architecture on the five decisions above.
- Implement an internal SLO dashboard before public beta (verify success, settle success, p95 latency).
- Ship one golden end-to-end flow in docs: upload dataset -> deploy -> paid call -> payout.

## Sources
- `deep-dives/x402-protocol-deep-dive.md`
- `deep-dives/cloudflare-workers-for-platforms-deep-dive.md`
- `competitive-analysis/rapidapi-val-town-seren-teardown.md`
- `findings/canonical-architecture-decisions-v2.md`
- See `research/claude-research/402claw-final-mvp-plan.md` for prior milestone assumptions.
