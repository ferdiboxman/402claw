# perf-check-api

x402-powered website performance, SEO, Lighthouse, and link checking API.

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /check?url=example.com` | $0.01 | Response time, SSL, DNS, security headers |
| `GET /lighthouse?url=example.com` | $0.03 | Core Web Vitals via PageSpeed Insights |
| `GET /seo?url=example.com` | $0.02 | SEO audit with scored report |
| `GET /links?url=example.com` | $0.02 | Broken link detection |
| `GET /health` | Free | Health check |

## Quick Start

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
npm start
# or: docker build -t perf-check-api . && docker run -p 3100:3100 perf-check-api
```

## Config

Copy `.env.example` to `.env` and adjust as needed. All values have sensible defaults.
