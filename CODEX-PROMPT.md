# Codex Prompt - 402claw Research & Development

Copy everything below this line and give it to Codex:

---

## Your Mission

You are joining a project called **402claw** - a platform for deploying paid APIs with one command. Another AI agent (Clawsenberg/Claude) has already done extensive research. Your job is to:

1. **Understand** the project by reading existing research
2. **Deep dive** into areas that need more investigation
3. **Build** prototypes to validate ideas
4. **Document** everything thoroughly

## Project Location

```
/Users/Shared/Projects/402claw/
```

## First Steps

1. Read the README.md to understand the project
2. Read AGENTS.md for your instructions
3. Read the complete research package:
   ```
   research/shared/402claw-complete-research-package.md
   ```
   This is 178KB / 5700 lines - read it thoroughly.

4. Skim through `research/claude-research/` for detailed docs

## What is 402claw?

**One-liner:** "Deploy your data, get a paid API. One command."

**The Problem:** Developers and AI agents have valuable data but no easy way to monetize it without building full infrastructure.

**The Solution:**
```bash
402claw deploy data.csv --price 0.001
# API live, getting paid in USDC
```

**Tech Stack:**
- x402 protocol for payments (HTTP 402 + crypto)
- USDC stablecoin on Base (Ethereum L2)
- Cloudflare Workers for hosting
- Node.js CLI

## Research Gaps (Your Focus Areas)

Put your research in: `research/codex-research/`

### 1. x402 Protocol Deep Dive
Clone and analyze: https://github.com/coinbase/x402
- Read the actual TypeScript/Python code
- Understand payment verification flow
- Document the facilitator pattern
- Build a working example

### 2. Cloudflare Workers for Platforms
Research how to:
- Deploy user code programmatically
- Isolate tenants securely
- Handle billing/metering
- Cost analysis at scale

### 3. CSV-to-API Integration
Analyze: https://github.com/jai0651/csv2api
- How does it generate endpoints?
- How would we add x402 payments?
- What modifications needed?

### 4. Competitive Deep Dive
Create detailed profiles for:
- RapidAPI (pricing, UX, weaknesses)
- Val.town (how it works, why no payments)
- Seren Desktop (marketplace model)

### 5. Build Prototypes
Create working code in `prototypes/`:
- Simple x402 server (Express + x402 middleware)
- CSV upload → API endpoint
- CLI proof of concept

## How to Research Deeply

**DO NOT RUSH.** Take 30-60 minutes per topic.

1. Clone repositories, don't just read READMEs
2. Read actual source code
3. Build working examples
4. Document with code snippets
5. Write 5000+ words per major topic

## Output Structure

Create these in `research/codex-research/`:

```
codex-research/
├── x402-deep-dive.md           # Protocol analysis
├── cloudflare-workers-analysis.md
├── csv-to-api-integration.md
├── competitive-analysis/
│   ├── rapidapi.md
│   ├── valtown.md
│   └── seren.md
├── prototypes/
│   ├── x402-server/
│   └── csv-api/
└── findings-summary.md         # Executive summary
```

## Key Decisions Already Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Payment Protocol | x402 | Stripe + Coinbase support |
| Blockchain | Base (L2) | Low fees, USDC native |
| MVP Scope | CSV/JSON only | Simplest path |
| Hosting | Cloudflare Workers | Cheap, fast, isolated |
| Revenue | 5% withdrawal fee | Lower than RapidAPI 25% |

## Open Questions (Help Answer These)

1. How exactly does x402 payment verification work?
2. Can we use Stripe as facilitator instead of Coinbase?
3. What's the cold start latency for Cloudflare Workers?
4. How do we handle failed payments mid-request?
5. What security risks exist with user-uploaded code?

## Success Criteria

Your research is successful if:
- [ ] x402 protocol is fully understood with working code
- [ ] Cloudflare Workers architecture is validated
- [ ] At least one working prototype exists
- [ ] Competitive landscape is deeply documented
- [ ] Risks and unknowns are identified

## Timeline

Take your time. Quality over speed. Aim for:
- 30-60 minutes per research topic
- 5000+ words per major document
- Working code for each prototype

## Questions?

Document your assumptions and proceed. We iterate.

---

Good luck! Build something great. 🚀
