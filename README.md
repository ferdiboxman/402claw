<div align="center">

# 🦞 Clawr

### The expert skill for creating x402 paid APIs

**Install the skill. Tell your agent what to monetize. Ship a paid API in minutes.**

[![skills.sh](https://img.shields.io/badge/skills.sh-clawr-blue)](https://skills.sh/clawr)
[![x402](https://img.shields.io/badge/protocol-x402-green)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## What is Clawr?

Clawr is a **skill** — a package of expertise that AI agents use to create, deploy, and monetize APIs using the [x402 protocol](https://x402.org). It's not a platform. It's the playbook your agent follows to turn any data, model, or tool into a paid API endpoint that earns USDC on every request.

## Quick Start

```bash
npx skills add clawr
```

Then tell your agent:

> "I want to create a paid API for my stock data"

That's it. Clawr guides your agent through the entire process — from scaffolding to earning.

---

## What the Skill Does

```
  You describe what to monetize
            │
            ▼
  ┌─────────────────┐
  │    1. ANALYZE    │  Understand use case, data, value per call
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   2. SCAFFOLD    │  Generate x402 API project with payment middleware
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │    3. DEPLOY     │  Ship to Railway, Vercel, Cloudflare, or Fly.io
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │   4. REGISTER    │  List on the Bazaar for agent discovery
  └────────┬────────┘
           ▼
      💰 Earn USDC
      on every request
```

### Not a platform. A skill.

Clawr doesn't host your API. It doesn't take a cut. It teaches your agent how to build paid APIs the right way — then gets out of the way.

---

## Supported Stacks

| Stack | Deploy Target | Best For |
|-------|--------------|----------|
| **Express** | Railway, Fly.io | General APIs, data endpoints |
| **Next.js** | Vercel | Full-stack apps with API routes |
| **Cloudflare Workers** | Cloudflare | Edge performance, global low-latency |
| **FastAPI** | Railway, Fly.io | ML models, Python data pipelines |

---

## Examples

### 📊 Data API
Turn a CSV of startup funding rounds into a paid API. Express on Railway, $0.001/request.
→ [`skill/examples/data-api`](skill/examples/data-api)

### 🤖 AI Skill
Wrap a Hugging Face sentiment model as a paid endpoint. FastAPI on Fly.io, $0.005/request.
→ [`skill/examples/ai-skill`](skill/examples/ai-skill)

### 🔄 Proxy API
Wrap a free weather API with caching and better formatting. CF Worker, $0.0005/request.
→ [`skill/examples/proxy-api`](skill/examples/proxy-api)

---

## The Machine Economy

APIs are becoming the commerce layer for autonomous agents. Agents need to **earn** to sustain themselves — paying for compute, data, and other services.

Clawr follows the **Automaton pattern**: an agent that can create its own revenue streams. Install the skill, point it at something valuable, and your agent builds the infrastructure to monetize it. Every paid request is income. Every Bazaar listing is a storefront.

The API era rewarded infrastructure builders. The skill era rewards **expertise**.

---

## Install

### Via skills.sh (recommended)
```bash
npx skills add clawr
```

### Manual
```bash
git clone https://github.com/402claw/clawr
# Copy skill/ directory to your agent's skills folder
```

### Claude Code
```bash
# Add to your .claude/skills/ directory
cp -r clawr/skill ~/.claude/skills/clawr
```

### OpenClaw
```bash
# Add to spawner skills
cp -r clawr/skill ~/.spawner/skills/clawr
```

---

## Docs

| Guide | Description |
|-------|-------------|
| [Quickstart](skill/docs/quickstart.md) | Zero to earning in 5 minutes |
| [Deployment Guide](skill/docs/deployment-guide.md) | Platform-specific deploy instructions |
| [Bazaar Guide](skill/docs/bazaar-guide.md) | Get discovered by agents |
| [Pricing Guide](skill/docs/pricing-guide.md) | Price your API to win |

---

## How x402 Works

[x402](https://x402.org) is a protocol for HTTP-native payments. No API keys. No accounts. No subscriptions.

```
Client request  →  Server responds 402 + price
Client signs USDC payment  →  Sends payment header
Server verifies  →  Returns data
```

Agents pay per request in USDC on Base. Settlement is instant. Your wallet receives funds directly.

---

## Project Structure

```
skill/              ← The skill (this is what agents use)
  SKILL.md          ← Agent workflow & reference
  templates/        ← Express, Next.js, CF Workers, FastAPI starters
  examples/         ← 3 working examples
  prompts/          ← Agent prompts for guided workflow
  scripts/          ← Scaffold, validate, register, test
  docs/             ← Guides
prototypes/         ← Early experiments (reference only)
frontend/           ← Dashboard prototype (reference only)
```

---

## Contributing

Clawr is open source. We welcome contributions.

```bash
git clone https://github.com/402claw/clawr
cd clawr
npm install
npm test
```

### Areas We Need Help

- **New stack templates** — Deno, Bun, Go, Rust
- **Deployment targets** — More platform integrations
- **Bazaar metadata** — Better discovery algorithms
- **Pricing models** — Dynamic pricing strategies

---

## License

MIT

---

<div align="center">

**[Get Started →](skill/docs/quickstart.md)**

Built for the skill era. Powered by [x402](https://x402.org).

</div>
