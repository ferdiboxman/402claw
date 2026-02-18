# Clawr Skills Specification v0.1

## Overview

A Clawr Skill is a packageable unit of expertise that agents can invoke and pay for via x402 micropayments.

## Directory Structure

```
my-skill/
├── clawr.json        # Required: deployment config
├── SKILL.md          # Required: skill definition
├── scripts/          # Optional: executable scripts
│   └── run.sh
├── prompts/          # Optional: system prompts
│   └── main.md
└── examples/         # Optional: usage examples
    └── example.json
```

## clawr.json Schema

```json
{
  "$schema": "https://clawr.ai/schemas/skill-v1.json",
  "name": "seo-audit",
  "version": "1.0.0",
  "description": "Audit any landing page for SEO issues",
  "author": "yourname",
  
  "pricing": {
    "model": "per-invocation",
    "price": "0.05",
    "currency": "USDC"
  },
  
  "input": {
    "type": "object",
    "required": ["url"],
    "properties": {
      "url": {
        "type": "string",
        "description": "URL to audit"
      },
      "depth": {
        "type": "string",
        "enum": ["quick", "standard", "deep"],
        "default": "standard"
      }
    }
  },
  
  "output": {
    "type": "object",
    "properties": {
      "score": { "type": "number" },
      "issues": { "type": "array" },
      "recommendations": { "type": "array" }
    }
  },
  
  "runtime": {
    "type": "prompt",
    "model": "claude-sonnet-4-5",
    "maxTokens": 4000,
    "timeout": 60
  },
  
  "metadata": {
    "category": "marketing",
    "tags": ["seo", "audit", "landing-page"],
    "icon": "🔍"
  }
}
```

## Pricing Models

### per-invocation (default)
```json
{
  "model": "per-invocation",
  "price": "0.05"
}
```

### per-token
```json
{
  "model": "per-token",
  "inputPrice": "0.00001",
  "outputPrice": "0.00003"
}
```

### tiered
```json
{
  "model": "tiered",
  "tiers": [
    { "upTo": 100, "price": "0.10" },
    { "upTo": 1000, "price": "0.05" },
    { "above": 1000, "price": "0.02" }
  ]
}
```

## Runtime Types

### prompt
Executes a prompt against an LLM with the skill's system prompt.

```json
{
  "type": "prompt",
  "model": "claude-sonnet-4-5",
  "systemPrompt": "prompts/main.md",
  "maxTokens": 4000
}
```

### script
Executes a script (bash, python, node).

```json
{
  "type": "script",
  "command": "scripts/run.sh",
  "timeout": 30
}
```

### function
Calls a deployed Cloudflare Worker function.

```json
{
  "type": "function",
  "worker": "my-skill-worker",
  "entrypoint": "handleSkill"
}
```

## SKILL.md Format

```markdown
---
name: seo-audit
description: Audit any landing page for SEO issues
author: yourname
pricing: $0.05/audit
---

# SEO Audit Skill

## When to Use
- Reviewing landing pages before launch
- Diagnosing traffic issues
- Competitive analysis

## Input
- `url` (required): The page to audit
- `depth`: quick | standard | deep

## Output
Returns a structured audit with:
- Overall score (0-100)
- Critical issues
- Warnings
- Recommendations with priority

## Example

\`\`\`bash
clawr invoke seo-audit --input '{"url": "https://example.com"}'
\`\`\`
```

## Deployment

```bash
# Deploy a skill
clawr deploy ./my-skill --type skill

# Update pricing
clawr update my-skill --price 0.10

# View stats
clawr stats my-skill

# Disable
clawr disable my-skill
```

## Invocation (Agent Side)

```bash
# Via CLI
clawr invoke user/seo-audit --input '{"url": "https://example.com"}'

# Via HTTP + x402
curl -X POST https://api.clawr.ai/skills/user/seo-audit \
  -H "Content-Type: application/json" \
  -H "X-402-Payment: <payment-token>" \
  -d '{"url": "https://example.com"}'
```

## Revenue & Payouts

- Payments received in USDC on Base
- 5% platform fee
- Instant settlement to deployer wallet
- Dashboard shows invocations, revenue, top users

## Versioning

```json
{
  "version": "1.0.0",
  "changelog": {
    "1.0.0": "Initial release",
    "1.1.0": "Added deep audit mode"
  }
}
```

Agents can pin versions:
```
clawr invoke user/seo-audit@1.0.0
```

## Security

- Skills run in isolated containers
- No access to other skills or user data
- Input validation enforced
- Rate limiting per caller
- Abuse detection

## Discovery

Skills are listed on ClawHub with:
- Name, description, author
- Pricing
- Usage stats
- Reviews/ratings
- Example outputs
