# Usage Limits + Secret Publish Hardening (2026-02-13)

## Executive Summary
Two production-risk gaps were closed in the live prototype stack: secret-safe proxy publishing and tenant-level usage quotas. The CLI can now publish Worker secrets referenced by tenant proxy configs, and the dispatcher now enforces daily/monthly request caps per tenant.

## What Changed

### 1) Secret-safe proxy publish flow
- Proxy tenants can declare secret header references (for example `Authorization -> OPENAI_API_KEY`) without storing plaintext in registry.
- Publish paths now resolve secret values from local environment only at deploy time.
- Tenant deploy fails fast in execute mode when required secrets are missing.
- On successful publish, secrets are uploaded to Cloudflare Worker secret storage via API.

Files:
- `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/registry.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/cloudflare.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/tests/cloudflare.test.js`

### 2) Tenant usage quota enforcement
- New tenant config shape: `usageLimit.dailyRequests` and `usageLimit.monthlyRequests`.
- New CLI flags on `deploy` and `wrap`:
  - `--quota-day <requests>`
  - `--quota-month <requests>`
- Dispatcher now enforces quotas before forwarding requests to tenant workers.
- Quota exceed returns `429 usage_quota_exceeded` with reset and window headers.
- x402 challenge-only responses do not consume quota.

Files:
- `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/registry.js`
- `/Users/Shared/Projects/402claw/prototypes/csv-api/src/cloudflare-worker.js`
- `/Users/Shared/Projects/402claw/prototypes/csv-api/tests/cloudflare-worker.test.js`

## Test Result
- CLI tests: `30/30` passing.
- Dispatcher tests: `34/34` passing.

## Why This Matters
- Prevents accidental secret leakage in tenant config and avoids manual secret setup drift.
- Adds explicit tenant-level usage controls required for spend containment and anti-abuse.
- Improves launch readiness for multi-tenant marketplace workloads.

## Recommended Next Steps
1. Add tenant spend caps (`dailySpendUsd`, `monthlySpendUsd`) with settlement-aware accounting.
2. Move quota counters from best-effort KV increments to atomic Durable Object counters for strict correctness at high concurrency.
3. Expose quota usage state in frontend `/explore` and tenant dashboard APIs.
