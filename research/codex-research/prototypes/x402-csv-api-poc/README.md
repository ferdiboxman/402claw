# x402 CSV API PoC

Prototype for `402claw`: CSV-to-API protected by an x402-style payment challenge/response flow.

## What this demonstrates

- Unpaid request gets `402 Payment Required` with `payment-required` challenge header.
- Client auto-builds a payment payload and retries with `payment-signature`.
- Server verifies and settles payment with a mock facilitator before returning data.
- Dataset is loaded from CSV and queried through REST (`/v1/records`).

## Run

```bash
cd /tmp/402claw-codex/codex-research/prototypes/x402-csv-api-poc
npm test
npm run demo
```

## CLI

```bash
npm run start
# prints api and facilitator URLs

node src/cli.js call http://127.0.0.1:PORT
node src/cli.js status http://127.0.0.1:API_PORT http://127.0.0.1:FAC_PORT
```

## Protocol notes

This PoC mirrors x402 v2 transport patterns but uses a simplified mock settlement path. For production, replace the mock facilitator with a real x402 facilitator and mechanism implementations.
