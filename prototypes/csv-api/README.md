# Dispatcher Prototype (Workers for Platforms)

This prototype translates the W4P architecture decisions into executable multi-tenant dispatch logic.

## What it models
- Host/path tenant resolution.
- Plan-based per-request limits (`cpuMs`, `subRequests`).
- Cloudflare dispatch limit mapping (`cpu_ms`, `subrequests`) for live Workers-for-Platforms calls.
- Structured dispatch lifecycle events.
- Failure mapping for missing tenant and tenant worker errors.
- Cloudflare Worker adapter that maps dispatcher decisions to `env.DISPATCHER.get(..., { limits })`.
- Tenant directory parsing from either `byHost/bySlug` or registry-style `tenants[]` JSON.
- E2E test path from CLI deploy metadata -> dispatcher worker routing.
- E2E paid x402 flow through dispatcher to upstream paywalled CSV API.
- Optional edge x402 middleware (`x402Enabled`) with challenge/verify/settle flow.
- Optional tenant usage quotas (`usageLimit.dailyRequests`, `usageLimit.monthlyRequests`).
- Settlement idempotency and replay dedupe (`x-payment-idempotency-key`, `x-payment-deduped`).
- Optional tenant spend caps (`spendLimit.dailySpendUsd`, `spendLimit.monthlySpendUsd`).
- Settlement ledger + audit append-only writes to `CONTROL_DB` D1 when bound.
- Built-in discovery analytics endpoints:
  - `GET /__platform/events?limit=100`
  - `GET /__platform/analytics?window=today|week|overall`

## Run tests

```bash
cd /Users/Shared/Projects/402claw/prototypes/csv-api
npm test

# Optional Phase 1.3 wrangler integration test
npm run test:d1:integration
```

## D1 Setup (Phase 1.1)

Create and apply the initial D1 schema:

```bash
cd /Users/Shared/Projects/402claw/prototypes/csv-api

# 1) Create database (copy database_id from output)
npm run d1:create

# 2) Add D1 binding to wrangler.toml (or start from wrangler.example.toml)
# [[d1_databases]]
# binding = "CONTROL_DB"
# database_name = "clawr-prod"
# database_id = "<your-d1-database-id>"

# 3) Apply schema locally for dev (uses wrangler.d1.local.toml + ./.wrangler-d1 persist dir)
npm run d1:migrate:local

# 3b) Verify local tables
npm run d1:verify:local

# 4) Apply schema remotely to Cloudflare D1
npm run d1:migrate:remote
```

Schema file:
- `migrations/0001_initial.sql`

Tables included:
- `tenants`
- `users`
- `api_keys`
- `ledger`
- `audit_log`

## Core API (Runtime-Agnostic)
- `resolveTenantFromRequest(requestUrl, tenantDirectory)`
- `resolveDispatchLimits({ plan, overrides })`
- `buildDispatchPayload({ requestUrl, tenant })`
- `createDispatcher({ tenantDirectory, fetchTenantWorker, onEvent })`

## Marketplace Metrics Prototype

File: `src/marketplace-metrics.js`

Purpose:
- Build leaderboard-ready analytics for `today`, `week`, and `overall`.
- Aggregate hero stats (`activeAgents`, `publishedApis`, `directories`, `calls`, `revenueUsd`).
- Rank APIs with anti-gaming penalties (traffic concentration, burst concentration, latency/error quality).
- Produce directory rollups for category cards.

Key exports:
- `normalizeUsageEvent(rawEvent)`
- `computeTrendingScore(metrics)`
- `buildWindowSnapshot(events, { window, now, topLimit })`
- `buildMarketplaceAnalytics(events, { now, topLimit })`

Tests:
- `tests/marketplace-metrics.test.js`

## Cloudflare Adapter

File: `src/cloudflare-worker.js`

Exports:
- `createCloudflareDispatcherWorker(options)`
- `parseTenantDirectory(input)`
- default worker export

Expected env bindings/vars:
- `DISPATCHER` (Workers for Platforms dispatch namespace binding)
- `TENANT_DIRECTORY_JSON` (JSON string)
- Optional: `USAGE_KV` (KV namespace for persistent analytics across isolates)
- Optional: `BILLING_KV` (KV namespace for settlement idempotency/spend counters; falls back to `RATE_KV` when unset)
- Optional: `FACILITATOR_URL` / `X402_FACILITATOR_URL` / `X402_FACILITATOR_PROD_URL`
- Optional: `FACILITATOR_API_KEY`
- Optional: `PAY_TO_ADDRESS`
- Optional: `CONTROL_DB` (D1 binding for immutable settlement ledger + audit trail)

`TENANT_DIRECTORY_JSON` supports:
- `{"byHost": {...}, "bySlug": {...}}`
- or `{"tenants":[{"slug":"acme","workerName":"tenant-acme-worker","plan":"pro","hosts":["acme.api.402claw.dev"]}]}`

Tenant fields used by edge middleware/analytics:
- `priceUsd`
- `x402Enabled` (boolean)
- `usageLimit.dailyRequests` / `usageLimit.monthlyRequests`
- `spendLimit.dailySpendUsd` / `spendLimit.monthlySpendUsd`
- `limits.cpuMs` + `limits.subRequests`
- `ownerUserId` / `owner`
- `directory`

Quota/rate response headers:
- Rate limiting: `X-RateLimit-*`, `Retry-After`
- Quotas: `X-Usage-Day-*`, `X-Usage-Month-*`
- Quota exceeded: `X-Usage-Limit`, `X-Usage-Remaining`, `X-Usage-Reset`, `X-Usage-Window`, `Retry-After`
- Spend caps: `X-Spend-*`, `X-Spend-Day-*`, `X-Spend-Month-*`
- Settlement replay/idempotency: `x-payment-idempotency-key`, `x-payment-deduped`

See `wrangler.example.toml` for a deploy shape example.

## Standalone Deploy Script

File: `src/cloudflare-worker-standalone.js`

Purpose:
- single-file dispatcher worker module suitable for API upload (no local imports required)
- reads `TENANT_DIRECTORY_JSON` and `DISPATCHER` binding from environment
- applies plan-based dispatch limits
