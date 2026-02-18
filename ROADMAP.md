# Clawr Roadmap

## Vision: The Monetization Layer for the Skill Era

APIs were the distribution layer of Web 2.0. Skills are the distribution layer of the Agent Era.

Clawr lets you monetize both:
- **Data** → Paid API endpoints
- **Expertise** → Paid skill invocations

One command. Instant monetization. x402 micropayments.

---

## Current (v0.1) ✅

- [x] CSV → Paid API
- [x] JSON data endpoints
- [x] x402 micropayments (USDC on Base)
- [x] CLI deployment (`npx clawr deploy`)
- [x] Cloudflare Workers hosting
- [x] CDP facilitator integration

---

## Next (v0.2) - Skill Monetization

### Core Features
- [ ] `clawr deploy --skill ./my-skill` - Deploy a skill as paid service
- [ ] SKILL.md parsing and validation
- [ ] Per-invocation pricing (x402)
- [ ] Skill versioning and updates
- [ ] Usage analytics per skill

### Skill Format
```
my-skill/
├── SKILL.md          # Skill definition + pricing
├── scripts/          # Executable scripts
├── prompts/          # System prompts
└── clawr.json        # Deployment config
```

### Pricing Models
- Per invocation (default)
- Per token (for LLM-heavy skills)
- Subscription (monthly access)
- Tiered (volume discounts)

---

## Agent Network (v0.3) - The Full Stack

Reference: `research/anet-reference/` (patterns from murrlincoln/anet)

### Identity (ERC-8004)
- [ ] On-chain agent registry
- [ ] Agent metadata (skills, endpoint, pricing)
- [ ] Discoverable by other agents (`clawr find "seo audit"`)

### Auth (ERC-8128)
- [ ] Sign-in with agent (wallet-based, no browser)
- [ ] Request signing + verification middleware
- [ ] Replace current wallet-connect flow

### Messaging (XMTP)
- [ ] Agent-to-agent encrypted messaging
- [ ] Async skill results (long-running skills)
- [ ] Service discovery via XMTP

### Reputation
- [ ] On-chain reputation after successful calls
- [ ] Reputation-based pricing (trusted agents pay less)
- [ ] Skill quality scores

### Combined Flow
```
clawr deploy ./seo-audit --price 0.05     # Package + deploy
clawr register                             # ERC-8004 on-chain
clawr up                                   # Serve + XMTP + sync
# Other agents:
clawr find "seo audit"                     # Discover
clawr call <id> seo-audit --url example.com # Auth + Pay + Execute
```

## Future (v0.4+)

### Marketplace Integration
- [ ] ClawHub listing (discovery)
- [ ] Clawr monetization (revenue)
- [ ] One-click "Monetize this skill"

### Agent-First Features
- [ ] Skill composition (skills calling skills)
- [ ] Revenue sharing for composed skills
- [ ] Agent identity verification
- [ ] Usage quotas and rate limiting

### Enterprise
- [ ] Team accounts
- [ ] Private skill deployments
- [ ] Custom domains
- [ ] SLA guarantees

---

## Philosophy

### The Old Playbook (API Era)
1. Build SaaS
2. Design UI
3. Onboard users
4. Drive retention
5. Expand seats

### The New Playbook (Skill Era)
1. Encode high-leverage expertise
2. Package as skill
3. Deploy with Clawr
4. Let agents invoke thousands of times/day
5. Revenue scales with invocations, not seats

---

## Key Metrics

- **Invocations** > Active Users
- **Revenue per Skill** > Revenue per Seat
- **Agent Integrations** > Human Signups

---

## Competitive Position

| Platform | Focus | Monetization |
|----------|-------|--------------|
| ClawHub | Skill discovery | Free |
| Clawr | Skill + Data monetization | x402 micropayments |
| Skills.sh | Skill packaging | None |
| API marketplaces | Traditional APIs | Subscriptions |

**Clawr's edge:** Native x402 micropayments + agent-first design

---

*Last updated: 2026-02-18*
