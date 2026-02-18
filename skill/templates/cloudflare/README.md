# x402 Cloudflare Worker Template

Payment-gated API using the [x402 protocol](https://x402.org) on Cloudflare Workers. Accepts USDC payments on Base.

## Quick Start

```bash
npm install
# Set your wallet address in wrangler.toml or as a secret:
wrangler secret put RECIPIENT_ADDRESS
npm run dev
```

## Endpoints

| Path | Price | Description |
|------|-------|-------------|
| `GET /health` | Free | Health check |
| `GET /.well-known/x402` | Free | Bazaar discovery metadata |
| `GET /api/data` | 0.01 USDC | Premium data |
| `GET /api/premium` | 0.05 USDC | Premium analytics |

## How It Works

1. Client requests a paid endpoint without `X-PAYMENT` header → receives `402` with payment requirements.
2. Client pays USDC on Base using the details in the 402 response.
3. Client retries with `X-PAYMENT` header containing the payment proof.
4. Worker verifies payment with the facilitator (`https://x402.org/facilitator`).
5. If valid, the paid content is returned.

## Adding Endpoints

Edit `PAID_ROUTES` in `src/worker.ts`:

```ts
const PAID_ROUTES: Record<string, RouteConfig> = {
  "/api/my-endpoint": {
    description: "My new endpoint",
    price: "0.02",
  },
};
```

Then add the response handler in the fetch function.

## Deploy

```bash
npm run deploy
```
