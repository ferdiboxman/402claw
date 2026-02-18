---
name: clawr
description: Expert skill for creating, deploying, and monetizing x402 paid APIs with USDC micropayments on Base.
---

# Clawr — x402 Paid API Creator Skill

Expert skill for creating, deploying, and monetizing x402 paid APIs.

## When to Use

- User wants to **create** an API that charges per-call via x402
- User wants to **monetize** an existing API with crypto payments
- User needs to **register** an API on Bazaar for discovery
- User asks about x402 server-side setup, pricing, or payment gates

## When NOT to Use

- **Consuming** x402 APIs → use `@x402/fetch` or `x402` skill
- General API development without payments
- Wallet management or token operations → use `x402-layer` skill

---

## Workflow (7 Steps)

### Step 1: Analyze

Understand what the API does, who pays, and what value each call delivers.

- What data/computation does each endpoint provide?
- Who is the target consumer (agents, developers, apps)?
- What's the cost basis per call (compute, data, third-party APIs)?

### Step 2: Choose Stack

| Stack | Best For | SDK |
|-------|----------|-----|
| **Express** | Standalone Node.js APIs | `@x402/express` |
| **Next.js** | Full-stack apps with API routes | `@x402/nextjs` |
| **Cloudflare Workers** | Edge, low-latency, global | Manual middleware |
| **FastAPI** | Python APIs | Manual middleware |

### Step 3: Scaffold

Use templates from `templates/` or scaffold manually. See [Quick Reference](#quick-reference) below.

### Step 4: Implement

Write your business logic. The x402 middleware handles payment gating — you write normal endpoint code.

### Step 5: Price

Set prices per endpoint. See [Pricing Strategy](#pricing-strategy).

```js
const paymentConfig = {
  "/api/data": { price: "$0.001", network: "base", config: { description: "Data lookup" } },
  "/api/generate": { price: "$0.01", network: "base", config: { description: "AI generation" } },
};
```

### Step 6: Test

Run through the [Testing Checklist](#testing-checklist).

### Step 7: Register on Bazaar

Submit your API for discovery. See [Bazaar Registration](#bazaar-registration).

---

## Quick Reference

### Express

```bash
npm init -y && npm install express @x402/express
```

```js
import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();

const paymentConfig = {
  "/api/resource": {
    price: "$0.001",
    network: "base",
    config: { description: "Get resource data" },
  },
};

app.use(paymentMiddleware(
  "0xYOUR_WALLET_ADDRESS",
  paymentConfig,
  { facilitatorUrl: "https://x402.org/facilitator" }
));

app.get("/api/resource", (req, res) => {
  res.json({ data: "paid content" });
});

app.listen(4020);
```

### Next.js

```bash
npm install @x402/nextjs
```

```js
// middleware.ts
import { paymentMiddleware } from "@x402/nextjs";

export default paymentMiddleware(
  "0xYOUR_WALLET_ADDRESS",
  {
    "/api/resource": {
      price: "$0.001",
      network: "base",
      config: { description: "Get resource data" },
    },
  },
  { facilitatorUrl: "https://x402.org/facilitator" }
);

export const config = { matcher: "/api/:path*" };
```

```ts
// app/api/resource/route.ts
export async function GET() {
  return Response.json({ data: "paid content" });
}
```

### Cloudflare Workers

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Check for payment header
    const payment = request.headers.get("X-PAYMENT");
    if (!payment) {
      return new Response(JSON.stringify({
        paymentRequired: true,
        price: "$0.001",
        network: "base",
        payTo: env.WALLET_ADDRESS,
        facilitator: "https://x402.org/facilitator",
      }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify payment with facilitator
    const verification = await fetch("https://x402.org/facilitator/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment, price: "$0.001", network: "base", payTo: env.WALLET_ADDRESS }),
    });

    if (!verification.ok) {
      return new Response("Payment invalid", { status: 402 });
    }

    return new Response(JSON.stringify({ data: "paid content" }));
  },
};
```

### FastAPI (Python)

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import httpx

app = FastAPI()
WALLET = "0xYOUR_WALLET_ADDRESS"
FACILITATOR = "https://x402.org/facilitator"

@app.middleware("http")
async def x402_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        payment = request.headers.get("X-PAYMENT")
        if not payment:
            return JSONResponse(status_code=402, content={
                "paymentRequired": True,
                "price": "$0.001",
                "network": "base",
                "payTo": WALLET,
                "facilitator": FACILITATOR,
            })
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{FACILITATOR}/verify", json={
                "payment": payment, "price": "$0.001",
                "network": "base", "payTo": WALLET,
            })
            if resp.status_code != 200:
                return JSONResponse(status_code=402, content={"error": "Payment invalid"})
    return await call_next(request)

@app.get("/api/resource")
async def resource():
    return {"data": "paid content"}
```

---

## Pricing Strategy

| Category | Price Range | Examples |
|----------|-------------|---------|
| **Micro-data** | $0.0001–$0.001 | Lookups, simple queries, static data |
| **Per-call AI** | $0.005–$0.05 | LLM completions, image analysis, embeddings |
| **Heavy compute** | $0.05–$1.00+ | Video processing, large model inference, batch jobs |

**Guidelines:**

- Price at or slightly above your cost basis — x402 enables volume
- For AI wrappers: your margin on top of upstream API cost
- Start low, raise later — it's easier than lowering
- Use `config.description` to explain what the caller gets for the price

---

## Bazaar Registration

Bazaar is the discovery layer built into the x402 facilitator. It automatically catalogs your endpoints — no manual registration API exists.

### How It Works

1. **Install the Bazaar extension**: `npm install @x402/extensions`
2. **Register it on your resource server**:

```typescript
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

// Register extension on your x402 resource server
server.registerExtension(bazaarResourceServerExtension);
```

3. **Add discovery metadata to your route configs**:

```typescript
const paymentConfig = {
  "GET /api/resource": {
    accepts: [{
      scheme: "exact",
      price: "$0.001",
      network: "eip155:8453",  // Base mainnet
      payTo: "0xYOUR_WALLET",
    }],
    description: "Returns resource data",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
        output: {
          example: { data: "sample response" },
          schema: { type: "object", properties: { data: { type: "string" } } },
        },
      }),
    },
  },
};
```

4. **The facilitator automatically catalogs** your endpoint metadata when it processes payments.

### Querying the Bazaar (Buyer Side)

Agents and developers discover APIs via the facilitator's discovery endpoint:

```bash
curl https://x402.org/facilitator/discovery/resources?type=http&limit=20&offset=0
```

Returns:
```json
{
  "items": [{
    "resource": "https://yourapi.com/api/resource",
    "type": "http",
    "x402Version": 2,
    "accepts": [{ "scheme": "exact", "price": "$0.001", "network": "eip155:8453" }],
    "metadata": { "output": { "example": { "data": "..." } } },
    "lastUpdated": "2026-01-15T..."
  }]
}
```

### Tips

- Include `declareDiscoveryExtension()` on every paid endpoint with input/output schemas
- Use descriptive `description` and `mimeType` fields — these power Bazaar search
- Your endpoint appears in Bazaar after the facilitator first processes a payment for it
- Provide example responses in metadata so buyers can evaluate before paying

---

## Testing Checklist

- [ ] **402 Response** — Unauthenticated request returns `402` with payment instructions
- [ ] **Payment fields** — Response includes `price`, `network`, `payTo`, `facilitator`
- [ ] **Valid payment accepted** — Request with valid `X-PAYMENT` header returns 200
- [ ] **Invalid payment rejected** — Bad/expired payment returns 402
- [ ] **Facilitator reachable** — Your app can reach `https://x402.org/facilitator`
- [ ] **CORS headers** — Browser clients can read 402 response (if applicable)
- [ ] **Bazaar discovery** — Endpoint appears in Bazaar search after registration
- [ ] **Price accuracy** — Verify the charged amount matches your config
- [ ] **Error handling** — Facilitator downtime doesn't crash your app

### Quick Smoke Test

```bash
# Should return 402
curl -i https://yourapi.com/api/resource

# Pay and retry (using @x402/fetch)
npx x402-fetch https://yourapi.com/api/resource
```

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| **Wrong facilitator URL** | Use `https://x402.org/facilitator` — no trailing slash |
| **Missing CORS** | Add CORS headers so browser-based clients can read 402 responses |
| **Price too high** | Start with micro-payments ($0.001); adjust based on usage |
| **Price too low** | Don't go below cost basis — you'll lose money at scale |
| **No rate limiting** | Even paid APIs need rate limits to prevent abuse/bugs draining resources |
| **Wallet not on Base** | x402 uses USDC on Base network — verify your wallet receives on Base |
| **No error handling** | Handle facilitator timeouts gracefully — don't block the entire request |
| **Forgetting Bazaar** | If nobody can find your API, nobody will pay for it — register on Bazaar |

---

## Skill Resources

| Directory | Contents |
|-----------|----------|
| `prompts/` | Agent prompts for each workflow step |
| `templates/` | Starter code for Express, Next.js, Workers, FastAPI |
| `scripts/` | Scaffolding, testing, and deployment scripts |
| `docs/` | x402 protocol spec, Bazaar API docs, pricing guides |

---

*Clawr v1.0.0 — by 402claw*
