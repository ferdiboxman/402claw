# Clawr Skill — Architecture Document

> **Clawr** is an expert Agent Skill that guides AI agents through creating, deploying, and monetizing x402 APIs. It turns any developer's idea into a live, paid endpoint on the x402 Bazaar.

---

## 1. Overview

### What is Clawr?

Clawr is packaged as an **Agent Skill** (the open standard at agentskills.io). When installed into any compatible agent (Claude Code, OpenClaw, Cursor, Codex, Copilot, Windsurf, etc.), it gives the agent deep expertise in:

1. **Scaffolding** x402-enabled API endpoints for any deployment target
2. **Pricing** — analyzing the Bazaar marketplace and recommending optimal pricing
3. **Deploying** — pushing to CF Workers, Vercel, Express servers, etc.
4. **Registering** — auto-registering on the x402 Bazaar discovery layer
5. **Testing** — validating endpoints with @x402/fetch client
6. **Iterating** — monitoring revenue, adjusting pricing, adding endpoints

### The One-Liner Promise

> *"I want to monetize my weather API"* → Clawr handles everything: scaffolds the code, configures x402 middleware, sets pricing, deploys, registers on Bazaar, and validates with a test payment.

---

## 2. Skill Structure (Directory Layout)

```
clawr/
├── SKILL.md                          # Required: skill metadata + main instructions
├── scripts/
│   ├── scaffold.sh                   # Generate x402 project from template
│   ├── deploy.sh                     # Deploy to target platform
│   ├── bazaar-register.sh            # Register endpoint on Bazaar
│   ├── bazaar-search.sh              # Search Bazaar for competitive analysis
│   ├── test-endpoint.sh              # Test endpoint with x402 payment
│   ├── validate-config.sh            # Validate x402 route config
│   └── pricing-analyze.sh            # Analyze Bazaar pricing for category
├── references/
│   ├── X402-PROTOCOL.md              # x402 protocol reference (condensed)
│   ├── BAZAAR-API.md                 # Bazaar discovery API reference
│   ├── DEPLOYMENT-TARGETS.md         # Platform-specific deployment guides
│   ├── PRICING-GUIDE.md              # Pricing strategy reference
│   └── TROUBLESHOOTING.md            # Common issues & fixes
├── assets/
│   └── templates/
│       ├── express/                  # Express.js template
│       │   ├── index.ts
│       │   ├── package.json
│       │   └── tsconfig.json
│       ├── next/                     # Next.js template
│       │   ├── middleware.ts
│       │   ├── route.ts
│       │   └── package.json
│       ├── hono-cf-worker/           # Cloudflare Workers (Hono) template
│       │   ├── index.ts
│       │   ├── package.json
│       │   └── wrangler.toml
│       ├── vercel-edge/              # Vercel Edge Functions template
│       │   ├── api/route.ts
│       │   └── package.json
│       └── fastapi/                  # Python FastAPI template
│           ├── main.py
│           └── requirements.txt
└── LICENSE
```

---

## 3. Component Details

### 3.1 SKILL.md — The Brain

```yaml
---
name: clawr
description: >
  Expert skill for creating, deploying, and monetizing x402 APIs.
  Use when the user wants to monetize an API, create a paid endpoint,
  accept crypto payments for services, list on the x402 Bazaar,
  or build pay-per-use APIs with stablecoins. Handles scaffolding,
  deployment, Bazaar registration, pricing analysis, and testing.
license: MIT
metadata:
  author: 402claw
  version: "1.0.0"
---
```

The SKILL.md body contains:
- **Decision tree**: What does the user want? (new endpoint / monetize existing / analyze market / test)
- **Step-by-step flows** for each path
- **Prompt patterns** for gathering requirements (what to charge, which network, which platform)
- **Code generation patterns** referencing templates in `assets/templates/`
- **Validation checklist** before deploying

### 3.2 Scripts

| Script | Purpose | Inputs | Outputs |
|--------|---------|--------|---------|
| `scaffold.sh` | Generate project from template | target platform, endpoint path, price, wallet address | Project directory with all files |
| `deploy.sh` | Deploy to hosting platform | project dir, platform, env vars | Live URL |
| `bazaar-register.sh` | Register on Bazaar via discovery extension | endpoint URL, schema metadata | Registration confirmation |
| `bazaar-search.sh` | Search Bazaar for existing endpoints | query, category | JSON list of competing endpoints + pricing |
| `test-endpoint.sh` | Make a paid request to validate | endpoint URL, private key | Payment receipt + response |
| `validate-config.sh` | Lint x402 route config | config file path | Validation report |
| `pricing-analyze.sh` | Analyze market pricing | category/keyword | Pricing recommendations |

### 3.3 References

| File | Content |
|------|---------|
| `X402-PROTOCOL.md` | Condensed x402 protocol: flow, headers, schemes, CAIP-2 networks, facilitator URLs |
| `BAZAAR-API.md` | Discovery API: `GET /discovery/resources`, `declareDiscoveryExtension()`, input/output schemas |
| `DEPLOYMENT-TARGETS.md` | Per-platform deployment: packages to install, middleware setup, env vars, deploy commands |
| `PRICING-GUIDE.md` | Pricing strategies: per-request vs per-token, market positioning, floor/ceiling analysis |
| `TROUBLESHOOTING.md` | Common errors: 402 not returning, facilitator rejection, settlement failures |

---

## 4. User Flow

### Flow 1: "I want to monetize X" (New Endpoint)

```
User: "I want to monetize my weather API"
  │
  ├─ 1. GATHER REQUIREMENTS
  │   ├─ What does the API do? (weather data)
  │   ├─ What platform? (Express / Next.js / CF Workers / Vercel / FastAPI)
  │   ├─ What price per request? (suggest based on Bazaar analysis)
  │   ├─ Which network? (Base mainnet = eip155:8453, Solana = solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp)
  │   └─ Wallet address to receive payments
  │
  ├─ 2. MARKET ANALYSIS (optional but recommended)
  │   ├─ Run bazaar-search.sh "weather"
  │   ├─ Show competing endpoints + their pricing
  │   └─ Recommend pricing strategy
  │
  ├─ 3. SCAFFOLD
  │   ├─ Run scaffold.sh with gathered params
  │   ├─ Generate project from template
  │   ├─ Configure x402 middleware with route config
  │   ├─ Add Bazaar discovery extension metadata
  │   └─ Set up environment variables
  │
  ├─ 4. IMPLEMENT LOGIC
  │   ├─ User's actual API logic goes in the route handler
  │   └─ Agent helps write/integrate the business logic
  │
  ├─ 5. DEPLOY
  │   ├─ Run deploy.sh for target platform
  │   └─ Get live URL
  │
  ├─ 6. TEST
  │   ├─ Run test-endpoint.sh against live URL
  │   ├─ Verify 402 response without payment
  │   ├─ Verify 200 response with valid payment
  │   └─ Verify payment receipt in PAYMENT-RESPONSE header
  │
  └─ 7. VERIFY BAZAAR LISTING
      ├─ Run bazaar-search.sh to confirm endpoint appears
      └─ Show discoverable metadata
```

### Flow 2: "Monetize my existing API" (Add x402 to existing project)

```
User: "Add x402 payments to my existing Express API"
  │
  ├─ 1. DETECT FRAMEWORK
  │   ├─ Scan package.json / requirements.txt
  │   └─ Identify: Express, Next.js, Hono, FastAPI, Flask, Gin
  │
  ├─ 2. ADD DEPENDENCIES
  │   ├─ Install @x402/core, @x402/{framework}, @x402/evm
  │   └─ Optionally @x402/extensions for Bazaar
  │
  ├─ 3. WRAP ROUTES
  │   ├─ Add paymentMiddleware() around target routes
  │   ├─ Configure pricing per route
  │   └─ Add Bazaar discovery metadata
  │
  ├─ 4. DEPLOY + TEST (same as Flow 1, steps 5-7)
```

### Flow 3: "What's on the Bazaar?" (Discovery/Analysis)

```
User: "What x402 endpoints exist for AI inference?"
  │
  ├─ 1. SEARCH BAZAAR
  │   ├─ Query facilitator discovery API
  │   └─ Filter by category/keyword
  │
  ├─ 2. PRESENT RESULTS
  │   ├─ List endpoints with pricing, schemas, descriptions
  │   └─ Highlight opportunities (gaps in marketplace)
  │
  └─ 3. OPTIONALLY BUILD
      └─ "Want me to build a competing endpoint?"
```

---

## 5. x402 Integration Details

### 5.1 Server-Side Middleware Pattern

All templates follow this pattern:

```typescript
// 1. Create facilitator client
const facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator"  // testnet
  // url: facilitator URL from CDP for mainnet
});

// 2. Create resource server + register schemes
const server = new x402ResourceServer(facilitator);
registerExactEvmScheme(server);
server.registerExtension(bazaarResourceServerExtension);

// 3. Configure routes with pricing + discovery
app.use(paymentMiddleware({
  "GET /api/data": {
    accepts: [{
      scheme: "exact",
      price: "$0.001",
      network: "eip155:8453",  // Base mainnet
      payTo: "0x...",
    }],
    description: "Endpoint description",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
        output: {
          example: { /* example response */ },
          schema: { /* JSON Schema */ },
        },
      }),
    },
  },
}, server));
```

### 5.2 Bazaar Discovery Integration

The Bazaar is an **extension** in x402 v2. To make endpoints discoverable:

1. Install `@x402/extensions`
2. Register `bazaarResourceServerExtension` on the resource server
3. Use `declareDiscoveryExtension()` in route config to declare input/output schemas
4. The facilitator automatically catalogs metadata when processing payments

**Discovery API** (buyer-side):
```
GET {facilitator_url}/discovery/resources?type=http&limit=20&offset=0
```

Returns:
```json
{
  "items": [{
    "resource": "https://api.example.com/weather",
    "type": "http",
    "x402Version": 2,
    "accepts": [{ "scheme": "exact", "price": "$0.001", ... }],
    "metadata": { "output": { ... }, "input": { ... } },
    "lastUpdated": "2026-01-15T..."
  }]
}
```

### 5.3 Supported Networks

| Network | CAIP-2 ID | Token | Notes |
|---------|-----------|-------|-------|
| Base Mainnet | `eip155:8453` | USDC | Primary production |
| Base Sepolia | `eip155:84532` | USDC (test) | Testing |
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | USDC | Production |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | USDC (test) | Testing |

### 5.4 Facilitator URLs

| Environment | URL |
|-------------|-----|
| Open/Testnet | `https://x402.org/facilitator` |
| CDP Mainnet | Requires CDP API keys |

CDP free tier: 1,000 tx/month, then $0.001/tx.

---

## 6. Deployment Targets

### 6.1 Express.js
- **Packages**: `@x402/express @x402/core @x402/evm`
- **Middleware**: `paymentMiddleware()` as Express middleware
- **Deploy**: Any Node.js host (Railway, Render, VPS, etc.)

### 6.2 Next.js
- **Packages**: `@x402/next @x402/core @x402/evm`
- **Middleware**: `paymentProxy()` in `middleware.ts`
- **Deploy**: `vercel --prod` or self-hosted

### 6.3 Cloudflare Workers (Hono)
- **Packages**: `@x402/hono @x402/core @x402/evm`
- **Middleware**: Hono payment middleware
- **Deploy**: `wrangler deploy`

### 6.4 Vercel Edge Functions
- **Packages**: `@x402/next @x402/core @x402/evm`
- **Deploy**: `vercel --prod`

### 6.5 FastAPI (Python)
- **Packages**: `x402[fastapi]`
- **Middleware**: `PaymentMiddlewareASGI`
- **Deploy**: `uvicorn` on any Python host

### 6.6 Go (Gin)
- **Packages**: `github.com/coinbase/x402/go`
- **Middleware**: Gin payment middleware
- **Deploy**: Any Go host

---

## 7. Pricing Analysis Features

The skill includes market intelligence:

1. **Bazaar Scan**: Query discovery API for endpoints in the same category
2. **Price Distribution**: Show min/median/max pricing for similar services
3. **Gap Analysis**: Identify underserved categories with no x402 endpoints
4. **Recommendations**: Based on:
   - Compute cost per request
   - Comparable endpoint pricing
   - Volume vs. margin tradeoff
   - Network fees (Base ~$0.001, negligible)

### Pricing Strategies
- **Flat per-request**: `$0.001` per call (simple APIs)
- **Tiered by compute**: `$0.01` for heavy inference, `$0.001` for data
- **upto scheme** (future): Dynamic pricing based on actual resource consumption

---

## 8. Reputation & Trust

x402 ecosystem supports reputation via:

1. **ERC-8004 Integration** (optional): On-chain reputation scoring
2. **Bazaar listing quality**: Complete discovery metadata → higher visibility
3. **Uptime & reliability**: Consistent endpoint availability
4. **Payment history**: Track record of successful settlements

The skill helps set up:
- Complete Bazaar metadata (input/output schemas, descriptions, examples)
- Health check endpoints
- Monitoring recommendations

---

## 9. Testing & Validation Flow

### Pre-deployment Validation
1. **Config lint**: `validate-config.sh` checks route config structure
2. **Schema validation**: Verify Bazaar discovery extension schemas
3. **Local test**: Start server locally, verify 402 response without payment

### Post-deployment Validation
1. **402 check**: `curl -I {url}` → should return 402 with PAYMENT-REQUIRED header
2. **Payment test**: `test-endpoint.sh` makes actual paid request
3. **Settlement verify**: Check PAYMENT-RESPONSE header for receipt
4. **Bazaar listing**: Confirm endpoint appears in discovery API

### Using @x402/fetch
```bash
# Install
npm install @x402/fetch

# Call a paid endpoint (handles 402 flow automatically)
npx x402-fetch https://api.example.com/weather
```

### Discovering endpoints via facilitator
```bash
# Query the facilitator's Bazaar discovery endpoint
curl "https://x402.org/facilitator/discovery/resources?type=http&limit=20"
```

---

## 10. Integration with Existing 402claw Infrastructure

The skill can optionally leverage:
- **402claw frontend** (`/frontend`): Dashboard for managing deployed endpoints
- **402claw cloudflare worker** (`/cloudflare`): Pre-built worker for quick deployment
- **Risk policy** (`risk-policy.json`): Payment risk assessment rules

---

## 11. Publishing Strategy

The skill will be published to:

1. **GitHub** → `402claw/clawr-skill` (source of truth)
2. **skills.sh** → `npx skills add 402claw/clawr-skill` (primary discovery)
3. **playbooks.com** → Listed on Playbooks marketplace
4. **npm** → `@clawr/skill` (optional, for programmatic use)
5. **Claude Code Plugin Marketplace** → Via plugin manifest

### Compatibility Matrix

| Agent | Install Method |
|-------|---------------|
| Claude Code | `npx skills add 402claw/clawr-skill` or `/plugin install` |
| OpenClaw | Skills directory or manual |
| Cursor | `.cursor/skills/clawr/SKILL.md` |
| Codex | `.agents/skills/clawr/SKILL.md` |
| Copilot | `.github/skills/clawr/SKILL.md` |
| Windsurf | Skills integration |
| Cline | Skills integration |
| Goose | Skills integration |

---

## 12. Key Design Principles

1. **Progressive Disclosure**: SKILL.md is < 500 lines. Heavy detail in references/.
2. **Template-Driven**: Agent fills in templates rather than generating from scratch → fewer bugs.
3. **Validate Everything**: Every step has a validation checkpoint.
4. **Market-Aware**: Always check Bazaar before suggesting pricing.
5. **Platform-Agnostic**: Same skill works in any agent that supports the Agent Skills standard.
6. **Fallback-Friendly**: Use @x402/fetch for client-side testing. If CDP keys aren't set, use the open facilitator.
