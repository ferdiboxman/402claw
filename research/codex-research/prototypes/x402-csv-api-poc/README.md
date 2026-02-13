# x402 CSV API PoC

Prototype for `402claw`: CSV-to-API protected by an x402-style payment challenge/response flow.

## What this demonstrates

- Unpaid request gets `402 Payment Required` with `payment-required` challenge header.
- Client auto-builds a payment payload and retries with `payment-signature`.
- Server verifies and settles payment with a mock facilitator before returning data.
- Server supports primary/fallback facilitator URLs for verify/settle resilience.
- Server emits structured request telemetry with `x-request-id` correlation.
- Dataset is loaded from CSV and queried through REST (`/v1/records`).

## Run

```bash
cd /Users/Shared/Projects/402claw/research/codex-research/prototypes/x402-csv-api-poc
npm test
npm run demo
```

## CLI

```bash
npm run start
# prints api and facilitator URLs

node src/cli.js call http://127.0.0.1:PORT
node src/cli.js status http://127.0.0.1:API_PORT http://127.0.0.1:FAC_PORT
node src/cli.js telemetry http://127.0.0.1:API_PORT 20
```

## Protocol notes

This PoC mirrors x402 v2 transport patterns but uses a simplified mock settlement path. For production, replace the mock facilitator with a real x402 facilitator and mechanism implementations.

## Telemetry

- `GET /v1/telemetry?limit=50` returns recent in-memory telemetry events.
- Every response includes `x-request-id`.
- Payment path emits:
  - `payment_challenge_issued`
  - `payment_verify_failed`
  - `payment_settlement_failed`
  - `payment_settled`

## Environment and Guardrails

- Runtime env values:
  - `test` (default): uses Base Sepolia network (`eip155:84532`)
  - `prod`: uses Base mainnet network (`eip155:8453`)
- Facilitator policy:
  - In `prod`, the PoC rejects `https://x402.org/facilitator` (test/demo facilitator) by design.
  - Default prod facilitator target is `https://api.cdp.coinbase.com/platform/v2/x402`.
  - If prod uses CDP facilitator, `FACILITATOR_API_KEY` is required.
- Multi-facilitator fallback:
  - `FACILITATOR_URLS=http://primary,http://fallback` (comma-separated) is supported.
  - If not set, server uses env-aware single-url default.

This keeps local demos simple while preventing accidental testnet facilitator usage in production-mode config.
