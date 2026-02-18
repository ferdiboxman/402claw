# 🔍 Website Audit Report: acmecorp.com

**Audited:** 2026-02-18 | **URL:** https://acmecorp.com | **Type:** Full Audit (5 categories)  
**Cost:** $0.11 (5 API calls)

---

## Overall Health Score: 76/100 (Grade: C)

| Category | Score | Grade | Status |
|----------|-------|-------|--------|
| 🚀 Performance | 68 | D | ⚠️ Needs Work |
| 🔒 Security | 82 | B | ✅ Good |
| 📈 SEO | 79 | C | ⚠️ Needs Work |
| ♿ Accessibility | 71 | C | ⚠️ Needs Work |
| 🔗 Link Health | 90 | A | ✅ Good |

---

## 🚨 Critical Issues (Fix Immediately)

### 1. Missing Alt Text on 7 Images
**Category:** Accessibility | **Impact:** Critical  
**Details:** 7 of 23 images have no `alt` attribute. This is a WCAG 2.1 failure and an accessibility law risk.

**Affected elements:**
- `img.hero-background` (homepage hero)
- `img.team-photo-1` through `img.team-photo-4` (About page)
- `img.client-logo-aws`, `img.client-logo-stripe`

**Fix:** Add descriptive alt text to each image. For decorative images, use `alt=""`.

### 2. LCP is 4.1s (Poor)
**Category:** Performance | **Impact:** Critical  
**Details:** Largest Contentful Paint is 4.1 seconds on mobile, well above the 2.5s "good" threshold. The LCP element is the hero image (2.4MB PNG).

**Fix:** 
- Convert hero image to WebP (estimated savings: 1.8s)
- Add `fetchpriority="high"` to the LCP image
- Preload the image: `<link rel="preload" as="image" href="...">`

### 3. Two Broken Links (404)
**Category:** Links | **Impact:** Critical  
**Details:**
- `https://acmecorp.com/careers/senior-dev` → 404 (anchor: "We're hiring!")
- `https://blog.acmecorp.com/2024-roadmap` → 404 (anchor: "Our 2024 Roadmap")

**Fix:** Update or remove the links. Redirect old URLs if content moved.

---

## ⚠️ Warnings (Fix Soon)

### 4. No Permissions-Policy Header
**Category:** Security | **Score Impact:** -8 points  
**Details:** The `Permissions-Policy` header is missing. This header controls which browser features (camera, microphone, geolocation) can be used.

**Fix:** Add to server config:
```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 5. Color Contrast Failures (5 elements)
**Category:** Accessibility | **Impact:** Serious  
**Details:** 5 elements fail WCAG AA contrast requirements (minimum 4.5:1 for normal text):
- Navigation links: `#999` on `#fff` (ratio: 2.8:1)
- Footer disclaimer: `#aaa` on `#f5f5f5` (ratio: 1.9:1)

**Fix:** Darken text colors to meet 4.5:1 contrast ratio. Navigation links → `#595959`, Footer text → `#767676`.

### 6. CLS is 0.18 (Needs Improvement)
**Category:** Performance | **Score Impact:** -12 points  
**Details:** Cumulative Layout Shift of 0.18, above the 0.1 "good" threshold. Caused by:
- Images without explicit dimensions
- Late-loading web fonts causing text reflow

**Fix:**
- Add `width` and `height` attributes to all images
- Use `font-display: swap` with font preloading

### 7. Missing Schema Markup
**Category:** SEO | **Score Impact:** -6 points  
**Details:** No structured data found. No Organization, WebSite, or BreadcrumbList schema.

**Fix:** Add JSON-LD schema markup:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "AcmeCorp",
  "url": "https://acmecorp.com",
  "logo": "https://acmecorp.com/logo.png"
}
</script>
```

---

## 💡 Recommendations

### Performance
- **Serve images in WebP/AVIF** — Estimated savings: 1.2s load time, 3.1MB → 1.4MB
- **Enable text compression** — 4 uncompressed JS files detected (savings: ~340KB)
- **Reduce DOM size** — 1,847 elements (aim for <1,500)

### Security
- **Upgrade CSP** — Current policy allows `unsafe-inline`. Consider nonce-based CSP.
- **Add `X-DNS-Prefetch-Control` header** — Minor hardening measure
- **SSL grade is A** — Certificate valid for 243 more days ✅

### SEO
- **Meta description is 187 chars** — Truncated in SERPs. Shorten to 150-160.
- **H1 tag is good** — Single H1, contains primary keyword ✅
- **17 images have alt text** — Good, but 7 still missing (see Critical #1)
- **Open Graph tags present** — Title, description, and image all set ✅

### Accessibility
- **Add skip navigation link** — No "Skip to content" link found
- **Form labels** — 2 form inputs use placeholder only (no `<label>`)
- **Focus indicators** — Custom styles remove default focus outline on buttons

---

## 📊 Detailed Scores

### Performance (68/100)
| Metric | Value | Rating |
|--------|-------|--------|
| LCP | 4.1s | 🔴 Poor |
| INP | 145ms | 🟢 Good |
| CLS | 0.18 | 🟡 Needs Improvement |
| TTFB | 0.8s | 🟡 Needs Improvement |
| Total Page Size | 4.7MB | 🔴 Heavy |
| Requests | 63 | 🟡 Moderate |

### Security (82/100, Grade B+)
| Check | Status |
|-------|--------|
| SSL Valid | ✅ TLS 1.3, Grade A |
| HSTS | ✅ max-age=31536000 |
| CSP | ⚠️ Has unsafe-inline |
| X-Frame-Options | ✅ DENY |
| X-Content-Type-Options | ✅ nosniff |
| Referrer-Policy | ✅ strict-origin-when-cross-origin |
| Permissions-Policy | ❌ Missing |
| Mixed Content | ✅ None |
| Server Info Leaked | ⚠️ Server: nginx/1.24 |

### SEO (79/100)
| Check | Status |
|-------|--------|
| Title Tag | ✅ 52 chars |
| Meta Description | ⚠️ 187 chars (too long) |
| H1 Tag | ✅ 1 H1, has keyword |
| Canonical | ✅ Set correctly |
| Open Graph | ✅ Complete |
| Schema Markup | ❌ None found |
| Mobile Friendly | ✅ Responsive |
| HTTPS | ✅ |

### Accessibility (71/100)
| Category | Score |
|----------|-------|
| Perceivable | 65 |
| Operable | 78 |
| Understandable | 82 |
| Robust | 74 |

Violations: 15 total (3 critical, 5 serious, 4 moderate, 3 minor)

### Link Health (90/100)
| Metric | Count |
|--------|-------|
| Total Links | 67 |
| Healthy | 62 |
| Broken (404/410) | 2 |
| Redirects (301/302) | 3 |

---

## 📋 Action Plan (Priority Order)

1. **[CRITICAL]** Add alt text to 7 images — Accessibility + SEO impact
2. **[CRITICAL]** Optimize hero image (PNG→WebP, add preload) — Fix LCP from 4.1s
3. **[CRITICAL]** Fix 2 broken links — Direct SEO + UX harm
4. **[HIGH]** Fix color contrast on 5 elements — WCAG AA compliance
5. **[HIGH]** Add explicit image dimensions — Fix CLS from 0.18
6. **[HIGH]** Add Permissions-Policy header — Security hardening
7. **[MEDIUM]** Add Organization schema markup — SEO rich results
8. **[MEDIUM]** Shorten meta description to 155 chars — Better SERP display
9. **[MEDIUM]** Add skip navigation link — Accessibility best practice
10. **[MEDIUM]** Enable text compression for JS files — 340KB savings
11. **[LOW]** Remove server version from headers — Minor security
12. **[LOW]** Upgrade CSP to remove unsafe-inline — Advanced security

---

*Report generated by [audit-website-pro](https://402claw.com/skills/audit-website-pro) via x402 micropayments.*
