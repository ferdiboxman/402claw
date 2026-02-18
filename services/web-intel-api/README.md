# 🧠 Web Intel API

Extract structured intelligence from any URL. Pay-per-call via [x402](https://x402.org).

## Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/extract` | POST | $0.01 | Structured data extraction (title, content, links, images, OG, JSON-LD) |
| `/summarize` | POST | $0.02 | Page summary with key points, entities, sentiment |
| `/compare` | POST | $0.03 | Compare two pages: similarities, differences, recommendation |
| `/health` | GET | free | Health check |

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Usage

```bash
# Extract
curl -X POST http://localhost:3002/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Summarize
curl -X POST http://localhost:3002/summarize \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxLength": 300}'

# Compare
curl -X POST http://localhost:3002/compare \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com", "https://example.org"]}'
```

## Deploy

```bash
# Docker
docker build -t web-intel-api .
docker run -p 3002:3002 web-intel-api

# Railway
railway up
```

## Config

| Env | Default | Description |
|-----|---------|-------------|
| `PORT` | 3002 | Server port |
| `PAY_TO` | `0x5C78...D0F` | Payment recipient address |
| `NETWORK` | `eip155:8453` | Base mainnet |
| `FACILITATOR_URL` | `https://facilitator.x402.org` | x402 facilitator |
