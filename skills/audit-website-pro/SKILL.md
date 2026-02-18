---
name: audit-website-pro
version: 1.0.0
description: Comprehensive website audit with real data — performance, security, SEO, accessibility, and broken links. Powered by x402 micropayments. Use when the user wants a FULL site health check with actual Lighthouse scores, security header analysis, SSL verification, accessibility violations, and broken link detection. Unlike basic audit skills that give checklists, this calls APIs and returns evidence-based reports. Triggers on "website audit," "site health," "is my site secure," "check my website," "performance audit," "accessibility check," "security audit," "broken links," "full site review," or "website health check."
---

# Website Audit Pro

You are an expert website auditor backed by real-time analysis APIs. You perform comprehensive, multi-dimensional website audits covering performance, security, SEO, accessibility, and link integrity — all with ACTUAL DATA.

## What Makes This Different

The original `audit-website` skill (21K+ installs) requires installing a separate CLI tool and running local crawls. **This skill calls x402-powered APIs** to get real data instantly:

| Category | What You Get |
|----------|-------------|
| **Performance** | Real Lighthouse scores, Core Web Vitals, load time breakdown |
| **Security** | SSL certificate details, security headers, vulnerability flags |
| **SEO** | Meta tags, schema markup, Open Graph, canonical analysis |
| **Accessibility** | WCAG violations, color contrast, ARIA issues, keyboard nav |
| **Links** | Broken links, redirect chains, anchor text analysis |

No CLI installation required. No local crawling. Just URLs and results.

---

## x402 API Endpoints

All endpoints are at `https://api.402claw.com/v1` and require x402 micropayments.

Use the `x402` skill to make authenticated requests. Each call is a micropayment — no API keys, no subscriptions.

---

### 1. `/lighthouse?url={URL}` — Performance Audit ($0.03)

Returns full Lighthouse audit with scores and diagnostics.

```bash
x402_call GET "https://api.402claw.com/v1/lighthouse?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "scores": {
    "performance": 72,
    "accessibility": 89,
    "bestPractices": 92,
    "seo": 85
  },
  "coreWebVitals": {
    "LCP": { "value": 2.8, "unit": "s", "rating": "needs-improvement" },
    "INP": { "value": 180, "unit": "ms", "rating": "good" },
    "CLS": { "value": 0.05, "unit": "", "rating": "good" }
  },
  "opportunities": [
    { "title": "Serve images in next-gen formats", "savings": "1.2s" },
    { "title": "Eliminate render-blocking resources", "savings": "0.8s" }
  ],
  "diagnostics": {
    "totalSize": "3.2MB",
    "requests": 47,
    "ttfb": "0.6s",
    "domSize": 1243
  }
}
```

---

### 2. `/security?url={URL}` — Security Audit ($0.02)

Checks SSL, security headers, and common vulnerabilities.

```bash
x402_call GET "https://api.402claw.com/v1/security?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "ssl": {
    "valid": true,
    "issuer": "Let's Encrypt",
    "expires": "2026-05-15T00:00:00Z",
    "daysRemaining": 86,
    "protocol": "TLSv1.3",
    "grade": "A"
  },
  "headers": {
    "strictTransportSecurity": { "present": true, "value": "max-age=31536000; includeSubDomains" },
    "contentSecurityPolicy": { "present": true, "issues": [] },
    "xFrameOptions": { "present": true, "value": "DENY" },
    "xContentTypeOptions": { "present": true, "value": "nosniff" },
    "referrerPolicy": { "present": true, "value": "strict-origin-when-cross-origin" },
    "permissionsPolicy": { "present": false, "recommendation": "Add Permissions-Policy header" }
  },
  "vulnerabilities": {
    "mixedContent": false,
    "serverInfoLeaked": true,
    "openRedirects": false,
    "clickjackable": false
  },
  "score": 82,
  "grade": "B+"
}
```

---

### 3. `/seo?url={URL}` — SEO Analysis ($0.02)

Returns comprehensive on-page SEO data.

```bash
x402_call GET "https://api.402claw.com/v1/seo?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "title": { "text": "Example - Your Site", "length": 19, "hasKeyword": true },
  "meta": { "description": "...", "length": 152, "robots": "index,follow" },
  "headings": { "h1": ["Main Heading"], "h2": ["About", "Features"], "h1Count": 1 },
  "images": { "total": 12, "missingAlt": 3, "details": [] },
  "links": { "internal": 24, "external": 8, "nofollow": 2 },
  "canonical": "https://example.com",
  "openGraph": { "title": "...", "description": "...", "image": "..." },
  "schema": [{ "type": "Organization", "valid": true }],
  "wordCount": 1847,
  "readabilityScore": 62,
  "mobileFriendly": true,
  "https": true
}
```

---

### 4. `/accessibility?url={URL}` — Accessibility Check ($0.02)

WCAG 2.1 AA compliance check using axe-core.

```bash
x402_call GET "https://api.402claw.com/v1/accessibility?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "score": 78,
  "standard": "WCAG 2.1 AA",
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Elements must have sufficient color contrast",
      "count": 5,
      "elements": ["nav a.subtle-link", "footer p.disclaimer"]
    },
    {
      "id": "image-alt",
      "impact": "critical",
      "description": "Images must have alternate text",
      "count": 3,
      "elements": ["img.hero-bg", "img.team-photo", "img.logo-partner"]
    }
  ],
  "passes": 42,
  "violationCount": 8,
  "categories": {
    "perceivable": { "score": 72, "issues": 5 },
    "operable": { "score": 88, "issues": 2 },
    "understandable": { "score": 90, "issues": 1 },
    "robust": { "score": 85, "issues": 0 }
  }
}
```

---

### 5. `/links?url={URL}` — Broken Link Check ($0.02)

Crawls the page and validates all links.

```bash
x402_call GET "https://api.402claw.com/v1/links?url=https://example.com"
```

**Response:**
```json
{
  "url": "https://example.com",
  "totalLinks": 42,
  "broken": [
    { "url": "https://example.com/old-page", "status": 404, "anchor": "Read more" },
    { "url": "https://external.com/gone", "status": 410, "anchor": "Source" }
  ],
  "redirects": [
    { "url": "http://example.com/blog", "redirectTo": "https://example.com/blog", "status": 301 }
  ],
  "healthy": 38,
  "brokenCount": 2,
  "redirectCount": 2
}
```

---

## Audit Workflow

When the user asks for a website audit, follow this sequence:

### Step 1: Confirm Scope

Ask the user:
- **URL** to audit
- **Depth**: Single page (~$0.11) or multi-page (~$0.11/page)?
- **Focus**: Full audit (all 5 categories) or specific areas?

Estimate cost before proceeding: `pages × $0.11 for full audit`.

### Step 2: Run API Calls

Call all relevant endpoints. For a full single-page audit, make 5 parallel calls:

```
/lighthouse?url={URL}     → Performance + base scores
/security?url={URL}       → Security posture
/seo?url={URL}            → SEO health
/accessibility?url={URL}  → WCAG compliance
/links?url={URL}          → Link integrity
```

**Total cost for full single-page audit: ~$0.11**

### Step 3: Generate Report

Structure the report as follows:

```
# 🔍 Website Audit Report: {domain}
**Audited:** {date} | **URL:** {url}

## Overall Health Score: {weighted_average}/100

### Score Breakdown
| Category       | Score | Grade |
|---------------|-------|-------|
| Performance    | XX    | X     |
| Security       | XX    | X     |
| SEO            | XX    | X     |
| Accessibility  | XX    | X     |
| Link Health    | XX    | X     |

## 🚨 Critical Issues (Fix Immediately)
{issues with impact=critical or security vulnerabilities}

## ⚠️ Warnings (Fix Soon)
{issues with impact=serious or moderate}

## 💡 Recommendations
{opportunities and best practices}

## Detailed Results
{per-category breakdown with evidence}
```

### Scoring

Calculate the overall health score as a weighted average:

| Category | Weight |
|----------|--------|
| Security | 25% |
| Performance | 25% |
| SEO | 20% |
| Accessibility | 20% |
| Link Health | 10% |

Grade scale: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)

### Step 4: Prioritized Action Plan

End every audit with a numbered action plan, ordered by impact:

```
## 📋 Action Plan (Priority Order)

1. **[CRITICAL]** Fix 3 broken links (404s hurt SEO + UX)
2. **[CRITICAL]** Add missing alt text to 3 images (accessibility law risk)
3. **[HIGH]** Add Permissions-Policy header (security hardening)
4. **[HIGH]** Serve images in WebP format (save 1.2s load time)
5. **[MEDIUM]** Improve color contrast on nav links (WCAG AA)
...
```

---

## Multi-Page Audits

For multi-page audits, audit the homepage plus key pages:

1. Homepage
2. Top navigation pages (up to 5)
3. Any pages the user specifically mentions

Summarize patterns across pages (e.g., "All pages missing Permissions-Policy header").

---

## Cost Transparency

Always be transparent about costs:

- Single page, full audit: **~$0.11**
- Single page, specific category: **$0.02-$0.03**
- 5-page full audit: **~$0.55**
- 10-page full audit: **~$1.10**

Confirm with the user before running multi-page audits.

---

## Comparison with audit-website

| Feature | audit-website | audit-website-pro |
|---------|--------------|-------------------|
| Installation | Requires squirrel CLI | No install needed |
| Data source | Local crawl | Cloud APIs (x402) |
| Speed | Minutes (crawl-based) | Seconds (API-based) |
| Performance data | Basic | Full Lighthouse + CWV |
| Security audit | Basic headers | SSL + headers + vulns |
| Accessibility | Basic | WCAG 2.1 AA (axe-core) |
| Cost | Free (after CLI install) | ~$0.11/page |
| Rules | 230+ rules | Focused on high-impact |

**When to use which:**
- Use `audit-website` for deep, exhaustive crawls of large sites with 230+ rules
- Use `audit-website-pro` for fast, data-driven audits with real scores and zero setup

---

## Tips

- **Re-audit after fixes** — Run the same audit again to verify improvements and track score changes
- **Save reports** — Write audit reports to files for before/after comparison
- **Combine with seo-audit-pro** — For deeper SEO-specific analysis, use alongside `seo-audit-pro`
- **CI/CD integration** — Run audits in deployment pipelines to catch regressions
