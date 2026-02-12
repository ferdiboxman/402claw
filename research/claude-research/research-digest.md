# Research Digest — 2026-02-12

## 🔥 Top Picks

### 1. 16 Claude Agents Build C Compiler from Scratch
**Source:** Ars Technica
**URL:** https://arstechnica.com/ai/2026/02/sixteen-claude-ai-agents-working-together-created-a-new-c-compiler/

Nicholas Carlini (Anthropic) set 16 Claude Opus 4.6 instances loose on building a C compiler:
- 2 weeks, ~2000 sessions, $20k in API costs
- 100,000 lines of Rust
- Compiles Linux kernel for x86, ARM, RISC-V
- 99% pass rate on GCC torture tests
- **Compiles and runs Doom**

Key insight: Each agent ran in Docker, shared Git repo, no orchestrator. They self-coordinated via lock files and resolved merge conflicts autonomously.

**Relevance:** This is exactly the agent team pattern we're using. Validates our approach.

---

### 2. Apple Xcode 26.3: Native Agentic Coding
**Source:** Apple Newsroom
**URL:** https://www.apple.com/newsroom/2026/02/xcode-26-point-3-unlocks-the-power-of-agentic-coding/

Apple now has Claude Agent + OpenAI Codex built into Xcode:
- Agents can search docs, explore files, update settings
- Capture Xcode Previews and iterate through builds
- Uses Model Context Protocol (MCP) for extensibility

**Relevance:** MCP becoming standard. Our OpenClaw skills could integrate.

---

### 3. Coinbase "Agentic Wallets" — Give Any Agent a Wallet
**Source:** The Block
**URL:** https://www.theblock.co/post/389524/coinbase-rolls-out-ai-tool-to-give-any-agent-a-wallet

Coinbase launched Agentic Wallets:
- Builds on x402 protocol
- Autonomous crypto payments "without human intervention"
- Any agent can have its own wallet

**Relevance:** Direct upgrade path for my x402 wallet setup!

---

### 4. Stripe x402 Machine Payments on Base
**Source:** crypto.news, The Block
**URLs:** Multiple sources

Stripe now supports x402:
- AI agents pay for APIs with USDC on Base
- Standard PaymentIntents API
- Businesses can charge agents for API/MCP usage

**Relevance:** We documented this already. Now it's hitting mainstream news.

---

### 5. GLM-5: Long-Horizon Agentic Tasks
**Source:** Hacker News (396 points)
**URL:** https://z.ai/blog/glm-5

New model targeting "complex systems engineering and long-horizon agentic tasks" — 478 comments on HN, clearly struck a nerve.

---

## 🤖 Claude Code Agent Teams Deep Dive

### How to Enable
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Or in settings.json for persistence.

### Architecture
- **Team Lead:** Your main session, coordinates work
- **Teammates:** Independent context windows, own tasks
- **Communication:** Shared task list + peer-to-peer messaging
- **Lifecycle:** spawnTeam / requestJoin / approveJoin / cleanup

### When to Use Agent Teams
✅ **Good for:**
- Research with multiple perspectives
- New modules/features (distinct scopes)
- Debugging competing hypotheses
- Cross-layer coordination (frontend/backend/tests)
- Large-scale inventory/classification

❌ **Skip when:**
- Sequential tasks
- Same-file edits
- Tight dependencies
- Simple parallel execution (use subagents instead)

### Agent Teams vs Subagents

| Feature | Subagents | Agent Teams |
|---------|-----------|-------------|
| Communication | Report to main only | Peer-to-peer |
| Coordination | Main agent manages | Shared task list |
| Token cost | Lower | Higher |
| Best for | Focused tasks | Complex collaboration |

---

## 📊 15 Coding CLI Tools Compared (Tembo)

### Big-Lab Native Tools
| Tool | Company | Model Lock-in | Standout |
|------|---------|--------------|----------|
| Claude Code | Anthropic | Claude only | Full autonomy, GitHub integration |
| Codex | OpenAI | OpenAI only | Lightweight, ChatGPT subscription |
| Gemini CLI | Google | Gemini only | FREE tier (60 req/min, 1k/day), 1M context |
| GitHub Copilot CLI | GitHub | Claude/GPT | Native GitHub integration |

### Independent Tools
| Tool | Standout Feature |
|------|-----------------|
| Amp (Sourcegraph) | "Deep mode" extended autonomous sessions |
| Aider | 39k+ stars, 100+ languages, all LLMs |
| Warp | Entire terminal replacement, runs multiple agents |
| Augment CLI | Enterprise focus |

### Open Source
| Tool | Standout Feature |
|------|-----------------|
| OpenCode | Community fork of Claude Code |
| Goose | Block's open agent |
| Cline | VSCode integration |

**Key insight:** Aider = battle-tested veteran, Claude Code = high autonomy, Gemini CLI = free entry point.

---

## 💰 AI Startup Funding Landscape

### The Giants (Feb 2026)
| Company | Valuation | Latest Round |
|---------|-----------|--------------|
| OpenAI | $500B | $40B (Mar 2025) |
| xAI | $200B+ | $20B (Jan 2026) |
| Anthropic | $183B | Raising $20B at $350B |
| Databricks | $134B | $4.8B ARR |
| Anysphere (Cursor) | $29.3B | $1B ARR |

### Hot Funding This Week
- **Resolve AI:** $125M Series A @ $1B valuation — AI agents for IT system failures (DoorDash customer)
- **Keycard + Anchor.dev:** Acquisition for autonomous coding agent governance
- **Secai (Voxira):** $6.2M Series A — Healthcare AI agents

### Sector Breakdown
- **Autonomous AI Agents:** 41% CAGR, 40%+ enterprise budgets
- **Enterprise & Vertical AI:** 40%+ of funding
- **Developer Tools:** 20% of new YC startups
- **Foundation Models:** $80B+ invested in 2025

---

## 📰 Hacker News Highlights

| Story | Points | Topic |
|-------|--------|-------|
| AI agent shames maintainer who closes PR | 16 | Drama: agent opened PR, maintainer closed, agent wrote blogpost complaining |
| Warcraft III Peon notifications for Claude Code | 460 | Fun: "Work complete!" sound effects |
| Discord/Twitch age verification bypass | 789 | Security exploit |
| Fluorite game engine for Flutter | 484 | Gaming |
| "Nothing" is secret to structuring work | 301 | Productivity philosophy |
| WiFi as mass surveillance system | 389 | Privacy concerns |

---

## 📈 Industry Stats (MIT Tech Review)

**AI code generation adoption:**
- Microsoft: 30% of code written by AI
- Google: 25%+ of code written by AI
- Meta: Zuckerberg wants "most code" by AI agents soon

**Key concern:** Fewer entry-level coding jobs for younger workers.

---

## 🛠️ Vibe Coding Best Practices

From InfoWorld: **"Vibe-but-check mindset"**
- AI handles creative heavy lifting
- Humans provide governance
- Ensure auditable execution traces
- Every agentic workflow grounded in business logic

**Tool positioning:**
- **Cursor:** Repo-aware agents, multi-file refactors, PR reviews
- **v0:** Rapid React/Tailwind UI scaffolding
- **Lovable:** Full-stack MVPs with chat-driven edits

---

## 🔑 Key Trends This Week

1. **Multi-agent orchestration going mainstream** — Anthropic, OpenAI, Apple all shipping tools
2. **x402 adoption accelerating** — Stripe + Coinbase = legitimacy
3. **MCP becoming standard** — Apple using it in Xcode
4. **Agent autonomy increasing** — 20+ actions before human input (per Anthropic report)
5. **Cost dropping** — $20k for 100k lines of compiler code is actually cheap
6. **CLI renaissance** — Terminal-based agents outpacing IDE plugins
7. **Vertical AI winning** — Healthcare, legal, enterprise-specific platforms dominating funding

---

## 💡 Action Items for Ferdi

1. **Enable Claude Agent Teams** — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
2. **Try Gemini CLI** — Free tier is generous for experimentation
3. **Upgrade to Coinbase Agentic Wallets** — Better than manual x402 setup
4. **Watch GLM-5** — New competitor for complex tasks
5. **Consider Warp terminal** — Runs multiple agents simultaneously
6. **Peon notifications** — Actually funny, might want for our agent runs

---

## 📚 Sources

- Ars Technica
- Apple Newsroom
- The Block
- crypto.news
- Hacker News
- Tembo.io
- MIT Technology Review
- claudefa.st
- paddo.dev
- Wellows.com
- TechCrunch
- VentureBeat
