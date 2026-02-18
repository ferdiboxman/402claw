# 402claw Launch Tasks

Created: 2025-02-17
Goal: Get clawr to launchable state

## Workstreams

### 1. Frontend → Vercel [AGENT: frontend-deploy]
- [ ] Check Vercel project exists or create
- [ ] Configure environment variables
- [ ] Deploy frontend to production
- [ ] Verify all pages work
- [ ] Custom domain (clawr.ai if available, else vercel subdomain)

### 2. CLI → npm [AGENT: cli-publish]
- [ ] Review package.json, set proper name (@clawr/cli or clawr)
- [ ] Add shebang, bin entry
- [ ] Test local install works
- [ ] Publish to npm
- [ ] Verify `npx clawr --help` works

### 3. Cloudflare Setup [AGENT: cloudflare-setup]
- [ ] Create/verify Cloudflare account access
- [ ] Set up Workers for Platforms dispatch namespace
- [ ] Create KV namespaces (usage, rate-limiting)
- [ ] Deploy dispatcher worker
- [ ] Test routing works

### 4. Demo Endpoint [AGENT: demo-endpoint]
- [ ] Pick interesting demo data (crypto prices, AI models list, etc.)
- [ ] Deploy as first tenant via CLI
- [ ] Configure x402 pricing
- [ ] Test payment flow with awal
- [ ] Document the demo endpoint

### 5. Documentation [AGENT: docs-writer]
- [ ] Quick start guide
- [ ] CLI reference
- [ ] Pricing explanation
- [ ] API format docs
- [ ] Deploy to /docs or separate docs site

## Status

| Workstream | Agent | Status |
|------------|-------|--------|
| Frontend | frontend-deploy | 🟡 Spawning |
| CLI | cli-publish | 🟡 Spawning |
| Cloudflare | cloudflare-setup | 🟡 Spawning |
| Demo | demo-endpoint | ⏸️ Waiting (needs Cloudflare) |
| Docs | docs-writer | 🟡 Spawning |

## Notes

- Demo endpoint depends on Cloudflare being ready
- CLI publish can run parallel with frontend
- Docs can start immediately (structure + content)
