# 🦞 Clawr Launch Plan

## Research Findings

### 1. Bazaar Registration — How It Actually Works

**Key insight:** Bazaar registration is NOT a separate API call. It's **automatic** when you:
1. Use the CDP facilitator (`https://www.x402.org/facilitator`)
2. Enable the `bazaar` extension in your route config
3. The facilitator extracts and catalogs your metadata automatically

**The Flow (v2 — current):**
1. Install `@x402/extensions` package
2. Import `bazaarResourceServerExtension` and `declareDiscoveryExtension`
3. Register the extension on your `x402ResourceServer`
4. Add `extensions: { ...declareDiscoveryExtension({...}) }` to each route config
5. The facilitator does the rest — no manual POST to any registry

**Discovery endpoint for buyers:**
```
GET https://www.x402.org/facilitator/discovery/resources?type=http&limit=20
```
Or via the CDP API:
```
GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources
```

**What metadata is needed per route:**
- `output.example` — example response JSON
- `output.schema` — JSON Schema of the response
- `input` — example query params or body (optional)
- `inputSchema` — JSON Schema of input (optional)
- `bodyType` — "json" for POST endpoints

**Our SKILL.md had a fake `curl POST bazaar.x402.org/api/register` — that doesn't exist.** The real flow is extension-based. The SKILL.md needs updating.

### 2. What Our Demo Endpoint Needs

**Current state:** `clawr-dispatcher.ferdiboxman.workers.dev` is a minimal Cloudflare Worker (health check only).

**To make it Bazaar-compatible, we need to:**

Option A: **Use the x402 v2 SDK (recommended)**
- Rewrite the worker using `@x402/core/server` + `@x402/extensions/bazaar`
- This requires Node.js compat in the Worker (or use Hono adapter)
- Register `bazaarResourceServerExtension` + `declareDiscoveryExtension()`

Option B: **Manual x402 middleware (current approach)**
- Return proper 402 responses with `PAYMENT-REQUIRED` header
- Include bazaar extension data in the payment requirements
- Verify payments via facilitator

**Recommended: Option A with `@x402/hono`** (Hono works great in Workers)

```typescript
// Cloudflare Worker with Hono + x402
import { Hono } from "hono";
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";

const app = new Hono();

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://www.x402.org/facilitator",
});

const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server);
server.registerExtension(bazaarResourceServerExtension);

app.use("/v1/records", paymentMiddleware(
  {
    "GET /v1/records": {
      accepts: {
        scheme: "exact",
        price: "$0.001",
        network: "eip155:8453",  // Base mainnet
        payTo: "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
      },
      extensions: {
        ...declareDiscoveryExtension({
          output: {
            example: {
              records: [
                { id: 1, name: "Demo Record", value: 42, timestamp: "2026-02-18T00:00:00Z" }
              ],
              total: 1,
            },
            schema: {
              properties: {
                records: { type: "array", items: { type: "object" } },
                total: { type: "number" },
              },
              required: ["records", "total"],
            },
          },
        }),
      },
    },
  },
  server,
));

app.get("/v1/records", (c) => {
  return c.json({
    records: [
      { id: 1, name: "Demo Record", value: 42, timestamp: new Date().toISOString() }
    ],
    total: 1,
  });
});

export default app;
```

### 3. Skills.sh Publishing

**How skills.sh works:**
- Skills are hosted in **GitHub repos** — skills.sh is just a discovery directory
- A skill = a repo with a `SKILL.md` file (YAML frontmatter + instructions)
- Users install via: `npx skills add <owner/repo>`
- The leaderboard auto-populates from anonymous install telemetry
- **No manual submission needed** — it appears when people install it

**To publish Clawr:**
1. Push the repo to `github.com/402claw/clawr` (or wherever)
2. Ensure `skill/SKILL.md` is at the expected path
3. Users install: `npx skills add 402claw/clawr`
4. It auto-appears on skills.sh leaderboard once installs happen

**Scaffold with:** `npx skills init` creates a template SKILL.md

**Playbooks.com:**
- Similar directory, also GitHub-backed
- Submit via login with GitHub on the site
- Skills listed with configs for Claude Code, Cursor, Cline, etc.

### 4. awal

**Status: `github.com/coinbase/awal` returns 404.**

awal either doesn't exist yet, is private, or was renamed. No npm package found either.

**Alternative for testing x402 endpoints:**
```bash
# Using @x402/fetch directly
npx tsx -e "
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const client = new x402Client();
registerExactEvmScheme(client, { signer });
const f = wrapFetchWithPayment(fetch, client);
const r = await f('https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records');
console.log(await r.json());
"
```

**Or create our own test script:** `scripts/test-endpoint.ts` (see below)

---

## Launch Checklist

### Pre-Launch
- [ ] **GitHub repo clean** — `github.com/402claw/clawr` public, README polished
- [ ] **SKILL.md updated** — Fix Bazaar section (remove fake curl, add real extension flow)
- [ ] **Demo endpoint upgraded** — Cloudflare Worker uses x402 v2 SDK + Bazaar extension
- [ ] **Demo endpoint returns proper 402** — Unauthenticated requests get payment requirements
- [ ] **Demo endpoint on Bazaar** — Shows up in `/discovery/resources` after facilitator processes it

### Skill Verification
- [ ] **`npx skills add 402claw/clawr`** works in Claude Code
- [ ] **`npx skills add 402claw/clawr`** works in Cursor
- [ ] **`npx skills add 402claw/clawr`** works in OpenClaw
- [ ] Skill correctly teaches agent to scaffold x402 APIs
- [ ] Templates in `skill/templates/` are functional

### Testing
- [ ] Demo endpoint smoke test: `curl -i https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records` returns 402
- [ ] Paid request with x402 client returns 200 + data
- [ ] Bazaar discovery shows our endpoint
- [ ] End-to-end: agent installs skill → creates new x402 API → deploys → registers

### Content
- [ ] README.md final review
- [ ] Blog post ready (`docs/blog-skill-era.md`)
- [ ] Tweet thread drafted (below)
- [ ] Demo GIF/video recorded

### Distribution
- [ ] Skill published to skills.sh (auto via installs)
- [ ] Skill submitted to playbooks.com
- [ ] GitHub repo tagged v1.0.0
- [ ] Link shared in x402 Discord

---

## Code Changes Needed

### 1. Update SKILL.md Bazaar Section

Replace the fake `curl POST bazaar.x402.org/api/register` with the real extension-based flow:

```markdown
### Bazaar Registration

Bazaar discovery is automatic when using the x402 v2 SDK:

1. Install: `npm install @x402/extensions`
2. Register the bazaar extension on your resource server
3. Add `declareDiscoveryExtension()` to your route config
4. The facilitator catalogs your endpoint automatically

See the x402 docs: https://docs.cdp.coinbase.com/x402/bazaar
```

### 2. Upgrade Cloudflare Worker

Replace `cloudflare/clawr-worker.js` with the Hono + x402 v2 implementation above.

**Dependencies to add:**
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@x402/core": "latest",
    "@x402/hono": "latest",
    "@x402/evm": "latest",
    "@x402/extensions": "latest"
  }
}
```

### 3. Create Test Script

```typescript
// scripts/test-endpoint.ts
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const ENDPOINT = process.argv[2] || "https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records";

// Step 1: Test 402 response
console.log("🔍 Testing 402 response...");
const raw = await fetch(ENDPOINT);
console.log(`  Status: ${raw.status}`);
if (raw.status === 402) {
  console.log("  ✅ Returns 402 Payment Required");
  const paymentReq = raw.headers.get("PAYMENT-REQUIRED");
  if (paymentReq) console.log("  ✅ Has PAYMENT-REQUIRED header");
}

// Step 2: Test paid request
if (process.env.EVM_PRIVATE_KEY) {
  console.log("\n💰 Testing paid request...");
  const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  const paidFetch = wrapFetchWithPayment(fetch, client);
  const paid = await paidFetch(ENDPOINT);
  console.log(`  Status: ${paid.status}`);
  if (paid.ok) {
    console.log("  ✅ Paid request succeeded");
    console.log("  Response:", await paid.json());
  }
} else {
  console.log("\n⚠️  Set EVM_PRIVATE_KEY to test paid requests");
}
```

---

## Tweet Thread (Draft)

**Thread for @ferdiboxman to post:**

---

**1/6** 🦞 Introducing Clawr — the agent skill that turns any idea into a paid API.

Tell your AI agent: "Create a paid API for [X]"
It scaffolds, deploys, and starts earning USDC. All via x402.

```
npx skills add 402claw/clawr
```

---

**2/6** How it works:

You → "I want a paid API for sentiment analysis"

Your agent →
✅ Picks the right stack
✅ Sets up x402 payment middleware
✅ Deploys to the cloud
✅ Registers on Bazaar for discovery
✅ Earning USDC on every request

One conversation. That's it.

---

**3/6** Built on @coinbase's x402 protocol — the HTTP 402 Payment Required standard.

No API keys. No accounts. No Stripe integration.

Just: request → pay → get data.

Every endpoint earns USDC on Base. Instant settlement.

---

**4/6** Works with the agents you already use:

• Claude Code
• Cursor
• OpenClaw
• Codex CLI
• Windsurf
• 30+ more

Install once, use everywhere:
```
npx skills add 402claw/clawr
```

---

**5/6** Bazaar makes your API discoverable.

Other agents can find and pay for your endpoints automatically. No marketplace listing. No approval process.

Deploy → discoverable → earning.

The API economy just became autonomous.

---

**6/6** Try it now:

🔗 GitHub: github.com/402claw/clawr
🔗 Skills: skills.sh/402claw/clawr
🔗 x402: x402.org

Built by @ferdiboxman 🦞

The skill era is here. Your agents can now create businesses.

---

## Priority Actions for Tomorrow

1. **Fix the SKILL.md** — Remove fake Bazaar registration curl, add real extension-based flow
2. **Upgrade the Worker** — Implement Hono + x402 v2 with Bazaar extension
3. **Test the full flow** — Install skill → create API → verify 402 → verify Bazaar listing
4. **Push to GitHub** — Clean repo, tag v1.0.0
5. **Post the thread** — After confirming everything works end-to-end
6. **Share in x402 Discord** — Get early visibility

## Key URLs

| What | URL |
|------|-----|
| x402 Bazaar docs | https://docs.cdp.coinbase.com/x402/bazaar |
| Facilitator | https://www.x402.org/facilitator |
| Discovery endpoint | https://www.x402.org/facilitator/discovery/resources |
| CDP Discovery API | https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources |
| Skills CLI | https://github.com/vercel-labs/skills |
| skills.sh | https://skills.sh |
| playbooks.com | https://playbooks.com |
| Our demo endpoint | https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records |
| Our wallet | 0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F |
