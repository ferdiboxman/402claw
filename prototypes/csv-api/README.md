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
- Built-in discovery analytics endpoints:
  - `GET /__platform/events?limit=100`
  - `GET /__platform/analytics?window=today|week|overall`

## Run tests

```bash
cd /Users/Shared/Projects/402claw/prototypes/csv-api
npm test
```

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
- Optional: `FACILITATOR_URL` / `X402_FACILITATOR_URL` / `X402_FACILITATOR_PROD_URL`
- Optional: `FACILITATOR_API_KEY`
- Optional: `PAY_TO_ADDRESS`

`TENANT_DIRECTORY_JSON` supports:
- `{"byHost": {...}, "bySlug": {...}}`
- or `{"tenants":[{"slug":"acme","workerName":"tenant-acme-worker","plan":"pro","hosts":["acme.api.402claw.dev"]}]}`

Tenant fields used by edge middleware/analytics:
- `priceUsd`
- `x402Enabled` (boolean)
- `usageLimit.dailyRequests` / `usageLimit.monthlyRequests`
- `limits.cpuMs` + `limits.subRequests`
- `ownerUserId` / `owner`
- `directory`

Quota/rate response headers:
- Rate limiting: `X-RateLimit-*`, `Retry-After`
- Quotas: `X-Usage-Day-*`, `X-Usage-Month-*`
- Quota exceeded: `X-Usage-Limit`, `X-Usage-Remaining`, `X-Usage-Reset`, `X-Usage-Window`, `Retry-After`

See `wrangler.example.toml` for a deploy shape example.

## Standalone Deploy Script

File: `src/cloudflare-worker-standalone.js`

Purpose:
- single-file dispatcher worker module suitable for API upload (no local imports required)
- reads `TENANT_DIRECTORY_JSON` and `DISPATCHER` binding from environment
- applies plan-based dispatch limits
