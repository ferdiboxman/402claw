# Choose Stack

Help the user pick the right deployment stack for their x402 API. The choice affects development speed, scaling, and cost.

## Step 1: Gather Context

Ask:
- **What language are you most comfortable with?** (JavaScript/TypeScript, Python, other)
- **Do you have existing infrastructure?** (Next.js app, Express server, Cloudflare account, etc.)
- **What's the compute profile?** (lightweight lookups, heavy ML inference, file processing)
- **Scaling needs?** (hobby project vs production service)

## Step 2: Present Options

### Express.js (Node.js)
**Best for:** Full control, custom middleware, complex APIs, WebSocket support

- ✅ Maximum flexibility
- ✅ Rich middleware ecosystem
- ✅ Easy to add x402 middleware (`@coinbase/x402-express`)
- ✅ Deploy anywhere (VPS, Docker, Railway, Fly.io)
- ⚠️ You manage the server
- ⚠️ Need to handle scaling yourself

**Choose when:** You want full control, have complex business logic, or need WebSockets/streaming.

### Next.js (API Routes)
**Best for:** Adding paid endpoints to an existing Next.js app

- ✅ Already have a Next.js app? Just add routes
- ✅ Vercel deployment is trivial
- ✅ x402 middleware for Next.js available (`@coinbase/x402-next`)
- ✅ Serverless scaling on Vercel
- ⚠️ Cold starts on serverless
- ⚠️ 10s/60s execution limits on Vercel (plan-dependent)

**Choose when:** You already run Next.js and want to monetize specific routes.

### Cloudflare Workers
**Best for:** Edge deployment, low latency globally, serverless

- ✅ Sub-millisecond cold starts
- ✅ Global edge network
- ✅ Generous free tier
- ✅ Workers-specific x402 integration
- ⚠️ Limited runtime (no Node.js APIs, Workers runtime)
- ⚠️ 10ms/50ms CPU time limits (free/paid)
- ⚠️ No native file system

**Choose when:** You need global low latency, simple request/response APIs, or are already in the Cloudflare ecosystem.

### FastAPI (Python)
**Best for:** ML models, data science, Python-native workflows

- ✅ Python ecosystem (numpy, pandas, torch, etc.)
- ✅ Auto-generated OpenAPI docs
- ✅ Async support
- ✅ x402 middleware for FastAPI available
- ⚠️ Slightly more deployment friction than Node options
- ⚠️ Need ASGI server (uvicorn) in production

**Choose when:** Your API wraps a Python model/library, or you're a Python developer.

## Step 3: Decision Matrix

Walk through this with the user:

| Factor | Express | Next.js | CF Workers | FastAPI |
|--------|---------|---------|------------|---------|
| JS/TS preferred | ✅ | ✅ | ✅ | ❌ |
| Python preferred | ❌ | ❌ | ❌ | ✅ |
| Existing Next.js app | ➖ | ✅✅ | ➖ | ➖ |
| Need edge/global | ➖ | ➖ | ✅✅ | ➖ |
| ML/AI inference | ✅ | ⚠️ | ❌ | ✅✅ |
| Simple data API | ✅ | ✅ | ✅✅ | ✅ |
| Long-running tasks | ✅✅ | ⚠️ | ❌ | ✅ |
| Easiest deploy | ➖ | ✅✅ | ✅ | ➖ |
| Full control | ✅✅ | ➖ | ➖ | ✅ |

## Step 4: Confirm and Proceed

Summarize the recommendation:

```
Recommended stack: [Stack]
Reason: [1-2 sentences]
Deploy target: [Where it'll run]
x402 package: [Which integration to use]
```

Then hand off to implementation with the chosen stack.
