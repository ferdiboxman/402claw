# Code Functions Research + Build Sprint (2026-02-13)

## Executive Summary
402claw now supports three runtime resource types in the same tenant model: `dataset`, `function`, and `proxy`. The dispatcher was hardened for production safety with fail-closed payment verification, authenticated raw event access, and KV-backed request rate limiting. This closes key launch blockers while keeping the architecture compatible with Workers for Platforms dispatch namespaces.

## Scope Covered
- Code-function deploy path from CLI to tenant worker generation
- API wrapper/proxy deploy path with method control, auth header injection, caching, and transform support
- Security hardening in dispatcher around x402 verification and analytics exposure
- Marketplace metrics integrity improvements to reduce spammed trend inflation
- Test coverage for new deploy modes and dispatcher protections

## Core Findings
1. **Fail-open payments are too risky for production**
   - Local fallback payment verification and settlement are useful in isolated dev loops, but must be opt-in.
   - Decision: default to fail-closed when no facilitator is configured.

2. **Public raw events are a privacy and abuse risk**
   - Exposing caller-level raw traffic should require operator auth.
   - Decision: protect `__platform/events` with `PLATFORM_ANALYTICS_TOKEN` unless explicitly opened.

3. **Trending needs event quality filters**
   - 402 challenge spam can inflate call counters if treated as normal activity.
   - Decision: mark payment challenge/failure events as `countable: false` and exclude from ranking snapshots.

4. **Code functions can be sandboxed enough for MVP with policy wrapper**
   - Worker wrapper can enforce host allowlists and explicit env exposure.
   - Decision: support `config.allowedHosts`, `config.maxDuration`, `config.exposeEnv` as first capability layer.

5. **Proxy wrapping is a high-leverage creator primitive**
   - Many early APIs will be wrappers around existing providers.
   - Decision: first prototype includes method allowlist, auth injection, cache TTL, transform, and caller rate limits.

## Implemented Architecture Changes

### 1. Multi-resource Registry
File: `/Users/Shared/Projects/402claw/prototypes/cli/src/registry.js`

Added first-class support for:
- `resourceType: "dataset" | "function" | "proxy"`
- `sourcePath` + `sourceType`
- `proxy` config storage
- `rateLimit` config storage (`perCaller`, `global`, `burst`)

Backward compatibility retained for existing dataset fields (`datasetPath`, `datasetType`).

### 2. CLI Command Surface
File: `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`

Added:
- `deploy <source-path> --type function|dataset` (auto detects `.js/.mjs/.csv/.json`)
- `wrap <upstream-url> ...` command for API proxy tenants
- Rate limit parsing:
  - `--rate-limit-caller 100/60s`
  - `--rate-limit-global 10000/1h`
  - `--rate-limit-burst 20`
- Dispatcher deploy option:
  - `--rate-kv-id <namespace-id>`

### 3. Tenant Worker Generation
File: `/Users/Shared/Projects/402claw/prototypes/cli/src/cloudflare.js`

Added three generation paths:
- Dataset worker (existing)
- Function wrapper worker (new)
- Proxy worker (new)

Function wrapper includes:
- import + execution of user handler
- optional timeout (`config.maxDuration`)
- outbound host allowlist (`config.allowedHosts`)
- explicit env projection (`config.exposeEnv`)

Proxy worker includes:
- upstream URL forwarding
- method allowlist
- header injection
- GET cache support
- optional JSON transform

### 4. Dispatcher Security Hardening
File: `/Users/Shared/Projects/402claw/prototypes/csv-api/src/cloudflare-worker.js`

Implemented:
- Fail-closed x402 default when facilitator missing
- Dev override via `ALLOW_LOCAL_X402_VERIFICATION=true`
- Auth guard for `GET /__platform/events`
- hashed caller identifiers in usage events
- KV-backed rate limiting (`RATE_KV`) with standard 429 headers

### 5. Analytics Integrity
File: `/Users/Shared/Projects/402claw/prototypes/csv-api/src/marketplace-metrics.js`

Implemented:
- lifecycle-aware usage event fields
- `countable` / `billable` semantics
- exclusion of non-countable events from ranking windows

## Prototype Deliverables
- `/Users/Shared/Projects/402claw/prototypes/code-functions/README.md`
- `/Users/Shared/Projects/402claw/prototypes/code-functions/examples/hello.js`
- `/Users/Shared/Projects/402claw/prototypes/code-functions/examples/fetch-news.js`
- `/Users/Shared/Projects/402claw/prototypes/api-proxy/README.md`
- `/Users/Shared/Projects/402claw/prototypes/api-proxy/examples/coingecko-proxy.yaml`

## Validation
### CLI tests
`/Users/Shared/Projects/402claw/prototypes/cli`
- `npm test`
- Result: passing (includes new function/wrap command tests)

### Dispatcher tests
`/Users/Shared/Projects/402claw/prototypes/csv-api`
- `npm test`
- Result: passing (includes new auth/rate-limit/fail-closed tests)

## Remaining Gaps
1. TS bundling is not implemented (`.ts` still unsupported).
2. Secret management is prototype-level; production should move to encrypted secret references + Cloudflare secret bindings.
3. Rate limiting uses KV counters (non-atomic at extreme concurrency). Durable Objects should be considered for strict guarantees.
4. Control plane persistence still uses local JSON; production should migrate to D1/Postgres.

## Recommended Next Steps
1. Add TypeScript bundling pipeline (esbuild) for function deploys.
2. Move proxy header secrets to named secret references (`--inject-header-secret`).
3. Add payout/on-chain settlement job with idempotent ledger events.
4. Add creator dashboard views from live analytics and tenant-level earnings.

## Sources
- https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
- https://developers.cloudflare.com/workers/
- https://github.com/coinbase/x402
- Internal implementation and tests in this repository
