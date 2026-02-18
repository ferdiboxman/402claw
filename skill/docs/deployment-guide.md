# Deployment Guide

Deploy your x402 API anywhere that runs HTTP servers.

---

## Vercel (Next.js)

Best for Next.js API routes.

```bash
cd your-project
npm i -g vercel
vercel login
vercel --prod
```

**Environment variables** (set in Vercel dashboard or CLI):
```bash
vercel env add WALLET       # Your 0x address
```

**Notes:**
- Serverless — scales automatically
- Free tier covers most x402 APIs
- Custom domain via Vercel dashboard

---

## Railway (Express)

Best for Express/Node.js.

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

**Environment variables:**
```bash
railway variables set WALLET=0x...
```

**Notes:**
- Always-on process (not serverless)
- $5/mo hobby plan, usage-based after
- Auto-deploy from GitHub

---

## Render (Express)

Alternative to Railway.

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect repo, set:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Env:** `WALLET=0x...`

---

## Cloudflare Workers

Best for edge deployment, lowest latency.

```bash
npm i -g wrangler
wrangler login
wrangler init
wrangler deploy
```

**Environment variables:**
```bash
wrangler secret put WALLET
```

**Notes:**
- Runs at the edge (300+ locations)
- 100k free requests/day
- No cold starts

---

## Fly.io (FastAPI)

Best for Python APIs.

```bash
pip install flyctl
fly auth login
fly launch    # Generates Dockerfile + fly.toml
fly deploy
```

**Environment variables:**
```bash
fly secrets set WALLET=0x...
fly secrets set OPENAI_API_KEY=sk-...  # If using AI
```

**Notes:**
- Docker-based, runs anywhere Fly supports
- Free tier: 3 shared VMs
- Global deployment with `fly regions add`

---

## Docker (Anywhere)

Works on any VPS, cloud VM, or container platform.

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t my-x402-api .
docker run -p 3000:3000 -e WALLET=0x... my-x402-api
```

**Platforms:** DigitalOcean, AWS ECS, Google Cloud Run, Azure Container Apps, Hetzner, etc.

---

## Post-Deploy Checklist

1. **Validate:** `npx clawr validate https://your-domain.com/api/endpoint`
2. **Test payment:** `npx clawr test https://your-domain.com/api/endpoint`
3. **Verify Bazaar discovery:** `./scripts/register-bazaar.sh https://your-domain.com/api/endpoint`
4. **Monitor:** Check your wallet for incoming USDC
