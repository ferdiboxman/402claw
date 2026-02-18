# x402 Next.js API

HTTP-paid API using the [x402 protocol](https://x402.org) with Next.js App Router. Payments in USDC on Base.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your wallet address
npm install
npm run dev
```

## How It Works

1. Client calls `GET /api/data`
2. Middleware returns `402 Payment Required` with payment details
3. Client pays USDC on Base via the facilitator
4. Client retries with `X-PAYMENT` header containing payment proof
5. Route handler verifies payment and returns data

## Project Structure

```
├── middleware.ts      # x402 payment gate for /api/* routes
├── x402.config.ts     # Centralized pricing & wallet config
├── app/api/data/
│   └── route.ts       # Paid endpoint with payment verification
└── .env.example       # Environment variables
```

## Adding Paid Routes

1. Add pricing in `x402.config.ts`
2. Create route handler in `app/api/`
3. Verify payment in the handler (middleware handles 402 responses)
