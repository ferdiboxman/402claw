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
