# 402claw - Complete Research Package

**Generated:** 2026-02-12 20:49 CET
**Status:** Ready for review
**Total research documents:** 20+
**Total research output:** ~300KB

---

## Table of Contents

1. Executive Summary
2. Product Definition
3. MVP Plan
4. CLI Design
5. Technical Architecture
6. Competitive Analysis
7. Market Research
8. Payment Infrastructure
9. Open Questions
10. Next Steps

---

## 1. Executive Summary

### What is 402claw?

**One-liner:** "Deploy your data, get a paid API. One command."

**The Problem:**
- Developers and AI agents have valuable data/code (ML models, research, datasets, utility functions)
- No lightweight path to monetization without building full SaaS infrastructure
- AI agents can't do traditional signup/payment flows - they NEED programmatic per-request payments

**The Solution:**
```bash
402claw deploy data.csv --price 0.001
# Done. API live. Getting paid in USDC.
```

**Why Now:**
- Stripe launched x402 support 2 days ago (Feb 10, 2026)
- x402 processed 100M+ payments, 200K+ DAU
- Google deployed Agent Payments Protocol (AP2) using x402
- Coinbase CDP facilitator: 1.2M payments in 5 days
- Market is HOT - big players validating the space

**Business Model:**
- 5% withdrawal fee (vs RapidAPI's 25%)
- x402 micropayments on Base (USDC)
- Payments as low as $0.01

**Target Users:**
1. AI agents wanting to monetize data/skills
2. Developers with valuable code/data
3. Humans with datasets (CSV upload)


---

## 2. MVP Plan (from 402claw-final-mvp-plan.md)

# 402claw — Final MVP Plan

**Version:** 2.0 (Consolidated)  
**Date:** February 12, 2026  
**Status:** READY FOR EXECUTION  
**Author:** Clawsenberg + Research Team

---

## Executive Summary

### What Changed Based on Research

| Area | Original Assumption | Research Finding | Decision |
|------|---------------------|------------------|----------|
| **CSV-to-API** | Build from scratch | csv2api (Node.js) is excellent foundation | **Fork csv2api** — saves 1-2 weeks |
| **Competition** | Blue ocean | MCPay/Toolhouse.ai exist but limited | **Differentiate on x402 + simplicity** |
| **Timeline** | 4 weeks MVP | Tech spec says 6-8 weeks | **Stick with 4 weeks** — aggressive but doable |
| **Take Rate** | 5% on withdrawal | RapidAPI charges 25%; market accepts 10% | **Keep 5%** — competitive advantage |
| **Target Users** | Generic "agents" | OpenClaw/Claude Code agents best fit | **Focus on MCP ecosystem first** |
| **Payment Model** | x402-only | Hybrid Stripe+x402 possible | **x402-only for MVP** — simpler |

### Key Decisions Made

1. ✅ **Fork csv2api** instead of building CSV-to-API from scratch
2. ✅ **Cloudflare Workers for Platforms** as hosting layer
3. ✅ **x402-only payments** (no Stripe in MVP)
4. ✅ **5% withdrawal fee** (not per-transaction)
5. ✅ **CLI-first, MCP-second, Web-third** priority order
6. ✅ **4-week aggressive timeline** with focused scope

### Risks Identified

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| x402 adoption too low | Medium | High | Build compelling demo APIs; document value |
| Cloudflare complexity | Medium | Medium | Use simple patterns first; defer advanced features |
| No demand for CSV APIs | Medium | High | Validate with 5 OpenClaw users in Week 1 |
| Toolhouse.ai races ahead | Medium | Medium | Ship fast; differentiate on x402 + simplicity |
| Legal (money transmission) | Low | Critical | Legal review before public launch |

---

## 1. Competitive Positioning

### MCPay Comparison

| Feature | 402claw | MCPay/Nevermined | RapidAPI |
|---------|---------|------------------|----------|
| **x402 Native** | ✅ Core | ✅ Supported | ❌ |
| **One-Command Deploy** | ✅ | ❌ Complex setup | ❌ |
| **CSV/JSON → API** | ✅ | ❌ | ❌ |
| **Take Rate** | 5% | Unknown | 25% |
| **Agent-First** | ✅ | ✅ | ❌ Human-first |
| **MCP Integration** | Phase 2 | ✅ Native | ❌ |
| **Time to First Revenue** | <5 min | Hours | Days |

### How We're Different

**The 402claw Advantage:**

1. **Simplest Path to Paid API**
   - RapidAPI: Create account → Upload docs → Configure pricing → Wait for approval → Integrate SDK
   - Toolhouse: Deploy agent → Configure tools → Set up payments → Marketplace listing
   - **402claw: `402claw deploy data.csv --price 0.01` → Done.**

2. **x402-Native from Day One**
   - Not bolted on, but core architecture
   - Agent wallets, not human payment forms
   - Sub-cent micropayments that work

3. **Agent-Optimized**
   - JSON output everywhere (`--json`)
   - No CAPTCHAs, no human verification gates
   - Programmatic everything

### Our Unique Value Proposition

> **"Deploy your data or code, get a paid API. One command. Revenue in your wallet."**

**Tagline options:**
- "The Vercel for Agent APIs"
- "Ship tools. Get paid. By agents."
- "One command to monetize your tool."

---

## 2. Revised Technical Approach

### Build vs Buy Decisions

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **CSV-to-API engine** | 🔨 Fork csv2api | Best feature set, MIT license, Node.js |
| **API hosting** | 🛒 Cloudflare Workers for Platforms | Native multi-tenant, ~$25/mo |
| **Payment protocol** | 🛒 x402 SDK | Coinbase-backed, proven |
| **Payment splitting** | 🛒 0xSplits | Immutable, trustless |
| **File storage** | 🛒 Cloudflare R2 | Zero egress fees |
| **Database** | 🛒 Cloudflare D1 | Native Workers integration |
| **CLI** | 🔨 Build (Go or Node) | Custom UX required |
| **Dashboard** | 🔨 Build (Next.js) | Simple, custom branding |

### Using csv2api

**What csv2api gives us:**
- ✅ Auto schema detection
- ✅ Full-text search
- ✅ Pagination & sorting
- ✅ Real-time file watching
- ✅ Column statistics
- ✅ Library mode (importable)
- ✅ MIT license

**What we add:**
- x402 payment middleware
- Wallet management
- Platform fee collection
- Cloudflare deployment
- Multi-tenant routing

**Integration pattern:**
```javascript
import { createServer } from 'csv2api-fork';
import { x402Middleware } from '402claw/payments';

const app = createServer('./data.csv');
app.use('/data', x402Middleware({ price: '0.001 USDC' }));
```

### Integration with x402 Ecosystem

```
┌─────────────────────────────────────────────────────────────┐
│                    402claw Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Client Request                                             │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            Cloudflare Dispatch Worker                │   │
│   │  ┌─────────────────────────────────────────────┐    │   │
│   │  │  1. Route by API name                       │    │   │
│   │  │  2. Check X-402-Payment header              │    │   │
│   │  │  3. If missing → return 402 + requirements  │    │   │
│   │  │  4. If present → verify via x402 facilitator│    │   │
│   │  │  5. If valid → dispatch to user Worker      │    │   │
│   │  └─────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │        User Worker (csv2api-based)                   │   │
│   │  • Query CSV data                                    │   │
│   │  • Return paginated results                          │   │
│   └─────────────────────────────────────────────────────┘   │
│                          │                                   │
│            ┌─────────────┼─────────────┐                    │
│            ▼             ▼             ▼                    │
│   ┌──────────────┐ ┌──────────┐ ┌──────────────┐            │
│   │     R2       │ │    D1    │ │  0xSplits    │            │
│   │ (CSV files)  │ │ (metadata)│ │ (payments)   │            │
│   └──────────────┘ └──────────┘ └──────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Updated MVP Scope

### ✅ What's in MVP (Absolutely Essential)

#### Week 1-2: Core
- [ ] **`402claw deploy <file>`** — CSV/JSON upload → working API
- [ ] **x402 payment verification** — 402 response with payment requirements
- [ ] **Basic wallet** — Auto-create on first use, store in keychain
- [ ] **`402claw status`** — List deployed APIs
- [ ] **`402claw wallet`** — Show balance

#### Week 3: Polish
- [ ] **`402claw withdraw`** — Withdraw to external wallet (5% fee)
- [ ] **`402claw logs <api-id>`** — View access logs
- [ ] **Basic web dashboard** — View APIs, revenue
- [ ] **Documentation** — Getting started, CLI reference

#### Week 4: Launch
- [ ] **3 example APIs** — Deployed by us, demonstrating value
- [ ] **Landing page** — Value prop, getting started CTA
- [ ] **Private alpha** — 10 OpenClaw users
- [ ] **Public launch** — X thread, Moltbook, Discord

### 📅 What's in v1.1 (2-4 weeks post-launch)

| Feature | Rationale |
|---------|-----------|
| **Python/JS function deployment** | Requires sandboxing work |
| **MCP tool integration** | Publish CLI as MCP server |
| **TypeScript/Python SDKs** | For consumers calling APIs |
| **Rate limiting** | Per-caller limits |
| **Webhooks** | Notify on new payments |

### 🚀 What's in v2+ (Later)

| Feature | Timeline |
|---------|----------|
| API discovery/marketplace | v2 (Month 2-3) |
| Subscription pricing | v2 |
| Custom domains | v2 |
| Fiat payments (Stripe) | v3 (if demand) |
| Team accounts | v3 |
| Enterprise features | v4+ |

### ❌ Explicitly NOT in MVP

- No Python/JS functions (just CSV/JSON)
- No marketplace/discovery (out of band for now)
- No Stripe/fiat (x402 only)
- No custom domains
- No subscription pricing
- No team features
- No rate limiting (trusted alpha users)

---

## 4. Week-by-Week Roadmap

### Week 1: Foundation

| Day | Deliverable | Owner | Dependencies |
|-----|-------------|-------|--------------|
| Mon | Set up Cloudflare account + Workers for Platforms | Ferdi | Cloudflare signup |
| Mon | Fork csv2api, create 402claw-csv repo | Clawsenberg | GitHub access |
| Tue | Implement file upload to R2 | Clawsenberg | CF account ready |
| Tue | Set up D1 database schema | Clawsenberg | CF account ready |
| Wed | Add x402 payment middleware to csv2api fork | Clawsenberg | x402 SDK |
| Thu | Create Dispatch Worker (routing + auth) | Clawsenberg | Workers for Platforms |
| Fri | Basic `deploy` command working | Clawsenberg | All above |
| Fri | **✅ MILESTONE: Deploy CSV → Working Paid API** | | |

**Week 1 Validation:**
- Can deploy a CSV and get a working endpoint?
- Does x402 payment flow work end-to-end?

### Week 2: CLI & Wallet

| Day | Deliverable | Owner | Dependencies |
|-----|-------------|-------|--------------|
| Mon | Wallet creation (keychain storage) | Clawsenberg | macOS keychain |
| Mon | Wallet import (existing private key) | Clawsenberg | |
| Tue | `wallet` command (show balance) | Clawsenberg | Wallet done |
| Tue | Integrate 0xSplits for payment splitting | Clawsenberg | 0xSplits SDK |
| Wed | `withdraw` command with platform fee | Clawsenberg | 0xSplits |
| Thu | `status` command (list APIs) | Clawsenberg | D1 queries |
| Thu | `logs` command (view access) | Clawsenberg | D1 queries |
| Fri | CLI polish and error handling | Clawsenberg | |
| Fri | **✅ MILESTONE: Full CLI Working** | | |

**Week 2 Validation:**
- Can create wallet, deploy, earn, and withdraw?
- Is error handling good enough for alpha?

### Week 3: Dashboard & Docs

| Day | Deliverable | Owner | Dependencies |
|-----|-------------|-------|--------------|
| Mon | Web dashboard scaffold (Next.js) | Clawsenberg | |
| Tue | Wallet connect (signature login) | Clawsenberg | viem |
| Tue | Dashboard: view deployed APIs | Clawsenberg | D1 API |
| Wed | Dashboard: view revenue/stats | Clawsenberg | D1 queries |
| Wed | Dashboard: update pricing | Clawsenberg | |
| Thu | Documentation site (basic) | Clawsenberg | |
| Thu | Getting started guide | Clawsenberg | CLI working |
| Fri | Security review (basic) | Ferdi/Clawsenberg | |
| Fri | **✅ MILESTONE: Production-Ready** | | |

**Week 3 Validation:**
- Dashboard functional?
- Docs clear enough for new users?

### Week 4: Launch

| Day | Deliverable | Owner | Dependencies |
|-----|-------------|-------|--------------|
| Mon | Deploy 3 example APIs | Clawsenberg | Platform ready |
| Mon | Landing page polish | Clawsenberg | |
| Tue | Private alpha invites (10 users) | Ferdi | User list |
| Tue | Alpha user onboarding calls | Ferdi | |
| Wed | Fix critical bugs from alpha | Clawsenberg | Alpha feedback |
| Wed | Prepare launch content | Ferdi | |
| Thu | Demo video (30-60 sec) | Ferdi | Working product |
| Thu | Twitter thread draft | Ferdi | |
| Fri | **🚀 PUBLIC LAUNCH** | Everyone | |
| Fri | Post to X, Discord, Moltbook | Ferdi | Content ready |

**Week 4 Success Criteria:**
- 10 external users in alpha
- At least 5 APIs deployed by non-team members
- Zero critical bugs at launch

---

## 5. Go/No-Go Decision Points

### Checkpoint 1: End of Week 1

**Go criteria:**
- [ ] Can deploy CSV and get working API endpoint
- [ ] x402 payment flow works (402 → pay → access)
- [ ] Infrastructure costs as expected (<$50/mo)

**Pivot triggers:**
- Cloudflare Workers for Platforms too complex → Consider Deno Deploy
- x402 integration blockers → Delay payments, launch free-tier first

### Checkpoint 2: End of Week 2

**Go criteria:**
- [ ] Full CLI working (deploy, wallet, withdraw)
- [ ] At least 3 internal test deploys successful
- [ ] End-to-end revenue flow works (deploy → earn → withdraw)

**Pivot triggers:**
- 0xSplits integration fails → Direct wallet payments, no splitting
- Withdrawal flow too complex → Launch without withdrawals, add later

### Checkpoint 3: End of Week 3 (Alpha Decision)

**Go to Alpha criteria:**
- [ ] Dashboard functional (view APIs, revenue)
- [ ] Documentation exists
- [ ] No known critical bugs

**Delay triggers:**
- Major security concerns → Delay alpha, fix first
- Dashboard not working → Alpha with CLI-only

### Checkpoint 4: End of Week 4 (Launch Decision)

**Launch criteria:**
- [ ] 10 alpha users onboarded
- [ ] At least 5 APIs deployed by external users
- [ ] No critical bugs in 24 hours
- [ ] Positive alpha feedback (>70% would recommend)

**Soft launch triggers (if criteria not met):**
- Launch to smaller audience
- Extend alpha period
- Focus on highest-value users only

### What Would Make Us Pivot Entirely?

| Signal | Response |
|--------|----------|
| Zero interest from alpha users | Pivot to different use case (e.g., MCP tools only) |
| x402 ecosystem collapses | Add Stripe payments urgently |
| Cloudflare costs explode | Move to Deno Deploy or self-host |
| Legal cease & desist | Pause, get legal advice |
| Better competitor emerges | Accelerate or niche down |

---

## 6. Success Metrics

### Week 1 Targets

| Metric | Target | Method |
|--------|--------|--------|
| Technical milestone | Deploy → API working | Manual test |
| Bugs discovered | <5 critical | Tracking |
| Infrastructure cost | <$30 | CF dashboard |

### Month 1 Targets

| Metric | Target | Notes |
|--------|--------|-------|
| APIs deployed | 50 | At least 30 by external users |
| API calls | 50,000 | Mix of test + real |
| Monthly GMV | $500 | Through platform |
| Platform revenue | $25 | 5% of withdrawals |
| Active creators | 20 | Deployed + earned |
| NPS score | >50 | Survey alpha users |

### Month 3 Targets

| Metric | Target |
|--------|--------|
| APIs deployed | 200 |
| API calls | 500,000 |
| Monthly GMV | $5,000 |
| Platform revenue | $250 |
| Active creators | 100 |
| Active consumers | 500 |

### North Star Metric

**Monthly GMV (Gross Merchandise Value)**

Why: It captures both supply (APIs deployed) and demand (APIs called) in a single number. Growing GMV means the marketplace is working.

---

## 7. Resource Requirements

### What Ferdi Needs to Do

| Task | Time | When |
|------|------|------|
| Cloudflare account setup | 1 hour | Week 1 Day 1 |
| Legal review (basic) | 2-4 hours | Week 3 |
| Alpha user recruitment | 2-3 hours | Week 3-4 |
| Alpha user calls | 3-5 hours | Week 4 |
| Launch content review | 1 hour | Week 4 |
| **Total** | ~10-15 hours | Spread over 4 weeks |

### What Clawsenberg Does

| Task | Time |
|------|------|
| Technical implementation | ~80-100 hours |
| Documentation | ~8 hours |
| Testing & bug fixes | ~16 hours |
| Demo content creation | ~4 hours |

### External Dependencies

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Cloudflare approval for Workers for Platforms | Low | Standard signup |
| x402 facilitator access | Low | Public API |
| 0xSplits deployment on Base | Low | Already deployed |
| Domain registration (402claw.com) | Medium | Check availability ASAP |

### Budget

| Item | Cost | Frequency |
|------|------|-----------|
| Cloudflare Workers for Platforms | $25 | Monthly |
| Cloudflare R2 (10GB) | ~$0.15 | Monthly |
| Cloudflare D1 | ~$0 (free tier) | Monthly |
| Domain (402claw.com) | ~$12 | Yearly |
| **Total** | ~$26/mo | |

---

## 8. Example APIs for Launch

### API 1: Fortune 500 Companies

**Data:** Fortune 500 list with revenue, employees, industry
**Price:** $0.001/query
**Use case:** Agents researching companies

```bash
402claw deploy fortune500.csv --price 0.001 --name fortune500
```

### API 2: Dad Jokes

**Data:** 500 dad jokes
**Price:** $0.0001/joke
**Use case:** Fun, low-stakes demo

```bash
402claw deploy jokes.csv --price 0.0001 --name dadjokes
```

### API 3: AI Model Benchmarks

**Data:** LLM benchmark results across models
**Price:** $0.01/query (higher value)
**Use case:** Agents evaluating models

```bash
402claw deploy benchmarks.csv --price 0.01 --name ai-benchmarks
```

---

## 9. Launch Checklist

### Before Alpha (Week 3)

- [ ] CLI installable via npm
- [ ] Basic documentation live
- [ ] 3 example APIs deployed
- [ ] Dashboard accessible
- [ ] Withdrawal flow tested

### Before Public Launch (Week 4)

- [ ] Landing page live at 402claw.com
- [ ] Demo video recorded (30-60 sec)
- [ ] Twitter thread drafted (10 tweets)
- [ ] Discord announcement ready
- [ ] Moltbook post ready
- [ ] Alpha bugs fixed
- [ ] Security basics reviewed

### Launch Day

- [ ] Post Twitter thread
- [ ] Post in OpenClaw Discord
- [ ] Post on Moltbook
- [ ] Monitor for issues
- [ ] Respond to feedback quickly

### Week After Launch

- [ ] Collect feedback
- [ ] Fix critical bugs
- [ ] Plan v1.1 features based on feedback
- [ ] Consider Hacker News "Show HN"

---

## 10. Final Decision Summary

| Decision | Choice | Confidence |
|----------|--------|------------|
| Build on Cloudflare Workers for Platforms | ✅ Yes | High |
| Fork csv2api for CSV-to-API | ✅ Yes | High |
| x402-only payments (no Stripe in MVP) | ✅ Yes | High |
| 5% withdrawal fee | ✅ Yes | Medium-High |
| 4-week timeline | ✅ Yes (aggressive) | Medium |
| Target OpenClaw users first | ✅ Yes | High |
| Launch with CSV/JSON only (no functions) | ✅ Yes | High |
| CLI-first approach | ✅ Yes | High |

---

## Appendix A: CLI Quick Reference

```bash
# Initialize
402claw init

# Deploy
402claw deploy data.csv --price 0.01

# Status
402claw status

# Wallet
402claw wallet
402claw withdraw <amount> <address>

# Logs
402claw logs <api-id>

# Help
402claw help
```

## Appendix B: Pricing Model

| Action | Fee |
|--------|-----|
| Deploy API | Free |
| API calls (creator revenue) | 0% |
| Withdraw earnings | 5% |
| Minimum withdrawal | $1.00 |

**Example:** $100 earned → $95 withdrawn

## Appendix C: Competitive Quick Reference

| Competitor | Our Advantage |
|------------|---------------|
| RapidAPI | 5% vs 25% fees; agent-native; simpler |
| Toolhouse.ai | One-command deploy; CSV support |
| MCPay/Nevermined | Simpler; faster time-to-revenue |
| Building yourself | We handle hosting, payments, everything |

---

**This document is the definitive 402claw MVP plan.**

**Next action:** Ferdi to review and approve, then Clawsenberg begins Week 1 implementation.

---

*Plan consolidated by Clawsenberg | February 12, 2026*

---

## 3. CLI Design (from 402claw-cli-design.md)

# 402claw CLI Design Specification

> The simplest way to deploy paid APIs. For agents and humans.

## Overview

```
402claw <command> [options]
```

**Global Flags (all commands):**
| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for programmatic use) |
| `--quiet`, `-q` | Suppress non-essential output |
| `--verbose`, `-v` | Show detailed output |
| `--help`, `-h` | Show help for command |
| `--version` | Show version |

---

## 1. Authentication

### `402claw login`

Link your wallet and authenticate with the 402claw registry.

```bash
402claw login [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--wallet <address>` | Ethereum wallet address | Interactive prompt |
| `--private-key <key>` | Private key (not recommended, use env) | - |
| `--keychain` | Use macOS Keychain / system keyring | ✓ (default) |
| `--network <network>` | Blockchain network | `base` |

**Example:**
```bash
# Interactive login (recommended)
$ 402claw login
? Enter your wallet address: 0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
? How do you want to store your private key?
  > System Keychain (recommended)
    Environment variable
    Config file (not recommended)

✓ Wallet linked: 0x5C78...D0F
✓ Network: Base (Chain ID 8453)
✓ Credentials stored in system keychain

You're ready to deploy! Try: 402claw deploy --help

# Non-interactive (for CI/agents)
$ 402claw login --wallet 0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F --keychain
✓ Logged in as 0x5C78...D0F
```

**JSON Output:**
```json
{
  "success": true,
  "wallet": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "network": "base",
  "chainId": 8453
}
```

---

### `402claw logout`

Remove stored credentials.

```bash
402claw logout [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--force`, `-f` | Skip confirmation |

**Example:**
```bash
$ 402claw logout
? Are you sure? This will remove all stored credentials. (y/N) y
✓ Logged out. Credentials removed.
```

---

### `402claw whoami`

Show current authentication status.

```bash
402claw whoami
```

**Example:**
```bash
$ 402claw whoami
Wallet:  0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
Network: Base (8453)
Balance: $12.45 USDC
APIs:    3 deployed
Earned:  $847.23 lifetime
```

**JSON Output:**
```json
{
  "wallet": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "network": "base",
  "chainId": 8453,
  "balance": {
    "usdc": "12.45",
    "raw": "12450000"
  },
  "stats": {
    "apiCount": 3,
    "lifetimeEarnings": "847.23"
  }
}
```

---

## 2. Deployment

### `402claw deploy`

Deploy a file or function as a paid API.

```bash
402claw deploy <source> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<source>` | File to deploy (CSV, JSON, Python, JavaScript) |

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--price <amount>` | Price per request in USDC | `0.001` |
| `--name <name>` | API name (slug) | Derived from filename |
| `--description <desc>` | Human-readable description | - |
| `--public` | List in public registry | `true` |
| `--private` | Don't list publicly | `false` |
| `--rate-limit <n>` | Max requests per minute per caller | `60` |
| `--timeout <ms>` | Request timeout in milliseconds | `30000` |
| `--env <KEY=value>` | Environment variable (repeatable) | - |
| `--env-file <path>` | Load env vars from file | - |
| `--dry-run` | Validate without deploying | `false` |

**Example:**
```bash
# Deploy a CSV dataset
$ 402claw deploy companies.csv --price 0.001 --name fortune500
Deploying companies.csv...

✓ Deployed: fortune500
  URL:      https://api.402claw.com/v1/fortune500
  Price:    $0.001 per request
  Type:     CSV (500 rows, 12 columns)

  Auto-generated endpoints:
    GET  /v1/fortune500           → All data (paginated)
    GET  /v1/fortune500/:id       → Single row by ID
    GET  /v1/fortune500/search    → Search by any column
    GET  /v1/fortune500/schema    → Column definitions

  Test it:
    402claw call fortune500 --params '{"limit": 5}'
```

**JSON Output:**
```json
{
  "success": true,
  "api": {
    "name": "fortune500",
    "url": "https://api.402claw.com/v1/fortune500",
    "price": "0.001",
    "type": "csv",
    "endpoints": [
      {"method": "GET", "path": "/v1/fortune500", "description": "All data (paginated)"},
      {"method": "GET", "path": "/v1/fortune500/:id", "description": "Single row by ID"},
      {"method": "GET", "path": "/v1/fortune500/search", "description": "Search"},
      {"method": "GET", "path": "/v1/fortune500/schema", "description": "Schema"}
    ],
    "metadata": {
      "rows": 500,
      "columns": 12
    }
  }
}
```

---

### `402claw update`

Update an existing deployment.

```bash
402claw update <name> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--source <file>` | New source file |
| `--price <amount>` | Update price |
| `--description <desc>` | Update description |
| `--rate-limit <n>` | Update rate limit |
| `--pause` | Pause the API (stops serving) |
| `--resume` | Resume a paused API |

**Example:**
```bash
$ 402claw update fortune500 --price 0.002
✓ Updated fortune500
  Price: $0.001 → $0.002
```

---

### `402claw undeploy`

Remove an API deployment.

```bash
402claw undeploy <name> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--force`, `-f` | Skip confirmation |

**Example:**
```bash
$ 402claw undeploy fortune500
? This will permanently remove the API. Continue? (y/N) y
✓ Removed: fortune500
```

---

## 3. List & Status

### `402claw list`

List your deployed APIs.

```bash
402claw list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--all`, `-a` | Include paused APIs | `false` |
| `--sort <field>` | Sort by: name, price, calls, earnings | `name` |

**Example:**
```bash
$ 402claw list

Your APIs (3 deployed)

  NAME          PRICE    CALLS (24h)  EARNINGS (24h)  STATUS
  ─────────────────────────────────────────────────────────
  fortune500    $0.001   1,234        $1.23           ✓ active
  weather-api   $0.002   567          $1.13           ✓ active  
  ai-summary    $0.01    89           $0.89           ⏸ paused

  Total earnings (24h): $3.25
```

**JSON Output:**
```json
{
  "apis": [
    {
      "name": "fortune500",
      "url": "https://api.402claw.com/v1/fortune500",
      "price": "0.001",
      "status": "active",
      "stats": {
        "calls24h": 1234,
        "earnings24h": "1.23"
      }
    }
  ],
  "summary": {
    "total": 3,
    "active": 2,
    "paused": 1,
    "earnings24h": "3.25"
  }
}
```

---

### `402claw stats`

Detailed statistics for an API or all APIs.

```bash
402claw stats [name] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--period <period>` | Time period: 1h, 24h, 7d, 30d, all | `24h` |
| `--breakdown` | Show hourly/daily breakdown | `false` |

**Example:**
```bash
$ 402claw stats fortune500 --period 7d

fortune500 - Last 7 days

  Calls:        8,432
  Earnings:     $8.43
  Avg latency:  45ms
  Error rate:   0.2%

  Daily breakdown:
    Mon   1,205  $1.21
    Tue   1,189  $1.19
    Wed   1,342  $1.34
    Thu   1,156  $1.16
    Fri   1,287  $1.29
    Sat     934  $0.93
    Sun   1,319  $1.32

  Top callers:
    0x1234...abcd  2,341 calls  $2.34
    0x5678...efgh  1,892 calls  $1.89
    0x9abc...ijkl  1,203 calls  $1.20
```

**JSON Output:**
```json
{
  "api": "fortune500",
  "period": "7d",
  "stats": {
    "calls": 8432,
    "earnings": "8.43",
    "avgLatencyMs": 45,
    "errorRate": 0.002
  },
  "daily": [
    {"date": "2026-02-05", "calls": 1205, "earnings": "1.21"},
    {"date": "2026-02-06", "calls": 1189, "earnings": "1.19"}
  ],
  "topCallers": [
    {"wallet": "0x1234...abcd", "calls": 2341, "spent": "2.34"}
  ]
}
```

---

## 4. Payouts

### `402claw balance`

Check your current balance.

```bash
402claw balance
```

**Example:**
```bash
$ 402claw balance

Wallet: 0x5C78...D0F

  Available:   $142.67 USDC
  Pending:     $12.34 USDC (clears in ~10 min)
  ─────────────────────────
  Total:       $155.01 USDC

  Lifetime earnings: $847.23
```

---

### `402claw withdraw`

Withdraw earnings to your wallet.

```bash
402claw withdraw [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--amount <amount>` | Amount to withdraw | All available |
| `--to <address>` | Destination wallet | Your linked wallet |
| `--force`, `-f` | Skip confirmation | `false` |

**Example:**
```bash
$ 402claw withdraw --amount 100
? Withdraw $100.00 USDC to 0x5C78...D0F? (y/N) y

Processing withdrawal...
✓ Withdrawn: $100.00 USDC
  Tx: 0xabc123...
  View: https://basescan.org/tx/0xabc123...

  New balance: $42.67 USDC
```

**JSON Output:**
```json
{
  "success": true,
  "amount": "100.00",
  "currency": "USDC",
  "to": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "txHash": "0xabc123...",
  "explorerUrl": "https://basescan.org/tx/0xabc123...",
  "newBalance": "42.67"
}
```

---

### `402claw payouts`

View payout history.

```bash
402claw payouts [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Number of payouts to show | `10` |

**Example:**
```bash
$ 402claw payouts

Recent payouts:

  DATE        AMOUNT      TX
  ────────────────────────────────────
  2026-02-10  $100.00     0xabc1...
  2026-02-03  $250.00     0xdef2...
  2026-01-28  $75.50      0xghi3...

  Total withdrawn: $425.50
```

---

## 5. Configuration

### `402claw config`

View or modify configuration.

```bash
402claw config [key] [value]
```

**Subcommands:**
| Command | Description |
|---------|-------------|
| `402claw config` | Show all config |
| `402claw config <key>` | Get specific value |
| `402claw config <key> <value>` | Set value |
| `402claw config --reset` | Reset to defaults |

**Example:**
```bash
# View all config
$ 402claw config

Configuration (~/.402claw/config.json):

  wallet:       0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
  network:      base
  defaultPrice: 0.001
  rateLimit:    60
  timeout:      30000
  apiUrl:       https://api.402claw.com

# Set default price
$ 402claw config defaultPrice 0.005
✓ Set defaultPrice = 0.005
```

---

## 6. Discovery

### `402claw search`

Search the public API registry.

```bash
402claw search <query> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--type <type>` | Filter by type: csv, json, function | - |
| `--max-price <price>` | Maximum price per request | - |
| `--sort <field>` | Sort by: relevance, price, popularity | `relevance` |
| `--limit <n>` | Number of results | `10` |

**Example:**
```bash
$ 402claw search "company data" --max-price 0.01

Found 12 APIs matching "company data":

  NAME              OWNER         PRICE    CALLS/DAY  DESCRIPTION
  ────────────────────────────────────────────────────────────────
  fortune500        0x5C78...     $0.001   1,234      Fortune 500 companies
  sp500-companies   0xabcd...     $0.002   892        S&P 500 with financials
  startup-db        0xefgh...     $0.005   456        Startup database

  Call an API:
    402claw call fortune500 --params '{"limit": 10}'
```

---

### `402claw info`

Get detailed info about an API.

```bash
402claw info <name>
```

**Example:**
```bash
$ 402claw info fortune500

fortune500
══════════════════════════════════════════

  Owner:        0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
  Price:        $0.001 per request
  Type:         CSV dataset
  Created:      2026-01-15
  Last updated: 2026-02-10

  Description:
    Complete Fortune 500 list with revenue, employees,
    headquarters, and industry classification.

  Endpoints:
    GET  /v1/fortune500           All data (paginated)
    GET  /v1/fortune500/:id       Single row by ID
    GET  /v1/fortune500/search    Search by any column
    GET  /v1/fortune500/schema    Column definitions

  Schema:
    id          (int)     Company rank
    name        (string)  Company name
    revenue     (float)   Revenue in millions
    employees   (int)     Number of employees
    industry    (string)  Industry classification
    hq_city     (string)  Headquarters city
    hq_state    (string)  Headquarters state

  Stats (30 days):
    Calls:      34,521
    Avg rating: 4.8/5 (127 reviews)

  Try it:
    402claw call fortune500 --params '{"limit": 5}'
```

---

## 7. Calling APIs

### `402claw call`

Call any 402claw API.

```bash
402claw call <name> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--endpoint <path>` | Specific endpoint (e.g., /search) | Base endpoint |
| `--params <json>` | Query parameters as JSON | `{}` |
| `--body <json>` | Request body for POST | - |
| `--method <method>` | HTTP method | `GET` |
| `--dry-run` | Show request without executing | `false` |
| `--raw` | Output raw response (no formatting) | `false` |

**Example:**
```bash
# Simple call
$ 402claw call fortune500 --params '{"limit": 3}'

Calling fortune500... (cost: $0.001)

[
  {"id": 1, "name": "Walmart", "revenue": 572754, "employees": 2300000},
  {"id": 2, "name": "Amazon", "revenue": 469822, "employees": 1541000},
  {"id": 3, "name": "Apple", "revenue": 365817, "employees": 164000}
]

  ✓ Paid: $0.001 USDC
  ✓ Latency: 42ms

# Search endpoint
$ 402claw call fortune500 --endpoint /search --params '{"industry": "Technology", "limit": 5}'

# Dry run (no payment)
$ 402claw call fortune500 --dry-run
Would call: GET https://api.402claw.com/v1/fortune500
Price: $0.001 USDC
Headers: X-402-Payer: 0x5C78...D0F
```

**JSON Output:**
```json
{
  "response": [
    {"id": 1, "name": "Walmart", "revenue": 572754, "employees": 2300000}
  ],
  "meta": {
    "cost": "0.001",
    "currency": "USDC",
    "latencyMs": 42,
    "txHash": "0xpayment..."
  }
}
```

---

## 8. Deploy Format Specifications

### CSV Files

**Source file:** `companies.csv`
```csv
id,name,revenue,employees,industry
1,Walmart,572754,2300000,Retail
2,Amazon,469822,1541000,Technology
3,Apple,365817,164000,Technology
```

**Deploy:**
```bash
402claw deploy companies.csv --price 0.001 --name fortune500
```

**Auto-generated endpoints:**

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /v1/{name}` | All rows (paginated) | `?limit=10&offset=0` |
| `GET /v1/{name}/:id` | Single row by first column | `/v1/fortune500/1` |
| `GET /v1/{name}/search` | Search any column | `?industry=Technology` |
| `GET /v1/{name}/schema` | Column definitions | Returns column types |
| `GET /v1/{name}/count` | Total row count | Returns `{"count": 500}` |

**Query parameters for main endpoint:**
- `limit` (int): Max rows to return (default: 100, max: 1000)
- `offset` (int): Skip N rows (for pagination)
- `sort` (string): Column to sort by
- `order` (string): `asc` or `desc`
- `{column}` (any): Filter by column value

---

### JSON Files

**Source file:** `products.json`
```json
{
  "products": [
    {"id": "prod_1", "name": "Widget", "price": 29.99, "stock": 150},
    {"id": "prod_2", "name": "Gadget", "price": 49.99, "stock": 75}
  ],
  "metadata": {
    "updated": "2026-02-12",
    "currency": "USD"
  }
}
```

**Deploy:**
```bash
402claw deploy products.json --price 0.002 --name product-catalog
```

**Auto-generated endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /v1/{name}` | Full JSON object |
| `GET /v1/{name}/{path}` | Access nested path (e.g., `/products`, `/metadata`) |
| `GET /v1/{name}/products/:id` | If array detected, access by id field |

---

### Python Functions

**Source file:** `summarize.py`
```python
"""
402claw API: AI-powered text summarization
price: 0.01
description: Summarize any text using GPT-4
"""

import os
from openai import OpenAI

def handler(request):
    """
    Summarize text.
    
    Args:
        text (str): The text to summarize
        max_length (int, optional): Maximum summary length. Default: 100
    
    Returns:
        dict: {"summary": "...", "word_count": N}
    """
    text = request.get("text")
    max_length = request.get("max_length", 100)
    
    if not text:
        return {"error": "text is required"}, 400
    
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"Summarize in under {max_length} words."},
            {"role": "user", "content": text}
        ]
    )
    
    summary = response.choices[0].message.content
    
    return {
        "summary": summary,
        "word_count": len(summary.split())
    }
```

**Deploy:**
```bash
402claw deploy summarize.py --env OPENAI_API_KEY=sk-xxx
# or
402claw deploy summarize.py --env-file .env
```

**Generated endpoint:**
- `POST /v1/summarize` → Calls `handler(request)` with JSON body

**Function requirements:**
1. Must have a `handler(request)` function
2. `request` is a dict with the JSON body
3. Return a dict (response) or tuple (response, status_code)
4. Optional docstring metadata at top of file
5. Use `requirements.txt` in same directory for dependencies

**requirements.txt:**
```
openai>=1.0.0
```

---

### JavaScript Functions

**Source file:** `translate.js`
```javascript
/**
 * 402claw API: Text translation
 * @price 0.005
 * @description Translate text between languages
 */

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Translate text to a target language.
 * @param {Object} request - The request object
 * @param {string} request.text - Text to translate
 * @param {string} request.target - Target language (e.g., "Spanish")
 * @param {string} [request.source] - Source language (auto-detected if not provided)
 * @returns {Object} - {translated: "...", detected_language: "..."}
 */
async function handler(request) {
    const { text, target, source } = request;
    
    if (!text || !target) {
        return { error: "text and target are required" };
    }
    
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
            role: "user",
            content: `Translate to ${target}: "${text}"`
        }]
    });
    
    return {
        translated: message.content[0].text,
        target_language: target,
        source_language: source || "auto-detected"
    };
}

module.exports = { handler };
```

**Deploy:**
```bash
402claw deploy translate.js --env ANTHROPIC_API_KEY=sk-xxx
```

**Generated endpoint:**
- `POST /v1/translate` → Calls `handler(request)`

**Function requirements:**
1. Export a `handler` function
2. Can be sync or async
3. Receives request object with JSON body
4. Return object (or throw for errors)
5. Use `package.json` in same directory for dependencies

---

## 9. Configuration File

**Location:** `~/.402claw/config.json`

```json
{
  "wallet": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "network": "base",
  "chainId": 8453,
  "apiUrl": "https://api.402claw.com",
  "defaults": {
    "price": "0.001",
    "rateLimit": 60,
    "timeout": 30000,
    "public": true
  },
  "credentials": {
    "storage": "keychain",
    "keyName": "402claw-wallet"
  }
}
```

**Credentials storage options:**
1. **keychain** (default): macOS Keychain / Linux secret-service
2. **env**: `WALLET_PRIVATE_KEY` environment variable
3. **file**: `~/.402claw/credentials` (encrypted, not recommended)

---

## 10. Environment Variables

| Variable | Description | Used by |
|----------|-------------|---------|
| `CLAW402_WALLET` | Override wallet address | All commands |
| `CLAW402_PRIVATE_KEY` | Wallet private key | Signing |
| `CLAW402_NETWORK` | Network (base, base-sepolia) | All commands |
| `CLAW402_API_URL` | API server URL | All commands |
| `CLAW402_CONFIG` | Custom config file path | All commands |

---

## 11. Error Messages

### Authentication Errors

```bash
# Not logged in
$ 402claw deploy data.csv
✗ Error: Not authenticated
  Run: 402claw login

# Invalid wallet
$ 402claw login --wallet invalid
✗ Error: Invalid wallet address
  Expected: 0x followed by 40 hex characters

# Insufficient balance
$ 402claw call expensive-api
✗ Error: Insufficient balance
  Required: $1.00 USDC
  Available: $0.50 USDC
  Fund your wallet: 0x5C78...D0F
```

### Deployment Errors

```bash
# Invalid file
$ 402claw deploy data.xlsx
✗ Error: Unsupported file type: .xlsx
  Supported: .csv, .json, .py, .js

# Missing handler
$ 402claw deploy broken.py
✗ Error: No handler function found in broken.py
  Your file must export: def handler(request): ...

# Name taken
$ 402claw deploy data.csv --name fortune500
✗ Error: API name 'fortune500' is already taken
  Try: 402claw deploy data.csv --name fortune500-v2

# Validation failed
$ 402claw deploy bad.csv
✗ Error: CSV validation failed
  Line 15: Expected 5 columns, found 4
  Fix the file and try again
```

### Runtime Errors

```bash
# API not found
$ 402claw call nonexistent
✗ Error: API 'nonexistent' not found
  Search for APIs: 402claw search <query>

# Rate limited
$ 402claw call busy-api
✗ Error: Rate limited
  Try again in 45 seconds
  Or: 402claw call busy-api --retry

# Timeout
$ 402claw call slow-api
✗ Error: Request timed out after 30s
  Try: 402claw call slow-api --timeout 60000
```

### JSON Error Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance",
    "details": {
      "required": "1.00",
      "available": "0.50",
      "currency": "USDC"
    }
  }
}
```

---

## 12. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Authentication required |
| 4 | Insufficient funds |
| 5 | Network error |
| 6 | API not found |
| 7 | Rate limited |
| 8 | Validation error |

---

## 13. Quick Reference

```bash
# Setup
402claw login                    # Link wallet
402claw whoami                   # Check status

# Deploy
402claw deploy data.csv          # Deploy CSV
402claw deploy api.py            # Deploy Python function
402claw list                     # See your APIs
402claw undeploy <name>          # Remove API

# Earn
402claw stats                    # View earnings
402claw balance                  # Check balance
402claw withdraw                 # Cash out

# Use
402claw search "weather"         # Find APIs
402claw info <name>              # API details
402claw call <name>              # Call an API

# All commands support:
--json                           # JSON output
--help                           # Command help
```

---

## 14. Agent-Friendly Design

The CLI is optimized for agent use:

1. **Predictable output:** Use `--json` for structured responses
2. **Non-interactive mode:** All prompts can be bypassed with flags (`--force`, etc.)
3. **Exit codes:** Clear success/failure indication
4. **Idempotent deploys:** Re-deploying updates instead of erroring
5. **Dry-run support:** Test without side effects
6. **Minimal dependencies:** Single binary, no runtime required

**Agent workflow example:**
```bash
# Check auth status
result=$(402claw whoami --json)
if [ "$(echo $result | jq -r '.wallet')" == "null" ]; then
    402claw login --wallet $WALLET --keychain
fi

# Deploy API
402claw deploy data.csv --price 0.001 --name my-api --json

# Check earnings
earnings=$(402claw stats my-api --period 24h --json | jq -r '.stats.earnings')
echo "Made $earnings today"

# Auto-withdraw if over threshold
balance=$(402claw balance --json | jq -r '.available')
if (( $(echo "$balance > 100" | bc -l) )); then
    402claw withdraw --force --json
fi
```

---

## Appendix: Full Command Tree

```
402claw
├── login           # Authenticate with wallet
├── logout          # Remove credentials
├── whoami          # Show current user
├── deploy          # Deploy new API
├── update          # Update existing API
├── undeploy        # Remove API
├── list            # List your APIs
├── stats           # View statistics
├── balance         # Check earnings balance
├── withdraw        # Withdraw to wallet
├── payouts         # View payout history
├── config          # View/set configuration
├── search          # Search public APIs
├── info            # Get API details
├── call            # Call an API
├── help            # Show help
└── version         # Show version
```

---

## 4. Technical Architecture (from 402claw-technical-spec.md)

# 402claw Technical Specification
## A Pay-Per-Call API Marketplace on x402

*Technical Spike - February 12, 2026*

---

## Executive Summary

402claw is a platform that enables anyone to deploy pay-per-call APIs monetized via x402. This document details the technical architecture, implementation approach, and specific technologies required to build it.

---

## 1. Cloudflare Workers for Platforms

### Overview
Workers for Platforms is the core technology that enables 402claw to run untrusted user code in isolated sandboxes.

### Key Concepts

**Dispatch Namespace**
- A container holding all user Workers (one namespace for production, optionally one for staging)
- NOT one namespace per customer — all customers' Workers live in a single namespace
- Can support millions of Workers per namespace

**Dynamic Dispatch Worker**
- Your platform's entry point that receives all requests
- Routes requests to the appropriate user Worker based on URL, subdomain, or headers
- This is where x402 payment verification happens

**User Workers**
- Customer code running in isolated V8 isolates
- Complete memory isolation between tenants
- Each gets its own KV, D1, R2 bindings if needed

### Architecture Diagram

```
Request → Cloudflare Edge → Dispatch Worker (x402 verification)
                                    ↓
                           Dispatch Namespace
                         /         |         \
                   User Worker  User Worker  User Worker
                   (alice-api) (bob-api)    (charlie-api)
```

### API for Programmatic Deployment

```bash
# Deploy a user Worker to a dispatch namespace
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/dispatch/namespaces/$NAMESPACE_NAME/scripts/$SCRIPT_NAME" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F 'metadata={"main_module": "worker.mjs", "bindings": [{"type": "kv_namespace", "name": "MY_KV", "namespace_id": "xxx"}], "tags": ["customer-123", "pro-plan"]};type=application/json' \
  -F 'worker.mjs=@worker.mjs;type=application/javascript+module'
```

**TypeScript SDK:**
```typescript
import Cloudflare from 'cloudflare';

const client = new Cloudflare();

await client.workers.scripts.update(scriptName, {
  account_id: accountId,
  dispatch_namespace: namespaceName,
  metadata: {
    main_module: 'worker.mjs',
    bindings: [
      { type: 'kv_namespace', name: 'DATA', namespace_id: kvNamespaceId }
    ],
    tags: ['customer-123', 'production']
  },
  // ... file content
});
```

### Multi-Tenant Isolation

Workers for Platforms provides:
- **V8 Isolate Isolation**: Each user Worker runs in its own V8 isolate
- **Memory Isolation**: Complete separation, no shared memory
- **Per-Customer Limits**: Set CPU time and subrequest limits per customer
- **Untrusted Mode**: User Workers don't get access to `request.cf` or zone caches

### Limits and Quotas

| Feature | Limit |
|---------|-------|
| Scripts per namespace | 1,000 included, +$0.02/script |
| CPU time per invocation | 30 seconds max |
| Memory per Worker | 128 MB |
| Script size | 10 MB (compressed) |
| Subrequests per invocation | 1,000 (paid) |

### Pricing

**Workers for Platforms Paid Plan: $25/month**

| Resource | Included | Overage |
|----------|----------|---------|
| Requests | 20M/month | $0.30/million |
| CPU time | 60M ms/month | $0.02/million ms |
| Scripts | 1,000 | $0.02/script |

**Example: 100M requests, 10ms avg CPU, 1,200 scripts = ~$72/month**

---

## 2. x402 Integration

### Protocol Overview

x402 is Coinbase's HTTP-native payment protocol. The flow:

1. Client requests protected resource
2. Server returns `HTTP 402` with payment requirements in `PAYMENT-REQUIRED` header
3. Client signs payment with wallet
4. Client retries request with `PAYMENT-SIGNATURE` header
5. Server verifies payment, serves resource, settles payment

### Integration Architecture

```
        ┌─────────────────────────────────────────────────┐
        │              Dispatch Worker                     │
        │  ┌─────────────────────────────────────────┐    │
        │  │  1. Check PAYMENT-SIGNATURE header      │    │
        │  │  2. If missing → return 402 + requirements│   │
        │  │  3. If present → verify via facilitator  │    │
        │  │  4. If valid → dispatch to user Worker   │    │
        │  │  5. After response → settle payment      │    │
        │  └─────────────────────────────────────────┘    │
        └─────────────────────────────────────────────────┘
```

### Dispatch Worker with x402

```typescript
import { paymentMiddleware, Network } from '@x402/hono'; // or express/next
import { Hono } from 'hono';

const app = new Hono();

// Payment verification middleware
const verifyPayment = async (request: Request, apiMetadata: ApiMetadata) => {
  const paymentHeader = request.headers.get('PAYMENT-SIGNATURE');
  
  if (!paymentHeader) {
    // Return 402 with payment requirements
    return new Response(null, {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': btoa(JSON.stringify({
          accepts: [{
            scheme: 'exact',
            network: 'eip155:8453', // Base
            maxAmountRequired: apiMetadata.priceUsd,
            resource: apiMetadata.endpoint,
            payTo: apiMetadata.ownerWallet, // or split address
            description: apiMetadata.description,
          }],
          facilitator: 'https://x402.coinbase.com',
        }))
      }
    });
  }
  
  // Verify payment with facilitator
  const verifyResponse = await fetch('https://x402.coinbase.com/verify', {
    method: 'POST',
    body: JSON.stringify({
      paymentPayload: paymentHeader,
      paymentRequirements: { /* ... */ }
    })
  });
  
  return verifyResponse.json();
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const apiName = url.pathname.split('/')[1];
    
    // Look up API metadata from D1
    const apiMetadata = await env.DB.prepare(
      'SELECT * FROM apis WHERE name = ?'
    ).bind(apiName).first();
    
    if (!apiMetadata) {
      return new Response('API not found', { status: 404 });
    }
    
    // Verify payment
    const paymentResult = await verifyPayment(request, apiMetadata);
    if (paymentResult instanceof Response) {
      return paymentResult; // 402 response
    }
    
    if (!paymentResult.valid) {
      return new Response('Payment invalid', { status: 402 });
    }
    
    // Dispatch to user Worker
    const userWorker = env.DISPATCHER.get(apiName);
    const response = await userWorker.fetch(request);
    
    // Settle payment after successful response
    if (response.ok) {
      await settlePayment(paymentResult, apiMetadata, env);
    }
    
    return response;
  }
};
```

### Payment Splitting (Platform Fee + Creator)

**Option A: 0xSplits (Recommended)**

[0xSplits](https://splits.org) provides immutable, gas-efficient payment splitting:

```typescript
// When creator registers API, create a Split
const splitAddress = await createSplit({
  recipients: [
    { address: creatorWallet, percentAllocation: 90 },
    { address: platformWallet, percentAllocation: 10 }
  ],
  distributorFee: 0,
  controller: '0x0000000000000000000000000000000000000000' // Immutable
});

// All payments go to splitAddress
// Anyone can call distribute() to split funds
```

Pros:
- Immutable contracts, no trust required
- 0% platform fees (just gas)
- Deployed on Base, Ethereum, and 13+ chains
- Automatic distribution on receive

**Option B: Custom Facilitator**

Build a custom x402 facilitator that:
1. Receives full payment
2. Splits before settlement
3. Settles to both platform and creator

```typescript
// Custom facilitator settle endpoint
app.post('/settle', async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body;
  
  // Calculate split
  const totalAmount = paymentPayload.amount;
  const platformFee = totalAmount * 0.10; // 10%
  const creatorAmount = totalAmount - platformFee;
  
  // Execute two transfers
  await transferUSDC(platformWallet, platformFee);
  await transferUSDC(creatorWallet, creatorAmount);
  
  res.json({ success: true });
});
```

### Settlement Options

| Option | Latency | Cost | Guarantee |
|--------|---------|------|-----------|
| Immediate settlement | ~2-5 sec | Higher gas | Strongest |
| Batched settlement | Minutes-hours | Lower gas | Good |
| Probabilistic | Instant | Lowest | Statistical |

**Recommendation**: Start with immediate settlement for trust, move to batching for scale.

---

## 3. Data Storage (CSV/JSON APIs)

### Architecture for Data APIs

```
User uploads CSV → Parse & validate → Store in R2 → Generate Worker
                                                         ↓
                                               Auto-REST endpoint
                                               (filters, pagination)
```

### Cloudflare R2 for File Storage

**Pricing:**
- Storage: $0.015/GB-month
- Class A (writes): $4.50/million
- Class B (reads): $0.36/million  
- Egress: **FREE**

**Why R2:**
- Zero egress fees (huge for APIs that serve data)
- S3-compatible API
- Native Workers binding
- 5 GB/object max

### Auto-Generated REST Endpoints

```typescript
// Worker generated from CSV upload
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    // Get data from R2
    const data = await env.BUCKET.get('data.json');
    let records = JSON.parse(await data.text());
    
    // Apply filters
    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('filter_')) {
        const field = key.replace('filter_', '');
        records = records.filter(r => r[field] === value);
      }
    }
    
    // Pagination
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 100;
    const start = (page - 1) * limit;
    records = records.slice(start, start + limit);
    
    return Response.json({
      data: records,
      pagination: { page, limit, total: records.length }
    });
  }
};
```

### Query Parsing Implementation

```typescript
interface QueryParams {
  // Filtering: ?filter_city=Amsterdam
  filters: Record<string, string>;
  // Sorting: ?sort=name&order=desc
  sort?: { field: string; order: 'asc' | 'desc' };
  // Pagination: ?page=2&limit=50
  pagination: { page: number; limit: number };
  // Field selection: ?fields=name,email
  fields?: string[];
}

function parseQuery(url: URL): QueryParams {
  const params = url.searchParams;
  
  return {
    filters: Object.fromEntries(
      [...params.entries()]
        .filter(([k]) => k.startsWith('filter_'))
        .map(([k, v]) => [k.replace('filter_', ''), v])
    ),
    sort: params.get('sort') ? {
      field: params.get('sort')!,
      order: (params.get('order') || 'asc') as 'asc' | 'desc'
    } : undefined,
    pagination: {
      page: parseInt(params.get('page') || '1'),
      limit: Math.min(parseInt(params.get('limit') || '100'), 1000)
    },
    fields: params.get('fields')?.split(',')
  };
}
```

---

## 4. User Functions (Python/JS)

### JavaScript Functions

Workers natively support JavaScript/TypeScript with:
- Full V8 runtime
- Web-standard APIs
- ~0ms cold starts (V8 isolates)

```typescript
// User-uploaded function becomes a Worker
export default {
  async fetch(request: Request) {
    // User's code here
    const result = await someCalculation();
    return Response.json(result);
  }
}
```

### Python Functions

Cloudflare Workers support Python via Pyodide (Python compiled to WebAssembly):

```python
# worker.py
from js import Response

async def on_fetch(request, env):
    # Full Python standard library available
    import json
    data = {"message": "Hello from Python!"}
    return Response.json(data)
```

**Python Capabilities:**
- Full standard library
- Popular packages: pandas, numpy, matplotlib (via Pyodide)
- Any pure-Python PyPI package
- Cold start: ~100-500ms (first request only)

### Sandbox SDK (Heavy Compute)

For operations that need more than Workers provide:

```typescript
import { getSandbox } from '@cloudflare/sandbox';

export default {
  async fetch(request: Request, env: Env) {
    const sandbox = getSandbox(env.Sandbox, 'user-123');
    
    // Execute Python script
    const result = await sandbox.exec('python analyze.py');
    
    return Response.json({
      output: result.stdout,
      exitCode: result.exitCode
    });
  }
};
```

**Sandbox Capabilities:**
- Full Linux container environment
- Install any packages
- Long-running processes
- File system access
- 10 GB storage per sandbox

**Sandbox Pricing:** Based on container duration (currently in beta, check for updates)

### Security Sandboxing

| Layer | Protection |
|-------|------------|
| V8 Isolate | Memory isolation, no shared state |
| WebAssembly | Additional sandboxing for Python |
| Workers Runtime | Blocked dangerous APIs |
| Outbound Worker | Control egress, rate limits |

**Outbound Worker Example:**
```typescript
// Outbound worker - controls what user code can access
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    
    // Block internal endpoints
    if (url.hostname.endsWith('.internal')) {
      return new Response('Blocked', { status: 403 });
    }
    
    // Rate limit external requests
    // Log all outbound requests for abuse detection
    
    return fetch(request);
  }
}
```

---

## 5. Database Architecture

### Data Requirements

| Data Type | Characteristics | Best Storage |
|-----------|-----------------|--------------|
| User accounts | Small, relational, consistent | D1 |
| API metadata | Small, frequently read | D1 + KV cache |
| Usage/billing | Append-heavy, time-series | D1 with partitioning |
| Payout records | Audit trail, immutable | D1 |
| User data files | Large blobs | R2 |
| Session/cache | High read, ephemeral | KV |

### Recommended: Cloudflare D1

**Why D1:**
- Native Workers integration (no network hop)
- SQLite-based (familiar, powerful)
- Up to 10 GB per database, 50,000 databases per account
- Can scale to millions of databases on Enterprise
- Read replicas for global performance
- $0.001/million rows read

**Schema Design:**

```sql
-- Users (wallet-based auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  tier TEXT DEFAULT 'free'
);

-- APIs
CREATE TABLE apis (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price_usd_cents INTEGER NOT NULL,
  worker_name TEXT NOT NULL,
  split_address TEXT, -- 0xSplits address for payments
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_apis_user ON apis(user_id);
CREATE INDEX idx_apis_name ON apis(name);

-- Usage tracking
CREATE TABLE usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_id TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()),
  caller_wallet TEXT,
  payment_hash TEXT,
  amount_usd_cents INTEGER,
  status TEXT,
  FOREIGN KEY (api_id) REFERENCES apis(id)
);
CREATE INDEX idx_usage_api_time ON usage(api_id, timestamp);

-- Payouts
CREATE TABLE payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount_usd_cents INTEGER NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (unixepoch()),
  settled_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### D1 vs Turso vs PlanetScale

| Feature | D1 | Turso | PlanetScale |
|---------|----|----|------------|
| Native CF integration | ✅ Yes | ❌ HTTP only | ❌ HTTP only |
| Latency from Workers | <1ms | 10-50ms | 10-50ms |
| SQLite compatible | ✅ Yes | ✅ Yes | ❌ MySQL |
| Free tier | 5GB, 5M reads/day | 9GB, 1B reads/mo | 5GB |
| Multi-region | ✅ Read replicas | ✅ Yes | ✅ Yes |
| Price | $0.001/M reads | $0.25/M reads | Usage-based |

**Recommendation:** Start with D1 for simplicity and native integration. Consider Turso only if you need multi-region writes.

---

## 6. Complete Tech Stack

### Core Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ Dispatch      │  │ Workers for   │  │ Sandbox SDK   │   │
│  │ Worker        │  │ Platforms     │  │ (Python/heavy)│   │
│  │ (x402 + route)│  │ (User code)   │  │               │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ D1            │  │ R2            │  │ KV            │   │
│  │ (Metadata)    │  │ (User files)  │  │ (Cache)       │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Blockchain (Base)                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ x402          │  │ 0xSplits      │  │ USDC          │   │
│  │ Facilitator   │  │ (Payment      │  │ Contract      │   │
│  │ (Coinbase)    │  │  splitting)   │  │               │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Edge compute | Cloudflare Workers | Gateway, routing |
| User code execution | Workers for Platforms | Multi-tenant sandboxing |
| Heavy compute | Sandbox SDK | Python, long-running jobs |
| Database | Cloudflare D1 | Metadata, usage tracking |
| File storage | Cloudflare R2 | User uploads (CSV, JSON) |
| Cache | Cloudflare KV | API metadata cache |
| Payments | x402 Protocol | Pay-per-call |
| Payment splitting | 0xSplits | Revenue share |
| Auth | Wallet signatures | No passwords |

### CLI Tool

**Recommended: Node.js with TypeScript**

Why:
- Same language as Workers
- Rich Cloudflare SDK
- Easy npm distribution
- x402 SDK available

```typescript
// 402claw CLI structure
src/
├── commands/
│   ├── init.ts        // Initialize new API project
│   ├── deploy.ts      // Deploy to 402claw
│   ├── logs.ts        // View API logs
│   ├── usage.ts       // View usage stats
│   └── withdraw.ts    // Withdraw earnings
├── lib/
│   ├── cloudflare.ts  // CF API client
│   ├── x402.ts        // x402 client
│   └── wallet.ts      // Wallet management
└── index.ts
```

**Example CLI Usage:**
```bash
# Install
npm install -g 402claw

# Login with wallet
402claw login

# Initialize a new API
402claw init my-api --template=data

# Deploy
402claw deploy --price 0.001

# Check earnings
402claw stats

# Withdraw
402claw withdraw
```

---

## 7. Build vs Buy Analysis

### Use Existing

| Component | Solution | Status |
|-----------|----------|--------|
| x402 SDK | `@x402/core`, `@x402/express`, etc. | ✅ Ready |
| Facilitator | Coinbase's x402.coinbase.com | ✅ Ready |
| Payment splitting | 0xSplits | ✅ Ready |
| Worker deployment | Cloudflare API/SDK | ✅ Ready |
| File storage | Cloudflare R2 | ✅ Ready |
| Database | Cloudflare D1 | ✅ Ready |

### Build Custom

| Component | Reason |
|-----------|--------|
| Dispatch Worker | Core routing + x402 integration |
| CLI | Developer experience |
| Dashboard UI | User management |
| API generator | CSV → Worker conversion |

### Effort Estimate

| Component | Effort |
|-----------|--------|
| Dispatch Worker | 1-2 weeks |
| CLI (basic) | 1 week |
| API from CSV generator | 3-5 days |
| Dashboard MVP | 2-3 weeks |
| Documentation | 1 week |
| **Total MVP** | **6-8 weeks** |

---

## 8. Security Considerations

### Malicious Code Prevention

**Layer 1: V8 Isolate Sandboxing**
- Each Worker runs in isolated V8 isolate
- No shared memory with other Workers
- No access to filesystem or system calls

**Layer 2: API Restrictions**
- No `eval()` or `new Function()` in user code
- Blocked APIs: file system, child processes
- Limited network access via Outbound Worker

**Layer 3: Outbound Worker**
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    // Blocklist
    const blocked = ['localhost', '127.0.0.1', '169.254.169.254'];
    if (blocked.some(h => url.hostname.includes(h))) {
      return new Response('Blocked', { status: 403 });
    }
    
    // Rate limit per user
    const userId = request.headers.get('x-user-id');
    const rateLimitKey = `ratelimit:${userId}`;
    // ... implement rate limiting
    
    return fetch(request);
  }
}
```

**Layer 4: Resource Limits**
```typescript
// Set custom limits per user
await client.workers.scripts.update(scriptName, {
  metadata: {
    // CPU limit in milliseconds
    limits: {
      cpu_ms: 50 // Max 50ms CPU per request
    }
  }
});
```

### Rate Limiting

**At Dispatch Worker:**
```typescript
async function rateLimit(request: Request, env: Env) {
  const ip = request.headers.get('CF-Connecting-IP');
  const key = `ratelimit:${ip}`;
  
  const current = await env.RATE_LIMIT.get(key);
  if (current && parseInt(current) > 1000) {
    return new Response('Rate limited', { status: 429 });
  }
  
  await env.RATE_LIMIT.put(key, String((parseInt(current) || 0) + 1), {
    expirationTtl: 60
  });
  
  return null; // Continue
}
```

**Cloudflare Built-in:**
- Use Cloudflare Rate Limiting rules
- WAF rules for common attacks
- Bot management

### DDoS Protection

Workers automatically get Cloudflare's DDoS protection:
- Layer 7 protection included
- No configuration needed
- Auto-scales to handle attacks

Additional measures:
- Under Attack Mode (enable via API if needed)
- Challenge suspicious requests
- Geographic restrictions if relevant

### API Key Management (Future)

For users who want traditional API keys alongside wallet auth:

```typescript
// Generate API key
function generateApiKey(userId: string): string {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const key = `402claw_${btoa(String.fromCharCode(...random))}`;
  // Store hash in D1
  return key;
}

// Validate
async function validateApiKey(key: string, env: Env): Promise<string | null> {
  const hash = await sha256(key);
  const result = await env.DB.prepare(
    'SELECT user_id FROM api_keys WHERE key_hash = ?'
  ).bind(hash).first();
  return result?.user_id;
}
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Cloudflare account with Workers for Platforms
- [ ] Create dispatch namespace
- [ ] Implement basic dispatch Worker
- [ ] D1 schema and migrations
- [ ] Basic x402 payment verification

### Phase 2: Core Features (Weeks 3-4)
- [ ] CLI scaffolding
- [ ] `deploy` command with API upload
- [ ] CSV → REST API generator
- [ ] Payment splitting with 0xSplits
- [ ] Basic usage tracking

### Phase 3: Polish (Weeks 5-6)
- [ ] Dashboard UI (earnings, logs)
- [ ] Python function support
- [ ] Rate limiting and security hardening
- [ ] Documentation and examples

### Phase 4: Launch (Weeks 7-8)
- [ ] Beta testing
- [ ] Landing page
- [ ] Example APIs
- [ ] Launch 🚀

---

## 10. Cost Projections

### Platform Costs at Scale

**Scenario: 1,000 APIs, 100M requests/month**

| Service | Usage | Cost |
|---------|-------|------|
| Workers for Platforms | 100M req, 10ms avg | ~$72/mo |
| D1 Database | 500M reads, 10M writes | ~$15/mo |
| R2 Storage | 100 GB, 100M reads | ~$40/mo |
| KV (cache) | 50M reads, 5M writes | ~$50/mo |
| **Total Infrastructure** | | **~$177/mo** |

**Revenue at 10% platform fee:**
- If average API charges $0.01/call
- 100M calls × $0.01 × 10% = **$100,000/mo platform revenue**

### Break-even Analysis

At $177/mo infrastructure, you need:
- ~18,000 API calls at $0.01 with 10% fee to break even
- Or ~1.8M calls at $0.001 with 10% fee

---

## Appendix A: Code Templates

### Basic REST API Worker

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Your API logic here
      const data = { message: 'Hello from 402claw!' };
      
      return new Response(JSON.stringify(data), {
        headers: corsHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
```

### Python Data Analysis API

```python
from js import Response
import json

async def on_fetch(request, env):
    # Parse request
    data = await request.json()
    
    # Import pandas (available in Pyodide)
    import pandas as pd
    
    # Process data
    df = pd.DataFrame(data['records'])
    result = {
        'count': len(df),
        'summary': df.describe().to_dict()
    }
    
    return Response.json(result)
```

### CSV to API Generator

```typescript
function generateWorkerFromCSV(csvContent: string): string {
  const Papa = require('papaparse');
  const parsed = Papa.parse(csvContent, { header: true });
  
  return `
const DATA = ${JSON.stringify(parsed.data)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    let results = DATA;
    
    // Filtering
    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('filter_')) {
        const field = key.replace('filter_', '');
        results = results.filter(r => String(r[field]) === value);
      }
    }
    
    // Pagination
    const page = parseInt(params.page) || 1;
    const limit = Math.min(parseInt(params.limit) || 100, 1000);
    const start = (page - 1) * limit;
    
    return Response.json({
      data: results.slice(start, start + limit),
      total: results.length,
      page,
      limit
    });
  }
};
`;
}
```

---

## Appendix B: Useful Links

- [Workers for Platforms Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/)
- [x402 GitHub](https://github.com/coinbase/x402)
- [x402 Documentation](https://x402.org)
- [0xSplits](https://splits.org)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Sandbox SDK](https://developers.cloudflare.com/sandbox/)

---

*Document generated: February 12, 2026*
*Author: Technical Spike - 402claw Research*

---

## 5. Competitive Analysis

# MCPay Analysis & Comparison with 402claw

**Date:** February 12, 2026  
**Author:** Clawsenberg (Subagent Analysis)  
**Status:** Complete

---

## Executive Summary

MCPay is a well-developed, actively maintained open-source project that adds x402 payments to MCP (Model Context Protocol) servers. After deep analysis, **402claw and MCPay are NOT redundant** - they serve different niches with distinct value propositions. However, there's significant overlap in the underlying payment infrastructure.

### TL;DR Recommendation
**Build 402claw, but integrate MCPay's SDK** where it makes sense. MCPay solves MCP server monetization; 402claw solves "data/function → paid API" for non-technical users and agents. Both can coexist.

---

## 1. MCPay Deep Dive

### 1.1 What MCPay Offers

MCPay is **infrastructure**, not a platform. It provides:

1. **SDK (`mcpay` npm package)**
   - Client wrapper (`withX402Client`) for MCP clients to auto-pay 402s
   - Server handler (`createMcpPaidHandler`) to add pricing to MCP tools
   - Multi-chain support: EVM (Base, Avalanche, IoTeX, Sei) + Solana

2. **CLI (`npx mcpay connect`)**
   - Stdio proxy connecting to paid MCP servers
   - Supports API keys OR wallet private keys for payment

3. **Registry (mcpay.tech)**
   - Discover paid MCP servers
   - Register your MCP server for monetization
   - Dashboard for analytics, payments, tools

4. **Facilitator Proxy**
   - High-availability x402 facilitator at `facilitator.mcpay.tech`
   - Failover between `facilitator.x402.rs` and `facilitator.payai.network`

### 1.2 MCPay Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MCPay Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Client Side                          Server Side               │
│   ───────────                          ───────────               │
│   ┌─────────────┐                      ┌─────────────┐          │
│   │ MCP Client  │                      │ Your MCP    │          │
│   │ (Cursor,    │                      │ Server      │          │
│   │  Claude,    │                      │ (Hono/Next) │          │
│   │  ChatGPT)   │                      │             │          │
│   └──────┬──────┘                      └──────┬──────┘          │
│          │                                    │                  │
│   ┌──────▼──────┐                      ┌──────▼──────┐          │
│   │ mcpay CLI   │                      │ mcpay SDK   │          │
│   │ connect     │──────── MCP ────────▶│ paidTool()  │          │
│   │ (x402 pay)  │◀──────────────────────│ (402 if !) │          │
│   └──────┬──────┘                      └──────┬──────┘          │
│          │                                    │                  │
│          └────────────┬───────────────────────┘                  │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                               │
│            │  MCPay Registry     │                               │
│            │  mcpay.tech         │                               │
│            │  - Server discovery │                               │
│            │  - Analytics        │                               │
│            │  - Payments         │                               │
│            └─────────────────────┘                               │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                               │
│            │  x402 Facilitator   │                               │
│            │  (verify + settle)  │                               │
│            └─────────────────────┘                               │
│                       │                                          │
│                       ▼                                          │
│            ┌─────────────────────┐                               │
│            │  Base / Solana      │                               │
│            │  (USDC settlement)  │                               │
│            └─────────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Payment Flow

1. MCP Client → MCP Server: `tools/call`
2. Server → Client: `402 Payment Required` + price metadata
3. Client (via SDK/CLI):
   - If configured with wallet → auto-pay and retry
   - If configured with API key → MCPay proxy handles payment
4. Payment verified via facilitator
5. Settled on-chain (USDC on Base or Solana)
6. Tool result returned

### 1.4 Tech Stack

| Component | Technology |
|-----------|------------|
| Core SDK | TypeScript, `@modelcontextprotocol/sdk` |
| Payments | `x402` protocol + `viem` for EVM, Solana SDK for SVM |
| Server handlers | Hono-based (edge-compatible) |
| Web app | Next.js 14, React, TailwindCSS |
| Database | Drizzle ORM (likely PostgreSQL or SQLite) |
| Hosting | Vercel |
| Monorepo | pnpm + Turborepo |

### 1.5 Project Maturity

| Metric | Value | Assessment |
|--------|-------|------------|
| **Commits** | 477 | Active development |
| **Contributors** | ~5-10 (based on PR activity) | Small but dedicated team |
| **Backed by** | vLayer, Coinbase CDP | Strong backing |
| **Awards** | 1st Coinbase Agents, Finalist ETHGlobal Prague, 2nd ETH Global Trifecta | Proven in hackathons |
| **GitHub Stars** | Check live | Growing |
| **npm downloads** | Check live | Growing |
| **Last commit** | Feb 12, 2026 | Very active |

### 1.6 MCPay Business Model

**Current:** Free/open-source infrastructure
- No visible transaction fees
- Registry is free to list
- Revenue model unclear (possibly VC-backed growth phase)

**Likely future:**
- Premium features for MCP server owners
- Enterprise plans for analytics/support
- Facilitator fees (currently using Coinbase's)

---

## 2. Gap Analysis

### 2.1 What MCPay Does Well

| Strength | Details |
|----------|---------|
| **MCP-native** | Built specifically for MCP protocol, understands tools/prompts/resources |
| **SDK quality** | Clean TypeScript, good DX with `paidTool()` helper |
| **Multi-chain** | EVM (6 networks) + Solana from day 1 |
| **Registry** | Discoverability for paid MCP servers |
| **Client support** | Works with Cursor, Claude, ChatGPT via CLI |
| **Open source** | Full codebase available, Apache 2.0 license |
| **Backed** | vLayer + Coinbase = credibility + resources |

### 2.2 What's Missing from MCPay

| Gap | Impact | Opportunity for 402claw? |
|-----|--------|--------------------------|
| **Non-MCP APIs** | Can't monetize plain REST APIs or data files | ✅ Yes - core 402claw use case |
| **Hosting** | Requires you to host your own MCP server | ✅ Yes - 402claw hosts for you |
| **Non-technical users** | Need to write code/understand MCP | ✅ Yes - upload CSV, done |
| **Data-first** | No "upload file → API" workflow | ✅ Yes - core 402claw feature |
| **Functions** | Only MCP tools, not arbitrary functions | ✅ Yes - 402claw functions |
| **Agent-to-agent** | Focused on human clients (Cursor/Claude) | ✅ Yes - 402claw agent-native |

### 2.3 Where MCPay and 402claw Overlap

| Overlap | MCPay Approach | 402claw Approach |
|---------|----------------|------------------|
| **x402 payments** | Full support | Full support |
| **Wallet management** | Via SDK/CLI | Built-in with CLI |
| **USDC on Base** | Primary network | Primary network |
| **CLI tool** | `mcpay connect` | `402claw deploy` |
| **Registry/discovery** | mcpay.tech/servers | Future phase |

---

## 3. Strategic Analysis

### 3.1 Should We Compete with MCPay?

**No, not directly.**

MCPay has:
- 477 commits head start
- vLayer + Coinbase backing
- ETHGlobal wins for credibility
- Active community

Competing on MCP server monetization would be:
- Duplication of effort
- Fighting an uphill battle
- Fragmenting the ecosystem

### 3.2 Should We Build on Top of MCPay?

**Partially yes.**

Use MCPay's components:
- `x402` protocol understanding (they've figured out edge cases)
- Facilitator proxy (high availability)
- Possibly their SDK for x402 client handling

**Don't use:**
- Their registry (we want our own ecosystem)
- Their dashboard (different UX needs)
- Their MCP handler (we're not MCP-focused)

### 3.3 Should We Focus on a Different Niche?

**Yes. This is the winning strategy.**

| MCPay Niche | 402claw Niche |
|-------------|---------------|
| MCP server developers | Anyone with data or code |
| Technical users | Non-technical users + agents |
| "Add payments to your MCP server" | "Turn your data into a paid API" |
| Infrastructure layer | Platform layer |
| Existing MCP servers | No server needed |

---

## 4. Differentiation: 402claw vs MCPay

### 4.1 Clear Differentiation

| Dimension | MCPay | 402claw |
|-----------|-------|---------|
| **Tagline** | "Add payments to MCP servers" | "Deploy data as paid API in one command" |
| **Primary user** | MCP server developers | Anyone with data/agents |
| **Requires code?** | Yes (MCP server) | No (upload CSV) |
| **Hosting** | You host | We host |
| **Protocol focus** | MCP-specific | REST APIs |
| **Complexity** | Medium-high | Very low |
| **Target market** | AI tool developers | Data owners, agents |

### 4.2 User Journey Comparison

**MCPay User Journey:**
1. Build an MCP server (Node.js/Python)
2. Add MCPay SDK to your server
3. Define `paidTool()` for each tool
4. Deploy your server somewhere
5. Register on mcpay.tech
6. Wait for clients to connect

**402claw User Journey:**
1. Have a CSV file
2. Run `402claw deploy restaurants.csv --price 0.01`
3. Done. Get paid.

### 4.3 The Key Insight

MCPay assumes you **already have** an MCP server and want to monetize it.

402claw assumes you **have data or a simple function** and want to expose it as a paid API without building anything.

These are fundamentally different problems.

---

## 5. Strategic Recommendations

### 5.1 Primary Strategy: Complementary Positioning

**Position 402claw as the "no-code/low-code" counterpart to MCPay.**

- MCPay = "Stripe for MCP servers" (infrastructure)
- 402claw = "Gumroad for API data" (platform)

Both serve the x402 ecosystem, but different users.

### 5.2 Technical Approach

1. **Use x402 protocol directly** (like MCPay does)
   - Don't reinvent payment verification
   - Use Coinbase's facilitator OR MCPay's proxy

2. **Don't build MCP support** (MCPay owns this)
   - Focus on REST APIs
   - Maybe add MCP later as an export format

3. **Differentiate on simplicity**
   - One command deployment
   - No code required
   - Instant wallet creation

### 5.3 Go-to-Market Differentiation

| MCPay Target | 402claw Target |
|--------------|----------------|
| MCP developers | Data owners |
| AI tool builders | Researchers with datasets |
| SaaS companies adding AI | Agents with outputs to sell |
| Cursor/Claude ecosystem | Agent-to-agent economy |

### 5.4 Potential Collaboration

Consider reaching out to MCPay team:
- They might want a "data API" feature
- Could be a partnership opportunity
- At minimum, avoid public conflict

### 5.5 Timeline Recommendation

**Week 1-4: Build 402claw MVP** (as planned)
- Focus on CSV/JSON → REST API
- x402 payments with Coinbase facilitator
- CLI-first, dead simple

**Month 2-3: Establish Position**
- Launch to OpenClaw community
- Differentiate clearly from MCPay
- Build initial user base

**Month 4+: Evaluate**
- If 402claw gains traction → expand
- If MCPay adds similar features → pivot or partner
- Stay agile

---

## 6. Conclusion

### Does MCPay Make 402claw Redundant?

**No.**

MCPay and 402claw serve different markets:
- MCPay: Technical users adding payments to existing MCP servers
- 402claw: Anyone turning data into paid APIs without coding

The x402 protocol is big enough for both.

### Honest Assessment

| Scenario | Likelihood | Impact |
|----------|------------|--------|
| Both succeed in different niches | **High** | Positive |
| MCPay adds "data upload" feature | Medium | Would compete, but we'd have first-mover in agent market |
| 402claw becomes redundant | Low | MCPay's focus is clearly MCP, not data |
| Partnership opportunity | Medium | Possible after we prove traction |

### Final Recommendation

**Build 402claw.** The niche is clear, the differentiation is real, and the agent economy needs both:
- Infrastructure for developers (MCPay)
- Platforms for everyone else (402claw)

---

## Appendix: MCPay Repository Structure

```
MCPay/
├── apps/
│   ├── app/          # Next.js dashboard (mcpay.tech)
│   ├── mcp/          # MCP proxy service
│   ├── mcp2/         # Updated MCP service
│   ├── mcp-data/     # Data service
│   ├── api2/         # API service
│   ├── docs/         # Documentation site
│   └── facilitator/  # x402 facilitator proxy
├── packages/
│   └── js-sdk/       # Main mcpay npm package
├── examples/
│   ├── chatgpt-apps-sdk-nextjs-starter/
│   ├── vlayer-client-example/
│   ├── auth-example/
│   └── x402-mcp/
└── context/          # AI context files
```

## Appendix: Useful MCPay Links

- **GitHub:** https://github.com/microchipgnu/MCPay
- **Website:** https://mcpay.tech
- **Registry:** https://mcpay.tech/servers
- **Docs:** https://docs.mcpay.tech
- **npm:** `mcpay`

---

*Analysis complete. Main agent can proceed with 402claw development.*

# CSV-to-API Tools Analysis & 402claw Integration Strategy

**Date:** 2026-02-12  
**Purpose:** Evaluate existing open-source CSV-to-API tools for potential integration with 402claw

---

## 1. Individual Tool Analysis

### 1.1 csv2api (Node.js)
**Repository:** https://github.com/jai0651/csv2api

#### Features
- 📊 CSV loading with automatic column detection
- 🔍 Full-text search across all fields
- 📄 Pagination with customizable page sizes
- 🔄 **Real-time file watching** (auto-reload on changes)
- 📈 Built-in statistics for numeric columns
- 🔒 CORS support (enabled by default)
- 📚 Dual-mode: CLI tool AND importable library

#### Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **CSV Parser:** csv-parser
- **File Watching:** chokidar
- **CLI:** Commander.js

#### Deployment
```bash
# CLI (instant)
npx csv2api data.csv --port 8080

# As library
npm install csv2api
```

#### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API docs & metadata |
| `/health` | GET | Health check |
| `/data` | GET | All data w/ filtering, search, pagination |
| `/data/:id` | GET | Single row by ID |
| `/columns` | GET | Column names |
| `/stats` | GET | Numeric column statistics |
| `/unique/:column` | GET | Unique values for column |

#### Query Parameters
- `search` - Case-insensitive full-text search
- `columns` - Comma-separated column filter
- `page` / `limit` - Pagination
- `sort` / `order` - Sorting (asc/desc)

#### Limitations
- No authentication/authorization
- No payment integration
- Express-only (no alternative servers)
- No database persistence (in-memory)

#### Maintenance Status
- **Activity:** New/Recent project (2024-2025)
- **Pros:** Well-documented, modern codebase
- **License:** MIT

---

### 1.2 fastapi-csv (Python)
**Repository:** https://github.com/jrieke/fastapi-csv

#### Features
- Auto-generated endpoints from CSV column names
- Auto-generated query parameters based on data types
- **SQLite backend** for fast queries on large files
- Smart type-based query operators:
  - `_greaterThan`, `_lessThanEqual` for numbers
  - `_contains` for strings
- Interactive Swagger/OpenAPI docs
- Hot-reload data via `app.update_database()`

#### Tech Stack
- **Runtime:** Python 3.7+
- **Framework:** FastAPI (async)
- **Database:** SQLite (temporary)
- **Server:** Uvicorn

#### Deployment
```bash
# CLI
pip install fastapi-csv
fastapi-csv data.csv

# Or from URL
fastapi-csv https://example.com/data.csv

# As library
from fastapi_csv import FastAPI_CSV
app = FastAPI_CSV("data.csv")
```

#### API Endpoints
Auto-generated based on filename:
- `/people` (from people.csv)
- Query with column names: `/people?first_name=Rachel&age_greaterThan=25`

#### Limitations
- No pagination (returns all matching results)
- No built-in file watching
- Updating data doesn't update schema (requires restart)
- Limited filter operators
- No authentication

#### Maintenance Status
- **Activity:** Moderate (last significant updates ~2021-2022)
- **Stars:** ~150+
- **License:** MIT

---

### 1.3 csvapi (Python - etalab)
**Repository:** https://github.com/etalab/csvapi

#### Features
- Instant JSON API from any CSV URL
- **Excel (.xls/.xlsx) support**
- SQLite backend (via agate)
- Flexible output shapes (arrays or objects)
- Production-ready (used by data.gouv.fr)
- SSL support with Hypercorn
- Optional caching with APC

#### Tech Stack
- **Runtime:** Python 3.9+
- **Framework:** Quart (async Flask-like)
- **Database:** SQLite
- **Server:** Hypercorn
- **Parser:** agate

#### Deployment
```bash
pip install csvapi
csvapi serve -h 0.0.0.0 -p 8000

# Production with SSL
hypercorn csvapi.webservice:app -b 0.0.0.0:443 --keyfile key.pem --ca-certs cert.pem
```

#### API Endpoints
```
# Convert CSV to API
GET /apify?url=http://example.com/data.csv
→ {"ok": true, "endpoint": "/api/abc123"}

# Query data
GET /api/<hash>?_size=100&_offset=0&_sort=column&_shape=objects
```

#### Query Parameters
- `_size` - Limit results (default: 100)
- `_offset` - Pagination offset
- `_sort` / `_sort_desc` - Sorting
- `_shape` - `lists` or `objects`
- `_rowid` - Show/hide row IDs
- `_total` - Show/hide total count
- `{column}__exact` / `{column}__contains` - Filtering

#### Limitations
- No real-time file watching
- Two-step process (convert then query)
- Limited filter comparators (exact, contains only)
- No authentication

#### Maintenance Status
- **Activity:** Active (government-backed, used in production)
- **Stars:** ~29
- **License:** AGPL-3.0 (⚠️ copyleft!)

---

### 1.4 csv-to-api (PHP)
**Repository:** https://github.com/project-open-data/csv-to-api

#### Features
- Multi-format output: JSON, XML, HTML
- Remote CSV proxy (serve any CSV via URL)
- JSONP callback support
- Optional APC caching
- Field-based filtering
- Sorting

#### Tech Stack
- **Runtime:** PHP
- **Caching:** APC (optional)
- **Dependencies:** None (single class)

#### Deployment
```php
// Copy files to web server
// Access via: /csv-to-api/?source=https://example.com/data.csv
```

#### Query Parameters
- `source` - CSV URL (required)
- `format` - json/xml/html
- `callback` - JSONP callback name
- `sort` / `sort_dir` - Sorting
- `{field}={value}` - Exact match filtering
- `header_row` - y/n (auto-generate field names)

#### Limitations
- **No pagination** (returns all data)
- No advanced filtering (exact match only)
- No type detection
- No search functionality
- Legacy PHP patterns
- Security concerns (arbitrary URL fetching)

#### Maintenance Status
- **Activity:** Dormant (last commit ~2014)
- **Stars:** ~200+ (historical value)
- **License:** GPL-3.0

---

## 2. Feature Comparison Matrix

| Feature | csv2api (Node) | fastapi-csv (Python) | csvapi (Python) | csv-to-api (PHP) |
|---------|----------------|---------------------|-----------------|------------------|
| **Auto Endpoints** | ✅ Fixed routes | ✅ From filename | ✅ Hash-based | ✅ Single route |
| **Full-text Search** | ✅ All fields | ❌ | ❌ | ❌ |
| **Column Filtering** | ✅ | ✅ Auto-generated | ✅ exact/contains | ✅ Exact only |
| **Numeric Comparisons** | ❌ | ✅ gt/lt/gte/lte | ❌ | ❌ |
| **Pagination** | ✅ page/limit | ❌ | ✅ size/offset | ❌ |
| **Sorting** | ✅ | ❌ | ✅ | ✅ |
| **Real-time Updates** | ✅ File watching | ⚠️ Manual reload | ❌ | ❌ |
| **Statistics** | ✅ Numeric stats | ❌ | ❌ | ❌ |
| **Unique Values** | ✅ Per column | ❌ | ❌ | ❌ |
| **Excel Support** | ❌ | ❌ | ✅ | ❌ |
| **Remote CSV URLs** | ❌ | ✅ | ✅ | ✅ |
| **OpenAPI Docs** | ❌ | ✅ Auto-generated | ❌ | ❌ |
| **Database Backend** | ❌ In-memory | ✅ SQLite | ✅ SQLite | ❌ In-memory |
| **Large File Support** | ⚠️ Memory-bound | ✅ Good | ✅ Good | ⚠️ Memory-bound |
| **Output Formats** | JSON | JSON | JSON | JSON/XML/HTML |
| **Library Mode** | ✅ | ✅ | ❌ | ❌ |
| **CORS Support** | ✅ Built-in | ✅ Via FastAPI | Manual | ❌ |
| **Authentication** | ❌ | ❌ | ❌ | ❌ |
| **Payment Integration** | ❌ | ❌ | ❌ | ❌ |
| **License** | MIT | MIT | AGPL-3.0 ⚠️ | GPL-3.0 |
| **Maintenance** | 🟢 Active | 🟡 Moderate | 🟢 Active | 🔴 Dormant |

---

## 3. Build vs Integrate Strategy

### Option A: Build from Scratch
**Effort:** High (~2-3 weeks)

**Pros:**
- Complete control over architecture
- Native x402 integration from day one
- No license complications
- Optimized for 402claw's specific needs

**Cons:**
- Reinventing the wheel
- More initial development time
- Need to handle edge cases others have solved

### Option B: Fork and Extend
**Best Candidate:** `csv2api` (Node.js)

**Effort:** Medium (~1 week)

**Pros:**
- Solid foundation with best feature set
- MIT license (no copyleft concerns)
- Modern Node.js codebase
- Already has library mode
- Real-time file watching built-in
- Active maintenance

**Cons:**
- Need to understand existing codebase
- May carry technical debt
- Upstream changes need merging

### Option C: Use as Dependency
**Best Candidate:** `csv2api` as npm package

**Effort:** Low (~2-3 days)

**Pros:**
- Fastest to implement
- Benefit from upstream improvements
- Less code to maintain

**Cons:**
- Less control over internals
- May need to wait for upstream features
- Dependency management overhead

---

### 🏆 Recommendation: **Option B - Fork csv2api**

**Reasoning:**

1. **Best Feature Match:** csv2api has the most comprehensive feature set (search, pagination, stats, file watching)

2. **License:** MIT allows commercial use and modification without copyleft obligations

3. **Architecture:** Express-based, easy to extend with middleware (perfect for x402)

4. **Library Mode:** Can be imported and wrapped, not just CLI

5. **Modern Stack:** Node.js aligns with 402claw ecosystem

6. **Modification Path:**
   ```javascript
   // Easy to wrap with x402 middleware
   import { createServer } from 'csv2api';
   import { x402Middleware } from '402claw';
   
   const app = createServer('./data.csv');
   app.use('/data', x402Middleware({ price: '0.001 USDC' }));
   ```

**Why Not Others:**
- **fastapi-csv:** No pagination, Python (different ecosystem)
- **csvapi:** AGPL license requires open-sourcing modifications
- **csv-to-api:** Dormant, PHP, missing core features

---

## 4. 402claw CSV Feature Specification

### 4.1 Overview

The `402claw csv` command transforms any CSV file into a monetized REST API with automatic x402 payment integration.

### 4.2 Core Commands

```bash
# Start a paid CSV API
402claw csv serve data.csv --price 0.001

# Serve with custom options
402claw csv serve data.csv \
  --price 0.01 \
  --port 8080 \
  --host 0.0.0.0 \
  --free-tier 100 \
  --rate-limit 60/min

# Deploy to cloud (future)
402claw csv deploy data.csv --price 0.01
```

### 4.3 Generated Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /` | Free | API documentation & schema |
| `GET /health` | Free | Health check |
| `GET /preview` | Free | First 5 rows (teaser) |
| `GET /data` | **Paid** | Full data with search/filter/pagination |
| `GET /data/:id` | **Paid** | Single row by ID |
| `GET /columns` | Free | Column names and types |
| `GET /stats` | **Paid** | Statistics for numeric columns |
| `GET /unique/:column` | **Paid** | Unique values |
| `GET /export` | **Paid (2x)** | Full CSV download |

### 4.4 Query Parameters

**Standard (from csv2api):**
- `search` - Full-text search across all fields
- `columns` - Comma-separated column filter
- `page` / `limit` - Pagination (default: page=1, limit=100)
- `sort` / `order` - Sorting (asc/desc)

**402claw Extensions:**
- `format` - Response format: `json` (default), `csv`, `jsonl`
- `fields` - Alias for columns (GraphQL-style)

### 4.5 x402 Integration

#### Payment Flow

```
Client                          402claw CSV API
  |                                    |
  |  GET /data?search=foo              |
  |  (no payment header)               |
  |----------------------------------->|
  |                                    |
  |  402 Payment Required              |
  |  X-402-Price: 0.001 USDC           |
  |  X-402-Network: base               |
  |  X-402-PayTo: 0x1234...            |
  |<-----------------------------------|
  |                                    |
  |  [Client makes payment]            |
  |                                    |
  |  GET /data?search=foo              |
  |  X-402-Payment: <signed_receipt>   |
  |----------------------------------->|
  |                                    |
  |  200 OK                            |
  |  { rows: [...], total: 150 }       |
  |<-----------------------------------|
```

#### Pricing Model

```javascript
// Default: Per-request pricing
const pricing = {
  '/data': '0.001 USDC',
  '/data/:id': '0.0005 USDC',
  '/stats': '0.002 USDC',
  '/unique/:column': '0.001 USDC',
  '/export': '0.01 USDC'  // Higher for bulk
};

// Alternative: Per-row pricing
const rowPricing = {
  basePrice: '0.0001 USDC',  // Per row returned
  maxPrice: '0.01 USDC',      // Cap per request
};

// Alternative: Subscription/credits (future)
const subscription = {
  credits: 1000,
  price: '0.50 USDC',
  validity: '24h'
};
```

### 4.6 Configuration File

`402claw-csv.json`:
```json
{
  "source": "./data.csv",
  "name": "My Dataset API",
  "description": "Premium dataset with 10,000 records",
  "pricing": {
    "model": "per-request",
    "default": "0.001 USDC",
    "endpoints": {
      "/export": "0.01 USDC"
    }
  },
  "freeTier": {
    "enabled": true,
    "requestsPerDay": 100,
    "previewRows": 5
  },
  "rateLimit": {
    "requests": 60,
    "window": "1m"
  },
  "cors": {
    "enabled": true,
    "origins": ["*"]
  },
  "watch": true
}
```

### 4.7 Example Usage

#### Publisher (Data Owner)

```bash
# Simple: Monetize a CSV instantly
$ 402claw csv serve products.csv --price 0.001
🚀 CSV API started!
   Endpoint: http://localhost:3402
   Price: 0.001 USDC per request
   File: products.csv (1,547 rows, 12 columns)
   
   Paid endpoints:
   • GET /data - Query with search, filter, pagination
   • GET /data/:id - Get single row
   • GET /stats - Column statistics
   • GET /export - Download full CSV
   
   Free endpoints:
   • GET / - API docs
   • GET /preview - First 5 rows
   • GET /columns - Schema info
```

#### Consumer (API User)

```bash
# Using 402claw client
$ 402claw fetch http://api.example.com/data?search=electronics
Payment: 0.001 USDC to 0x1234...
Response: 200 OK

{
  "rows": [...],
  "total": 47,
  "page": 1,
  "limit": 100
}

# Using curl with manual payment
$ curl -H "X-402-Payment: $PAYMENT_RECEIPT" \
    "http://api.example.com/data?search=electronics&limit=10"
```

#### Code Integration

```javascript
// Node.js client
import { Claw402Client } from '402claw';

const client = new Claw402Client({
  wallet: process.env.WALLET_KEY
});

const data = await client.get('http://api.example.com/data', {
  params: { search: 'laptop', limit: 50 }
});
// Payment handled automatically

console.log(data.rows);
```

```python
# Python client
from claw402 import Client

client = Client(wallet_key=os.environ['WALLET_KEY'])

data = client.get('http://api.example.com/data', params={
    'search': 'laptop',
    'limit': 50
})

print(data['rows'])
```

### 4.8 Implementation Roadmap

#### Phase 1: MVP (Week 1-2)
- [ ] Fork csv2api
- [ ] Add x402 middleware integration
- [ ] Basic CLI: `402claw csv serve`
- [ ] Per-request pricing
- [ ] Free preview endpoint

#### Phase 2: Enhanced Features (Week 3-4)
- [ ] Configuration file support
- [ ] Rate limiting
- [ ] Free tier quotas
- [ ] Multiple pricing models
- [ ] Export endpoint

#### Phase 3: Production Ready (Week 5-6)
- [ ] Cloud deployment: `402claw csv deploy`
- [ ] Analytics dashboard
- [ ] Webhook notifications (new payments)
- [ ] Multi-file support

---

## 5. Appendix: Code Examples

### A. Minimal x402 Middleware Integration

```javascript
// lib/csv-x402.js
import express from 'express';
import { CsvLoader } from 'csv2api';
import { verifyX402Payment, createPaymentRequired } from '402claw-core';

export function createPaidCsvApi(csvPath, options = {}) {
  const { price = '0.001', currency = 'USDC', wallet } = options;
  
  const app = express();
  const loader = new CsvLoader();
  
  // Load CSV
  await loader.loadCsv(csvPath);
  
  // Free endpoints
  app.get('/', (req, res) => {
    res.json({
      name: options.name || 'CSV API',
      columns: loader.getColumns(),
      totalRows: loader.getData().length,
      pricing: { price, currency },
      endpoints: {
        '/preview': 'Free - First 5 rows',
        '/data': `Paid - ${price} ${currency}`,
        '/stats': `Paid - ${price} ${currency}`
      }
    });
  });
  
  app.get('/preview', (req, res) => {
    const data = loader.getData().slice(0, 5);
    res.json({ rows: data, preview: true });
  });
  
  // Paid endpoints with x402 middleware
  const x402 = async (req, res, next) => {
    const payment = req.headers['x-402-payment'];
    
    if (!payment) {
      return res.status(402).json(createPaymentRequired({
        price,
        currency,
        wallet,
        network: 'base'
      }));
    }
    
    const valid = await verifyX402Payment(payment, { price, wallet });
    if (!valid) {
      return res.status(402).json({ error: 'Invalid payment' });
    }
    
    next();
  };
  
  app.get('/data', x402, (req, res) => {
    const { search, page = 1, limit = 100, sort, order } = req.query;
    let data = loader.getData();
    
    if (search) {
      data = data.filter(row => 
        Object.values(row).some(v => 
          String(v).toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    
    if (sort) {
      data.sort((a, b) => {
        const cmp = a[sort] > b[sort] ? 1 : -1;
        return order === 'desc' ? -cmp : cmp;
      });
    }
    
    const total = data.length;
    const offset = (page - 1) * limit;
    const rows = data.slice(offset, offset + limit);
    
    res.json({ rows, total, page: +page, limit: +limit });
  });
  
  return app;
}
```

### B. CLI Implementation Sketch

```javascript
#!/usr/bin/env node
// bin/402claw-csv.js

import { program } from 'commander';
import { createPaidCsvApi } from '../lib/csv-x402.js';

program
  .command('serve <csvFile>')
  .description('Start a paid CSV API')
  .option('-p, --price <amount>', 'Price per request', '0.001')
  .option('--port <port>', 'Server port', '3402')
  .option('--wallet <address>', 'Payment wallet address')
  .option('--free-tier <requests>', 'Free requests per day', '0')
  .action(async (csvFile, opts) => {
    const app = await createPaidCsvApi(csvFile, {
      price: opts.price,
      wallet: opts.wallet || process.env.X402_WALLET
    });
    
    app.listen(opts.port, () => {
      console.log(`🚀 CSV API started on port ${opts.port}`);
      console.log(`   Price: ${opts.price} USDC per request`);
    });
  });

program.parse();
```

---

## 6. Conclusion

**Summary:**
- `csv2api` (Node.js) is the best foundation for 402claw integration
- Fork and extend approach balances speed with control
- x402 middleware pattern enables clean separation of concerns
- MVP achievable in 1-2 weeks

**Next Steps:**
1. Fork csv2api repository
2. Create 402claw-csv package structure
3. Implement x402 middleware
4. Build CLI wrapper
5. Test with real CSV datasets
6. Document and release

---

*Generated by OpenClaw AI Agent | 2026-02-12*

# GitHub Deep Dive: Function Marketplaces & Data APIs

**Research Date:** 2026-02-12  
**Focus:** Projects relevant to 402claw - function marketplaces, data monetization, agent commerce, and payment integration

---

## Executive Summary

This research uncovered **100+ relevant projects** across GitHub. The space is rapidly evolving with several key trends:

1. **x402 Protocol Dominance** - Coinbase's x402 (5,420★) has become the de-facto standard for HTTP 402-based payments
2. **A2A + x402 Integration** - Google's A2A protocol combined with x402 for agent-to-agent commerce is gaining traction
3. **Usage-Based Billing Maturity** - Lago (9,291★) and OpenMeter (1,811★) are production-ready solutions
4. **Agent Economy Emergence** - Multiple projects targeting autonomous agent payments and commerce

---

## Category 1: Payment Protocols (HTTP 402)

### Tier 1: Production-Ready Protocols

| Project | Stars | Description | Tech Stack | Payments | 402claw Relevance |
|---------|-------|-------------|------------|----------|-------------------|
| [**coinbase/x402**](https://github.com/coinbase/x402) | 5,420 | HTTP 402 payment protocol for the internet | TypeScript, EVM | USDC on Base | ⭐⭐⭐ Direct competitor/inspiration |
| [**google-agentic-commerce/a2a-x402**](https://github.com/google-agentic-commerce/a2a-x402) | 451 | A2A protocol with x402 payments extension | TypeScript | On-chain crypto | ⭐⭐⭐ Agent commerce standard |
| [**x402-rs/x402-rs**](https://github.com/x402-rs/x402-rs) | 224 | Rust implementation of x402 | Rust | USDC | ⭐⭐ Reference implementation |
| [**lightninglabs/L402**](https://github.com/lightninglabs/L402) | 77 | Lightning Network payment protocol (LSAT) | Go | Bitcoin/Lightning | ⭐⭐ Alternative payment rail |
| [**DhananjayPurohit/ngx_l402**](https://github.com/DhananjayPurohit/ngx_l402) | 47 | nginx module for L402 auth | C, nginx | Lightning | ⭐⭐ Infrastructure component |

### Tier 2: Protocol Extensions & SDKs

| Project | Stars | Description | Key Learning |
|---------|-------|-------------|--------------|
| [**dabit3/a2a-x402-typescript**](https://github.com/dabit3/a2a-x402-typescript) | 98 | TypeScript A2A+x402 implementation | Clean TS patterns |
| [**mark3labs/x402-go**](https://github.com/mark3labs/x402-go) | 26 | Go implementation of x402 | Go ecosystem support |
| [**quiknode-labs/x402-rails**](https://github.com/quiknode-labs/x402-rails) | 34 | Rails middleware for x402 | Easy integration patterns |
| [**michielpost/x402-dotnet**](https://github.com/michielpost/x402-dotnet) | 9 | .NET implementation | Enterprise stack support |
| [**cashubtc/xcashu**](https://github.com/cashubtc/xcashu) | 23 | Cashu (ecash) for HTTP 402 | Privacy-preserving payments |
| [**bit-gpt/h402**](https://github.com/bit-gpt/h402) | 32 | Machine-to-machine 402 protocol | M2M focus |

### Key Insights - Payment Protocols

1. **x402 is winning** - Most new projects build on or integrate with x402
2. **Multi-chain support matters** - Projects adding Solana, Starknet, Aptos support
3. **MCP integration is hot** - Several x402+MCP bridges (mark3labs/mcp-go-x402, civicteam/x402-mcp)
4. **L402 (Lightning) exists** but momentum shifted to x402/USDC

---

## Category 2: Usage-Based Billing & Metering

### Production-Ready Platforms

| Project | Stars | Description | Tech Stack | How Payments Work | 402claw Relevance |
|---------|-------|-------------|------------|-------------------|-------------------|
| [**getlago/lago**](https://github.com/getlago/lago) | 9,291 | Open-source metering & billing | Ruby, React | Stripe, custom integrations | ⭐⭐⭐ Billing infrastructure |
| [**openmeterio/openmeter**](https://github.com/openmeterio/openmeter) | 1,811 | Metering for AI, API, DevOps | Go, Kafka | Usage-based, metering API | ⭐⭐⭐ Real-time metering |
| [**meteroid-oss/meteroid**](https://github.com/meteroid-oss/meteroid) | 958 | Pricing & billing infrastructure | Rust | Subscriptions, usage-based | ⭐⭐ Modern Rust stack |
| [**getlago/lago-api**](https://github.com/getlago/lago-api) | 411 | Lago API component | Ruby | Event-based metering | Reference architecture |

### Smaller Tools & Libraries

| Project | Stars | Description |
|---------|-------|-------------|
| [**fireship-io/api-monetization-demo**](https://github.com/fireship-io/api-monetization-demo) | 149 | Stripe metered billing tutorial | Great learning resource |
| [**copyleftdev/api-metering-libary**](https://github.com/copyleftdev/api-metering-libary) | 2 | TypeScript metering for Stripe | Reusable patterns |

### Key Insights - Billing

1. **Lago is the leader** - 9K+ stars, production-ready, open-source
2. **OpenMeter for real-time** - Better for high-volume, real-time metering
3. **Gap: No native crypto billing** - All use traditional payment processors
4. **Opportunity: x402 + Lago** - Bridge x402 micropayments to billing systems

---

## Category 3: Agent Commerce & Payments

### Agent Payment Infrastructure

| Project | Stars | Description | Tech Stack | Payment Method | 402claw Relevance |
|---------|-------|-------------|------------|----------------|-------------------|
| [**daydreamsai/lucid-agents**](https://github.com/daydreamsai/lucid-agents) | 162 | Bootstrap AI agents with payment rails | TypeScript | AP2, A2A, x402, ERC8004 | ⭐⭐⭐ Multi-protocol SDK |
| [**chu2bard/pinion-os**](https://github.com/chu2bard/pinion-os) | 100 | Claude plugin for x402 micropayments | TypeScript | x402/USDC on Base | ⭐⭐⭐ Claude integration |
| [**coinbase/cdp-agentkit-nodejs**](https://github.com/coinbase/cdp-agentkit-nodejs) | 57 | Coinbase AgentKit for Node.js | TypeScript | Coinbase/CDP | ⭐⭐ Official Coinbase |
| [**ChaosChain/chaoschain-x402**](https://github.com/ChaosChain/chaoschain-x402) | 16 | Decentralized x402 facilitator | Solidity | x402 | Decentralized settlement |
| [**daydreamsai/facilitator**](https://github.com/daydreamsai/facilitator) | 14 | x402 payment settlement service | TypeScript, Elysia | Multi-chain | Reference implementation |

### Agent Registries & Discovery

| Project | Stars | Description |
|---------|-------|-------------|
| [**awslabs/a2a-agent-registry-on-aws**](https://github.com/awslabs/a2a-agent-registry-on-aws) | 10 | AWS-based agent registry with semantic search |
| [**ai-agent-registry/ai-agent-registry**](https://github.com/ai-agent-registry/ai-agent-registry) | 1 | Simple agent registry |

### Agent Wallets

| Project | Stars | Description |
|---------|-------|-------------|
| [**xpaysh/agentic-economy-boilerplate**](https://github.com/xpaysh/agentic-economy-boilerplate) | 7 | Multiple payment protocol implementations |
| [**AgentPayy/agentpayy-python-sdk**](https://github.com/AgentPayy/agentpayy-python-sdk) | 5 | Multi-agent payments SDK |
| [**matverach/paysentry**](https://github.com/matverach/paysentry) | 4 | Auth gateway for agent payments |
| [**joelklabo/agentpay**](https://github.com/joelklabo/agentpay) | 0 | Cross-protocol router (x402, L402, Solana) |

### Key Insights - Agent Commerce

1. **Lucid Agents is impressive** - Multi-protocol support, drop-in adapters for frameworks
2. **Daydreams AI ecosystem** - Building comprehensive agent commerce infrastructure
3. **Pinion-OS for Claude** - Already solving the "Claude + payments" problem
4. **Protocol fragmentation** - x402, L402, AP2, A2A, ERC8004 all competing
5. **Facilitators needed** - Settlement services are critical infrastructure

---

## Category 4: API Marketplaces

### Existing Platforms

| Project | Stars | Description | Tech Stack | Payments | 402claw Relevance |
|---------|-------|-------------|------------|----------|-------------------|
| [**yint-tech/sekiro-open**](https://github.com/yint-tech/sekiro-open) | 1,890 | Distributed service publishing platform | Java, RPC | None (free) | ⭐⭐ Architecture patterns |
| [**nianod/Developers-Api-Marketplace**](https://github.com/nianod/Developers-Api-Marketplace) | 7 | Platform for sharing APIs | Web | None | Basic marketplace |
| [**Agentokratia/agentokratia**](https://github.com/Agentokratia/agentokratia) | 3 | API marketplace | Unknown | Unknown | Early stage |

### AI Tool Marketplaces

| Project | Stars | Description |
|---------|-------|-------------|
| [**YoubetDao/MCPForge-Backend**](https://github.com/YoubetDao/MCPForge-Backend) | 0 | Crypto-native MCP marketplace |
| [**swervelabs-marketplace**](https://github.com/SwiggitySwerve/swervelabs-marketplace) | 0 | AI dev tools for OpenCode/Claude |
| [**Fewsats/marketplace**](https://github.com/Fewsats/marketplace) | 2 | Open source Fewsats marketplace |

### Key Insights - Marketplaces

1. **No dominant function marketplace** - Space is wide open
2. **Sekiro interesting model** - Distributed RPC publishing
3. **MCP marketplaces emerging** - MCPForge, swervelabs trying to fill gap
4. **Fewsats building one** - Lightning-focused marketplace

---

## Category 5: Data Marketplaces

### Blockchain-Based

| Project | Stars | Description | Tech Stack | 402claw Relevance |
|---------|-------|-------------|------------|-------------------|
| [**data-dot-all/dataall**](https://github.com/data-dot-all/dataall) | 248 | AWS data marketplace | Python, AWS | ⭐⭐ Enterprise architecture |
| [**daviddao/awesome-data-valuation**](https://github.com/daviddao/awesome-data-valuation) | 137 | Curated data valuation resources | N/A | ⭐⭐ Research resource |
| [**oceanprotocol/ocean.py**](https://github.com/oceanprotocol/ocean.py) | 174 | Ocean Protocol Python SDK | Python | ⭐⭐ Data NFTs |
| [**oceanprotocol/ocean.js**](https://github.com/oceanprotocol/ocean.js) | 118 | Ocean Protocol JS SDK | TypeScript | Data exchange protocol |
| [**nulven/EthDataMarketplace**](https://github.com/nulven/EthDataMarketplace) | 93 | Ethereum data marketplace | Solidity | On-chain data trading |
| [**iotaledger-archive/data-marketplace**](https://github.com/iotaledger-archive/data-marketplace) | 53 | IOTA data marketplace | IOTA MAM | IoT data focus |
| [**bnb-chain/greenfield-data-marketplace-frontend**](https://github.com/bnb-chain/greenfield-data-marketplace-frontend) | 22 | BNB Chain data exchange | React | Greenfield storage |

### Key Insights - Data Marketplaces

1. **Ocean Protocol mature** - Established data NFT protocol
2. **AWS dataall is enterprise** - Not decentralized but well-architected
3. **BNB Greenfield interesting** - Decentralized storage + marketplace
4. **Gap: Real-time data APIs** - Most focus on static datasets

---

## Category 6: Serverless/FaaS Platforms

| Project | Stars | Description | Tech Stack | 402claw Relevance |
|---------|-------|-------------|------------|-------------------|
| [**OpenFunction/OpenFunction**](https://github.com/OpenFunction/OpenFunction) | 1,645 | Cloud Native FaaS (CNCF) | Go, Kubernetes | ⭐⭐⭐ Reference architecture |
| [**nurturelabs-co/Agentopia**](https://github.com/nurturelabs-co/Agentopia) | 10 | On-demand services for AI Agents | Unknown | Agent-specific marketplace |

### Key Insights - FaaS

1. **OpenFunction is leader** - CNCF project, Kubernetes-native
2. **No FaaS + payments** - Big gap in the market
3. **Agentopia interesting** - Specifically targets AI agent services

---

## Category 7: A2A Protocol Ecosystem

| Project | Stars | Description | Language |
|---------|-------|-------------|----------|
| [**themanojdesai/python-a2a**](https://github.com/themanojdesai/python-a2a) | 978 | Python A2A implementation | Python |
| [**elkar-ai/elkar-a2a**](https://github.com/elkar-ai/elkar-a2a) | 146 | Task management for A2A | Unknown |
| [**GongRzhe/A2A-MCP-Server**](https://github.com/GongRzhe/A2A-MCP-Server) | 137 | Bridge MCP to A2A | TypeScript |
| [**vishalmysore/a2ajava**](https://github.com/vishalmysore/a2ajava) | 94 | Java A2A + auto MCP exposure | Java |
| [**aws-samples/sample-getting-started-with-strands-agents-course**](https://github.com/aws-samples/sample-getting-started-with-strands-agents-course) | 70 | AWS agent course with A2A/MCP | Python |
| [**neuroglia-io/a2a-net**](https://github.com/neuroglia-io/a2a-net) | 51 | .NET A2A implementation | C# |
| [**pjawz/n8n-nodes-agent2agent**](https://github.com/pjawz/n8n-nodes-agent2agent) | 41 | n8n nodes for A2A | TypeScript |

### Key Insights - A2A

1. **Rapid adoption** - Multiple language implementations in months
2. **MCP bridges popular** - A2A-MCP-Server shows demand for interop
3. **a2ajava auto-exposes MCP** - Interesting convergence pattern
4. **a2a-x402 is official** - Google blessed x402 integration

---

## Category 8: Machine-to-Machine Payments

| Project | Stars | Description | Use Case |
|---------|-------|-------------|----------|
| [**alsk1992/CloddsBot**](https://github.com/alsk1992/CloddsBot) | 51 | Trading bot with M2M payments | Autonomous trading |
| [**bumi/ln-markdown-to-pdf**](https://github.com/bumi/ln-markdown-to-pdf) | 5 | Lightning M2M example | Document conversion |
| [**autogridos/AutoGrid-OS**](https://github.com/autogridos/AutoGrid-OS) | 1 | Robotic fleet payments | IoT/Robotics |
| [**OmniacsDAO/x402-paywall-proxy**](https://github.com/OmniacsDAO/x402-paywall-proxy) | 0 | Docker paywall proxy | Any app paywall |
| [**the-robo-os/roboos-sdk-cpp**](https://github.com/the-robo-os/roboos-sdk-cpp) | 0 | C++ SDK for robot payments | Robotics |

### Key Insights - M2M

1. **CloddsBot production-ready** - Actually trading autonomously
2. **Docker proxy pattern** - x402-paywall-proxy is useful pattern
3. **Robotics emerging** - RoboOS, AutoGrid targeting physical machines

---

## Category 9: Fewsats Ecosystem (Lightning)

| Project | Stars | Description |
|---------|-------|-------------|
| [**Fewsats/fewsats-mcp**](https://github.com/Fewsats/fewsats-mcp) | 21 | MCP server for Fewsats |
| [**Fewsats/fewsats-python**](https://github.com/Fewsats/fewsats-python) | 12 | Python SDK |
| [**Fewsats/fewsatscli**](https://github.com/Fewsats/fewsatscli) | 8 | CLI tool |
| [**Fewsats/marketplace**](https://github.com/Fewsats/marketplace) | 2 | Open marketplace |

### Key Insights - Fewsats

1. **MCP-first approach** - Building for Claude/AI assistants
2. **L402/Lightning focus** - Alternative to x402/USDC
3. **Full ecosystem** - SDK, CLI, MCP, marketplace

---

## Category 10: Curated Resources

| Project | Stars | Description |
|---------|-------|-------------|
| [**xpaysh/awesome-x402**](https://github.com/xpaysh/awesome-x402) | 110 | Comprehensive x402 resource list |
| [**tsubasakong/awesome-agent-payments-protocol**](https://github.com/tsubasakong/awesome-agent-payments-protocol) | 5 | AP2/A2A/x402 resources |
| [**1bcMax/state-of-x402**](https://github.com/1bcMax/state-of-x402) | 5 | x402 research reports |

---

## Comparison Matrix: Top Projects by Category

| Category | Leader | Stars | Maturity | Payments | Open Source |
|----------|--------|-------|----------|----------|-------------|
| **HTTP 402 Protocol** | coinbase/x402 | 5,420 | Production | USDC | ✅ |
| **Usage Billing** | getlago/lago | 9,291 | Production | Stripe/custom | ✅ |
| **Real-time Metering** | openmeterio/openmeter | 1,811 | Production | Various | ✅ |
| **Agent Commerce SDK** | daydreamsai/lucid-agents | 162 | Beta | Multi-protocol | ✅ |
| **A2A Protocol** | themanojdesai/python-a2a | 978 | Stable | Via extensions | ✅ |
| **FaaS Platform** | OpenFunction/OpenFunction | 1,645 | Production | None | ✅ |
| **Data Marketplace** | data-dot-all/dataall | 248 | Production | Enterprise | ✅ |
| **API Marketplace** | yint-tech/sekiro-open | 1,890 | Production | None | ✅ |
| **Agent Facilitator** | daydreamsai/facilitator | 14 | Beta | Multi-chain | ✅ |
| **Lightning Payments** | Fewsats/fewsats-mcp | 21 | Beta | Lightning | ✅ |

---

## Gaps & Opportunities for 402claw

### Clear Gaps in the Market

1. **No integrated function marketplace with native payments**
   - Sekiro has distribution, no payments
   - x402 has payments, no marketplace
   - Opportunity: Combine both

2. **No MCP-first marketplace with billing**
   - MCPForge exists but early
   - No integration with usage billing
   - Opportunity: MCP marketplace + Lago/OpenMeter

3. **No facilitator marketplace**
   - Daydreams facilitator is single-provider
   - No competition/choice for settlement
   - Opportunity: Facilitator registry/marketplace

4. **No cross-protocol payment router**
   - agentpay tries but 0 stars
   - Users locked into single rail
   - Opportunity: Abstract payment rails

5. **No agent reputation/credit system**
   - agent-escrow-protocol is early attempt
   - No established credit scoring
   - Opportunity: Agent credit rails

### What to Build

Based on gaps, 402claw should consider:

1. **Function Registry + x402** - List functions, charge per call via 402
2. **MCP Marketplace** - Aggregate MCP servers, add billing
3. **Facilitator Network** - Multiple settlement providers, competitive rates
4. **Agent Credit Layer** - Enable trusted agents to run tabs

---

## Technical Patterns to Adopt

### From x402

```
HTTP 402 Payment Required
X-Payment-Request: {"scheme": "x402", ...}
```

### From Lago (Usage Metering)

```ruby
# Event-based usage tracking
Lago.create_event(
  transaction_id: "txn_123",
  customer_id: "cust_456",
  code: "api_call",
  properties: { tokens: 150 }
)
```

### From Lucid Agents (Multi-protocol)

```typescript
// Protocol-agnostic payment initialization
const agent = createAgent({
  payments: {
    protocols: ['x402', 'ap2', 'a2a'],
    defaultProtocol: 'x402'
  }
})
```

### From OpenFunction (FaaS)

```yaml
# Function definition with scaling
apiVersion: core.openfunction.io/v1beta1
kind: Function
spec:
  serving:
    scaleOptions:
      minReplicas: 0
      maxReplicas: 10
```

---

## Recommendations

### Immediate Actions

1. **Study lucid-agents deeply** - Best multi-protocol SDK architecture
2. **Fork/study pinion-os** - Already solves Claude + x402
3. **Integrate with Lago** - Don't rebuild billing, use Lago API
4. **Watch a2a-x402** - Google-blessed, likely to become standard

### Strategic Positioning

1. **Don't compete with x402** - Build on it
2. **Don't rebuild metering** - Integrate Lago/OpenMeter
3. **Focus on marketplace layer** - Discovery, listing, reputation
4. **Agent-first design** - Human UX is secondary

### Tech Stack Suggestion

- **Payments**: x402 (primary), L402 (secondary)
- **Metering**: OpenMeter for real-time events
- **Billing**: Lago for invoicing/subscriptions
- **Protocol**: A2A for agent discovery, MCP for tool execution
- **Settlement**: Build facilitator network (not single point)

---

## Appendix: All Projects Found

<details>
<summary>Full list of 100+ projects (click to expand)</summary>

### Payment Protocols
- coinbase/x402 (5,420★)
- google-agentic-commerce/a2a-x402 (451★)
- x402-rs/x402-rs (224★)
- lightninglabs/L402 (77★)
- DhananjayPurohit/ngx_l402 (47★)
- dabit3/a2a-x402-typescript (98★)
- quiknode-labs/x402-rails (34★)
- mark3labs/x402-go (26★)
- cashubtc/xcashu (23★)
- michielpost/x402-dotnet (9★)
- nuwa-protocol/x402-exec (13★)
- bit-gpt/h402 (32★)

### Billing/Metering
- getlago/lago (9,291★)
- openmeterio/openmeter (1,811★)
- meteroid-oss/meteroid (958★)
- getlago/lago-api (411★)
- fireship-io/api-monetization-demo (149★)

### Agent Commerce
- daydreamsai/lucid-agents (162★)
- chu2bard/pinion-os (100★)
- coinbase/cdp-agentkit-nodejs (57★)
- ChaosChain/chaoschain-x402 (16★)
- daydreamsai/facilitator (14★)
- xpaysh/agentic-economy-boilerplate (7★)
- AgentPayy/agentpayy-python-sdk (5★)

### A2A Protocol
- themanojdesai/python-a2a (978★)
- elkar-ai/elkar-a2a (146★)
- GongRzhe/A2A-MCP-Server (137★)
- vishalmysore/a2ajava (94★)
- neuroglia-io/a2a-net (51★)
- pjawz/n8n-nodes-agent2agent (41★)

### Marketplaces
- yint-tech/sekiro-open (1,890★)
- OpenFunction/OpenFunction (1,645★)
- data-dot-all/dataall (248★)
- oceanprotocol/ocean.py (174★)
- nulven/EthDataMarketplace (93★)

### Resources
- xpaysh/awesome-x402 (110★)
- daviddao/awesome-data-valuation (137★)

</details>

---

*Research compiled 2026-02-12 for 402claw project planning*

---

## 6. Market Research & Sentiment

# Hacker News Deep Research: API Monetization & Micropayments
**Date:** February 12, 2026  
**Sources:** 12+ HN discussions (2022-2026)

---

## Executive Summary

The HN community has consistently expressed **strong interest but deep skepticism** about micropayments and API monetization. The core problem is well-understood: **developers have valuable code that doesn't fit the SaaS/app model**, but existing solutions are fragmented, expensive, or require too much integration work.

**Key Insight:** The emergence of AI agents has created a **new forcing function** for micropayments that didn't exist before. Agents can't sign up for accounts, manage API keys, or enter credit cards—making per-request payment protocols like x402 suddenly practical.

---

## Part 1: Pain Points (What Problems People Face)

### 1.1 The "Non-App Code" Problem
From [Ask HN: How do you monetize personal code if it's not an "app"?](https://news.ycombinator.com/item?id=43667887) (176 points, 70 comments):

> *"I have a trained ML model that solves a niche task really well — but turning it into a full-blown app seems like overkill."*
> 
> *"I've written a CLI tool that processes log files better than anything else I've found, but it's too specialized to justify making a company out of it."*
> 
> *"I built a few small functions in different languages (Python, Go, Rust) that do neat things — data cleanup, API scraping, PDF generation — but none of them are 'products' by themselves."*

**The gap:** Developers have valuable utilities, scripts, and models but **no easy path to monetization** without:
- Building a full SaaS
- Creating developer accounts and billing systems
- Marketing to humans
- Managing subscriptions, API keys, and customer support

### 1.2 Transaction Fee Economics
From [Is there hope for micropayments?](https://news.ycombinator.com/item?id=31386483) (major discussion):

> *"The thing that killed the momentum then is the same thing that still kills it - card transaction fees."* — Bitpass early employee

**The math problem:**
- Stripe/traditional: $0.30 + 2.9% per transaction
- Reading a single article at $0.02? Impossible.
- **Stripe's minimum destroys micropayment economics**

> *"I'd prefer to just pay tiny constant monthly fees for things, than to have the mental overhead of knowing there is a nonzero cost for every search I do. I am prone to microoptimizing things."*

**Mental accounting burden** is a real UX concern—not just fees.

### 1.3 Subscription Fatigue vs. Per-Use Desire
The community is split but vocal:

**Pro-subscription camp:**
> *"If the level of a bill surprises you, you are financially irresponsible."*

**Pro-pay-per-use camp:**
> *"I'm getting tired of all these monthly subscriptions that cost me $7-20 no matter of usage."*
>
> *"I'd like to support news sites behind paywalls by reading a single article for $0.25 but I'm not willing to pay $10 a month for a subscription."*

### 1.4 The Integration Tax
From [Show HN: API monetization with its own billing engine](https://news.ycombinator.com/item?id=42248214):

> *"User registration, authentication, subscription management, subscription plans, limit enforcement, premium features, usage metering, billing, invoicing, payment collection… In many cases it's more effort than developing the API itself."*

**Integration complexity is the silent killer** of small API monetization projects.

### 1.5 Tax & Compliance Nightmare
> *"Let's say my site lets people purchase news articles for 1 cent. I get 4 readers in Chicago who each purchase 1 article per week. That's 208 transactions for a total of $2.08. That's over the threshold in Illinois... for creating an 'economic nexus'. So now I've got to register with Illinois and do regular tax filing."*

**The regulatory burden of micropayments is understated.**

---

## Part 2: Solutions People Actually Want

### 2.1 Single API Key, Universal Credits
From [Sparkhub discussion](https://news.ycombinator.com/item?id=40985297):

> *"Users on the platform have a single API key and a wallet of prepaid credits. The credits can be used for any API on the platform."*
>
> *"I think it is also interesting from the point of view of AI Agents. An AI agent could access any API on the platform and pay only for what they use without having to open accounts/subscriptions on a wide variety of platforms."*

**What they want:**
- ✅ Single wallet across multiple services
- ✅ No per-service signup
- ✅ Pay-per-call granularity
- ✅ Agent-friendly (no CAPTCHAs, no card entry)

### 2.2 Government-Run Payment Rails
Multiple HN users point to India's UPI and Brazil's Pix as models:

> *"India have this very well figured out with its Universal Payment Interface (UPI). Payment of any amount small or big is possible online as well as offline. I use the same interface to transfer 100k+ to my trading account and also to buy vegetables from a roadside vendor for few rupees."*

> *"Pix is not even 2 years old and it's already changed the way people deal with money. It's incredibly reliable and astonishingly fast."*

**The implicit desire:** Why can't developers have something this simple?

### 2.3 The x402 Vision
From [Show HN: X402 – an open standard for internet native payments](https://news.ycombinator.com/item?id=43908129):

**The promise:**
- No API keys
- No credit cards on file
- No account creation
- One line of middleware
- Instant settlement (2 seconds on Base)
- Sub-cent fees

> *"API keys and subscriptions don't work well for autonomous software: they require accounts, secrets, and prior trust before a single request can be made. This gateway flips that model. Instead of authenticating, clients pay per request."*

---

## Part 3: What Has Been Tried (And Failed)

### 3.1 Bitpass (2003-era)
> *"Bitpass got around [card fees] by allowing you to buy Bitpass credits for like $3, which you could spend anywhere. It worked great for music... Alas, it never took off."*
>
> *"Never trust the suits, kids. Never trust their bullshit. And never give your heart to the business. It'll get broken every time."*

**Failure mode:** Investor capture, pivot away from core use case.

### 3.2 RapidAPI Model
From multiple discussions, RapidAPI is seen as:
- ✅ Solved discovery
- ❌ High fees (30%+)
- ❌ Rigid subscription plans
- ❌ Poor developer experience

> *"The first public version... had no billing capabilities at all, but it allowed API providers to configure 'subscription plans' more flexibly than with RapidAPI. Like, you could include several APIs in one plan, exclude certain endpoints from low-cost plans..."*

### 3.3 Coil / Web Monetization
> *"The browser extension you wish for exists, it's called Coil... but it simply doesn't have enough buy-in to work. The real problem with micropayments has nothing to do about some bigwig execs or some deep state preventing it crap, it's simply that EVERYONE has to buy into it for it to work properly."*

**Failure mode:** Chicken-and-egg / network effects.

### 3.4 Lightning Network for Payments
> *"The whole Podcasting 2.0 / 'value 4 value' movement is built on top of Lightning Network micropayments. It works. People use it."*

But also:
> *"If you are in US what are you going to do at tax time? Each of those payments are a taxable event for you the payer. What a nightmare."*

**Failure mode:** Tax complexity, volatility, on-ramp/off-ramp friction.

---

## Part 4: Community Reaction to x402

### 4.1 Positive Reception
From [x402 — An open protocol for internet-native payments](https://news.ycombinator.com/item?id=45347335) (large discussion):

> *"With Stripe moving into the space heavily and looking to lock things up in 'Stripe-land', I think having an open protocol is great."*

> *"Blockchains are fast and cheap now! Modern blockchains like Base, Solana, Sui typically have block times <2 seconds, and a stablecoin transfer can cost as little as $0.0005."*

### 4.2 Skepticism & Concerns

**Crypto association baggage:**
> *"I feel like there's a way for crypto to be useful in this problem space, but I don't have faith that the actors who build such a system would be good-natured enough to make it a healthy environment, especially after all of the scammy projects that have surfaced these past few years."*

**KYC/AML concerns:**
> *"Given that this protocol is Coinbase sponsored, you can be sure that the whole KYC/AML bullshit is going to be applied to every transaction."*

**Hidden fees skepticism:**
> *"The protocol boasts 'no fee' but that's deceptive: if it's based upon a blockchain, there will be transaction fees."*

Response: *"Coinbase currently subsidizes x402 transactions that go through our facilitator."*

**Centralization concern (Coinbase/Base):**
> *"No mention of Lightning or Bitcoin in the entire whitepaper. Just Base - a L2 rollup on Ethereum developed by Coinbase which is behind the x402 standard."*
>
> *"Free and open payments should be bitcoin based to be truly decentralized."*

**L402 (Lightning) exists:**
> *"This already exists (L402 -- formerly known as LSAT), and pre-dates x402 by several years."*

### 4.3 Seren Desktop & x402 in Practice
From [Show HN: Seren Desktop – AI IDE with Publisher Store and X402 Micropayments](https://news.ycombinator.com/item?id=46799839):

**The model:**
- 90+ publishers in marketplace
- Pay per API call with USDC on Base
- No subscriptions, no expiring credits
- Publishers set their own pricing

**What makes it interesting:**
- First real "AI IDE with integrated micropayment marketplace"
- Demonstrates x402 in a real product context
- MIT licensed client, proprietary marketplace (like VS Code model)

### 4.4 Apitoll: Latest Implementation (Feb 2026)
From [Show HN: Apitoll Payment Infrastructure for AI agents](https://news.ycombinator.com/item?id=46965845):

> *"The problem: AI agents need data from paid APIs, but they can't sign up for accounts or manage API keys. Stripe's $0.30 minimum makes micropayments impossible."*

**Live stats:**
- 75 paid API endpoints
- $0.001–$0.02 per call
- 3% platform fee
- Settlement in ~2 seconds

---

## Part 5: Synthesis & Opportunity Analysis

### The #1 Pain Point
**Developers have valuable code but no lightweight path to monetization.**

The current options all have fatal flaws:
| Option | Problem |
|--------|---------|
| Build a SaaS | Massive overhead for niche tools |
| RapidAPI | 30%+ fees, rigid plans |
| Stripe direct | $0.30 minimum kills micropayments |
| Self-host billing | Integration tax, compliance nightmare |

### What People Actually Want
1. **Zero-signup payments** — Hit an endpoint, pay, get data
2. **Sub-cent transactions** — Make $0.001-$0.01 calls economical
3. **Universal wallet** — One balance across all services
4. **Agent-compatible** — No CAPTCHAs, no card entry, no accounts
5. **Simple integration** — "One line of middleware"
6. **Fair economics** — <5% fees, instant settlement

### Skepticism to Address

| Concern | How to Address |
|---------|----------------|
| "Crypto = scam" | Emphasize stablecoins, no volatility, no speculation |
| "KYC nightmare" | Highlight that payments are the KYC (wallet = identity) |
| "Coinbase lock-in" | Open protocol, multiple facilitators possible |
| "Hidden fees" | Transparent: gas subsidized or clearly stated |
| "Tax complexity" | Offer reporting tools, aggregate transactions |
| "Mental accounting burden" | Budget caps, daily limits, spending dashboards |

### The Opportunity

**AI agents are the forcing function.**

The HN community has debated micropayments for 20+ years. What's different now:

1. **AI agents can't use traditional payment flows** — They need programmatic, per-request payments
2. **Stablecoins eliminated volatility** — USDC solves the "but what about price swings" objection
3. **L2s made fees negligible** — Base transactions cost fractions of a cent
4. **x402 provides a standard** — HTTP 402 finally has a spec

> *"This gateway flips that model. Instead of authenticating, clients pay per request."*

**The window:** Whoever builds the definitive "agent-friendly API marketplace with micropayments" captures the infrastructure layer for the agentic economy.

---

## Appendix: Key Quotes for Positioning

### On the problem:
> *"How do you monetize personal code if it's not an 'app'?"*

### On traditional payment failure:
> *"The thing that killed the momentum then is the same thing that still kills it - card transaction fees."*

### On subscription fatigue:
> *"I'm getting tired of all these monthly subscriptions that cost me $7-20 no matter of usage."*

### On the agent opportunity:
> *"AI agents need data from paid APIs, but they can't sign up for accounts or manage API keys."*

### On what's changed:
> *"Blockchains are fast and cheap now! Modern blockchains like Base, Solana, Sui typically have block times <2 seconds, and a stablecoin transfer can cost as little as $0.0005."*

### On the vision:
> *"API keys and subscriptions don't work well for autonomous software: they require accounts, secrets, and prior trust before a single request can be made. This gateway flips that model."*

---

## Sources Analyzed

1. [Ask HN: How do you monetize personal code if it's not an "app"?](https://news.ycombinator.com/item?id=43667887) — April 2025
2. [Ask HN: Is there hope for micropayments?](https://news.ycombinator.com/item?id=31386483) — May 2022
3. [Ask HN: Best Services for API Monetization?](https://news.ycombinator.com/item?id=30889711) — April 2022
4. [Show HN: Real-time API usage-based monetization](https://news.ycombinator.com/item?id=40985297) — July 2024
5. [Show HN: Turnkey API monetization – Project X](https://news.ycombinator.com/item?id=36225722) — June 2023
6. [Show HN: API monetization with billing engine](https://news.ycombinator.com/item?id=42248214) — November 2024
7. [Show HN: X402 – an open standard for internet native payments](https://news.ycombinator.com/item?id=43908129) — May 2025
8. [x402 — An open protocol for internet-native payments](https://news.ycombinator.com/item?id=45347335) — September 2025
9. [X402 – protocol for micropayments and the agentic economy](https://news.ycombinator.com/item?id=46094348) — November 2025
10. [Replacing API keys with payments (HTTP 402 / x402)](https://news.ycombinator.com/item?id=46853847) — February 2026
11. [Show HN: Apitoll Payment Infrastructure for AI agents](https://news.ycombinator.com/item?id=46965845) — February 2026
12. [Show HN: Seren Desktop – AI IDE with X402 Micropayments](https://news.ycombinator.com/item?id=46799839) — January 2026

# Extended Research: Seren Desktop & x402 Ecosystem

**Date:** 2026-02-12  
**Context:** Deep dive into Seren Desktop and the broader x402 ecosystem for 402claw competitive analysis

---

## Executive Summary

The x402 protocol ecosystem has matured significantly, with **75M+ transactions** and **$24M+ volume** processed. Seren Desktop represents the most comprehensive implementation of an AI IDE with integrated x402 micropayments marketplace. The landscape includes multiple competing approaches to agent-to-agent payments, MCP monetization, and API marketplaces.

**Key Findings:**
- Seren has 50+ publishers, 90+ MCP tools, and a full AI IDE with x402 payments
- The x402 GitHub topic has 327+ public repositories
- Multiple competing protocols exist: x402, AP2 (Google), ACP (OpenAI/Stripe), ERC-8004
- HN sentiment shows strong interest but historical skepticism about micropayments
- Major gap: Most solutions are developer-focused; few target non-dev end users

---

## 1. Seren Desktop Analysis

### What It Is
Seren Desktop is an **open-source AI desktop client** built with Tauri, SolidJS, and Rust. It positions itself as "an AI IDE for non-devs that great devs will appreciate."

**GitHub:** https://github.com/serenorg/seren-desktop  
**Website:** https://serendb.com  
**Status:** v0.1.0-alpha.9 (macOS, Windows, Linux)

### Core Features

#### AI Chat & Models
- Multi-model support: Claude, GPT-4, Gemini via Seren Gateway or direct API keys
- Smart model routing using Thompson sampling (satisfaction-driven)
- Free tier with Gemini 2.0 Flash (no payment required)
- Auto-reroute on failure with satisfaction-ranked model fallback
- Query cost tracking alongside response duration

#### AI Coding Agents (ACP)
- Claude Code and Codex agent support
- Multiple concurrent sessions in tabs
- Inline diff review with Monaco editor
- Permission system with risk levels
- Sandbox modes: ReadOnly, WorkspaceWrite, FullAccess
- GPG signing support for signed commits

#### Publisher Marketplace
- **90+ publishers** for databases, web scraping, AI search, email, calendars, CRM
- Categories:
  - Databases: SerenDB (serverless Postgres), MongoDB, Neon
  - Web scraping: Firecrawl
  - AI search: Perplexity
  - Productivity: Google email, calendars, CRM
  - Coming: GitHub, Linear, Notion
- Each publisher sets own pricing
- Pay-per-call with USDC on Base (x402)

#### Semantic Codebase Indexing
- AI-powered embeddings via SerenEmbed API
- Local sqlite-vec storage for zero-latency retrieval
- Language-aware chunking (Rust, TypeScript, Python)
- Automatic re-indexing on file save

#### MCP Integration
- 90+ built-in tools via Gateway MCP
- Multi-server support
- OAuth flows for publishers
- x402 payments for premium tools

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SolidJS 1.8+, TypeScript 5+, Vite |
| Backend | Rust, Tauri 2.0 |
| Editor | Monaco Editor 0.52+ |
| Vector Store | sqlite-vec |
| State | SolidJS stores |
| Crypto | alloy-rs (Ethereum signing) |
| Agent Protocol | agent-client-protocol |

### Architecture Model
- **Client:** Open source, MIT licensed, ~10MB binary
- **Gateway:** Proprietary (api.serendb.com)
  - Authentication & billing (SerenBucks)
  - AI model routing
  - Publisher marketplace
  - MCP server hosting
  - SerenDB serverless PostgreSQL
  - SerenEmbed API (embeddings)
  - SerenWhisper API (speech-to-text)

Think: **VS Code (open source) + Extension Marketplace (proprietary)**

### Business Model
- **SerenBucks:** Internal credit system
- **Daily claim:** Free daily credits
- **Stripe deposits:** Add funds via credit card
- **Auto top-up:** Automatic balance refresh
- **x402 USDC:** Crypto payments on Base
- **Publisher revenue:** 100% to publishers during growth phase

### Key Differentiators
1. Non-dev friendly with dev-grade tools
2. Open marketplace with 90+ publishers
3. No subscriptions, no expiring credits
4. Semantic codebase indexing (local)
5. Multi-agent support (Claude Code, Codex)

---

## 2. Comparison with 402claw

### Overlap Areas

| Feature | Seren Desktop | 402claw |
|---------|---------------|---------|
| x402 payments | ✅ Core feature | ✅ Core feature |
| AI chat | ✅ Multi-model | ✅ Via OpenClaw |
| MCP tools | ✅ 90+ via gateway | ✅ Skills system |
| Wallet management | ✅ Built-in | ✅ Built-in |
| Code editing | ✅ Monaco + agents | ✅ Claude Code integration |

### Differentiation Opportunities for 402claw

1. **Personal AI Agent Focus**
   - Seren is an IDE; 402claw is a personal assistant
   - 402claw has multi-channel presence (Discord, Telegram, WhatsApp)
   - Memory and personality continuity
   
2. **Node Network**
   - 402claw's device ecosystem (phones, cameras, screens)
   - Real-world integration beyond code
   
3. **Non-developer First**
   - Seren says "for non-devs" but is clearly dev-focused
   - 402claw could be truly consumer-first
   
4. **Agent Commerce (Selling)**
   - 402claw could sell services, not just consume them
   - Become a publisher, not just a client

5. **Personal Data Monetization**
   - Users could monetize their own data/services
   - Personal API marketplace

### What We Can Learn from Seren
- Publisher onboarding process (connect API → set pricing → earn)
- Task classification routing (chat vs agent vs publisher)
- Satisfaction-driven model selection
- Free tier to reduce friction
- Clear cost tracking per query

---

## 3. x402 GitHub Topic Analysis

**URL:** https://github.com/topics/x402  
**Total Repos:** 327+ public repositories

### High-Value Projects

#### Payment Infrastructure
| Repo | Description | Stars |
|------|-------------|-------|
| [coinbase/x402](https://github.com/coinbase/x402) | Official protocol implementation | Core |
| [xpaysh/awesome-x402](https://github.com/xpaysh/awesome-x402) | Curated resource list | Reference |
| [second-state/x402-facilitator](https://github.com/second-state/x402-facilitator) | Rust payment infrastructure | Infra |
| [AIMOverse/x402-kit](https://github.com/AIMOverse/x402-kit) | Modular SDK for complex integrations | SDK |
| [zpaynow/ZeroPay](https://github.com/zpaynow/ZeroPay) | Open payment gateway for humans & agents | Gateway |

#### Agent Commerce Frameworks
| Repo | Description | Stars |
|------|-------------|-------|
| [daydreamsai/lucid-agents](https://github.com/daydreamsai/lucid-agents) | Bootstrap AI agents in 60s with payments | Framework |
| [microchipgnu/MCPay](https://github.com/microchipgnu/MCPay) | x402 payments for MCP servers | MCP |
| [nirholas/agenti](https://github.com/nirholas/agenti) | 380+ tools, 20+ chains, x402 enabled | Tools |
| [daydreamsai/daydreams](https://github.com/daydreamsai/daydreams) | Tools for building commerce agents | SDK |

#### LLM Routers
| Repo | Description | Stars |
|------|-------------|-------|
| [BlockRunAI/ClawRouter](https://github.com/BlockRunAI/ClawRouter) | Smart LLM router, 78% cost savings | Router |

#### Specialized Implementations
| Repo | Description | Use Case |
|------|-------------|----------|
| [alsk1992/CloddsBot](https://github.com/alsk1992/CloddsBot) | Autonomous trading across 1000+ markets | Trading |
| [chu2bard/pinion-os](https://github.com/chu2bard/pinion-os) | Claude plugin + skill framework | Plugins |
| [OnChainMee/x402-erc8004-agent](https://github.com/OnChainMee/x402-erc8004-agent) | A2A + x402 + ERC-8004 identity | Identity |
| [roswelly/solana-ai-agent-mvp](https://github.com/roswelly/solana-ai-agent-mvp) | Solana AI agent with x402 | Solana |
| [Merit-Systems/x402scan](https://github.com/Merit-Systems/x402scan) | x402 ecosystem explorer | Analytics |

### Implementation Patterns

1. **Server Middleware Pattern**
   ```typescript
   app.use(paymentMiddleware({
     "GET /weather": {
       price: "$0.001",
       accepts: ["USDC"],
     }
   }));
   ```

2. **Client Auto-Pay Pattern**
   ```typescript
   const client = withX402Client(httpClient, {
     wallet: evmSigner,
     maxPaymentValue: 0.1 * 1e6
   });
   ```

3. **MCP Tool Monetization**
   ```typescript
   server.paidTool("weather", "Weather data", "$0.001", 
     { city: z.string() }, 
     async ({ city }) => fetchWeather(city)
   );
   ```

### Common Tech Stack
- **Languages:** TypeScript (dominant), Rust (infrastructure), Python (ML)
- **Chains:** Base (primary), Ethereum, Solana
- **Tokens:** USDC (standard), native tokens
- **Signing:** EIP-3009 TransferWithAuthorization (gasless)
- **Frameworks:** Hono, Express, Next.js, Axum

---

## 4. Competitor Landscape

### Payment Protocols

| Protocol | Maintainer | Focus | Status |
|----------|-----------|-------|--------|
| **x402** | Coinbase/Community | HTTP micropayments | Production (75M+ txns) |
| **AP2** | Google | Agent-to-agent payments | Production |
| **ACP** | OpenAI/Stripe | Agentic commerce checkout | Production |
| **ERC-8004** | Community | Trustless agent identity | Draft |

#### Google AP2 (Agent Payments Protocol)
- GitHub: https://github.com/google-agentic-commerce/AP2
- Focus: Secure, interoperable AI-driven payments
- Complements A2A and MCP
- 60+ organizations involved
- Part of Google's AI Agent Marketplace

#### OpenAI/Stripe ACP (Agentic Commerce Protocol)
- GitHub: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
- Focus: Checkout and merchant integration
- Secure payment token passing between buyers/businesses via AI agents

### MCP Marketplaces

| Platform | Focus | Status |
|----------|-------|--------|
| **Seren Desktop** | AI IDE with publishers | Production |
| **MCPay** | MCP payment layer | Production |
| **XPack** | Build MCP marketplaces | Production |
| **Apify** | Actor/scraper marketplace | Production |
| **Smithery** | MCP server discovery | Production |
| **OpenTools** | MCP tool directory | Beta |

### Agent Commerce Frameworks

| Framework | Key Features | Language |
|-----------|-------------|----------|
| **Lucid Agents** | Multi-protocol (x402, A2A, AP2, ERC-8004) | TypeScript |
| **Agenti** | 380+ tools, 20+ chains | TypeScript |
| **Daydreams** | Agent supply chains | TypeScript |
| **ClawRouter** | Smart LLM routing + x402 | TypeScript |

### Key Differentiators

1. **Lucid Agents** stands out for protocol-agnostic design
2. **MCPay** specifically targets MCP monetization
3. **Seren** has the most complete IDE experience
4. **ClawRouter** focuses on cost optimization

---

## 5. Tools & Libraries for 402claw

### Recommended Integrations

#### Must-Have
- **x402-typescript** (Coinbase) - Core protocol implementation
- **alloy-rs** or **viem** - Wallet signing

#### Should Consider
- **MCPay SDK** - If we want MCP monetization
- **Lucid Agents payments package** - Payment policy enforcement
- **x402-kit** - Modular approach for complex needs

#### Nice-to-Have
- **ClawRouter** - Smart model routing with x402
- **x402scan** - Ecosystem analytics

### Integration Patterns for 402claw

1. **Skill-Based Monetization**
   - Each skill could have optional x402 pricing
   - Skills as "publishers" in the Seren model

2. **Wallet Abstraction**
   - Single wallet for all x402 interactions
   - Balance tracking and alerts

3. **MCP Payment Wrapper**
   - Wrap existing MCP servers with payment layer
   - Auto-pay for premium MCP tools

4. **Publisher Mode**
   - Let 402claw agents sell services
   - Expose capabilities via x402

---

## 6. HN Sentiment Analysis

### Key Themes

#### Enthusiasm (Recent)
- x402 seen as solving the "AI agents can't pay" problem
- Stablecoins (USDC) more accepted than volatile crypto
- Agent-to-agent economy narrative gaining traction
- "Finally, HTTP 402 being used" sentiment

#### Historical Skepticism
- "Micropayments are from people who want to collect them, not pay them"
- Numbers don't work for consumer content (articles, etc.)
- Mental transaction cost too high for small payments

#### Current Problems Mentioned
1. **Account/API key management** - AI agents can't sign up
2. **Stripe's $0.30 minimum** - Makes true micropayments impossible
3. **Subscription commitment** - AI agents need burst usage
4. **Settlement time** - Traditional escrow takes days

#### Solutions People Are Asking For
1. Single wallet, multiple services
2. Pay-per-request without accounts
3. Instant settlement (<2 seconds)
4. Sub-cent transaction support
5. Non-custodial (funds stay in wallet until spent)

### Recent HN Posts

| Post | Date | Theme |
|------|------|-------|
| Seren Desktop Show HN | 2 weeks ago | AI IDE + x402 marketplace |
| Apitoll - 75 Live APIs | 2 days ago | x402 API aggregator |
| A2A payment system | 1 day ago | Agent-to-agent escrow |
| x402 protocol discussion | Nov 2025 | Protocol deep dive |

### Sentiment Shift
The narrative has shifted from "micropayments are dead" to "micropayments for AI agents might work" because:
1. AI agents have no psychological friction
2. Stablecoins removed volatility concerns
3. L2s (Base) reduced gas costs to near-zero
4. HTTP-native approach reduces integration friction

---

## 7. Strategic Recommendations for 402claw

### Immediate Opportunities

1. **x402 Integration**
   - Add wallet management to OpenClaw
   - Enable x402 payments in skills
   - Track spending per skill/service

2. **MCP Monetization Layer**
   - Wrap premium MCP tools with MCPay
   - Unified payment handling across all skills

3. **Smart Routing**
   - Consider ClawRouter integration
   - Cost optimization with model routing

### Medium-Term

4. **Publisher Mode**
   - Let users expose their OpenClaw as a service
   - Personal API marketplace
   - Monetize skills/capabilities

5. **Agent-to-Agent Protocol**
   - Implement A2A for agent discovery
   - Enable cross-agent payments

### Differentiation Strategy

| Seren Approach | 402claw Opportunity |
|----------------|---------------------|
| IDE for developers | Personal AI for everyone |
| Code editing focus | Multi-modal life assistant |
| Desktop only | Cross-device (nodes) |
| Consumer of services | Both consumer AND provider |
| Proprietary gateway | Decentralized/self-hostable |

---

## 8. Key Links & Resources

### Core x402
- Protocol: https://x402.org
- Whitepaper: https://x402.org/x402-whitepaper.pdf
- Coinbase Docs: https://docs.cdp.coinbase.com/x402
- GitHub: https://github.com/coinbase/x402

### Ecosystem
- Awesome x402: https://github.com/xpaysh/awesome-x402
- x402 Topic: https://github.com/topics/x402
- x402scan: https://x402scan.io (ecosystem explorer)

### Competitors/Alternatives
- Seren Desktop: https://github.com/serenorg/seren-desktop
- MCPay: https://mcpay.tech
- Lucid Agents: https://github.com/daydreamsai/lucid-agents
- Google AP2: https://ap2-protocol.org

### Stats (as of 2026-02-12)
- x402 Transactions: 75.41M
- x402 Volume: $24.24M
- Buyers: 94.06K
- Sellers: 22K

---

## Appendix: All x402 Repos Found

<details>
<summary>Full list of 327+ repos (click to expand)</summary>

**Infrastructure:**
- coinbase/x402
- second-state/x402-facilitator
- x402-rs/x402-rs
- AIMOverse/x402-kit
- zpaynow/ZeroPay

**SDKs:**
- x402-typescript (npm)
- x402 (PyPI)
- x402-rs (crates.io)
- x402-got
- x402-next
- x402-axum
- x402-reqwest

**Agent Frameworks:**
- daydreamsai/lucid-agents
- daydreamsai/daydreams
- nirholas/agenti
- microchipgnu/MCPay
- BlockRunAI/ClawRouter

**Implementations:**
- chu2bard/pinion-os
- dabit3/a2a-x402-typescript
- OnChainMee/x402-erc8004-agent
- alsk1992/CloddsBot
- roswelly/solana-ai-agent-mvp
- aaronjmars/tweazy
- Eversmile12/X402-audio-to-audio
- skalenetwork/machinepal
- Now-Or-Neverr/solana-x402-payment
- darkresearch/mallory

**Tools:**
- Merit-Systems/x402scan
- xpaysh/awesome-x402

</details>

---

*Research compiled: 2026-02-12 20:44 CET*

---

## 7. Payment Infrastructure Research

# Payment Infrastructure Research for Agent API Platform

**Research Date:** February 12, 2026  
**Purpose:** Evaluate payment options for an Agent API Platform marketplace

---

## Executive Summary

This report analyzes payment infrastructure options for an Agent API Platform, comparing traditional (Stripe Connect) with crypto-native (x402) approaches. 

**Key Finding:** A **hybrid approach** is recommended for MVP, starting with Stripe Connect for fiat payments while implementing x402 for agent-to-agent transactions. This provides broad accessibility while future-proofing for autonomous agent payments.

---

## 1. Stripe Connect Deep Dive

### How Stripe Connect Works for Marketplaces

Stripe Connect is designed specifically for platforms and marketplaces that need to:
- Accept payments from customers
- Split payments between the platform and service providers (API creators)
- Handle payouts to multiple connected accounts

**Architecture Options:**
1. **Direct charges** - Platform creates charges directly on behalf of connected accounts
2. **Destination charges** - Funds go to platform first, then transferred
3. **Separate charges and transfers** - Most flexible, full control over fund flows

### Fee Structure (EU/Netherlands)

| Component | Cost |
|-----------|------|
| Standard card processing | 1.5% + €0.25 (EU cards) |
| UK cards | 2.5% + €0.25 |
| Monthly active account | €2/account (if platform handles pricing) |
| Payout to connected account | 0.25% + €0.10 per payout |
| Instant Payouts | 1% of payout volume |
| Cross-border payouts | 0.25% of payout volume |

**Platform Revenue Options:**
- **Revenue Share Model:** Stripe handles pricing, platform earns a revenue share from Stripe
- **Custom Pricing Model:** Platform sets own rates for connected accounts, collects fees

### Onboarding Flow for API Providers

1. **Create Connected Account** via API
2. **Generate Account Link** for hosted onboarding
3. **User completes KYC** on Stripe-hosted flow (or embedded components)
4. **Capabilities activated** (payments, payouts)
5. **Ongoing verification** handled automatically

**Onboarding Options:**
- **Stripe-hosted** - Lowest friction, Stripe handles UI
- **Embedded components** - Custom UI with Stripe-powered flows
- **Custom/API-based** - Full control, more compliance burden

### Payout Options & Timing

| Option | Timing | Notes |
|--------|--------|-------|
| Standard | 2-7 business days | Varies by country |
| Express | T+1 | Additional fees may apply |
| Instant | Minutes | 1% fee |
| Manual | On-demand | Platform controls timing |

### AI Agents as "Merchants"

**Challenge:** Stripe requires legal entities and human identity verification.

**Workarounds:**
1. **Platform as merchant of record** - Platform is the legal entity, agents are internal services
2. **Human-backed agent accounts** - Each agent tied to a human/company identity
3. **Aggregated sub-accounts** - Platform manages on behalf of agents

**Verdict:** Stripe works for *human-controlled* AI agent businesses but not for fully autonomous agents without human backing.

---

## 2. x402 Protocol Analysis

### Current State of x402 Ecosystem

**What is x402?**
- Open payment protocol reviving HTTP 402 "Payment Required" status
- Developed by Coinbase, now an open standard
- Enables micropayments via stablecoins (USDC) over HTTP
- Perfect for AI agent-to-agent transactions

**Ecosystem Stats (as of Feb 2026):**
- 75.41M transactions processed
- $24.24M total volume
- 94.06K buyers
- 22K sellers

**Supported Networks:**
- Base (EVM)
- Solana
- More networks coming

### How x402 Works

```
1. Client sends HTTP request
2. Server returns 402 + PAYMENT-REQUIRED header
3. Client constructs payment (signs with wallet)
4. Client retries with PAYMENT-SIGNATURE header
5. Server verifies via Facilitator
6. Facilitator settles on-chain
7. Server returns requested resource
```

**Key Components:**
- **Facilitator:** Handles verification and settlement (Coinbase provides hosted option)
- **Wallet:** Client's crypto wallet (can be MPC/embedded)
- **USDC:** Primary payment token

### Facilitator Pricing

| Tier | Cost |
|------|------|
| Free tier | 1,000 tx/month |
| Beyond free tier | $0.001/transaction |
| Network fees | ~$0.001 on Base |

**Total per-transaction cost:** ~$0.002 for sub-cent payments

### Platform Integration

**For Sellers (API Providers):**
```javascript
// Single line middleware integration
app.use(
  paymentMiddleware({
    "GET /weather": {
      price: "$0.001",
      description: "Weather data",
    },
  })
);
```

**For Buyers (AI Agents):**
- TypeScript and Go SDKs available
- Wallet integration (embedded or external)
- No API keys or accounts needed

### Can We Combine Stripe + x402?

**Yes! Hybrid approach:**

| Payment Type | Rail |
|--------------|------|
| Human customers | Stripe Connect |
| Agent-to-agent | x402 (USDC) |
| Credit top-ups | Stripe → USDC conversion |
| Platform fees | Stripe Billing (subscriptions) |

**Settlement & Reconciliation:**
- x402: Real-time on-chain settlement
- Stripe: T+2 to T+7 depending on config
- Bridge needed: Circle API or Coinbase for fiat ↔ USDC

---

## 3. Comparison: Stripe vs x402 vs Hybrid

### Feature Comparison

| Feature | Stripe Connect | x402 | Hybrid |
|---------|---------------|------|--------|
| Human customers | ✅ Excellent | ⚠️ Learning curve | ✅ Best of both |
| AI agents | ⚠️ Workarounds | ✅ Native | ✅ Native |
| Micropayments (<$0.10) | ❌ Fees prohibitive | ✅ ~$0.002/tx | ✅ Via x402 |
| KYC/Compliance | ✅ Built-in | ❌ None | ✅ Via Stripe |
| Fiat support | ✅ 130+ currencies | ❌ USDC only | ✅ Via Stripe |
| Settlement speed | 2-7 days | Seconds | Mixed |
| Global coverage | ✅ Excellent | ✅ Permissionless | ✅ Both |
| Chargebacks | ❗ Risk | ✅ None | Mixed |
| Dev complexity | Medium | Low | Medium-High |

### Pros & Cons Summary

**Stripe Connect**
- ✅ Trusted, compliant, broad payment methods
- ✅ Handles KYC, disputes, tax compliance
- ✅ Familiar to humans
- ❌ 2.9% + €0.25 kills micropayments
- ❌ Not agent-native
- ❌ Settlement delays

**x402**
- ✅ Zero protocol fees
- ✅ Sub-second settlement
- ✅ Agent-native design
- ✅ No accounts needed
- ❌ USDC only (for now)
- ❌ User education needed
- ❌ No dispute resolution

**Hybrid**
- ✅ Best of both worlds
- ✅ Future-proof
- ✅ Broad accessibility
- ❌ More complexity
- ❌ Dual reconciliation

### MVP Recommendation

**Start with Stripe Connect for:**
- Human user onboarding (credit card, bank)
- Platform subscriptions
- Large transactions (>$1)
- Regulatory compliance

**Add x402 for:**
- Agent-to-agent payments
- Micropayments (<$0.10)
- Real-time settlement needs
- "Pay-per-call" model

### Long-term Scalability

| Approach | Scalability Score | Notes |
|----------|-------------------|-------|
| Stripe Only | 6/10 | Hits micropayment ceiling |
| x402 Only | 7/10 | Limited fiat accessibility |
| Hybrid | 9/10 | Scales with both human and agent growth |

---

## 4. Alternative Payment Rails

### Coinbase Commerce

**Overview:** Crypto payment solution for merchants

**Pricing:** 1% fee on all crypto payments

**Pros:**
- Easy integration
- Multiple crypto support
- Fiat settlement available
- Commerce Payment Protocol (open source)

**Cons:**
- Not designed for micropayments
- No agent-native features
- 1% fee higher than x402

**Verdict:** Good for one-off crypto payments, but x402 is better for API micropayments.

### Circle USDC APIs

**Overview:** Direct USDC infrastructure

**Features:**
- Circle Mint for large-scale USDC operations
- Programmable Wallets
- Cross-Chain Transfer Protocol (CCTP)
- 30 blockchain networks

**Pricing:** Custom/enterprise pricing

**Use Case:** Backend infrastructure for:
- USDC minting/redemption
- Fiat on/off ramps
- Treasury operations

**Verdict:** Useful as backend infrastructure, not a payment API itself.

### Lightning Network (L402)

**Overview:** Bitcoin Layer 2 for micropayments

**How it works:**
- HTTP 402 + Lightning invoices
- Pay per API call with Bitcoin/satoshis
- Sub-cent transactions possible

**Pros:**
- True micropayments (< 1 cent)
- Instant settlement
- Growing ecosystem (Nostr, etc.)

**Cons:**
- Bitcoin volatility
- Liquidity management complex
- Smaller ecosystem than USDC
- Less agent tooling than x402

**Verdict:** Viable alternative to x402, but USDC stability preferred for business pricing.

### Other Agent-Native Options

| Solution | Description | Status |
|----------|-------------|--------|
| Skyfire | AI agent payment network | Early stage |
| AgentPay protocols | Various startups | Emerging |
| Web3 native wallets | MPC wallets for agents | Growing |

---

## 5. Pricing Models Research

### Common API Pricing Models

#### 1. Per-Call Pricing (Usage-Based)

**How it works:** Charge per API request

**Examples:**
- AWS API Gateway: $1-3.50 per million requests
- AWS Lambda: $0.20 per million requests
- OpenAI GPT-4: $0.03/1K input tokens

**Pros:**
- Transparent cost tracking
- Scales with actual usage
- Low barrier to entry

**Cons:**
- Unpredictable revenue
- Micropayment overhead

#### 2. Subscription/Tiered Model

**How it works:** Monthly fee for quota of calls

**Examples:**
- Twilio: Various plans with included usage
- Algolia: Tier-based pricing

**Pricing tiers example:**
| Tier | Price | Included |
|------|-------|----------|
| Free | $0 | 1,000 calls/month |
| Pro | $29/mo | 50,000 calls/month |
| Business | $99/mo | 500,000 calls/month |
| Enterprise | Custom | Unlimited |

**Pros:**
- Predictable revenue
- Encourages commitment
- Simple to understand

**Cons:**
- Unused quota waste
- Tier boundaries cause friction

#### 3. Credit-Based System

**How it works:** Pre-purchase credits, consume per use

**Examples:**
- OpenAI tokens
- OpusClip credits

**Pricing:**
- Buy credits in bulk (discounts for volume)
- Different operations cost different credits
- Credits may or may not roll over

**Pros:**
- Flexible for variable workloads
- Reduces billing friction
- Good for agents (pre-funded wallets)

**Cons:**
- "Token math" can confuse users
- Pre-payment barrier

#### 4. Freemium + Usage

**How it works:** Free tier + pay for overages

**Example structure:**
- Free: 100 calls/day
- Overage: $0.001/call

**Pros:**
- Maximum adoption
- Low barrier to try
- Viral growth potential

**Cons:**
- Free tier abuse
- Low conversion rates

### Competitor Pricing Analysis

| Platform | Model | Pricing |
|----------|-------|---------|
| RapidAPI | Marketplace cut | 20% of transaction |
| AWS API Gateway | Per-request | $1.00-3.50/million |
| Stripe Connect | Transaction % | 0.25-0.5% of volume |
| OpenAI | Token-based | $0.002-0.06/1K tokens |
| Anthropic Claude | Token-based | $0.003-0.015/1K tokens |
| Replicate | Per-second compute | $0.00025-0.0032/sec |

### Recommended Pricing Model for Agent API Platform

**Hybrid: Subscription Base + Usage + x402**

```
Platform Tiers:
├── Free: 1,000 API calls/month (any provider)
├── Pro ($29/mo): 50,000 calls + reduced per-call fees
├── Team ($99/mo): 200,000 calls + priority support
└── Enterprise: Custom SLA + volume discounts

Per-Call Pricing (beyond quota):
├── Standard APIs: $0.001-0.01/call
├── AI/Compute-heavy: $0.01-0.10/call
└── Premium APIs: Provider-set pricing

Platform Take Rate:
├── Stripe transactions: 5-10% of API provider revenue
├── x402 transactions: 1-3% (competitive due to low fees)
└── Subscription revenue: 100% to platform
```

---

## 6. MVP Payment Strategy Recommendation

### Phase 1: Launch (Month 1-3)

**Implement:**
1. **Stripe Connect** for API provider onboarding
2. **Stripe Billing** for platform subscriptions
3. **Credit system** - Buy credits with Stripe, spend on API calls

**Why:**
- Fastest time to market
- Compliance handled
- Familiar to users

**Platform fees:**
- 10% take rate on API revenue
- $0 for credit purchases (Stripe fees absorbed by user)

### Phase 2: Agent Support (Month 4-6)

**Add:**
1. **x402 integration** for agent-to-agent payments
2. **USDC credit deposits** (via Circle or Coinbase)
3. **Dual billing** - Stripe for humans, x402 for agents

**Why:**
- Opens agent-to-agent market
- Enables true micropayments
- Competitive advantage

### Phase 3: Scale (Month 7+)

**Optimize:**
1. **Hybrid settlement** - Pool small payments, settle in batches
2. **Volume discounts** via Stripe + on-chain
3. **White-label wallets** for API providers

**Why:**
- Reduces per-transaction costs at scale
- Better UX for high-volume users
- Platform becomes payment infrastructure

---

## 7. Implementation Checklist

### Stripe Connect Setup
- [ ] Create Stripe account with Connect enabled
- [ ] Choose account type (Express recommended for MVP)
- [ ] Configure onboarding flow (hosted or embedded)
- [ ] Set up webhook handlers
- [ ] Implement payout logic
- [ ] Configure platform fee collection

### x402 Integration
- [ ] Set up Base wallet for platform
- [ ] Integrate CDP Facilitator (free tier)
- [ ] Add payment middleware to API gateway
- [ ] Create agent wallet provisioning
- [ ] Build payment verification flow
- [ ] Implement settlement webhooks

### Billing System
- [ ] Define pricing tiers
- [ ] Create credit purchase flow
- [ ] Build usage metering
- [ ] Implement quota enforcement
- [ ] Set up invoicing (Stripe Billing)
- [ ] Create billing portal

---

## 8. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| x402 protocol changes | Medium | Abstract payment layer, stay updated |
| Stripe fee increases | Medium | Negotiate volume discounts, x402 fallback |
| USDC depegging | High | Multi-stablecoin support, circuit breakers |
| Regulatory changes | High | Maintain compliance, legal review |
| Agent wallet security | High | MPC wallets, spending limits |

---

## 9. Conclusion

**Recommendation: Hybrid Stripe + x402**

The agent API economy requires both:
1. **Traditional rails** for human accessibility and compliance
2. **Crypto rails** for agent-native, micropayment-friendly transactions

Starting with Stripe Connect provides a solid foundation, while x402 integration positions the platform for the autonomous agent future. The $0.002/transaction cost of x402 makes per-call pricing viable at any scale.

**Next Steps:**
1. Prototype Stripe Connect integration
2. Test x402 with sample API
3. Design unified credit system
4. Legal review of hybrid model
5. Launch MVP with Stripe-only, add x402 in Phase 2

---

*Research compiled from: Stripe documentation, Coinbase CDP docs, x402.org, AWS pricing, Nordic APIs, and industry analysis.*


### Stripe x402 Integration (BREAKING - Feb 10, 2026)

Stripe launched Machine Payments with x402 support:

**Features:**
- x402 protocol support
- USDC on Base
- Microtransactions from $0.01
- Gasless (Stripe pays gas)
- PaymentIntent API integration
- Payments land in Stripe balance

**Documentation:**
- https://docs.stripe.com/payments/machine
- https://docs.stripe.com/payments/machine/x402

**Implications for 402claw:**
- Can use Stripe as facilitator (alternative to Coinbase)
- Validates the market - big players investing
- x402 becoming the standard


---


## 8. Key Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Payment Protocol | x402 | Industry standard, Stripe/Coinbase support |
| Blockchain | Base (L2) | Low fees, Coinbase ecosystem, USDC native |
| MVP Scope | CSV/JSON only | Simplest path to value, add functions later |
| CLI vs Web | CLI-first | Agents are primary users |
| Hosting | Cloudflare Workers | Cheap, fast, global, V8 isolates |
| CSV-to-API | Fork csv2api | MIT license, best features, saves 2 weeks |
| Revenue Model | 5% withdrawal fee | Lower than RapidAPI (25%), sustainable |
| Facilitator | Coinbase CDP (primary) | Free tier, proven scale |

## 9. Open Questions

1. **Domain name:** 402claw.com? clawfetch.com? Something else?
2. **Free tier limits:** How many calls before payment required?
3. **Stripe vs Coinbase:** Which facilitator to use primarily?
4. **Functions:** When to add Python/JS function support?
5. **MCP integration:** Priority for v1.1 or later?

## 10. Timeline

**Week 1-2:** Foundation
- CLI with deploy, status, wallet, withdraw
- csv2api fork with x402 middleware
- Basic Cloudflare Workers deployment

**Week 3:** Polish
- Documentation
- Simple web dashboard
- Testing & security audit

**Week 4:** Launch
- Alpha with select users
- Iterate based on feedback
- Public launch

## 11. Success Metrics

**Month 1 Targets:**
- 50 APIs deployed
- 50K API calls
- $500 GMV
- 20 active creators

**North Star Metric:** Monthly GMV (Gross Merchandise Value)

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Stripe launches competing product | Focus on simplicity, agent-native UX |
| x402 adoption slow | Build for x402 + traditional API keys |
| Regulatory issues | USDC is regulated stablecoin, consult legal |
| Security vulnerabilities | Audit, sandboxing, rate limits |

---

## Appendix: All Research Documents

Location: `~/.openclaw/workspace/artifacts/2026-02-12/`

| Document | Description |
|----------|-------------|
| 402claw-final-mvp-plan.md | Consolidated MVP plan |
| 402claw-cli-design.md | Complete CLI specification |
| 402claw-technical-spec.md | Technical architecture |
| mcpay-analysis.md | MCPay competitor analysis |
| csv-api-analysis.md | CSV-to-API tools analysis |
| github-marketplace-research.md | 100+ GitHub projects |
| hn-sentiment-research.md | Hacker News sentiment |
| extended-research-seren-x402.md | Seren & x402 ecosystem |
| research-payments.md | Payment infrastructure |
| research-architecture.md | Hosting & costs |
| research-competition.md | Competitive landscape |
| research-agent-experience.md | Agent UX research |

**Deep research in progress (4 agents, 30-60 min each):**
- x402 protocol deep dive
- Working prototype build
- Full competitive intelligence
- Marathon research (all topics)

---

*Generated by Clawsenberg for Ferdi - 2026-02-12*

