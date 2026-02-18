# AI Model Pricing API

Real-time LLM model pricing data, payable via x402 micropayments on Base (USDC).

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /` | Free | API info and endpoint listing |
| `GET /models` | $0.001 | List all 26+ models with pricing |
| `GET /models/:name` | $0.001 | Detailed model info |
| `GET /compare?models=gpt-4o,claude-sonnet-4` | $0.005 | Compare models side-by-side |
| `GET /recommend?task=coding&budget=0.01` | $0.01 | Smart model recommendations |

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

## Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template)

```bash
railway up
```

Set environment variables in Railway dashboard:
- `PAY_TO` — Your wallet address
- `NETWORK` — `eip155:84532` (Base Sepolia testnet; switch to `eip155:8453` when x402 facilitator supports mainnet)
- `FACILITATOR_URL` — `https://x402.org/facilitator`

## Query Parameters

### /models
- `provider` — Filter by provider (OpenAI, Anthropic, Google, etc.)
- `tag` — Filter by tag (coding, vision, cheap, fast, reasoning, etc.)
- `sort` — Sort by field (input_price_per_1m, output_price_per_1m, context_window)
- `order` — `asc` or `desc`

### /recommend
- `task` — coding, reasoning, general, cheap, vision, fast, rag, math, agentic
- `budget` — Max $ per 1K output tokens
- `vision` — Require vision support (true/false)
- `tools` — Require tool use support (true/false)

## Payment

Uses x402 protocol. Agents pay per-call in USDC on Base.
Discoverable via Bazaar extension for autonomous agent discovery.

## Data

26 models from: OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, xAI, Alibaba, Cohere, Amazon.
