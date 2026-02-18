# x402 FastAPI Template

Payment-gated API using the [x402 protocol](https://x402.org) with FastAPI. Accepts USDC payments on Base.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your wallet address
pip install -r requirements.txt
uvicorn main:app --reload
```

## Docker

```bash
docker build -t x402-api .
docker run -p 8000:8000 --env-file .env x402-api
```

## Endpoints

| Path | Price | Description |
|------|-------|-------------|
| `GET /health` | Free | Health check |
| `GET /.well-known/x402` | Free | Bazaar discovery metadata |
| `GET /api/data` | 0.01 USDC | Premium data |
| `GET /api/premium` | 0.05 USDC | Premium analytics |

## Adding Endpoints

1. Add the route to `PAID_ROUTES` in `main.py`.
2. Create the endpoint handler as a normal FastAPI route.
3. The middleware handles all payment logic automatically.

## How It Works

The `X402PaymentMiddleware` intercepts requests to paid routes:
- No `X-PAYMENT` header → returns 402 with payment requirements.
- `X-PAYMENT` present → verifies with facilitator → serves content if valid.
