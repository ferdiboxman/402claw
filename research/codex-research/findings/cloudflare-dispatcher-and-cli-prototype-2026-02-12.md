# Cloudflare Dispatcher + CLI Prototype Progress (2026-02-12)

## Executive Summary
This increment moves the MVP from architecture notes to runnable platform primitives. We now have a tested dispatcher core, a Cloudflare Worker adapter for W4P-style dispatch limits, and a CLI prototype that manages tenant deploy metadata and exports dispatcher-ready routing maps.

## Key Findings
- Host and path tenant routing both work in tests.
- Plan-based limits are enforced at dispatch payload generation.
- Worker adapter correctly maps tenant records to `env.DISPATCHER.get(worker, { limits })` calls.
- CLI deployment metadata can be converted into dispatcher `byHost/bySlug` directory JSON.
- End-to-end flow from CLI deploy metadata to dispatcher routing is now test-covered.
- CLI now includes Cloudflare dispatcher deployment command with safe dry-run default and optional execute mode.
- CLI now records Cloudflare deployment history and supports rollback planning/execution from saved state.
- End-to-end paid request flow (x402 challenge -> payment -> settlement) is now validated through dispatcher path.

## Detailed Analysis

### 1. Dispatcher runtime core
File: `prototypes/csv-api/src/dispatcher.js`

What is implemented:
- tenant resolution from hostname or `/t/:slug` path mode
- deterministic per-plan limits (`free`, `pro`, `business`, `enterprise`, `quarantine`)
- structured dispatch lifecycle events (`dispatch_start`, `dispatch_success`, `dispatch_failure`)

Why it matters:
- directly implements canonical requirement for custom per-tenant limits in the dispatch layer.

### 2. Cloudflare Worker adapter
File: `prototypes/csv-api/src/cloudflare-worker.js`

What is implemented:
- Cloudflare-style `fetch(request, env)` handler
- tenant directory parsing from two shapes:
  - direct maps (`byHost`, `bySlug`)
  - registry shape (`tenants[]`)
- path rewrite support for `/t/:slug/*`
- passthrough response from tenant worker with trace headers (`x-request-id`, `x-tenant-id`)
- controlled error mapping:
  - `404 tenant_not_found`
  - `500 dispatcher_binding_missing`
  - `502 tenant_worker_failure`

### 3. CLI prototype for deploy metadata
Files:
- `prototypes/cli/src/registry.js`
- `prototypes/cli/src/index.js`
- `prototypes/cli/src/cloudflare.js`

What is implemented:
- `deploy <dataset> --tenant --price` (upsert tenant record)
- `list`
- `show <slug>`
- `export-tenant-directory`
- `cloudflare-deploy-dispatcher` (dry-run plan and optional Cloudflare API execution)
- deployment state file (`.402claw/cloudflare-dispatcher-history.json`)
- `cloudflare-rollback-dispatcher` (dry-run or execute rollback to previous deployment snapshot)

Registry includes:
- `tenantId`, `slug`, `workerName`, `plan`
- dataset path/type
- price
- optional hosts

Why it matters:
- creates practical bridge between creator onboarding and dispatcher routing config.

## Test Evidence
Passing test suites:
- `prototypes/csv-api/tests/dispatcher.test.js`
- `prototypes/csv-api/tests/cloudflare-worker.test.js`
- `prototypes/csv-api/tests/e2e-cli-dispatch.test.js`
- `prototypes/csv-api/tests/e2e-dispatcher-x402-paid-flow.test.js`
- `prototypes/cli/tests/registry.test.js`
- `prototypes/cli/tests/cloudflare.test.js`

Also re-validated existing suites:
- `research/codex-research/prototypes/x402-csv-api-poc` tests
- `prototypes/x402-server` tests

## Gaps Remaining
- No real upload/build/deploy pipeline to Cloudflare APIs yet.
- Tenant registry is file-based only (no auth, no audit log).
- No payout/withdrawal path implemented.

## Recommendations
1. Add a thin deploy adapter that converts CLI registry entries into real Worker script uploads.
2. Integrate dispatcher telemetry with durable sink (analytics/log store).
3. Add first end-to-end scenario test: deploy dataset via CLI -> export tenant directory -> paid request through dispatcher -> settled response.

## Sources
- `prototypes/csv-api/src/dispatcher.js`
- `prototypes/csv-api/src/cloudflare-worker.js`
- `prototypes/cli/src/registry.js`
- `prototypes/cli/src/index.js`
- `research/codex-research/findings/canonical-architecture-decisions-v2.md`
