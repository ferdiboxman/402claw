# Bazaar Guide

Everything about listing your API on the Bazaar discovery layer.

---

## What is Bazaar?

Bazaar is the discovery layer built into the x402 facilitator. It automatically catalogs x402 endpoints so that:

- **Sellers** have their paid APIs discovered automatically
- **Buyers** find APIs via the facilitator's discovery endpoint
- **Agents** (AI, scripts) query Bazaar to find APIs they need

There is **no separate registration API**. Bazaar works as an extension on your x402 resource server.

---

## How to Register

### Step 1: Install the extension

```bash
npm install @x402/extensions
```

### Step 2: Register on your resource server

```typescript
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

// Add to your x402 resource server setup
server.registerExtension(bazaarResourceServerExtension);
```

### Step 3: Add discovery metadata to routes

```typescript
const paymentConfig = {
  "GET /api/endpoint": {
    accepts: [{
      scheme: "exact",
      price: "$0.001",
      network: "eip155:8453",
      payTo: "0xYOUR_WALLET",
    }],
    description: "What my API does",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
        output: {
          example: { result: "sample data" },
          schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
        },
      }),
    },
  },
};
```

### Step 4: Deploy and make a payment

The facilitator automatically catalogs your endpoint metadata when it processes the first payment. After that, your endpoint appears in Bazaar discovery.

---

## Discovering APIs (Buyer Side)

Query the facilitator's discovery endpoint:

```bash
curl "https://x402.org/facilitator/discovery/resources?type=http&limit=20&offset=0"
```

Response:

```json
{
  "items": [
    {
      "resource": "https://your-domain.com/api/endpoint",
      "type": "http",
      "x402Version": 2,
      "accepts": [{ "scheme": "exact", "price": "$0.001", "network": "eip155:8453" }],
      "metadata": { "output": { "example": { "result": "..." } } },
      "lastUpdated": "2026-01-15T12:00:00Z"
    }
  ]
}
```

---

## Optimizing Your Listing

**Description:** What does it return? Who is it for? Keep it under 200 chars.

**Schema metadata:** Include both `input` and `output` in `declareDiscoveryExtension()` so buyers can evaluate your API without paying first.

**Category tags:** Use descriptive `description` fields — these power search.

**Pricing:** Include human-readable pricing in the description (e.g., "$0.01/request").

---

## Monitoring Performance

Check your wallet for incoming USDC transactions on Base:

- [Basescan](https://basescan.org/address/YOUR_WALLET) — transaction history
- Wallet app — balance and notifications

---

## Tips

- **Good endpoint URLs** are stable — don't change them after going live
- **Add output schemas** — richer metadata means better discoverability
- **Price competitively** — check similar listings via the discovery endpoint
- **Respond fast** — slow APIs lose customers regardless of price
- **Include examples** — example responses in metadata help buyers evaluate your API
