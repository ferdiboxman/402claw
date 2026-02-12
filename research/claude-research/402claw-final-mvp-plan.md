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
