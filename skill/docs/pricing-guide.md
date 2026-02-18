# Pricing Guide

How to price your x402 API.

---

## Pricing Models

### Per-request (most common)
Charge a fixed amount per API call. Simple and predictable.

```
maxAmountRequired: "1000"   → $0.001 per request
maxAmountRequired: "10000"  → $0.01 per request
maxAmountRequired: "100000" → $0.10 per request
```

USDC has 6 decimals: `1000000` = $1.00.

### Cost-plus
Your cost + margin. Best for APIs that call paid services (OpenAI, databases, etc.).

```
Your cost: $0.003 per OpenAI call
Your price: $0.01 (3.3x markup)
maxAmountRequired: "10000"
```

### Value-based
Price based on what the data is worth, not what it costs you.

- Commodity data (weather, time): $0.0001–$0.001
- Curated data (analytics, insights): $0.01–$0.10
- AI inference: $0.005–$0.05
- Premium/unique data: $0.10–$1.00+

---

## Cost Calculation

Factor in all costs:

| Cost | Example |
|------|---------|
| Compute | $5-20/mo server |
| External APIs | $0.001-0.01/call to OpenAI |
| Data sources | Varies |
| Bandwidth | Usually negligible |
| Your time | Factor it in |

**Formula:**
```
price = (monthly_fixed_costs / expected_monthly_calls) + per_call_costs + margin
```

**Example:**
- Server: $10/mo, expect 10k calls/mo → $0.001/call fixed
- OpenAI: $0.003/call variable
- Total cost: $0.004/call
- Price at 2.5x: $0.01/call → `maxAmountRequired: "10000"`

---

## Competitive Analysis

Before pricing, check:

1. **Bazaar** — what do similar APIs charge?
2. **Traditional APIs** — what's the per-call cost of equivalents?
3. **Free alternatives** — if free options exist, price for convenience/reliability

x402 has zero signup friction, so you can charge a premium over APIs that require registration.

---

## When to Change Prices

**Lower prices when:**
- Volume is lower than expected
- Competitors are cheaper
- You want to grow market share
- Costs decreased

**Raise prices when:**
- You're at capacity
- Your API provides unique value
- Costs increased (e.g., OpenAI price hike)
- Users are clearly getting more value than they pay

**How:** Update `maxAmountRequired` in your code, redeploy. Existing clients adapt automatically — x402 reads the price from each 402 response.

---

## Volume Considerations

**Low volume (<1k calls/mo):** Price higher to cover fixed costs. $0.01-0.10/call.

**Medium volume (1k-100k):** Sweet spot. $0.001-0.01/call.

**High volume (100k+):** Can price very low. $0.0001-0.001/call. Volume makes up for margin.

**The x402 advantage:** No minimum viable volume. Even 10 calls/month generates revenue with zero overhead. No billing infrastructure, no invoices, no payment processing.

---

## Quick Reference

| Use Case | Suggested Price | maxAmountRequired |
|----------|----------------|-------------------|
| Simple data lookup | $0.001 | 1000 |
| Rich data query | $0.005 | 5000 |
| AI inference (small) | $0.01 | 10000 |
| AI inference (large) | $0.05 | 50000 |
| Premium/unique data | $0.10 | 100000 |
| Heavy compute | $0.50+ | 500000+ |
