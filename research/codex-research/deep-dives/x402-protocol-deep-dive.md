# x402 Protocol Deep Dive

## Executive Summary
x402 v2 is now a clean HTTP challenge/response protocol (`402` + `PAYMENT-REQUIRED`, then retry with `PAYMENT-SIGNATURE`, then `PAYMENT-RESPONSE`) with explicit support for multiple mechanisms and networks. The implementation in `coinbase/x402` is mature enough for an MVP, but there are critical integration details around settlement timing, facilitator reliability, header compatibility (v1/v2), and permit2-specific `412` behavior.

## Canonical Alignment (2026-02-12)
Use this deep dive as protocol detail, not as the final decision source. Active implementation policy lives in:
- `research/codex-research/deep-dives/canonical-research-baseline-2026-02-12.md`
- `research/codex-research/findings/canonical-architecture-decisions-v2.md`

Specific lock-ins from canonical decisions:
- `prod` must not use `https://x402.org/facilitator`.
- `prod` with CDP facilitator requires `FACILITATOR_API_KEY`.
- Base mainnet for `prod` (`eip155:8453`) and Base Sepolia for `test` (`eip155:84532`).

## Key Findings
- x402 v2 transport is header-first and backward-compatibility with v1 headers is still present in client wrappers.
- `@x402/fetch` and `@x402/axios` include explicit retry-loop protection.
- Server-side flow separates verification and settlement; framework middleware can block response delivery when settlement fails.
- Permit2 allowance failures can intentionally return `412 Precondition Failed` instead of `402`.
- Facilitator selection is capability-driven with fallback to trying all configured facilitators.
- Default facilitator client points at `https://x402.org/facilitator`; this is convenient for demos but should not be hardcoded for production marketplaces.
- Ecosystem facilitator availability is uneven; routing/failover strategy is mandatory for production.

## Detailed Analysis

### 1. Transport Semantics in v2
The protocol-level HTTP handshake is:
1. Buyer calls protected endpoint.
2. Seller returns `402 Payment Required` with encoded requirements in `PAYMENT-REQUIRED` header.
3. Buyer creates signed payment payload and retries with `PAYMENT-SIGNATURE`.
4. Seller verifies and settles, then returns protected response and `PAYMENT-RESPONSE` header.

Migration docs explicitly show v1 to v2 header changes:
- `X-PAYMENT` -> `PAYMENT-SIGNATURE`
- `X-PAYMENT-RESPONSE` -> `PAYMENT-RESPONSE`

For 402claw, this means API consumers can be migrated incrementally if you expose both a modern v2 path and compatibility guidance.

### 2. Core Server Flow and Failure Modes
In `x402HTTPResourceServer`:
- payment extraction reads `PAYMENT-SIGNATURE` (v2) first.
- unpaid response builder emits `PAYMENT-REQUIRED`.
- settlement headers are emitted as `PAYMENT-RESPONSE`.
- special-case status mapping returns `412` when error is `permit2_allowance_required`.

This is important for client UX:
- `402` means "pay now" path.
- `412` (Permit2 allowance needed) means "approve once, then retry" path.

If your first-party SDK hides this distinction, users will experience ambiguous failures.

### 3. Retry Behavior in Official HTTP Clients
`@x402/fetch` and `@x402/axios` both protect against infinite retry loops:
- fetch wrapper checks whether request already has `PAYMENT-SIGNATURE` or `X-PAYMENT`.
- axios wrapper marks retries with an internal retry flag.

This guard is essential. Without it, malformed requirements or signer failures can create repeated paid-retry loops and runaway call volume.

### 4. Settlement Timing and Response Buffering
Express/Hono/Next middleware implementations buffer successful route responses until settlement completes. If settlement fails, protected payload is not released and an error is returned instead.

Implications for 402claw:
- do not stream protected data before settlement completes.
- route handlers should be fast; settlement latency is now on critical path.
- observability must separate verify latency, settle latency, and handler latency.

### 5. Facilitator Selection, Capability Discovery, and Failover
`x402ResourceServer` initializes against one or multiple facilitator clients and maps supported kinds by `(version, network, scheme)`. If no specific facilitator is mapped, it falls back to trying all configured facilitators for verify/settle.

This supports a multi-facilitator architecture for uptime, but only if you:
- run regular `supported` health checks,
- pin preferred facilitators per tenant/network,
- degrade gracefully when one facilitator is stale or unavailable.

### 6. Mechanism-Level Behavior: Permit2 and EIP-3009
Spec and implementation show permit2 has a precondition path for allowance. In `scheme_exact_evm.md`, verifier logic explicitly allows returning `412 Precondition Failed` when allowance setup is missing.

For your MVP, EIP-3009 first is lower friction for custodial/provider-managed flows; Permit2 introduces an extra approval state you must message clearly.

### 7. Live Facilitator Reality Check (2026-02-12)
`https://www.x402.org/facilitator/supported` currently reports limited public kinds (Base Sepolia and Solana devnet variants across v1/v2). It is suitable for test/demo flows, but not sufficient as sole production dependency for broad mainnet coverage.

From partner metadata in the x402 ecosystem list, `/supported` checks show mixed reliability (200/401/404/523/timeout across providers). This validates that 402claw should ship with:
- configurable facilitator endpoint per environment/tenant,
- periodic capability snapshotting,
- automatic failover and circuit-breakers.

### 8. Edge Cases to Design For
- malformed encoded payment headers (decode failure path).
- malformed URL/path encoding in protected route matching tests.
- partial settlement failures after successful handler execution.
- duplicate settlement attempts and idempotency.
- extension-driven behavior drift (new keys in requirements/payload).

## Code Examples

### Example A: Minimal challenge/response pattern (prototype)
```js
// unpaid
if (!payment) {
  return json(402, challenge, {
    "payment-required": JSON.stringify(challenge),
  });
}

// paid retry
const verified = await verifyPayment({ payment, requirement });
if (!verified.isValid) {
  return json(402, invalidChallenge, {
    "payment-required": JSON.stringify(invalidChallenge),
  });
}

const settlement = await settlePayment({ payment });
if (!settlement.settled) return json(502, { error: "settlement_failed" });

return json(200, data, {
  "payment-response": JSON.stringify(settlement.receipt),
});
```

### Example B: Retry-loop prevention signal
```ts
if (clonedRequest.headers.has("PAYMENT-SIGNATURE") || clonedRequest.headers.has("X-PAYMENT")) {
  throw new Error("Payment already attempted");
}
```

## Recommendations
- Use v2 headers by default in 402claw SDK/CLI; keep opt-in v1 compatibility mode only for migration.
- Treat `412 permit2_allowance_required` as a first-class UX state, not a generic error.
- Implement facilitator abstraction now (primary + fallback + health score), even for MVP.
- Make settlement idempotency a hard requirement before beta.
- Store verify/settle traces and correlate with request IDs for dispute handling.
- Start with EIP-3009 routes for least-friction onboarding; add Permit2 after approval UX is hardened.

## Sources
- https://github.com/coinbase/x402/blob/main/docs/guides/migration-v1-to-v2.mdx
- https://github.com/coinbase/x402/blob/main/typescript/packages/core/src/http/x402HTTPResourceServer.ts
- https://github.com/coinbase/x402/blob/main/typescript/packages/http/fetch/src/index.ts
- https://github.com/coinbase/x402/blob/main/typescript/packages/http/axios/src/index.ts
- https://github.com/coinbase/x402/blob/main/typescript/packages/http/express/src/index.ts
- https://github.com/coinbase/x402/blob/main/typescript/packages/core/src/server/x402ResourceServer.ts
- https://github.com/coinbase/x402/blob/main/typescript/packages/core/src/http/httpFacilitatorClient.ts
- https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md
- https://www.x402.org/facilitator/supported
- `research/codex-research/deep-dives/canonical-research-baseline-2026-02-12.md`
- `research/codex-research/findings/canonical-architecture-decisions-v2.md`
- See `research/claude-research/402claw-technical-spec.md` for prior architecture context.
