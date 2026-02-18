# API Reference — audit-website-pro

All endpoints are served at `https://api.402claw.com/v1` and authenticated via x402 micropayments.

---

## Authentication

All requests use the x402 payment protocol. No API keys needed. The `x402` skill handles payment headers automatically.

```bash
# Using x402 skill helper
x402_call GET "https://api.402claw.com/v1/{endpoint}?url={TARGET_URL}"
```

---

## Endpoints

### GET `/lighthouse`

Full Lighthouse performance audit.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to audit (must include protocol) |
| `device` | string | No | `mobile` (default) or `desktop` |
| `categories` | string | No | Comma-separated: `performance,accessibility,best-practices,seo` |

**Cost:** $0.03

**Response Fields:**
- `scores` — Object with `performance`, `accessibility`, `bestPractices`, `seo` (0-100)
- `coreWebVitals` — LCP, INP, CLS with values, units, and ratings (`good`, `needs-improvement`, `poor`)
- `opportunities` — Array of improvement suggestions with estimated time savings
- `diagnostics` — `totalSize`, `requests`, `ttfb`, `domSize`

**Error Codes:**
- `422` — Invalid URL or unreachable
- `504` — Page load timeout (>30s)

---

### GET `/security`

SSL and security header analysis.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to audit |

**Cost:** $0.02

**Response Fields:**
- `ssl` — Certificate details: `valid`, `issuer`, `expires`, `daysRemaining`, `protocol`, `grade`
- `headers` — Check for each security header: `present` (bool), `value`, `issues[]`
  - Headers checked: `strictTransportSecurity`, `contentSecurityPolicy`, `xFrameOptions`, `xContentTypeOptions`, `referrerPolicy`, `permissionsPolicy`
- `vulnerabilities` — Boolean flags: `mixedContent`, `serverInfoLeaked`, `openRedirects`, `clickjackable`
- `score` — Overall security score (0-100)
- `grade` — Letter grade (A+ through F)

---

### GET `/seo`

On-page SEO analysis.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to audit |

**Cost:** $0.02

**Response Fields:**
- `title` — `text`, `length`, `hasKeyword`
- `meta` — `description`, `length`, `robots`
- `headings` — `h1[]`, `h2[]`, `h1Count`
- `images` — `total`, `missingAlt`, `details[]`
- `links` — `internal`, `external`, `nofollow`
- `canonical` — Canonical URL
- `openGraph` — `title`, `description`, `image`
- `schema` — Array of detected schema types with `valid` flag
- `wordCount`, `readabilityScore`, `mobileFriendly`, `https`

---

### GET `/accessibility`

WCAG 2.1 AA compliance check.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to audit |
| `standard` | string | No | `wcag2a`, `wcag2aa` (default), `wcag2aaa` |

**Cost:** $0.02

**Response Fields:**
- `score` — Accessibility score (0-100)
- `standard` — WCAG standard tested against
- `violations[]` — Each with `id`, `impact` (`critical`/`serious`/`moderate`/`minor`), `description`, `count`, `elements[]`
- `passes` — Number of passed checks
- `violationCount` — Total violations
- `categories` — Scores for `perceivable`, `operable`, `understandable`, `robust`

---

### GET `/links`

Broken link detection and validation.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL to crawl for links |
| `depth` | number | No | Crawl depth: `0` (page only, default) or `1` (follow internal links) |
| `timeout` | number | No | Per-link timeout in ms (default: 5000) |

**Cost:** $0.02 (depth=0), $0.05 (depth=1)

**Response Fields:**
- `totalLinks` — Total links found
- `broken[]` — Each with `url`, `status`, `anchor`
- `redirects[]` — Each with `url`, `redirectTo`, `status`
- `healthy` — Count of healthy links
- `brokenCount`, `redirectCount`

---

## Rate Limits

- 10 requests/minute per wallet
- 100 requests/hour per wallet
- Concurrent requests: up to 5

## Error Format

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "The provided URL could not be resolved",
    "status": 422
  }
}
```

Common error codes: `INVALID_URL`, `TIMEOUT`, `RATE_LIMITED`, `PAYMENT_REQUIRED`, `INTERNAL_ERROR`
