# SEO Audit Pro — API Reference

Base URL: `https://api.402claw.com/v1`

All endpoints use the x402 micropayment protocol. On first request, the server returns `402 Payment Required` with payment instructions. Your x402 wallet handles payment automatically.

---

## Authentication

Include your x402 payment token in the header:

```
Authorization: Bearer <x402-token>
```

Or let the x402/x402-layer skill handle it automatically.

---

## Endpoints

### GET `/seo`

Full on-page SEO analysis for a single URL.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Full URL to analyze (include https://) |

**Cost:** $0.02 per request

**Response:**

```json
{
  "url": "https://example.com",
  "statusCode": 200,
  "loadTimeMs": 1234,
  "title": {
    "text": "Example Domain - Your Site Title",
    "length": 33,
    "hasKeyword": true
  },
  "meta": {
    "description": "This is the meta description of the page.",
    "length": 42,
    "robots": "index,follow",
    "viewport": "width=device-width, initial-scale=1"
  },
  "headings": {
    "h1": ["Main Heading"],
    "h2": ["Section One", "Section Two"],
    "h3": ["Subsection A", "Subsection B"],
    "h1Count": 1,
    "totalHeadings": 5
  },
  "images": {
    "total": 12,
    "missingAlt": 3,
    "details": [
      { "src": "/images/hero.jpg", "alt": "Hero banner", "hasAlt": true },
      { "src": "/images/team.png", "alt": "", "hasAlt": false }
    ]
  },
  "links": {
    "internal": 24,
    "external": 8,
    "nofollow": 2,
    "total": 32
  },
  "canonical": "https://example.com",
  "openGraph": {
    "title": "Example Domain",
    "description": "OG description",
    "image": "https://example.com/og-image.jpg",
    "type": "website"
  },
  "twitterCard": {
    "card": "summary_large_image",
    "title": "Example Domain",
    "description": "Twitter description"
  },
  "schema": [
    { "type": "Organization", "valid": true },
    { "type": "WebSite", "valid": true }
  ],
  "wordCount": 1847,
  "readabilityScore": 62,
  "mobileFriendly": true,
  "https": true,
  "language": "en",
  "charset": "UTF-8"
}
```

---

### GET `/lighthouse`

Lighthouse performance audit powered by Chrome headless.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Full URL to audit |
| `device` | string | No | `mobile` (default) or `desktop` |

**Cost:** $0.03 per request

**Response:**

```json
{
  "url": "https://example.com",
  "device": "mobile",
  "fetchedAt": "2025-01-15T12:00:00Z",
  "scores": {
    "performance": 72,
    "accessibility": 89,
    "bestPractices": 92,
    "seo": 85
  },
  "coreWebVitals": {
    "LCP": { "value": 2.8, "unit": "s", "rating": "needs-improvement" },
    "INP": { "value": 180, "unit": "ms", "rating": "good" },
    "CLS": { "value": 0.05, "unit": "", "rating": "good" },
    "FCP": { "value": 1.2, "unit": "s", "rating": "good" },
    "TTFB": { "value": 0.6, "unit": "s", "rating": "good" }
  },
  "opportunities": [
    {
      "title": "Serve images in next-gen formats",
      "description": "Image formats like WebP and AVIF often provide better compression.",
      "savings": "1.2s",
      "details": [
        { "url": "/images/hero.jpg", "totalBytes": 524288, "wastedBytes": 314572 }
      ]
    },
    {
      "title": "Eliminate render-blocking resources",
      "description": "Resources are blocking the first paint of your page.",
      "savings": "0.8s",
      "details": [
        { "url": "/css/main.css", "totalBytes": 102400, "wastedMs": 800 }
      ]
    }
  ],
  "diagnostics": {
    "totalSize": "3.2MB",
    "totalSizeBytes": 3355443,
    "requests": 47,
    "ttfb": "0.6s",
    "domSize": 1243,
    "mainThreadWork": "2.1s",
    "bootupTime": "1.4s"
  }
}
```

---

### GET `/links`

Crawl a page and check all links for broken/redirected status.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Full URL to crawl |
| `depth` | int | No | Crawl depth (default: 1, max: 3) |
| `timeout` | int | No | Timeout per link in ms (default: 5000) |

**Cost:** $0.02 per request

**Response:**

```json
{
  "url": "https://example.com",
  "crawledAt": "2025-01-15T12:00:00Z",
  "totalLinks": 42,
  "healthy": 38,
  "brokenCount": 2,
  "redirectCount": 2,
  "broken": [
    {
      "url": "https://example.com/old-page",
      "status": 404,
      "anchor": "Read more",
      "foundOn": "https://example.com",
      "type": "internal"
    },
    {
      "url": "https://external.com/gone",
      "status": 410,
      "anchor": "Source",
      "foundOn": "https://example.com/blog/post-1",
      "type": "external"
    }
  ],
  "redirects": [
    {
      "url": "http://example.com/blog",
      "redirectTo": "https://example.com/blog",
      "status": 301,
      "anchor": "Blog",
      "type": "internal"
    }
  ]
}
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Missing or invalid `url` parameter |
| 402 | Payment required — x402 payment needed |
| 408 | Target URL timed out |
| 429 | Rate limited — wait and retry |
| 500 | Internal error — retry |
| 502 | Target URL unreachable |

```json
{
  "error": "invalid_url",
  "message": "URL must include protocol (https://)"
}
```

---

## Rate Limits

- 60 requests/minute per wallet
- 1000 requests/day per wallet
- Burst: 10 concurrent requests

---

## x402 Payment Flow

1. Client sends GET request
2. Server responds `402` with `X-Payment` header containing payment details
3. Client's x402 wallet signs and sends USDC micropayment on Base
4. Client retries with payment proof in `X-Payment-Response` header
5. Server validates and returns data

This is handled automatically by the `x402` and `x402-layer` skills.
