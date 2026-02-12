# 402claw MVP Plan

**Version:** 1.0  
**Date:** February 12, 2026  
**Status:** Ready for Review

---

## 1. Executive Summary

**402claw** is a CLI tool and platform that lets AI agents (and humans) turn data or code into paid APIs with one command. Upload a CSV, JSON file, or simple function → get a working REST endpoint with x402 payments built-in → receive USDC directly to your wallet.

**Core Value Proposition:** "Deploy your tool, get a paid API. One command."

**Why Now:**
- x402 protocol is live with 75M+ transactions processed
- AI agents are everywhere but can't easily monetize their outputs
- MCP adoption gives agents standard tooling to deploy services
- RapidAPI (25% take rate) and traditional platforms aren't agent-native
- No platform combines deployment + monetization + agent-to-agent payments

---

## 2. Product Definition

### What 402claw IS
- A **CLI tool** (`402claw`) for deploying paid APIs
- A **serverless platform** that hosts and runs those APIs
- An **x402 payment layer** that handles micropayments automatically
- **Agent-first infrastructure** for the agent economy

### What 402claw is NOT
- Not a marketplace (yet) — no discovery/browsing in MVP
- Not a replacement for MCP — complements it
- Not a general cloud platform — focused on paid APIs only
- Not for humans building apps — for agents serving agents

### Core User: AI Agents
- **OpenClaw agents** with full tool access
- **Claude Code agents** via MCP integration
- **GPT-based agents** via function calling
- Any agent that can make HTTP requests

### Secondary User: Humans with Data
- Non-technical humans with valuable CSV/JSON datasets
- Developers who want passive income from simple APIs
- Researchers wanting to monetize data

---

## 3. MVP Features (Phase 1 — 4 Weeks)

### ✅ MUST HAVE

#### 3.1 CLI Tool (`402claw`)
```bash
# Core commands only
402claw deploy <file>      # Deploy CSV/JSON as API
402claw status             # Check deployed APIs
402claw wallet             # Show wallet balance
402claw withdraw           # Withdraw to external wallet
402claw logs <api-id>      # View access logs
```

#### 3.2 Data Upload (CSV/JSON Only)
- **CSV files:** Auto-detect schema, create queryable REST endpoint
- **JSON files:** Host as-is, serve via REST
- **Size limit:** 10MB per file (MVP)
- **Query support:** Simple filters (`?name=John&age=25`)

#### 3.3 x402 Payment Integration
- Every API endpoint returns `402 Payment Required` with price header
- Callers pay via x402 protocol (USDC on Base)
- Instant settlement to provider's wallet
- **Minimum price:** $0.001 per request
- **Maximum price:** $10 per request (for MVP)

#### 3.4 Wallet Management
- Auto-create wallet on first deploy (derived from user identity)
- Import existing wallet via private key
- View balance (USDC on Base)
- Withdraw to external address
- **Platform fee:** Deducted at withdrawal (not per-transaction)

#### 3.5 Basic Dashboard (Web)
- Login with wallet signature (no email/password)
- View deployed APIs
- See call counts and revenue
- Update pricing
- Download access logs

### ❌ NOT IN MVP (Deferred)

| Feature | Reason to Defer | When |
|---------|-----------------|------|
| Function/code deployment | Requires sandboxing | Phase 2 |
| MCP tools | Need core platform first | Phase 2 |
| API discovery/marketplace | Build supply first | Phase 3 |
| Custom domains | Nice-to-have | Phase 3 |
| Subscription pricing | Per-call is simpler | Phase 3 |
| Fiat payments (Stripe) | Adds complexity | Phase 3 |
| Team accounts | Solo agents first | Phase 4 |

---

## 4. Technical Architecture

### 4.1 Architecture Diagram

```
                         ┌─────────────────────────────────────────┐
                         │              402claw.com                │
                         └────────────────────┬────────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                    │
         ┌──────────▼──────────┐                          ┌──────────────▼───────────┐
         │    CLI / Dashboard   │                          │     API Gateway          │
         │    (Next.js + tRPC)  │                          │   (Cloudflare Worker)    │
         │                      │                          │                          │
         │  • Deploy files      │                          │  • Route to user APIs    │
         │  • Manage wallets    │                          │  • x402 payment verify   │
         │  • View analytics    │                          │  • Rate limiting         │
         └──────────┬──────────┘                          └──────────────┬───────────┘
                    │                                                    │
                    │                                                    │
         ┌──────────▼──────────────────────────────────────────────────▼───────────┐
         │                     Workers for Platforms                                │
         │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                   │
         │   │  API Worker │   │  API Worker │   │  API Worker │   ...              │
         │   │  (user-1)   │   │  (user-2)   │   │  (user-3)   │                   │
         │   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                   │
         │          │                 │                 │                          │
         │          └────────────────┬┴─────────────────┘                          │
         └───────────────────────────┼─────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
       ┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐
       │ Cloudflare  │        │   Turso     │        │ Cloudflare  │
       │     R2      │        │   (SQLite)  │        │     KV      │
       │             │        │             │        │             │
       │ • CSV/JSON  │        │ • API meta  │        │ • Sessions  │
       │ • User data │        │ • Usage log │        │ • Cache     │
       └─────────────┘        │ • Wallets   │        └─────────────┘
                              └─────────────┘
```

### 4.2 Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **CLI** | Go | Fast, single binary, cross-platform |
| **Dashboard** | Next.js 14 + Tailwind | Fast to build, good DX |
| **API Gateway** | Cloudflare Workers | Zero cold start, global edge |
| **User APIs** | Workers for Platforms | Native multi-tenant isolation |
| **File Storage** | Cloudflare R2 | Zero egress fees |
| **Database** | Turso (SQLite) | Edge-replicated, per-tenant DBs |
| **Cache/Sessions** | Cloudflare KV | Fast key-value |
| **Payments** | x402 + Coinbase CDP | Agent-native, low fees |
| **Wallet** | viem + ethers.js | Standard Ethereum tooling |

### 4.3 Cost Estimates

| Scale | Requests/mo | Users | Infrastructure | Platform Revenue (5%) | Net |
|-------|-------------|-------|----------------|----------------------|-----|
| **Launch** | 100K | 10 | ~$30/mo | ~$10/mo | -$20 |
| **Early** | 1M | 100 | ~$45/mo | ~$500/mo | +$455 |
| **Growth** | 10M | 1,000 | ~$120/mo | ~$5,000/mo | +$4,880 |
| **Scale** | 100M | 10,000 | ~$500/mo | ~$50,000/mo | +$49,500 |

**Breakdown (Growth stage):**
- Workers for Platforms: $25 base + ~$30 overages = ~$55
- R2 Storage (50GB): $0.75
- Turso Developer: $4.99 + ~$20 overages = ~$25
- Cloudflare KV: ~$5
- Domain/misc: ~$35
- **Total: ~$120/mo**

---

## 5. User Flows

### Flow A: Agent Uploads CSV, Gets Paid API

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Deploys CSV Flow                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Install CLI
$ npm install -g 402claw
# or
$ brew install 402claw

Step 2: Initialize (first time)
$ 402claw init
✓ Created wallet: 0x7a3...f92
✓ Config saved to ~/.402claw/config.json
✓ Ready to deploy!

Step 3: Deploy CSV
$ 402claw deploy restaurants.csv --price 0.01
Uploading restaurants.csv (2.3 MB)...
Detecting schema...
  ├── name (string)
  ├── rating (number)  
  ├── address (string)
  └── cuisine (string)

✓ API deployed!
  Endpoint: https://api.402claw.com/v1/abc123xyz
  Price: $0.01 per request
  
Test it:
  curl -H "X-402-Payment: ..." https://api.402claw.com/v1/abc123xyz

Step 4: Check earnings
$ 402claw wallet
Balance: 4.37 USDC
Pending: 0.23 USDC
Total earned: 4.60 USDC

Step 5: Withdraw
$ 402claw withdraw 4.00 0xMyExternalWallet
✓ Withdrew 3.80 USDC (0.20 USDC platform fee)
  TX: 0x...
```

### Flow B: Agent Calls Another Agent's API (x402)

```
┌─────────────────────────────────────────────────────────────────┐
│                  Agent Calls Paid API Flow                       │
└─────────────────────────────────────────────────────────────────┘

Step 1: Agent discovers API (out of band for MVP)
# Another agent shared: https://api.402claw.com/v1/abc123xyz

Step 2: Agent makes request, gets 402
$ curl https://api.402claw.com/v1/abc123xyz?cuisine=italian
HTTP/1.1 402 Payment Required
X-402-Price: 0.01
X-402-Token: USDC
X-402-Network: base
X-402-Recipient: 0x...

Step 3: Agent pays and retries (SDK handles this)
```

**Agent Code (Python/TypeScript):**

```python
# Using 402claw SDK
from four02claw import Client

client = Client(
    wallet_key=os.environ["WALLET_KEY"]
)

# SDK automatically handles 402 → pay → retry
response = await client.get(
    "https://api.402claw.com/v1/abc123xyz",
    params={"cuisine": "italian"},
    max_payment=0.10  # Max willing to pay
)

print(response.data)  # Restaurant data
print(response.payment)  # {"amount": 0.01, "tx": "0x..."}
```

```typescript
// TypeScript version
import { FourOhTwoClaw } from '402claw';

const client = new FourOhTwoClaw({
  walletKey: process.env.WALLET_KEY
});

const { data, payment } = await client.get(
  'https://api.402claw.com/v1/abc123xyz',
  { params: { cuisine: 'italian' }, maxPayment: 0.10 }
);
```

### Flow C: Human Uploads Data via Web

```
┌─────────────────────────────────────────────────────────────────┐
│                    Human Web Upload Flow                         │
└─────────────────────────────────────────────────────────────────┘

1. Visit: https://402claw.com
2. Click "Connect Wallet" (MetaMask, Coinbase Wallet, etc.)
3. Drag & drop CSV file
4. Preview detected schema
5. Set price: $0.01 per query (slider)
6. Click "Deploy API"
7. Copy endpoint URL
8. Done! Check dashboard for revenue
```

---

## 6. Business Model

### 6.1 Revenue Model: Platform Fee on Withdrawals

| Action | Fee | Example |
|--------|-----|---------|
| Deploy API | Free | — |
| API calls (revenue) | 0% (creator keeps 100%) | $10 earned |
| Withdraw to wallet | **5%** | $10 → $9.50 received |
| Minimum withdrawal | $1.00 | — |

**Why withdrawal fee instead of per-transaction:**
- Simpler accounting (one deduction)
- Lower gas costs (batch vs per-tx)
- Better UX (see full earnings, pay once)
- Aligns with "platform takes cut when you cash out"

### 6.2 Future Revenue Streams (Post-MVP)

| Stream | Model | Timeline |
|--------|-------|----------|
| Premium features | $10-50/mo subscription | Phase 3 |
| Custom domains | $5/mo per domain | Phase 3 |
| Higher limits | Usage-based tiers | Phase 3 |
| Enterprise | Custom pricing | Phase 4 |
| Marketplace listing fee | $0 (grow supply first) | Never (keep free) |

### 6.3 Unit Economics

**Per 1M API calls at $0.01 average:**
- Gross API revenue: $10,000
- Creator keeps: $10,000
- On withdrawal: Creator gets $9,500, Platform gets $500
- Infrastructure cost: ~$30 (Workers + storage)
- **Net margin: $470 per 1M calls**

**Break-even:** ~60K API calls/month at $0.01 average

### 6.4 Cost Structure

| Category | Monthly Cost | Notes |
|----------|--------------|-------|
| Cloudflare Workers for Platforms | $25-100 | Scales with usage |
| Cloudflare R2 | $5-50 | Scales with storage |
| Turso | $5-30 | Scales with DBs |
| Domain + DNS | $2 | Fixed |
| Coinbase CDP Facilitator | $0-10 | Free tier: 1000 tx/mo |
| **Total (early)** | **~$40-50/mo** | |

---

## 7. Go-to-Market

### 7.1 Launch Channels (Priority Order)

| Channel | Action | Expected Reach |
|---------|--------|----------------|
| **1. OpenClaw Discord** | Direct post, get feedback | 50-100 agents |
| **2. X/Twitter** | Thread from @clawsenberg | 500-1000 views |
| **3. Moltbook** | Post as agent announcement | 100-200 agents |
| **4. Hacker News** | "Show HN" post | 5,000-20,000 views |
| **5. r/LocalLLaMA** | Reddit post | 1,000-5,000 views |

### 7.2 First 100 Users Strategy

**Week 1-2: Friends & Alpha**
- Deploy 3-5 example APIs ourselves
- Invite 10 OpenClaw power users
- Collect feedback, fix bugs

**Week 3-4: Soft Launch**
- X thread with demo video
- Moltbook announcement
- Discord #showcase channel

**Month 2: Public Launch**
- Hacker News "Show HN"
- Product Hunt launch
- Dev.to article

### 7.3 Launch Content

**Required before launch:**
- [ ] 30-second demo video (terminal recording)
- [ ] Landing page with clear value prop
- [ ] Documentation site (deploy, pricing, SDK)
- [ ] 3 example APIs (restaurants, weather, quotes)
- [ ] Twitter thread draft (10 tweets)

### 7.4 Base Batches Application

**Consider applying for Base Batches (Coinbase accelerator)**

**Why we're a fit:**
- Built on x402 (Coinbase protocol)
- Uses USDC on Base
- Agent-native (Coinbase pushing agentic wallets)
- Clear business model

**Application talking points:**
- First platform purpose-built for agent API monetization
- x402-native from day one
- Growing agent market ($50B+ by 2030)
- Team has shipped (OpenClaw, Moltscape)

---

## 8. Success Metrics

### 8.1 Week 1 Targets

| Metric | Target | Notes |
|--------|--------|-------|
| APIs deployed | 10 | At least 5 by external users |
| API calls | 1,000 | Mix of test + real |
| Unique callers | 20 | Distinct wallets |
| Revenue through platform | $10 | Proof of concept |
| Bugs reported | <10 critical | Stability check |

### 8.2 Month 1 Targets

| Metric | Target | Notes |
|--------|--------|-------|
| APIs deployed | 50 | Organic growth |
| API calls | 50,000 | ~1,600/day |
| Monthly revenue | $500 | GMV through platform |
| Platform revenue | $25 | 5% of withdrawals |
| Active creators | 20 | Deployed + earned |
| Retention (week 2) | 40% | Creators who deploy again |

### 8.3 Month 3 Targets

| Metric | Target | Notes |
|--------|--------|-------|
| APIs deployed | 200 | |
| API calls | 500,000 | ~16,000/day |
| Monthly GMV | $5,000 | |
| Platform revenue | $250 | |
| Active creators | 100 | |
| Active consumers | 500 | Unique caller wallets |

### 8.4 Key Metrics to Track

**North Star:** Monthly GMV (Gross Merchandise Value) through platform

**Supporting Metrics:**
- APIs deployed (supply)
- API calls (demand)
- Average revenue per API
- Creator retention (week over week)
- Consumer retention
- Time to first revenue (for new creators)

---

## 9. Risks and Mitigations

### 9.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| x402 protocol changes | Medium | High | Abstract payment layer, stay close to spec |
| Cloudflare outages | Low | High | Consider multi-cloud fallback for Phase 2 |
| Wallet security issues | Medium | Critical | Use audited libs, limit auto-sign amounts |
| Cold start latency | Low | Medium | Workers have near-zero cold start |
| Data loss | Low | Critical | R2 durability (11 9s), daily backups |

### 9.2 Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No demand (agents don't need this) | Medium | Critical | Validate with 10 users before full build |
| RapidAPI adds agent features | Medium | High | Move fast, establish x402 niche |
| x402 doesn't get adoption | Medium | High | Support Stripe as fallback (Phase 3) |
| Base/USDC loses relevance | Low | Medium | Multi-chain support later |

### 9.3 Competition Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Toolhouse.ai expands | High | Medium | Differentiate on simplicity + x402 |
| Big cloud enters space | Medium | Medium | Target indie/agent niche they ignore |
| Val.town adds payments | Medium | High | Partner or differentiate on x402 |

### 9.4 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Can't reach break-even | Medium | High | Keep costs low (<$50/mo), grow organically |
| Legal issues (money transmission) | Low | Critical | Legal review before launch, geo-restrict if needed |
| API abuse (malicious data) | Medium | Medium | Content policy, report mechanism |

---

## 10. Timeline

### Week 1: Foundation
| Day | Task | Owner |
|-----|------|-------|
| Mon | Set up Cloudflare Workers for Platforms | Dev |
| Mon | Create 402claw CLI scaffold (Go) | Dev |
| Tue | Implement file upload to R2 | Dev |
| Tue | Set up Turso database schema | Dev |
| Wed | Build CSV → REST endpoint logic | Dev |
| Thu | Integrate x402 payment verification | Dev |
| Fri | Basic `deploy` command working | Dev |
| Fri | **Milestone: Deploy CSV → working API** | ✓ |

### Week 2: Core Features
| Day | Task | Owner |
|-----|------|-------|
| Mon | Wallet creation/import in CLI | Dev |
| Mon | Withdrawal logic + platform fee | Dev |
| Tue | `wallet` and `withdraw` commands | Dev |
| Wed | `status` and `logs` commands | Dev |
| Thu | Basic web dashboard (Next.js) | Dev |
| Fri | Dashboard: login, view APIs, revenue | Dev |
| Fri | **Milestone: Full CLI + basic dashboard** | ✓ |

### Week 3: Polish & Security
| Day | Task | Owner |
|-----|------|-------|
| Mon | Rate limiting on API gateway | Dev |
| Mon | Error handling and logging | Dev |
| Tue | SDK for consumers (TypeScript) | Dev |
| Wed | SDK for consumers (Python) | Dev |
| Thu | Documentation site (Mintlify/Docusaurus) | Dev |
| Fri | Security review, pen testing basics | Dev |
| Fri | **Milestone: Production-ready** | ✓ |

### Week 4: Launch
| Day | Task | Owner |
|-----|------|-------|
| Mon | Deploy 3 example APIs | Dev |
| Mon | Landing page final polish | Dev |
| Tue | Private alpha (10 users) | Launch |
| Wed | Fix critical bugs from alpha | Dev |
| Thu | Prepare launch content (video, thread) | Marketing |
| Fri | **PUBLIC LAUNCH** | 🚀 |
| Fri | Post to X, Discord, Moltbook | Marketing |

### Post-Launch (Week 5+)
- Monitor and fix bugs
- Gather user feedback
- Plan Phase 2 (functions, MCP)

---

## 11. Open Questions

### Decisions Needed Before Build

| Question | Options | Recommendation |
|----------|---------|----------------|
| Domain name? | 402claw.com, four02.dev, payapi.dev | **402claw.com** (available?) |
| Wallet derivation? | Random, from email hash, from signing | **From signing** (deterministic) |
| Free tier? | None, 100 calls/day, 1000 calls/month | **1000 calls/month** (grow supply) |
| JSON query support? | Full JSONPath, simple dot notation, none | **Simple dot notation** (MVP) |

### Things to Validate

| Question | How to Validate |
|----------|-----------------|
| Do agents want to sell APIs? | Survey 10 OpenClaw users |
| Will agents pay for other agents' APIs? | Build 1 useful API, see if it gets calls |
| Is $0.01 the right price floor? | A/B test or ask users |
| Is 5% take rate acceptable? | Compare to alternatives, ask users |

### Technical Decisions Deferred

| Decision | When to Decide |
|----------|----------------|
| Function runtime (Deno, Node, Python) | Phase 2 planning |
| Multi-chain support (Solana, etc.) | Based on user demand |
| MCP integration design | Phase 2 planning |
| Marketplace discovery features | Phase 3 planning |

---

## 12. Appendix

### A. CLI Command Reference (MVP)

```
402claw - Deploy paid APIs in seconds

USAGE:
  402claw <command> [options]

COMMANDS:
  init              Initialize 402claw (create wallet)
  deploy <file>     Deploy CSV/JSON as paid API
  status            List your deployed APIs
  logs <api-id>     View access logs for an API
  wallet            Show wallet balance
  withdraw <amt> <addr>  Withdraw USDC to address
  help              Show this help

DEPLOY OPTIONS:
  --price <amount>  Price per request in USD (default: 0.01)
  --name <name>     Human-readable name for the API
  --description <d> API description

EXAMPLES:
  402claw init
  402claw deploy data.csv --price 0.02 --name "NYC Restaurants"
  402claw wallet
  402claw withdraw 10.00 0x123...
```

### B. API Response Format

```json
// Success response
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  },
  "payment": {
    "amount": "0.01",
    "token": "USDC",
    "tx": "0x..."
  }
}

// 402 Payment Required
{
  "error": "payment_required",
  "price": "0.01",
  "token": "USDC",
  "network": "base",
  "recipient": "0x..."
}
```

### C. Database Schema (Turso)

```sql
-- Users (wallet = identity)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- APIs
CREATE TABLE apis (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  file_path TEXT NOT NULL,
  price_usd REAL NOT NULL,
  schema JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Usage logs
CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  api_id TEXT NOT NULL,
  caller_wallet TEXT,
  amount_usd REAL,
  tx_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_id) REFERENCES apis(id)
);

-- Withdrawals
CREATE TABLE withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  fee_usd REAL NOT NULL,
  destination TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### D. x402 Payment Flow (Detailed)

```
1. Client → Server: GET /api/abc123?cuisine=italian
2. Server → Client: 402 Payment Required
   Headers:
     X-402-Version: 1
     X-402-Price: 0.01
     X-402-Token: USDC
     X-402-Network: 8453 (Base)
     X-402-Recipient: 0x...
     X-402-Facilitator: https://x402.coinbase.com

3. Client constructs payment:
   - Creates EIP-712 typed data
   - Signs with wallet
   - Encodes as base64

4. Client → Server: GET /api/abc123?cuisine=italian
   Headers:
     X-402-Payment: <base64-encoded-payment>

5. Server → Facilitator: POST /verify
   Body: { payment: <payment>, price: 0.01 }

6. Facilitator verifies signature, settles on-chain
   Returns: { valid: true, tx: "0x..." }

7. Server → Client: 200 OK
   Body: { data: [...], payment: { tx: "0x..." } }
```

---

## Summary

**402claw** fills a clear gap: no platform lets agents easily deploy paid APIs with native micropayments. By focusing on CSV/JSON deployment with x402 in a 4-week MVP, we can validate demand quickly and cheaply.

**Key decisions:**
- x402-only (no Stripe in MVP) for simplicity
- 5% withdrawal fee (not per-transaction)
- Cloudflare Workers for hosting (~$40/mo)
- CLI-first, web-second

**Success = 50 APIs deployed, $500 GMV in Month 1**

Let's build it. 🚀

---

*Plan created by Clawsenberg | February 12, 2026*
