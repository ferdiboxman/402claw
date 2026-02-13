# 402claw Secrets Inventory

Last updated: 2026-02-13

## Scope
This inventory tracks runtime secrets used by prototypes and frontend. Values must be stored in secure secret managers (Cloudflare Secrets / CI secrets / local `.env`), never committed.

## Core Secrets

| Secret | Used by | Purpose | Rotation guidance |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CLI deploy commands (`prototypes/cli`) | Cloudflare API auth for worker deploy, rollback, tenant publish | Rotate every 90 days or immediately on leak |
| `CLOUDFLARE_ACCOUNT_ID` | CLI deploy commands | Target account for API calls | Non-secret identifier, still treat as sensitive metadata |
| `CLOUDFLARE_DISPATCH_NAMESPACE` | Dispatcher/tenant deploy flow | Workers for Platforms namespace target | Rotate/recreate if namespace compromised |
| `FACILITATOR_API_KEY` | Dispatcher worker (`prototypes/csv-api/src/cloudflare-worker.js`) | Auth with facilitator for verify/settle | Rotate every 90 days; immediate rotation on suspicious settlement events |
| `CLAWR_EVENTS_API_TOKEN` | Dispatcher `__platform/events` endpoint | Protect platform events API access | Rotate every 60 days; keep separate from deploy tokens |
| `CLAWR_SESSION_SECRET` | Frontend auth (`frontend/src/lib/auth/session.ts`) | HMAC signing for session cookies | Rotate every 30 days with dual-key migration plan |
| `PAY_TO_ADDRESS` | x402 flows (`prototypes/x402-server`, dispatcher requirement metadata) | Settlement destination wallet | Update under change-control + audit event |

## Optional / Environment Config

| Variable | Type | Notes |
|---|---|---|
| `CLAWR_ANALYTICS_BASE_URL` | config | Frontend analytics upstream URL |
| `X402_FACILITATOR_URL` | config | Test facilitator endpoint |
| `X402_FACILITATOR_PROD_URL` | config | Production facilitator endpoint |
| `X402_NETWORK` / `X402_NETWORK_PROD` | config | Chain IDs (Base testnet/mainnet) |

## Storage Rules
- Local development: `.env` in repo root (gitignored).
- Cloudflare Workers: set with `wrangler secret put` per environment.
- GitHub Actions: store in repository/environment secrets.
- Never print secret values in logs or research docs.

## Rotation Process (Minimum)
1. Add new secret value in secret manager.
2. Deploy with both old/new acceptance if protocol allows.
3. Cut traffic to new secret.
4. Revoke old secret.
5. Record action in audit log (`audit-list` / deployment notes).

## Gaps
- No automatic dual-key session secret rotation in frontend yet.
- No scheduled key-rotation automation in CI/CD yet.
