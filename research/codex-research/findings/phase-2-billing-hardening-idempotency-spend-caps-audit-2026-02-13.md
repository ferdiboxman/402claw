# Phase 2 Billing Hardening - Idempotency, Spend Caps, Audit Trail (2026-02-13)

## Scope
- Implement Phase 2.1/2.2/2.3 hardening in dispatcher runtime:
  - settlement idempotency
  - tenant spend caps
  - append-only settlement audit trail in D1

## Implemented Changes

### 1) Settlement Idempotency (Task 2.1)
- File: `prototypes/csv-api/src/cloudflare-worker.js`
- Added deterministic idempotency key resolution from payment payload.
- Added settlement record caching in KV/memory:
  - `BILLING_KV` preferred
  - `RATE_KV` fallback
  - isolate-memory fallback when no KV exists
- Added replay dedupe behavior:
  - repeated payment with same idempotency key bypasses facilitator `/settle`
  - response headers include:
    - `x-payment-idempotency-key`
    - `x-payment-deduped: true` on replay

### 2) Spend Caps (Task 2.2)
- File: `prototypes/csv-api/src/cloudflare-worker.js`
- Added tenant config support:
  - `spendLimit.dailySpendUsd`
  - `spendLimit.monthlySpendUsd`
- Added cumulative spend checks per tenant before settlement.
- Added cap block response:
  - HTTP `402`
  - body error: `cap_exceeded`
  - includes cap window/limit/current/projected values
- Added spend headers:
  - `X-Spend-*`
  - `X-Spend-Day-*`
  - `X-Spend-Month-*`

### 3) Audit Trail + Ledger Writes (Task 2.3)
- File: `prototypes/csv-api/src/cloudflare-worker.js`
- Added optional append-only writes to `CONTROL_DB` D1:
  - `INSERT OR IGNORE` into `ledger` keyed by deterministic settlement ID
  - `INSERT` into `audit_log` with action `payment_settled`
- Audit metadata now includes:
  - `amountUsd`
  - `facilitatorTx`
  - `tenant`
  - `callerHash`
  - `timestamp`
  - `idempotencyKey`

## Test Coverage Added
- File: `prototypes/csv-api/tests/cloudflare-worker.test.js`
- Added tests:
  - `worker dedupes settlement retries by idempotency key`
  - `worker blocks paid calls when tenant spend cap is exceeded`
  - `worker writes settlement ledger and audit trail to CONTROL_DB`

## Docs Updated
- `prototypes/csv-api/README.md`
  - new runtime capabilities
  - new headers
  - billing KV binding notes
- `prototypes/csv-api/wrangler.example.toml`
  - optional `BILLING_KV` binding example
- `prototypes/cli/src/index.js` + `prototypes/cli/src/registry.js`
  - spend cap flags added to deploy/wrap:
    - `--spend-day <usd>`
    - `--spend-month <usd>`
  - persisted into tenant registry as `spendLimit`

## Validation
- `npm test` in `prototypes/csv-api`: pass.
- `npm test` in `prototypes/cli`: pass.
