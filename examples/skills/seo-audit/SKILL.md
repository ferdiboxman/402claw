---
name: seo-audit
description: Audit any landing page for SEO issues like a senior growth operator
author: clawr
pricing: $0.05/audit
---

# SEO Audit

Audit any landing page for SEO, content, and conversion issues. Get actionable recommendations prioritized by impact.

## When to Use

- Before launching a new landing page
- Diagnosing why a page isn't ranking
- Competitive analysis
- Quarterly site health checks

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Page URL to audit |
| depth | string | No | `quick` (30s), `standard` (2min), `deep` (5min) |
| competitors | array | No | Competitor URLs to compare |

## Output

```json
{
  "score": 75,
  "grade": "C",
  "summary": "Solid content but missing technical fundamentals",
  "critical": [
    {
      "issue": "Missing meta description",
      "impact": "high",
      "fix": "Add 150-160 char meta description with primary keyword"
    }
  ],
  "warnings": [...],
  "recommendations": [
    {
      "action": "Add FAQ schema",
      "priority": "medium",
      "effort": "low"
    }
  ]
}
```

## Example

```bash
clawr invoke clawr/seo-audit --input '{
  "url": "https://mysite.com/pricing",
  "depth": "standard"
}'
```

## Pricing

$0.05 per audit (x402 USDC on Base)

## Author

Built by the Clawr team based on 1000+ landing page audits.
