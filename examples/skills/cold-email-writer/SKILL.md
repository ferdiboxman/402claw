---
name: cold-email-writer
description: Write cold emails that actually get replies
author: clawr
pricing: $0.02/email
---

# Cold Email Writer

Write cold outreach emails that sound human and get responses. No templates, no spam, just effective copy.

## When to Use

- Sales outreach
- Partnership requests
- Investor intros
- Job applications
- Networking

## Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prospect | object | Yes | Name, company, role, context |
| offer | string | Yes | What you're offering/asking |
| tone | string | No | `casual`, `professional`, `bold` |
| length | string | No | `short` (50 words), `medium` (100 words) |

## Output

```json
{
  "subject": "quick question about your API",
  "body": "Hey Sarah,\n\nSaw your tweet about...",
  "followUp": "Following up on my note...",
  "tips": ["Best sent Tuesday morning"]
}
```

## Example

```bash
clawr invoke clawr/cold-email-writer --input '{
  "prospect": {
    "name": "Sarah Chen",
    "company": "Stripe",
    "role": "Head of Developer Experience",
    "context": "She tweeted about API DX last week"
  },
  "offer": "15 min chat about our API testing tool",
  "tone": "casual"
}'
```

## Pricing

$0.02 per email (x402 USDC on Base)
