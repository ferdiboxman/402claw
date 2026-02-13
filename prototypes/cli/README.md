# 402claw CLI Prototype

Local CLI prototype for creator onboarding and tenant registry management.

## Commands

```bash
cd /Users/Shared/Projects/402claw/prototypes/cli

# Deploy (register/update) a dataset-backed tenant
node src/index.js deploy ../x402-server/data/sample.csv \
  --tenant acme \
  --owner alice \
  --plan pro \
  --price 0.002 \
  --host acme.api.402claw.dev \
  --cpu-ms 180 \
  --subrequests 40 \
  --quota-day 10000 \
  --quota-month 200000 \
  --x402 true

# Deploy + publish tenant worker to a dispatch namespace in one command
node src/index.js deploy ../x402-server/data/sample.csv \
  --tenant acme \
  --owner alice \
  --plan pro \
  --price 0.002 \
  --host acme.api.402claw.dev \
  --x402 true \
  --publish \
  --dispatch-namespace clawr-staging

# List tenants
node src/index.js list

# Show one tenant
node src/index.js show acme

# Export byHost/bySlug structure for dispatcher env var
node src/index.js export-tenant-directory

# Cloudflare dispatcher deploy (dry-run by default)
node src/index.js cloudflare-deploy-dispatcher \
  --script-name claw-dispatcher \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token> \
  --dispatch-namespace <dispatch-namespace-id> \
  --usage-kv-id <kv-namespace-id>

# Execute real API calls
node src/index.js cloudflare-deploy-dispatcher \
  --script-name claw-dispatcher \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token> \
  --dispatch-namespace <dispatch-namespace-id> \
  --usage-kv-id <kv-namespace-id> \
  --rate-kv-id <kv-namespace-id> \
  --execute

# Rollback preview (defaults to previous deployment for same script)
node src/index.js cloudflare-rollback-dispatcher \
  --script-name claw-dispatcher \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token>

# Execute rollback
node src/index.js cloudflare-rollback-dispatcher \
  --script-name claw-dispatcher \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token> \
  --execute

# Deploy a real tenant worker script generated from dataset
node src/index.js cloudflare-deploy-tenant \
  --tenant acme \
  --script-name tenant-acme-worker \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token> \
  --dispatch-namespace clawr-staging \
  --execute

# Wrap upstream + inject secret header by reference, then publish
OPENAI_API_KEY=sk-demo \
node src/index.js wrap https://api.example.com/v1 \
  --tenant proxy-secret \
  --price 0.01 \
  --inject-header-secret "Authorization: OPENAI_API_KEY" \
  --publish \
  --dispatch-namespace clawr-staging \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token> \
  --execute

# Bootstrap auth (only needed once, before any keys exist)
node src/index.js user-create --user alice --name "Alice"
node src/index.js auth-create-key --user alice --scope deploy --scope withdraw

# Any command requiring auth can now use --api-key
node src/index.js deploy ../x402-server/data/sample.csv \
  --tenant acme \
  --plan pro \
  --price 0.002 \
  --host acme.api.402claw.dev \
  --api-key <alice-api-key>

# Credit settled revenue and withdraw
node src/index.js revenue-credit --tenant acme --amount 12.40 --source settled_request --api-key <alice-api-key>
node src/index.js balance --tenant acme
node src/index.js withdraw --tenant acme --amount 5 --to 0xabc123 --api-key <alice-api-key>

# Audit log
node src/index.js audit-list --limit 25

# Storage migration (JSON -> D1 adapter backend)
node src/index.js storage-migrate-json-to-d1 --storage-path ./.402claw/control-plane.db
node src/index.js storage-migrate-json-to-d1 --storage-path ./.402claw/control-plane.db --execute

# Roll back D1 storage from a migration backup snapshot
node src/index.js storage-rollback-d1 --backup-dir ./.402claw/backups/json-to-d1-<timestamp>
node src/index.js storage-rollback-d1 --backup-dir ./.402claw/backups/json-to-d1-<timestamp> --execute
```

## Registry format
Registry is stored at `.402claw/tenants.json` by default and contains:
- tenant slug/id
- owner user id
- worker name
- plan
- dataset path/type
- price
- hosts
- optional tenant dispatch limits (`cpuMs`, `subRequests`)
- optional edge-payment toggle (`x402Enabled`)
- optional usage quotas (`usageLimit.dailyRequests`, `usageLimit.monthlyRequests`)

## Control plane format
Persistent multi-user control plane is stored at `.402claw/control-plane.json` by default and contains:
- users
- hashed API keys and scopes
- payout ledger + withdrawals
- append-only audit events

If at least one active API key exists, mutating commands require `--api-key` (or `CLAW_API_KEY`).

## Storage backends

CLI supports two storage backends:
- `json` (default): file-backed storage (`.402claw/tenants.json`, `.402claw/control-plane.json`)
- `d1`: sqlite-backed D1 adapter (for local/prototype parity before remote D1 wiring)

Global storage flags:
- `--storage-backend json|d1`
- `--storage-path <path-to-sqlite-db>` (used by `d1` backend)
- `--storage-migration-sql <path-to-sql>`

Examples:

```bash
# Read tenants from D1 adapter storage
node src/index.js list --storage-backend d1 --storage-path ./.402claw/control-plane.db

# Write deploys to D1 adapter storage
node src/index.js deploy ../x402-server/data/sample.csv \
  --tenant acme \
  --plan pro \
  --price 0.002 \
  --storage-backend d1 \
  --storage-path ./.402claw/control-plane.db
```

## Tests

```bash
npm test
```

## Cloudflare deploy notes

- Default worker source is `../csv-api/src/cloudflare-worker.js` (with local module graph upload).
- Registry content is converted into `TENANT_DIRECTORY_JSON` binding.
- Optional persistent analytics storage can be bound via `--usage-kv-id` (as `USAGE_KV` binding).
- Optional persistent rate/usage counter storage can be bound via `--rate-kv-id` (as `RATE_KV` binding).
- Proxy tenants can publish secret references (`injectHeaderSecrets`) without storing plaintext in registry.
- In `--execute` mode, CLI calls:
  - upload worker module
  - upload referenced worker secrets
  - enable workers.dev subdomain (unless `--workers-dev false` or tenant deploy targets dispatch namespace)
- Deployment history is stored in `.402claw/cloudflare-dispatcher-history.json` by default (override with `--state-path`).
