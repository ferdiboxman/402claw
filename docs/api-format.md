# API Format

## Base URL

```
https://api.402claw.com/<tenant-slug>/
```

## Authentication

All paid endpoints require x402 payment via the `X-Payment` header.

### Without Payment

```bash
curl https://api.402claw.com/my-api/v1/records
```

Response:
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: true

{
  "error": "payment_required",
  "price": "0.001",
  "currency": "USDC",
  "network": "base",
  "payTo": "0x...",
  "accepts": "x402"
}
```

### With Payment

```bash
curl -H "X-Payment: <x402-signed-payment>" \
  https://api.402claw.com/my-api/v1/records
```

## Dataset Endpoints

For deployed CSV/JSON datasets:

### List Records

```
GET /<tenant>/v1/records
```

Response:
```json
{
  "data": [
    { "id": 1, "name": "Product A", "price": 29.99 },
    { "id": 2, "name": "Product B", "price": 49.99 }
  ],
  "meta": {
    "total": 2,
    "limit": 100,
    "offset": 0
  }
}
```

### Query Parameters

| Param | Description | Example |
|-------|-------------|---------|
| `limit` | Max records to return | `?limit=10` |
| `offset` | Skip N records | `?offset=20` |
| `filter[field]` | Filter by field value | `?filter[status]=active` |
| `sort` | Sort by field | `?sort=price` |
| `order` | Sort direction | `?order=desc` |

### Get Single Record

```
GET /<tenant>/v1/records/:id
```

Response:
```json
{
  "data": { "id": 1, "name": "Product A", "price": 29.99 }
}
```

## Function Endpoints

For deployed JS functions:

```
GET|POST /<tenant>/
```

Request body and response format defined by your function.

## Proxy Endpoints

For wrapped upstream APIs:

```
<method> /<tenant>/
```

Proxies to configured upstream with injected headers.

## Error Responses

### 402 Payment Required

```json
{
  "error": "payment_required",
  "price": "0.001",
  "currency": "USDC"
}
```

### 429 Rate Limited

```json
{
  "error": "rate_limited",
  "retryAfter": 60,
  "limit": "100/60s"
}
```

### 429 Quota Exceeded

```json
{
  "error": "quota_exceeded",
  "limit": "daily",
  "resets": "2024-01-02T00:00:00Z"
}
```

### 404 Not Found

```json
{
  "error": "not_found",
  "message": "Tenant or record not found"
}
```

## Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-Id` | Unique request identifier |
| `X-RateLimit-Remaining` | Requests remaining in window |
| `X-RateLimit-Reset` | Window reset timestamp |
| `X-Payment-Receipt` | Payment confirmation (when paid) |

## Content Types

- Request: `application/json`
- Response: `application/json`

Binary responses supported for function endpoints.
