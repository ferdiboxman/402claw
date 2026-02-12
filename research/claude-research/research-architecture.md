# Agent API Platform: Technical Architecture & Infrastructure Research

**Date:** February 12, 2026  
**Prepared for:** Platform Architecture Planning

---

## Executive Summary

This document analyzes hosting options, cost modeling, sandboxing strategies, and data storage solutions for building an Agent API Platform—a service where AI agents can deploy and expose APIs. The recommended MVP architecture uses **Cloudflare Workers for Platforms** as the primary compute layer, combined with **Cloudflare R2** for object storage and **Turso** or **Neon** for edge databases.

---

## 1. Hosting Options Analysis

### Overview Comparison

| Platform | Model | Min Cost | Cold Start | Global Edge | Multi-tenant Native |
|----------|-------|----------|------------|-------------|---------------------|
| **Cloudflare Workers** | V8 Isolates | $5/mo | ~0ms | ✅ 300+ PoPs | ✅ Workers for Platforms |
| **Deno Deploy** | V8 Isolates | $0 (free tier) | ~0ms | ✅ 6 regions (free), global (paid) | ❌ |
| **Vercel Functions** | Serverless | $0 (free tier) | 50-250ms | ✅ | ❌ |
| **AWS Lambda** | Containers | $0 (free tier) | 100-500ms | ⚠️ Regional | ❌ |
| **Fly.io** | Firecracker VMs | ~$2/mo | 50-150ms | ✅ 30+ regions | ❌ |
| **Railway** | Containers | $5/mo | 100-300ms | ⚠️ Limited | ❌ |

---

### Cloudflare Workers ⭐ RECOMMENDED

**Pricing:**
- **Free:** 100K requests/day, 10ms CPU time/request
- **Paid ($5/mo):** 10M requests/mo included, +$0.30/million additional
- **CPU:** 30M CPU-ms included, +$0.02/million CPU-ms
- **No egress charges**

**Workers for Platforms (Multi-tenant):** $25/mo base
- 20M requests included, +$0.30/million
- 60M CPU-ms included, +$0.02/million
- 1000 scripts included, +$0.02/script

**Pros:**
- Near-zero cold starts (V8 isolates)
- Built-in multi-tenant isolation via Workers for Platforms
- Global edge deployment (300+ locations)
- Free egress bandwidth
- Integrated KV, R2, D1, Durable Objects

**Cons:**
- Limited to JavaScript/TypeScript/WASM
- 128MB memory limit per isolate
- 30-second CPU time limit (standard requests)

**Best for:** API endpoints, lightweight transformations, edge computing

---

### Fly.io

**Pricing (per VM, billed per second):**
- **Shared CPU 1x, 256MB:** ~$2/mo
- **Shared CPU 1x, 1GB:** ~$6/mo
- **Performance 1x, 2GB:** ~$32/mo
- **Storage:** $0.15/GB/month

**Network:** $0.02/GB egress (first 100GB free)

**Pros:**
- Full container/VM flexibility
- Run any language/runtime
- Per-second billing
- Good global coverage (30+ regions)
- Firecracker-based isolation

**Cons:**
- More operational overhead
- No built-in multi-tenant features
- Cold starts for stopped machines

**Best for:** Long-running processes, non-JS workloads, full containers

---

### Railway

**Pricing:**
- **Free:** $1/mo credit (severely limited)
- **Hobby ($5/mo):** $5 usage credit included
- **Pro ($20/mo):** $20 usage credit included
- **RAM:** $10/GB/month
- **CPU:** $20/vCPU/month
- **Egress:** $0.05/GB

**Pros:**
- Excellent DX and simple deployment
- Easy database provisioning
- Git-based deployments

**Cons:**
- Higher costs at scale
- Limited regions
- No native multi-tenant support
- Container overhead

**Best for:** Quick prototypes, traditional backend services

---

### AWS Lambda

**Pricing:**
- **Free tier:** 1M requests/mo, 400K GB-seconds
- **Requests:** $0.20/million
- **Duration:** $0.0000166667/GB-second
- **Example:** 1M requests @ 200ms @ 512MB ≈ $1.67/mo

**Pros:**
- Massive scale capacity
- Rich AWS ecosystem integration
- Mature tooling

**Cons:**
- Cold starts (100-500ms)
- Complex pricing
- Vendor lock-in
- Regional (not edge by default)

**Best for:** Enterprise integration, existing AWS infrastructure

---

### Vercel Functions

**Pricing:**
- **Hobby (Free):** 100K invocations, 100GB bandwidth
- **Pro ($20/seat):** 1M invocations, 1TB bandwidth included
- **Active CPU:** Starting at $0.128/hour (Fluid compute)
- **Invocations:** Starting at $0.60/million

**Pros:**
- Excellent Next.js integration
- Simple deployment
- Good DX

**Cons:**
- Expensive at scale
- Function limits (10s timeout on hobby)
- Per-seat pricing for teams

**Best for:** Frontend-heavy apps, Next.js projects

---

### Deno Deploy

**Pricing:**
- **Free:** 1M requests/mo, 100GB bandwidth, 15h CPU time
- **Pro ($20/mo):** Higher limits, additional features
- **Enterprise:** Custom pricing

**Pros:**
- Near-zero cold starts
- Built-in Deno KV database
- TypeScript-first
- Secure by default

**Cons:**
- Smaller ecosystem than Node.js
- Limited memory (512MB free tier)
- No built-in multi-tenant features

**Best for:** TypeScript-focused projects, simple APIs

---

## 2. Cost Modeling

### Scenario Assumptions
- Average API call: 50ms CPU time, 10KB response
- Mix of simple lookups and data transformations

### Tier 1: 1K API calls/day (30K/month) — Early Stage

| Service | Compute | Storage (1GB) | Database | Total/mo |
|---------|---------|---------------|----------|----------|
| **CF Workers + R2 + D1** | ~$0 (free tier) | ~$0.02 | ~$0 (free) | **~$5** (min paid) |
| **Deno Deploy + KV** | $0 (free tier) | Included | Included | **$0** |
| **AWS Lambda + S3 + DynamoDB** | ~$0.15 | ~$0.03 | ~$0.50 | **~$0.70** |
| **Fly.io + Turso** | ~$2 | ~$0.15 | ~$0 (free) | **~$2.15** |
| **Vercel + Blob** | $0 (free tier) | Included | - | **$0** |

**Recommendation:** Deno Deploy or Cloudflare Workers free tier

---

### Tier 2: 100K API calls/day (3M/month) — Growth

| Service | Compute | Storage (10GB) | Database | Bandwidth | Total/mo |
|---------|---------|----------------|----------|-----------|----------|
| **CF Workers for Platforms** | ~$25 base | $0.15 (R2) | ~$5 (D1) | $0 | **~$30-35** |
| **Deno Deploy Pro** | $20 | Included | Included | Included | **$20** |
| **AWS Lambda + S3** | ~$3 | ~$0.25 | ~$15 (DDB) | ~$10 | **~$28** |
| **Fly.io + Postgres** | ~$15 | $1.50 | ~$15 | ~$5 | **~$36** |
| **Vercel Pro** | ~$20/seat + ~$20 | ~$5 | - | Included | **~$45+** |

**Recommendation:** Cloudflare Workers for Platforms or Deno Deploy Pro

---

### Tier 3: 10M API calls/day (300M/month) — Scale

| Service | Compute | Storage (100GB) | Database | Bandwidth | Total/mo |
|---------|---------|-----------------|----------|-----------|----------|
| **CF Workers for Platforms** | ~$125 | $1.50 (R2) | ~$25 (D1) | $0 | **~$150-175** |
| **AWS Lambda** | ~$60 | ~$2.50 | ~$200 (DDB) | ~$300 | **~$560** |
| **Fly.io** | ~$200 | $15 | ~$50 | ~$100 | **~$365** |

**Recommendation:** Cloudflare Workers for Platforms (significant cost advantage due to no egress)

---

## 3. Sandboxing and Security

### Isolation Technologies Comparison

| Technology | Provider | Isolation Level | Cold Start | Memory | Use Case |
|------------|----------|-----------------|------------|--------|----------|
| **V8 Isolates** | Cloudflare, Deno | Process-level | ~0ms | 128MB | Lightweight functions |
| **Firecracker** | Fly.io, AWS | VM-level | 50-150ms | Configurable | Full containers |
| **gVisor** | GCP Cloud Run | Kernel-level | 100-300ms | Configurable | Containers |
| **Docker/containers** | Railway, generic | Process-level | 100-500ms | Configurable | Traditional apps |

### V8 Isolates (Cloudflare Workers, Deno Deploy)

**How it works:**
- Each tenant runs in a separate V8 isolate
- Memory isolation between isolates
- Shared runtime reduces overhead
- No filesystem access by default

**Security Features:**
- Memory isolation per request
- No access to host filesystem
- Network restricted via fetch() API
- CPU time limits enforced
- Automatic resource cleanup

**Limitations:**
- JavaScript/TypeScript/WASM only
- 128MB memory per isolate
- Limited runtime APIs

**Verdict:** ✅ **Excellent for agent APIs** — fast, secure, low overhead

---

### Firecracker MicroVMs (Fly.io, AWS Lambda)

**How it works:**
- Lightweight VM per execution
- Full Linux kernel isolation
- Snapshot-based fast boot

**Security Features:**
- Hardware-level isolation
- Full kernel separation
- Network namespace isolation
- Filesystem isolation

**Limitations:**
- Higher cold start (~50-150ms)
- More resource overhead
- Complex networking setup

**Verdict:** ✅ **Good for full language support** — use if agents need Python, Rust, etc.

---

### Security Recommendations for Agent Code

1. **Network Restrictions:**
   - Allowlist outbound domains
   - Rate limit API calls
   - Block private IP ranges

2. **Resource Limits:**
   - CPU time limits (30s max)
   - Memory limits (128-512MB)
   - Request body size limits

3. **Code Validation:**
   - Static analysis before deployment
   - Banned API patterns (eval, dynamic imports)
   - Content security policies

4. **Monitoring:**
   - Request logging per tenant
   - Resource usage tracking
   - Anomaly detection

---

## 4. Data Storage Options

### Object Storage (for CSV/JSON files)

| Service | Storage | Class A Ops | Class B Ops | Egress | Free Tier |
|---------|---------|-------------|-------------|--------|-----------|
| **Cloudflare R2** | $0.015/GB | $4.50/M | $0.36/M | **FREE** | 10GB + 10M ops |
| **AWS S3** | $0.023/GB | $5/M | $0.40/M | $0.09/GB | 5GB for 12mo |
| **Backblaze B2** | $0.006/GB | $0.004/1K | Free | $0.01/GB | 10GB |

**Recommendation:** **Cloudflare R2** — Zero egress is game-changing for APIs serving data

---

### Databases

#### Turso (SQLite at the Edge) ⭐ RECOMMENDED FOR MVP

**Pricing:**
- **Free:** 100 DBs, 5GB storage, 500M rows read
- **Developer ($4.99/mo):** Unlimited DBs, 9GB, 2.5B rows read
- **Scaler ($29/mo):** 24GB, 100B rows read

**Pros:**
- Database-per-tenant model
- Edge replication
- SQLite simplicity
- Excellent for multi-tenant

**Cons:**
- SQLite limitations
- Newer platform

---

#### Neon (Serverless Postgres)

**Pricing:**
- **Free:** 0.5 GB storage, 191 compute hours
- **Launch ($19/mo):** 10GB, auto-scaling
- **Scale ($69/mo):** Higher limits, read replicas

**Pros:**
- Full Postgres compatibility
- Branching for dev/staging
- Autoscaling to zero
- Point-in-time recovery

**Cons:**
- Single region (free tier)
- More expensive than Turso

---

#### Supabase (Postgres + Auth + Realtime)

**Pricing:**
- **Free:** 500MB database, 2 projects
- **Pro ($25/mo):** 8GB database, 100K MAU
- **Team ($599/mo):** Enterprise features

**Pros:**
- All-in-one backend
- Built-in auth
- Realtime subscriptions
- REST API auto-generated

**Cons:**
- Higher cost at scale
- Heavy for simple use cases

---

#### PlanetScale (MySQL)

**Pricing:**
- **Scaler ($5/mo):** 10GB, 1B row reads
- **Team ($29/mo):** Higher limits

**Pros:**
- MySQL compatibility
- Non-blocking schema changes
- Excellent scaling

**Cons:**
- No free tier (removed in 2024)
- MySQL only

---

### Database Recommendation Matrix

| Use Case | Recommended | Reason |
|----------|-------------|--------|
| Simple key-value | Cloudflare KV / D1 | Built-in, free tier |
| Per-agent isolated DB | Turso | Database-per-tenant model |
| Complex queries | Neon | Full Postgres power |
| All-in-one backend | Supabase | Auth + DB + API |

---

## 5. Architecture Recommendations

### MVP Architecture (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent API Platform MVP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌─────────────────────────────────────┐   │
│  │   Agents     │────▶│   Cloudflare Workers for Platforms  │   │
│  │ (Deploy API) │     │   ┌─────────────────────────────┐   │   │
│  └──────────────┘     │   │  Dispatch Worker (Router)   │   │   │
│                       │   └────────────┬────────────────┘   │   │
│  ┌──────────────┐     │                │                    │   │
│  │   Users      │────▶│   ┌────────────▼────────────────┐   │   │
│  │ (Call APIs)  │     │   │    User Workers (per agent) │   │   │
│  └──────────────┘     │   │    V8 Isolate Sandboxing    │   │   │
│                       │   └────────────┬────────────────┘   │   │
│                       └────────────────┼────────────────────┘   │
│                                        │                        │
│            ┌───────────────────────────┼───────────────────┐    │
│            │                           │                   │    │
│     ┌──────▼──────┐             ┌──────▼──────┐     ┌──────▼──┐ │
│     │ Cloudflare  │             │   Turso     │     │   D1    │ │
│     │     R2      │             │  (per-agent │     │ (config)│ │
│     │  (files)    │             │   database) │     │         │ │
│     └─────────────┘             └─────────────┘     └─────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
1. **Dispatch Worker:** Routes requests to correct agent worker
2. **User Workers:** One per agent, sandboxed V8 isolate
3. **R2:** Store agent-uploaded files (CSV, JSON)
4. **Turso:** Per-agent SQLite database
5. **D1:** Platform configuration, agent metadata

**Estimated Cost (Growth Phase):**
- Workers for Platforms: $25-50/mo
- R2 Storage (50GB): $0.75/mo
- Turso Developer: $4.99/mo
- **Total: ~$35-60/mo** for 3M requests/month

---

### Scaling Architecture (Phase 2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Agent API Platform - Scaled                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐                                                      │
│  │  CDN / Cache   │◀─── Static assets, cached responses                  │
│  └───────┬────────┘                                                      │
│          │                                                               │
│  ┌───────▼────────┐     ┌──────────────────────────────────────────┐    │
│  │    Gateway     │────▶│   Workers for Platforms (Edge Compute)   │    │
│  │ (Rate Limit,   │     │   ┌────────────────────────────────────┐ │    │
│  │  Auth, Meter)  │     │   │  Agent Workers (1000s of scripts)  │ │    │
│  └────────────────┘     │   └────────────────────────────────────┘ │    │
│                         └──────────────┬───────────────────────────┘    │
│                                        │                                │
│     ┌──────────────────────────────────┼──────────────────────────┐     │
│     │                                  │                          │     │
│     ▼                                  ▼                          ▼     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │    R2    │    │  Turso   │    │   Neon   │    │   Queues/Kafka   │  │
│  │(Hot Data)│    │  (Edge)  │    │(Complex) │    │   (Async Jobs)   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Observability Layer                             │  │
│  │  • Cloudflare Analytics  • Custom Metrics  • Error Tracking       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### What to Defer

| Feature | MVP | Defer Until |
|---------|-----|-------------|
| Basic API hosting | ✅ | - |
| File upload (CSV/JSON) | ✅ | - |
| Simple KV storage | ✅ | - |
| Per-agent database | ✅ | - |
| Custom domains | ❌ | Scale |
| Complex database queries | ❌ | Growth |
| Async job queues | ❌ | Scale |
| Multiple regions | ❌ | Scale |
| Advanced analytics | ❌ | Scale |
| WebSocket support | ❌ | Scale |

---

### Scaling Bottlenecks

1. **V8 Isolate Memory (128MB)**
   - Solution: Split large workloads across requests
   - Consider Fly.io for memory-heavy agents

2. **CPU Time Limits (30s)**
   - Solution: Break into smaller operations
   - Use queues for long-running tasks

3. **Turso Per-Agent Databases**
   - At 10K+ agents, monthly active DB charges add up
   - Solution: Tiered pricing, shared databases for free tier

4. **R2 Class A Operations**
   - Heavy write patterns get expensive ($4.50/M)
   - Solution: Batch writes, use KV for hot data

5. **Workers for Platforms Script Limit**
   - 1000 scripts included, $0.02/additional
   - At 50K agents = ~$1000/mo just for scripts
   - Solution: Enterprise negotiation, script pooling

---

## 6. Final Recommendations

### For MVP Launch

| Layer | Choice | Reason |
|-------|--------|--------|
| **Compute** | Cloudflare Workers for Platforms | Native multi-tenant, zero cold start |
| **File Storage** | Cloudflare R2 | Zero egress, cheap storage |
| **Agent Database** | Turso (SQLite) | Database-per-tenant, edge replicated |
| **Platform Database** | Cloudflare D1 | Integrated, free tier |
| **Auth** | Cloudflare Access or custom | Built-in option |

### Total MVP Cost Estimate

| Stage | Requests/mo | Agents | Est. Cost |
|-------|-------------|--------|-----------|
| Launch | 100K | 10 | ~$25-30/mo |
| Early Growth | 1M | 100 | ~$35-50/mo |
| Growth | 10M | 1000 | ~$100-150/mo |
| Scale | 100M | 10000 | ~$400-600/mo |

### Alternative Path: Full Flexibility

If agents need to run Python, Rust, or other languages:
- Use **Fly.io** with Firecracker VMs
- Higher cold starts (~100ms) but full language support
- Est. cost: 2-3x higher than Workers approach

---

## Appendix: Quick Reference Pricing

### Cloudflare Workers (Standard)
- $5/mo base
- 10M requests included
- $0.30/million additional
- 30M CPU-ms included
- $0.02/million CPU-ms additional

### Cloudflare Workers for Platforms
- $25/mo base
- 20M requests included
- 60M CPU-ms included
- 1000 scripts included
- $0.02/additional script

### Cloudflare R2
- $0.015/GB storage
- $4.50/million Class A (writes)
- $0.36/million Class B (reads)
- **Zero egress**

### Turso
- Free: 100 DBs, 5GB, 500M reads
- Developer ($4.99/mo): Unlimited DBs, 9GB
- Scaler ($29/mo): 24GB, 100B reads

### Neon
- Free: 0.5GB, 191 compute hours
- Launch ($19/mo): 10GB, auto-scaling
- Scale ($69/mo): Read replicas, more storage
