# Cloudflare Env Validation (2026-02-13)

## Executive Summary
Local `.env` credentials are valid and can deploy standard Cloudflare Workers from the CLI prototype.
Workers for Platforms dispatcher deployment is blocked by account entitlement: dispatch namespaces are not enabled on this account.

## What Was Validated
- API token validity (`/user/tokens/verify`): success, active.
- Account lookup (`/accounts/{id}`): success.
- CLI tenant deploy path (`cloudflare-deploy-tenant --execute`): success.
- Live worker endpoint check (`/health`, `/v1/records`): success.
- Dispatcher deploy with dispatch namespace (`cloudflare-deploy-dispatcher --execute`): blocked by Cloudflare entitlement.

## Repro Commands
```bash
cd /Users/Shared/Projects/402claw
set -a; source .env; set +a

# Validate token and account access
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID"

# Bootstrap tenant and deploy from CLI prototype
cd /Users/Shared/Projects/402claw/prototypes/cli
node src/index.js deploy ../x402-server/data/sample.csv \
  --tenant smoketest --owner codex --plan pro --price 0.002 \
  --host smoketest.api.402claw.dev

node src/index.js cloudflare-deploy-tenant \
  --tenant smoketest \
  --script-name tenant-smoketest-worker \
  --execute
```

## Live Proof
- Worker URL: `https://tenant-smoketest-worker.ferdiboxman.workers.dev/health`
- Health response: `{"ok":true,"tenant":"smoketest","records":20}`
- Records endpoint also returned expected data.

## Blocker
Dispatcher execute attempt returns Cloudflare API error:
- "You do not have access to dispatch namespaces."
- Path: `PUT /accounts/{accountId}/workers/scripts/claw-dispatcher`

## Recommendation
- For immediate MVP: deploy per-tenant standard Workers (works now) and use registry routing at app layer.
- For Workers-for-Platforms architecture: enable/purchase Cloudflare dispatch namespace entitlement on the target account.

## Sources
- Cloudflare API token verify endpoint: https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/
- Cloudflare Workers for Platforms docs: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
