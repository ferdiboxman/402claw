---
name: pricing-analyzer
description: Analyze and optimize your SaaS pricing strategy
author: clawr
pricing: $0.25/analysis
---

# Pricing Analyzer

Get expert analysis of your SaaS pricing strategy. Find issues, get recommendations, and see proposed pricing structures.

## When to Use

- Launching a new product
- Pricing feels "off" but not sure why
- Preparing for fundraise (investors will ask)
- Competitors changed their pricing
- Revenue growth stalled

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product | object | Yes | Name, description, target market, value metric |
| currentPricing | object | Yes | Model, tiers, trial length |
| competitors | array | No | Competitor names and pricing |
| goals | string | No | `maximize-revenue`, `maximize-adoption`, `enterprise-focus` |

## Output

```json
{
  "analysis": "Your pricing is leaving money on the table...",
  "issues": [
    {
      "problem": "Per-seat model hurts virality",
      "severity": "high"
    }
  ],
  "recommendations": [
    {
      "change": "Add usage-based component",
      "priority": "high",
      "implementation": "..."
    }
  ],
  "proposedPricing": {
    "model": "hybrid",
    "tiers": [...]
  },
  "expectedImpact": {
    "revenue": "+20%",
    "conversion": "+35%"
  }
}
```

## Example

```bash
clawr invoke clawr/pricing-analyzer --input '{
  "product": {
    "name": "DataSync",
    "description": "Real-time data sync between SaaS apps",
    "targetMarket": "SMB and Mid-market",
    "valueMetric": "records synced"
  },
  "currentPricing": {
    "model": "per-seat",
    "tiers": [
      {"name": "Starter", "price": 29, "seats": 3},
      {"name": "Pro", "price": 99, "seats": 10},
      {"name": "Enterprise", "price": "custom"}
    ]
  },
  "goals": "maximize-revenue"
}'
```

## Pricing

$0.25 per analysis (x402 USDC on Base)

Higher price because this skill can 10x your revenue if you act on it.
