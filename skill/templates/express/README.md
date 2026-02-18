# x402 Express API

HTTP-paid API using the [x402 protocol](https://x402.org). Payments in USDC on Base.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your wallet address
npm install
npm run dev
```

## How It Works

1. Client calls `GET /api/data`
2. Server returns `402 Payment Required` with payment details
3. Client pays USDC on Base via the facilitator
4. Client retries with `X-PAYMENT` header containing payment proof
5. Server verifies and returns data

## Endpoints

| Route | Price | Description |
|-------|-------|-------------|
| `GET /api/data` | $0.01 | Example paid endpoint |
| `GET /.well-known/x402` | Free | API metadata |
| `GET /health` | Free | Health check |

## Docker

```bash
docker build -t my-x402-api .
docker run -p 3000:3000 --env-file .env my-x402-api
```
