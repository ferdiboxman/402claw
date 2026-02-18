# Demo Endpoint: AI Model Pricing API

## Overview

A paid API endpoint showcasing x402 micropayments. Returns current pricing data for popular AI models including GPT-4o, Claude, Gemini, DeepSeek, and more.

## Endpoint

```
GET https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records
```

## Pricing

- **Price per request:** $0.01 USD
- **Payment:** USDC on Base (x402 protocol)
- **Network:** eip155:84532 (Base Sepolia testnet)

## Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Company name (Anthropic, OpenAI, Google, etc.) |
| `model` | string | Model identifier |
| `input_per_1m` | number | Cost per 1M input tokens (USD) |
| `output_per_1m` | number | Cost per 1M output tokens (USD) |
| `context_window` | number | Maximum context length in tokens |
| `max_output` | number | Maximum output tokens |
| `features` | array | List of capabilities |
| `updated` | string | Last update date (YYYY-MM-DD) |

## Models Included

- **Anthropic:** Claude Opus 4, Claude Sonnet 4, Claude 3.5 Haiku
- **OpenAI:** GPT-4o, GPT-4o-mini, o1, o3-mini
- **Google:** Gemini 2.0 Flash, Gemini 1.5 Pro
- **DeepSeek:** DeepSeek-V3, DeepSeek-R1
- **Mistral:** Mistral Large 2, Codestral
- **Meta:** Llama 3.3 70B
- **xAI:** Grok-2

## Testing

### Without Payment (Returns 402)

```bash
curl -s "https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records"
```

Response:
```json
{
  "x402Version": 2,
  "error": "missing_payment_signature",
  "accepts": [{
    "kind": "exact",
    "scheme": "exact",
    "network": "eip155:84532",
    "resource": "/v1/records",
    "description": "Access paid API endpoint demo",
    "maxAmountRequired": "10000",
    "payTo": "0x402c1aw000000000000000000000000000000000",
    "asset": "USDC"
  }]
}
```

### With x402 Payment

```bash
# Using x402 client library
curl -H "X-PAYMENT: <base64-encoded-payment>" \
  "https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records"
```

## Tenant Configuration

```json
{
  "slug": "demo",
  "tenantId": "tenant_demo_31fa",
  "workerName": "tenant-demo-worker",
  "plan": "free",
  "resourceType": "dataset",
  "priceUsd": 0.01,
  "x402Enabled": true,
  "routeBase": "/t/demo"
}
```

## Source Data

Located at: `prototypes/cli/demo/ai-models.json`

## Use Cases

1. **AI cost estimation** - Compare model pricing for budgeting
2. **Model selection** - Find the best price/performance ratio
3. **Feature comparison** - Filter by capabilities (vision, reasoning, etc.)
4. **Monitoring** - Track price changes over time

---

*Deployed: 2026-02-17 | Last updated: 2026-02-17*
