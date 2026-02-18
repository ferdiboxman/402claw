# Data API Example

Serve CSV data as a paid JSON API using x402.

## What it does

Reads `data.csv` and serves rows as JSON behind an x402 paywall. Each request costs $0.001 USDC.

## Run

```bash
npm install
npm run dev
# → http://localhost:3000/api/data
```

## Test

```bash
# Should return 402
curl http://localhost:3000/api/data

# Pay and get data
npx x402-fetch http://localhost:3000/api/data
```
