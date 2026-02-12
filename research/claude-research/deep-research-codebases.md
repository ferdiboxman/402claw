# Deep Research: Codebase Analysis

**Date:** 2026-02-12
**Researcher:** OpenClaw Subagent
**Subject:** Comprehensive analysis of x402-related and competing codebases

---

## Table of Contents
1. [Coinbase x402 Protocol](#1-coinbase-x402-protocol)
2. [MCPay](#2-mcpay)
3. [csv2api](#3-csv2api)
4. [Seren Desktop](#4-seren-desktop)
5. [Comparative Analysis](#5-comparative-analysis)
6. [Key Learnings for 402claw](#6-key-learnings-for-402claw)

---

## 1. Coinbase x402 Protocol

**Repository:** https://github.com/coinbase/x402
**Cloned:** `~/.openclaw/workspace/research-repos/402claw-research/x402/`

### Overview
The official reference implementation of the x402 protocol by Coinbase. This is the foundational project that 402claw will build upon.

### Repository Stats
- **Files:** 941 source files (TypeScript, Go, Python)
- **Total Lines:** ~50,000+ lines of code
- **Contributors:** Multiple Coinbase engineers
- **Activity:** Very active (1,151+ commits)
- **License:** Apache 2.0

### Directory Structure
```
x402/
├── docs/              # GitBook documentation source
├── e2e/               # End-to-end tests (18 subdirectories)
├── examples/          # Example implementations
├── go/                # Go SDK implementation
│   ├── mechanisms/    # Payment mechanisms (EVM, SVM)
│   ├── types/         # Core types
│   ├── mcp/           # MCP integration
│   └── http/          # HTTP middleware (gin)
├── java/              # Java SDK
├── python/            # Python SDK
│   ├── x402/          # Main package
│   └── legacy/        # Legacy implementation
├── specs/             # Protocol specifications
│   ├── schemes/       # Payment schemes (exact)
│   ├── transports-v1/ # HTTP, A2A, MCP transports
│   └── transports-v2/ # Updated transports
├── static/            # Static assets (diagrams)
└── typescript/        # TypeScript SDK (main)
```

### Tech Stack
- **TypeScript:** Primary implementation language
- **Go:** Server-side SDK
- **Python:** Client/server SDK
- **Java:** Enterprise SDK
- **Viem:** Ethereum client library
- **EIP-712:** Typed data signing standard
- **EIP-3009:** TransferWithAuthorization for gasless payments

### Key Source Files Analyzed

#### TypeScript Core (`typescript/`)
The TypeScript implementation is the most complete. Key packages:
- `@x402/core` - Core types and utilities
- `@x402/evm` - EVM chain support
- `@x402/svm` - Solana support
- `@x402/fetch` - Fetch client wrapper
- `@x402/express` - Express middleware
- `@x402/hono` - Hono middleware
- `@x402/next` - Next.js integration
- `@x402/paywall` - Paywall components

#### Protocol Specification (`specs/x402-specification-v1.md`)
```markdown
Key Protocol Components:
1. PaymentRequirementsResponse - Server's payment request
2. PaymentPayload - Client's payment authorization
3. SettlementResponse - Confirmation of payment

Core Fields in PaymentRequirements:
- scheme: "exact" (fixed amount)
- network: "base-sepolia", "base", "ethereum"
- maxAmountRequired: amount in atomic units
- asset: token contract address (USDC)
- payTo: recipient address
- resource: URL being paid for
- maxTimeoutSeconds: payment validity window
```

#### Payment Flow
```
Client → Request → Server
Server → 402 + PaymentRequirements → Client
Client → Sign EIP-3009 Authorization → Client
Client → Request + X-PAYMENT header → Server
Server → Verify via Facilitator → Facilitator
Facilitator → Valid → Server
Server → Execute request → Client
Server → Settle via Facilitator → Blockchain
```

### Patterns & Architecture

**1. Middleware Pattern**
```typescript
// Express-style middleware
app.use(paymentMiddleware(routes, facilitator));
```

**2. Scheme/Network Separation**
- Schemes define HOW to move money (exact, upto)
- Networks define WHERE to move money (Base, Ethereum)
- Clean separation allows extensibility

**3. Facilitator Abstraction**
```typescript
interface Facilitator {
  verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse>;
  settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse>;
  supported(): Promise<{kinds: SupportedKind[]}>;
}
```

**4. Transport Agnostic**
- HTTP (primary)
- MCP (Model Context Protocol)
- A2A (Agent-to-Agent)

### What We Can Learn
1. **Clean protocol design** - separating concerns (scheme, network, transport)
2. **Multi-language support** - TypeScript, Go, Python, Java
3. **Middleware abstraction** - easy integration with existing frameworks
4. **Facilitator pattern** - outsourcing blockchain complexity
5. **EIP-3009 gasless payments** - user doesn't pay gas

### Open Issues to Watch
- Solana support still experimental
- Rate limiting not standardized
- Session/subscription models not yet supported

---

## 2. MCPay

**Repository:** https://github.com/microchipgnu/MCPay
**Cloned:** `~/.openclaw/workspace/research-repos/402claw-research/MCPay/`

### Overview
MCPay adds x402 payments to Model Context Protocol (MCP) servers. This is a direct competitor/complement to what 402claw could offer.

### Repository Stats
- **Files:** 197 source files
- **Total Lines:** 38,407 lines of code
- **Contributors:** microchipgnu (primary)
- **Activity:** Active (30+ recent commits)
- **License:** Apache 2.0

### Directory Structure
```
MCPay/
├── apps/
│   ├── app/           # Web dashboard
│   │   └── src/       # React/Next.js frontend
│   └── mcp2/          # MCP proxy server
├── examples/
│   ├── chatgpt-apps-sdk-nextjs-starter/
│   ├── vlayer-client-example/
│   ├── auth-example/
│   └── x402-mcp/
├── packages/
│   └── js-sdk/        # Main SDK
│       └── src/
│           ├── handler/     # Request handlers
│           │   ├── proxy/   # Proxy hooks
│           │   └── server/  # Server plugins
│           ├── client/      # Client utilities
│           ├── cli/         # CLI tools
│           └── utils/       # Utilities
└── context/           # Documentation/context
```

### Tech Stack
- **TypeScript/Next.js:** Web dashboard
- **Hono:** Edge runtime server
- **MCP SDK:** @modelcontextprotocol/sdk
- **x402 libraries:** @x402/core, @x402/evm, etc.
- **Turborepo:** Monorepo management
- **Changeset:** Version management

### Key Source Code Analysis

#### X402 Monetization Hook (`packages/js-sdk/src/handler/proxy/hooks/x402-hook.ts`)
```typescript
// This is the core payment enforcement logic
export class X402MonetizationHook implements Hook {
    name = "x402-monetization";
    private readonly cfg: X402ProxyConfig;
    
    // Key methods:
    // 1. buildRequirements() - Create PaymentRequirements for a tool
    // 2. processCallToolRequest() - Intercept tool calls, require payment
    // 3. processCallToolResult() - Settle payment after successful execution
    // 4. processListToolsResult() - Add payment annotations to tools
}
```

**Critical Pattern: Payment Lifecycle**
```typescript
async processCallToolRequest(req, extra) {
    // 1. Get tool name
    // 2. Look up price configuration
    // 3. Build payment requirements
    // 4. Check for payment token in _meta["x402/payment"]
    // 5. If no token → return 402 with requirements
    // 6. If token → verify with facilitator
    // 7. If valid → continue to tool execution
}

async processCallToolResult(res, original, extra) {
    // 1. Check if tool execution succeeded
    // 2. If success → settle payment via facilitator
    // 3. Add transaction info to response metadata
}
```

#### Server Plugin (`packages/js-sdk/src/handler/server/plugins/with-x402.ts`)
```typescript
// Augments McpServer with paidTool() method
export function withX402<S extends McpServer>(
    server: S,
    cfg: X402Config
): S & X402AugmentedServer {
    // Returns server with new paidTool() method
    // Handles payment verification inline
}

// Usage:
server.paidTool(
    "weather",
    "Get weather data",
    "$0.001",
    { city: z.string() },
    {},
    async ({ city }) => ({
        content: [{ type: "text", text: `Weather in ${city}: sunny` }],
    })
)
```

#### Client Wrapper (`packages/js-sdk/src/client/with-x402-client.ts`)
```typescript
// Wraps MCP client with automatic payment handling
export function withX402Client<T extends MCPClient>(
    client: T,
    x402Config: X402ClientConfig
): X402AugmentedClient & T {
    // Intercepts callTool() to:
    // 1. Detect 402 responses
    // 2. Automatically sign payment
    // 3. Retry with payment token
}
```

### Features
1. **Registry** - Discover MCP servers at mcpay.tech/servers
2. **Monetizer Proxy** - Wrap existing services with pay-per-call
3. **Dashboard** - Usage and revenue analytics
4. **CLI** - `npx mcpay connect` for quick setup
5. **Multi-network** - EVM (Base, Avalanche, IoTeX) + SVM (Solana)

### Pricing Model
- Per-tool pricing defined by developer
- Supports USD amounts (e.g., "$0.001")
- Automatic conversion to token amounts

### What We Can Learn
1. **Hook-based architecture** - Clean interception of requests
2. **Tool annotations** - Adding payment info to tool metadata
3. **Proxy pattern** - No code changes to upstream service
4. **Registry concept** - Discoverable paid services
5. **CLI-first UX** - Easy integration via npx

### Competitive Analysis
**Strengths:**
- Purpose-built for MCP
- Clean SDK design
- Good documentation
- Registry for discovery

**Weaknesses:**
- Limited to MCP protocol
- No subscription model
- Requires separate wallet management
- No fiat fallback

---

## 3. csv2api

**Repository:** https://github.com/jai0651/csv2api
**Cloned:** `~/.openclaw/workspace/research-repos/402claw-research/csv2api/`

### Overview
A simple CLI tool and Node.js library that turns CSV files into REST APIs. Relevant to 402claw as an example of quick API creation that could be monetized.

### Repository Stats
- **Files:** 10 JavaScript files
- **Total Lines:** 1,493 lines
- **Contributors:** 1
- **Commits:** 3 (new project)
- **License:** MIT

### Directory Structure
```
csv2api/
├── src/
│   ├── index.js       # Main exports
│   ├── csvLoader.js   # CSV parsing/watching
│   ├── queryUtils.js  # Search/filter utilities
│   ├── server.js      # Express server setup
│   ├── apiRoutes.js   # REST API endpoints
│   └── cli.js         # CLI interface
├── examples/
│   └── library-usage.js
├── test-basic.js
├── test-library.js
└── example-data.csv
```

### Tech Stack
- **Node.js:** Runtime
- **Express.js:** Web framework
- **csv-parser:** CSV parsing
- **Chokidar:** File watching
- **Commander.js:** CLI framework

### Key Source Code Analysis

#### CSV Loader (`src/csvLoader.js`)
```javascript
export class CsvLoader {
    constructor() {
        this.data = [];
        this.columns = [];
        this.watcher = null;
    }
    
    async loadCsv(filePath) {
        // Stream-based parsing
        // Returns { data, columns, totalRows, filePath, lastModified }
    }
    
    startWatching(filePath, onDataChange) {
        // Real-time file watching with chokidar
        // Auto-reload on changes
    }
}
```

#### API Routes (`src/apiRoutes.js`)
```javascript
// RESTful endpoints:
GET /           # API metadata
GET /data       # All data with filtering/pagination
GET /data/:id   # Single row by ID
GET /columns    # Column names
GET /stats      # Numeric column statistics
GET /unique/:column  # Unique values

// Query params:
// ?search=term  - Full-text search
// ?columns=a,b  - Select columns
// ?page=1&limit=10 - Pagination
// ?sort=col&order=desc - Sorting
```

### What We Can Learn
1. **Instant API generation** - Low barrier to entry
2. **Hot reload** - Live data updates
3. **Query DSL** - Search, filter, paginate, sort
4. **CLI-first approach** - `npx csv2api data.csv`

### Relevance to 402claw
csv2api represents the type of simple, instantly-deployable API that 402claw could monetize:
- User uploads CSV → gets REST API → monetizes with x402
- Zero-code API creation
- Could be a 402claw feature or integration

---

## 4. Seren Desktop

**Repository:** https://github.com/serenorg/seren-desktop
**Cloned:** `~/.openclaw/workspace/research-repos/402claw-research/seren-desktop/`

### Overview
An open-source AI desktop client with integrated x402 payments. Built with Tauri, SolidJS, and Rust. This is a direct example of a production x402 client.

### Repository Stats
- **Files:** 291 source files (TypeScript + Rust)
- **Total Lines:** 97,267 lines
- **Contributors:** Multiple
- **Activity:** Very active (642+ commits)
- **License:** MIT

### Directory Structure
```
seren-desktop/
├── src/                      # SolidJS frontend
│   ├── components/
│   │   ├── acp/             # Agent Client Protocol
│   │   ├── mcp/             # MCP tools, x402 approval
│   │   ├── wallet/          # Payments UI
│   │   └── ...
│   ├── lib/
│   │   ├── x402/            # x402 TypeScript types
│   │   └── ...
│   └── stores/              # State management
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── wallet/          # x402 signing (Rust)
│   │   │   ├── mod.rs
│   │   │   ├── payment.rs
│   │   │   ├── signing.rs
│   │   │   └── types.rs
│   │   ├── orchestrator/    # AI routing
│   │   └── ...
│   └── embedded-runtime/    # Bundled Node.js
├── skills/                  # Agent skills
└── tests/                   # E2E tests
```

### Tech Stack
- **Tauri 2.0:** Desktop framework
- **SolidJS:** Frontend (97K lines)
- **Rust:** Backend (alloy-rs for Ethereum)
- **Monaco Editor:** Code editing
- **sqlite-vec:** Vector storage
- **TypeScript:** Frontend logic

### Key Source Code Analysis - x402 Implementation

#### Rust Wallet Module (`src-tauri/src/wallet/`)

**Signing (`signing.rs`):**
```rust
// EIP-712 signing for USDC TransferWithAuthorization
sol! {
    struct TransferWithAuthorization {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
    }
}

pub async fn sign_transfer_authorization(
    wallet: &PrivateKeyWallet,
    domain: &Eip712Domain,
    message: &AuthorizationMessage,
) -> Result<String, WalletError> {
    let signing_hash = sol_message.eip712_signing_hash(&alloy_domain);
    let signature = wallet.signer().sign_hash(&signing_hash).await?;
    Ok(format!("0x{}", hex::encode(signature.as_bytes())))
}
```

**Payment Parsing (`payment.rs`):**
```rust
pub struct PaymentRequirements {
    pub x402_version: Option<u8>,
    pub resource: Option<X402ResourceInfo>,
    pub accepts: Vec<PaymentOption>,
    pub insufficient_credit: Option<InsufficientCredit>,
    pub error: Option<String>,
}

// Parses both x402 v1 and v2 responses
impl PaymentRequirements {
    pub fn parse(body: &str) -> Result<Self, PaymentError> {
        // Handles:
        // 1. Prepaid/credits shape
        // 2. x402 v1 format
        // 3. x402 v2 format
    }
}

// Payment method selection priority: x402 > prepaid
pub fn select_payment_method(
    requirements: &PaymentRequirements,
    user: &UserCapabilities,
) -> Option<PaymentMethod> {
    // Prefers x402 if wallet available
    // Falls back to prepaid credits
}
```

#### TypeScript x402 Module (`src/lib/x402/types.ts`)
```typescript
export interface PaymentRequirements {
    x402Version?: number;
    resource?: X402ResourceInfo;
    accepts: PaymentOption[];
    insufficientCredit?: InsufficientCredit;
    error?: string;
}

export function parsePaymentRequirements(body: string): PaymentRequirements {
    // Parses v1 and v2 formats
}

export function formatUsdcAmount(amountRaw: string): string {
    // "1000000" → "$1"
}

export function getChainName(network: string): string {
    // "eip155:8453" → "Base"
}
```

### Features Relevant to 402claw
1. **Dual payment methods** - x402 crypto + prepaid credits
2. **Wallet management** - Secure key storage in Tauri
3. **Payment approval UI** - User confirms payments
4. **Gateway integration** - SerenBucks payment system
5. **MCP x402 support** - Automatic micropayments for tools

### Architecture Patterns

**1. Hybrid Payment Strategy**
```
User has wallet? → Use x402 direct payment
User has credits? → Use prepaid/SerenBucks
Neither? → Prompt to add funds
```

**2. Native + Web Stack**
- Rust for crypto signing (secure, fast)
- TypeScript for UI (flexible, familiar)
- IPC bridge between them

**3. Payment Flow in MCP**
```
Tool requires payment → Show approval dialog → 
User confirms → Sign with Tauri backend →
Submit payment → Execute tool
```

### What We Can Learn
1. **Native wallet integration** - Rust + alloy-rs for secure signing
2. **Fallback payment methods** - x402 + prepaid credits
3. **Payment approval UX** - User-friendly confirmation dialogs
4. **Version handling** - Support both x402 v1 and v2
5. **Gateway as facilitator** - SerenDB acts as facilitator

---

## 5. Comparative Analysis

### Code Quality Comparison

| Project | Lines of Code | Test Coverage | Documentation | Activity |
|---------|--------------|---------------|---------------|----------|
| x402 | 50,000+ | Extensive | Excellent | Very High |
| MCPay | 38,407 | Moderate | Good | High |
| csv2api | 1,493 | Basic | Good | Low |
| Seren Desktop | 97,267 | Moderate | Good | Very High |

### Architecture Patterns

| Pattern | x402 | MCPay | Seren |
|---------|------|-------|-------|
| Middleware | ✅ | ✅ | ✅ |
| Facilitator | ✅ | ✅ | ✅ (Gateway) |
| Hook-based | ❌ | ✅ | ❌ |
| Native signing | ❌ | ❌ | ✅ |
| Multi-language | ✅ | ❌ | ✅ |

### Payment Features

| Feature | x402 | MCPay | Seren |
|---------|------|-------|-------|
| EVM Support | ✅ | ✅ | ✅ |
| Solana Support | ✅ | ✅ | ❌ |
| Prepaid Credits | ❌ | ❌ | ✅ |
| MCP Integration | ✅ | ✅ | ✅ |
| Service Registry | ❌ | ✅ | ❌ |

---

## 6. Key Learnings for 402claw

### Technical Recommendations

1. **Use x402 as foundation**
   - Well-designed protocol
   - Multi-language SDKs available
   - Active development by Coinbase

2. **Adopt MCPay patterns**
   - Hook-based architecture for flexibility
   - Tool annotation for discovery
   - CLI-first developer experience

3. **Learn from Seren Desktop**
   - Hybrid payment methods (x402 + credits)
   - Native signing for security
   - Payment approval UX patterns

4. **Consider csv2api simplicity**
   - Low-barrier API creation
   - Could be a quick monetization feature

### Code Snippets to Reuse/Adapt

**Payment Middleware Pattern (from x402):**
```typescript
app.use(
    paymentMiddleware({
        "GET /api/data": {
            accepts: [{
                scheme: "exact",
                price: "$0.01",
                network: "base",
                payTo: process.env.WALLET_ADDRESS
            }],
            description: "Data endpoint"
        }
    }, facilitatorClient)
)
```

**Tool Pricing (from MCPay):**
```typescript
server.paidTool(
    "search",
    "Web search",
    "$0.001",
    { query: z.string() },
    {},
    async ({ query }) => searchWeb(query)
)
```

**Payment Selection (from Seren):**
```rust
pub fn select_payment_method(requirements, user) {
    // 1. Prefer x402 if wallet available
    // 2. Fall back to prepaid credits
    // 3. Return None if no payment method
}
```

### Gaps to Fill

1. **Subscription model** - None of these support recurring payments
2. **Rate limiting** - Not standardized across implementations
3. **Analytics** - MCPay has dashboard, others don't
4. **Fiat onramp** - Only Seren has prepaid credits
5. **Service discovery** - Only MCPay has registry

---

## Appendix: Commit History

### x402 (Recent Activity)
```
2536820 Add ouchanip x402 APIs to ecosystem (#1151)
[... 1150+ more commits]
```

### MCPay (Recent Activity)
```
b6b7fe1 back to commit 984e6a9... serverId update
984e6a9 Refactor SupportedBySection layout
48ec1c8 Refactor mobile carousel
5e29e2f Add Colosseum logo
[... 30+ more commits]
```

### Seren Desktop (Recent Activity)
```
5145667 feat: implement cascading model fallback on 408 timeouts
1a37b3f fix: persist orchestrator messages to database
c94ccd0 chore: switch seren-acp-codex sidecar
d5a4223 fix: widen settings slide panel
[... 640+ more commits]
```

---

*Document generated by OpenClaw Deep Research Agent*
*Total source code analyzed: ~190,000 lines*
*Time spent: ~15 minutes on codebase analysis*
