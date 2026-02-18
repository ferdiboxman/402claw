# Pricing Strategy

Guide the user to set the right price for their x402 API. Pricing is per-call in USDC on Base chain.

## Key Principles

1. **Price per call, not per month.** x402 is pay-per-use. No subscriptions (yet).
2. **USDC on Base.** Low gas fees make micro-payments viable.
3. **Facilitator fee.** A small fee is taken by the facilitator that verifies payments. Factor this in.
4. **You can change prices.** Start somewhere reasonable, adjust based on usage data.

## Step 1: Determine Your Tier

### Micro ($0.001 – $0.01)
- Simple data lookups (DNS, WHOIS, IP geo)
- Static or cached responses
- High-volume, low-compute
- Example: `$0.005` per weather query

### Standard ($0.01 – $0.10)
- API calls with real computation
- Database queries with processing
- Data transformation/enrichment
- Example: `$0.05` per sentiment analysis call

### Premium ($0.10 – $1.00)
- AI/ML inference (LLM calls, image generation)
- Complex computation (rendering, simulation)
- High-value proprietary data
- Example: `$0.25` per AI-generated summary

### Ultra ($1.00+)
- GPU-heavy workloads
- Bulk data exports
- Premium research/analysis
- Example: `$2.00` per high-res image generation

## Step 2: Cost Analysis

Walk through with the user:

```
Per-call costs:
  Compute (CPU/GPU time):     $___
  External API calls:         $___
  Data/storage:               $___
  Bandwidth:                  $___
  ─────────────────────────
  Total cost per call:        $___

  Desired margin:             ___% 
  Facilitator fee (~1%):      $___
  ─────────────────────────
  Minimum viable price:       $___
```

## Step 3: Value-Based Adjustment

Cost is the floor. Value is the ceiling. Consider:

- **What does the alternative cost?** If competitors charge $0.10, you can price at $0.08 (undercut) or $0.15 (if you're better).
- **What's the value to the caller?** A fraud-detection API that saves $1000 per catch can charge more than a lorem-ipsum generator.
- **Data uniqueness.** Proprietary data commands premium pricing. Public data doesn't.
- **Convenience premium.** Even if data is free elsewhere, a clean API with good DX has value.

## Step 4: Volume Considerations

- **High volume expected (>10k/day):** Price lower, optimize for throughput
- **Low volume, high value (<100/day):** Price higher, focus on quality
- **Unknown volume:** Start mid-range, monitor, adjust

Future x402 features may support volume discounts and subscription-like patterns. For now, keep it simple: one price per endpoint.

## Step 5: Set the Price

Help the user commit:

```
Endpoint: [path]
Price: $X.XX USDC per call
Rationale: [1 sentence]
```

💡 **Tips:**
- Round to clean numbers ($0.05, not $0.0473)
- Different endpoints can have different prices
- Monitor actual usage and adjust within the first week
- When in doubt, start slightly lower — it's easier to raise prices with a track record than to attract users at a high price
