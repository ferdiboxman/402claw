# Quickstart

Deploy your first paid API in 5 minutes.

## Install

```bash
npm install -g 402claw
```

## Deploy a Dataset

Turn any CSV or JSON file into a paid API:

```bash
402claw deploy products.csv --tenant my-products --price 0.001
```

Output:
```json
{
  "ok": true,
  "tenant": { "slug": "my-products", "priceUsd": "0.001" },
  "endpoint": "/my-products/v1/records"
}
```

## Deploy a Function

Deploy a JS function as a paid endpoint:

```bash
402claw deploy handler.js --tenant my-function --type function --price 0.01
```

Your function receives `request` and returns a `Response`:

```javascript
// handler.js
export default {
  async fetch(request) {
    return new Response(JSON.stringify({ hello: "world" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

## Wrap an Existing API

Monetize any upstream API:

```bash
402claw wrap https://api.example.com/v1 --tenant wrapped-api --price 0.002
```

## Test Your API

Without payment (returns 402):
```bash
curl https://api.402claw.com/my-products/v1/records
# HTTP 402 Payment Required
```

With x402 payment header:
```bash
curl -H "X-Payment: <x402-payment-token>" \
  https://api.402claw.com/my-products/v1/records
```

## Set Usage Limits

Control abuse with built-in rate limits and quotas:

```bash
402claw deploy data.csv --tenant my-api --price 0.001 \
  --caller-rate-limit 100/60s \
  --quota-day 5000 \
  --quota-month 100000
```

## Next Steps

- [CLI Reference](cli-reference.md) — All commands
- [Pricing](pricing.md) — How payments work
- [API Format](api-format.md) — Request/response format
