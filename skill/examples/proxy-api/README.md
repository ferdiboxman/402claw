# x402 Proxy API Example — Weather

A complete Express server that wraps the free [Open-Meteo](https://open-meteo.com/) weather API with [x402](https://x402.org) micropayments.

**What it demonstrates:**
- Proxying a public API behind x402 payment gates
- In-memory caching (5 min TTL) to reduce upstream calls
- Rate limiting (100 req/min per IP)
- Response enrichment: feels-like temperature, UV warnings, clothing suggestions

## Endpoints

| Route | Price | Description |
|-------|-------|-------------|
| `GET /api/weather?lat=52.52&lon=13.41` | $0.001 | Current weather + enrichment |
| `GET /api/forecast?lat=52.52&lon=13.41&days=7` | $0.005 | Multi-day forecast + daily enrichment |
| `GET /health` | Free | Health check |

## Quick Start

```bash
npm install
node server.js
```

The server starts on `http://localhost:4023`.

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `PORT` | 4023 | Server port |
| `PAY_TO_ADDRESS` | `0x5C78...D0F` | Wallet receiving payments |
| `FACILITATOR_URL` | `https://x402.org/facilitator` | x402 facilitator |

Copy `.env.example` to `.env` to customize.

## Enrichment

Every response includes an `enrichment` object:

```json
{
  "enrichment": {
    "feels_like_c": 14.2,
    "uv_warning": { "level": "moderate", "message": "Wear sunscreen..." },
    "clothing": ["Light jacket or sweater", "Long pants"],
    "comfort": "moderate"
  }
}
```

Forecast responses also include `daily_enrichment` with per-day suggestions.

## Testing

```bash
# Health check (free)
curl http://localhost:4023/health

# Weather (returns 402 without payment header)
curl http://localhost:4023/api/weather?lat=52.52&lon=13.41

# See test.sh for more examples
bash test.sh
```

## How It Works

1. Client sends request with x402 payment header
2. `@x402/express` middleware verifies payment via the facilitator
3. Server fetches from Open-Meteo (or serves from cache)
4. Response is enriched with derived data and returned
