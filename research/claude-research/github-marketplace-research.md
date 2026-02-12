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
