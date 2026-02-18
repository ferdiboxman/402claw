# Quickstart — 5 Minutes to Your First Paid API

## 1. Scaffold

```bash
npx clawr scaffold
```

Choose your stack (Express, Next.js, Cloudflare Workers, or FastAPI) and enter your wallet address.

## 2. Configure Wallet

You need a wallet that can receive USDC on Base:

- **Coinbase Wallet** — easiest, built-in Base support
- **MetaMask** — add Base network (Chain ID 8453)
- **Any EVM wallet** — just need the 0x address

Copy your address. The scaffold step already embedded it in your code.

## 3. Deploy

```bash
# Express → Railway
railway up

# Next.js → Vercel
vercel --prod

# Cloudflare Workers
wrangler deploy

# FastAPI → Fly.io
fly launch && fly deploy
```

See [Deployment Guide](./deployment-guide.md) for detailed instructions.

## 4. Enable Bazaar Discovery

Bazaar registration is automatic. Add the Bazaar extension to your x402 server:

```bash
npm install @x402/extensions
```

```typescript
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
server.registerExtension(bazaarResourceServerExtension);
// Add declareDiscoveryExtension() to your route configs
```

The facilitator catalogs your endpoint after processing the first payment. Buyers find you via `GET https://x402.org/facilitator/discovery/resources`.

## 5. Start Earning

Your API is live. When someone calls it:

1. They get a `402` response with your price
2. Their client pays USDC to your wallet on Base
3. They retry with the payment proof
4. Your API serves the response
5. USDC lands in your wallet

**Validate your endpoint:**

```bash
npx clawr validate https://your-domain.com/api/endpoint
```

**Test a paid call:**

```bash
npx clawr test https://your-domain.com/api/endpoint
```

---

That's it. You're selling API access for crypto. 🐾
