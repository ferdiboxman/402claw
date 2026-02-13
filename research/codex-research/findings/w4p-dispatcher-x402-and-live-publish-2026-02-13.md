# W4P Dispatcher + x402 + Live Publish (2026-02-13)

## Executive Summary
The prototype now supports end-to-end tenant publishing from CLI to a Cloudflare Workers for Platforms dispatch namespace and a dispatcher runtime with optional edge x402 middleware.
Live validation on `clawr-dispatcher.ferdiboxman.workers.dev` confirms: x402 challenge is returned for an `x402Enabled` tenant, paid retry succeeds, and tenant worker responses are routed correctly.

## What Was Implemented

### 1) Dispatcher runtime hardening
- File: `/Users/Shared/Projects/402claw/prototypes/csv-api/src/cloudflare-worker.js`
- Added edge x402 middleware flow:
  - payment challenge (`402` + `payment-required` header)
  - payment verification (`/verify` facilitator if configured; local fallback for prototype)
  - settlement (`/settle` facilitator if configured; local fallback)
  - settlement receipt header (`payment-response`)
- Added usage/discovery endpoints:
  - `GET /__platform/events?limit=<n>`
  - `GET /__platform/analytics?window=today|week|overall&top=<n>`
- Added usage event emission fields compatible with marketplace ranking logic.

### 2) Cloudflare W4P correctness for limits
- File: `/Users/Shared/Projects/402claw/prototypes/csv-api/src/dispatcher.js`
- Dispatch limits now map to Cloudflare dynamic dispatch shape:
  - `cpu_ms`
  - `subrequests`
- Kept internal tenant-plan model with `cpuMs`/`subRequests` and added conversion helper.

### 3) CLI deploy → real user worker publish
- Files:
  - `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`
  - `/Users/Shared/Projects/402claw/prototypes/cli/src/cloudflare.js`
  - `/Users/Shared/Projects/402claw/prototypes/cli/src/registry.js`
- `deploy` command now supports:
  - `--cpu-ms`, `--subrequests`, `--x402`
  - `--publish` (deploys tenant worker immediately)
  - `--dispatch-namespace`
- Tenant worker deploy supports namespace endpoint:
  - `PUT /accounts/{account}/workers/dispatch/namespaces/{namespace}/scripts/{script}`
- Dispatcher deploy now uploads local module graph (not just single-file script), enabling deployment of `cloudflare-worker.js` with imports.

## Live Verification

### Commands executed
```bash
cd /Users/Shared/Projects/402claw/prototypes/cli
set -a; source ../../.env; set +a

# tenant upsert + publish to dispatch namespace
node src/index.js deploy ../x402-server/data/sample.csv \
  --tenant livecheck \
  --owner codex \
  --plan pro \
  --price 0.001 \
  --x402 true \
  --host livecheck.api.402claw.dev \
  --cpu-ms 180 \
  --subrequests 40 \
  --publish \
  --dispatch-namespace "$CLOUDFLARE_DISPATCH_NAMESPACE"

# deploy dispatcher with tenant directory + namespace binding
node src/index.js cloudflare-deploy-dispatcher \
  --script-name clawr-dispatcher \
  --dispatch-namespace "$CLOUDFLARE_DISPATCH_NAMESPACE" \
  --execute
```

### Runtime checks
```bash
# challenge
curl 'https://clawr-dispatcher.ferdiboxman.workers.dev/t/livecheck/v1/records?limit=1'
# -> x402Version=2 + missing_payment_signature challenge

# paid retry
node --input-type=module -e '...fetchWithX402(...)...'
# -> HTTP 200
```

## Tests
- `prototypes/csv-api`: `26/26` pass
- `prototypes/cli`: `18/18` pass

## Caveats / Next Work
- Analytics is currently best-effort in-memory; cross-isolate persistence requires a bound KV namespace (`USAGE_KV`).
- For production, replace local x402 fallback with strict facilitator-only verify/settle policy.
- Add explicit auth for `__platform/analytics` and `__platform/events` endpoints before public launch.

## Sources
- Cloudflare Workers for Platforms dynamic dispatch docs:
  - https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/dynamic-dispatch/
- Cloudflare API endpoint for dispatch namespace scripts:
  - https://developers.cloudflare.com/api/resources/workers/subresources/dispatch/subresources/namespaces/subresources/scripts/methods/update/
