# Pricing

## How It Works

402claw uses the [x402 protocol](https://www.x402.org/) for micropayments. When a caller hits your paid endpoint:

1. **402 Response** — Without payment, endpoint returns `HTTP 402 Payment Required` with pricing info
2. **Payment Header** — Caller includes `X-Payment` header with signed USDC authorization
3. **Verification** — 402claw verifies payment via the x402 facilitator
4. **Execution** — Request proceeds, payment settles on Base

## Currency

- **USDC on Base** (Ethereum L2)
- Sub-cent transactions possible
- Near-instant settlement

## Platform Fee

**5% of gross revenue**

| Gross | Fee (5%) | You Keep |
|-------|----------|----------|
| $1.00 | $0.05 | $0.95 |
| $10.00 | $0.50 | $9.50 |
| $100.00 | $5.00 | $95.00 |

Compare to RapidAPI's 25% fee.

## Setting Prices

Price per request in USD:

```bash
402claw deploy data.csv --tenant my-api --price 0.001
```

Common price points:

| Price | Use Case |
|-------|----------|
| $0.0001 | High-volume data lookups |
| $0.001 | Standard API calls |
| $0.01 | Compute-intensive operations |
| $0.10+ | Premium/AI endpoints |

## Caller Spend Limits

Protect callers from runaway costs:

```bash
402claw deploy data.csv --tenant my-api --price 0.001 \
  --spend-day 10 \
  --spend-month 100
```

Once a caller hits their spend limit, requests return `429 Too Many Requests`.

## Payouts

Check your balance:

```bash
402claw balance --tenant my-api
```

Withdraw to your wallet:

```bash
402claw withdraw --tenant my-api --amount 50 --to 0xYourWallet...
```

Withdrawals settle in USDC on Base.

## x402 Flow

```
Caller                     402claw                    Your API
  |                           |                          |
  |-- GET /endpoint --------->|                          |
  |<-- 402 + pricing ---------|                          |
  |                           |                          |
  |-- GET + X-Payment ------->|                          |
  |                           |-- verify payment ------->|
  |                           |<-- OK -------------------|
  |                           |                          |
  |                           |-- execute request ------>|
  |                           |<-- response -------------|
  |<-- response --------------|                          |
```

## Why x402?

- **HTTP-native** — Uses standard 402 status code
- **No accounts** — Pay with any wallet
- **Micropayments** — Sub-cent transactions viable on L2
- **Permissionless** — No API keys or signup required
