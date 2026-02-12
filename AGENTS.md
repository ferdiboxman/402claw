# AGENTS.md - Instructions for AI Agents

This project is being developed by multiple AI agents. Follow these guidelines.

## Project Overview

**402claw** is a platform for deploying paid APIs with one command. 

Core value proposition:
- Upload CSV/JSON → Get REST API
- x402 micropayments built-in
- USDC on Base blockchain
- 5% platform fee (vs RapidAPI's 25%)

## Your Role

You are one of multiple AI agents working on this project. Your job is to:

1. **Research** - Deep dive into relevant topics
2. **Document** - Write findings in markdown
3. **Prototype** - Build experimental code
4. **Iterate** - Improve based on findings

## File Organization

```
research/
├── claude-research/    # Clawsenberg's research (DO NOT MODIFY)
├── codex-research/     # Your research goes here
│   ├── deep-dives/     # In-depth analysis
│   ├── prototypes/     # Code experiments
│   └── findings/       # Key discoveries
└── shared/             # Consolidated docs (read-only)
```

**Rules:**
- Put YOUR work in `codex-research/` (or your agent name)
- Don't modify other agents' research folders
- Shared folder is for consolidated docs only

## Research Already Done (by Claude/Clawsenberg)

Read these first:
1. `research/shared/402claw-complete-research-package.md` - START HERE
2. `research/claude-research/402claw-final-mvp-plan.md` - MVP plan
3. `research/claude-research/402claw-technical-spec.md` - Architecture

Key findings already established:
- x402 is the payment protocol (Coinbase + Stripe support)
- Cloudflare Workers for hosting
- Fork csv2api for CSV-to-API functionality
- 5% withdrawal fee business model
- 4-week MVP timeline

## Research Gaps (Need Your Help)

1. **x402 Protocol Deep Dive**
   - Clone and analyze: https://github.com/coinbase/x402
   - Understand the payment flow in detail
   - Document edge cases and limitations

2. **Cloudflare Workers for Platforms**
   - How to deploy user code programmatically
   - Multi-tenant isolation patterns
   - Cost optimization strategies

3. **Competitive Analysis**
   - RapidAPI detailed teardown
   - Val.town user experience
   - Seren Desktop marketplace model

4. **Prototype Building**
   - Build a working x402 payment flow
   - CSV-to-API with x402 middleware
   - CLI proof of concept

## How to Do Deep Research

Don't rush. Take your time:

1. **Clone repos** - Read actual code, not just READMEs
2. **Build things** - Understanding comes from doing
3. **Document thoroughly** - 5000+ words per topic
4. **Include code snippets** - Show don't tell
5. **Cite sources** - URLs for everything

## Output Format

When writing research documents:

```markdown
# Topic Name

## Executive Summary
[2-3 sentences]

## Key Findings
[Bullet points]

## Detailed Analysis
[Multiple sections with depth]

## Code Examples
[Actual code that works]

## Recommendations
[What should we do?]

## Sources
[URLs and references]
```

## Communication

- Write findings to markdown files
- Don't assume the other agent knows your work
- Cross-reference: "See claude-research/xyz.md for related analysis"

## Current Priorities

1. Understand x402 protocol deeply
2. Validate technical architecture
3. Build proof-of-concept prototypes
4. Identify risks and unknowns

## Questions?

If something is unclear, document your assumptions and proceed. We can iterate.

---

*Last updated: 2026-02-12*
