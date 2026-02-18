---
name: seo-audit-pro
version: 1.0.0
description: Professional SEO audit with real data. Powered by x402 micropayments. When the user wants to audit, review, or diagnose SEO issues on their site with REAL DATA — not just a checklist. Also use when the user mentions "SEO audit," "technical SEO," "why am I not ranking," "SEO issues," "on-page SEO," "meta tags review," or "SEO health check." Unlike basic SEO audit skills, this one calls APIs to get actual performance scores, crawl data, and broken links.
---

# SEO Audit Pro

You are an expert in search engine optimization backed by real-time analysis APIs. Your goal is to identify SEO issues using ACTUAL DATA and provide actionable, evidence-based recommendations.

## What Makes This Different

Most SEO audit skills give you a checklist and ask YOU to go check things. This skill calls x402-powered APIs to get real data:

- **Actual Lighthouse scores** — not "go check PageSpeed Insights"
- **Real broken links** — not "make sure you don't have broken links"
- **Live meta tag analysis** — not "check your title tags"
- **Crawl data** — not "ensure your site is crawlable"

You get DATA, then write the audit around what you FOUND.

---

## x402 API Endpoints

All endpoints are at `https://api.402claw.com/v1` and require x402 micropayments.

### `/seo?url={URL}` — Full SEO Analysis ($0.02)

Returns comprehensive on-page SEO data for a single URL:

```json
{
  "url": "https://example.com",
  "title": { "text": "...", "length": 55, "hasKeyword": true },
  "meta": { "description": "...", "length": 152, "robots": "index,follow" },
  "headings": { "h1": ["..."], "h2": ["...", "..."], "h1Count": 1 },
  "images": { "total": 12, "missingAlt": 3, "details": [...] },
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

### `/lighthouse?url={URL}` — Performance Scores ($0.03)

Returns Lighthouse performance audit:

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

### `/links?url={URL}` — Broken Link Check ($0.02)

Crawls the page and checks all links:

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

## How to Call the APIs

Use x402 payment protocol. The API returns a `402 Payment Required` on first call with payment details. Your x402 skill/wallet handles payment automatically.

```bash
curl -X GET "https://api.402claw.com/v1/seo?url=https://example.com" \
  -H "Authorization: Bearer <x402-token>"
```

If you have the `x402` or `x402-layer` skill installed, payments are automatic.

---

## Audit Workflow

### Step 1: Gather Context

**Check for product marketing context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for information not already covered.

Before auditing, understand:

1. **Site Context**
   - What type of site? (SaaS, e-commerce, blog, etc.)
   - What's the primary business goal for SEO?
   - What keywords/topics are priorities?

2. **Current State**
   - Any known issues or concerns?
   - Current organic traffic level?
   - Recent changes or migrations?

3. **Scope**
   - Full site audit or specific pages?
   - Which pages to analyze? (API calls cost money — be targeted)
   - Access to Search Console / analytics?

### Step 2: Run API Analysis

For the target URL(s), call the APIs in this order:

1. **`/seo?url=X`** — Get the on-page data first
2. **`/lighthouse?url=X`** — Get performance scores
3. **`/links?url=X`** — Check for broken links

For a full site audit, run these on:
- Homepage
- Top 3-5 priority pages (ask the user which ones matter)
- One blog post (if applicable)

**Cost estimate:** ~$0.07 per page (all 3 endpoints), ~$0.35 for a 5-page audit.

### Step 3: Analyze the Data

Use the API response data to identify issues. Don't guess — cite the numbers.

**Bad:** "Your page might be slow"
**Good:** "Your LCP is 2.8s (needs improvement). Lighthouse identified 'Serve images in next-gen formats' as saving 1.2s."

**Bad:** "Make sure you have alt text on images"
**Good:** "3 of your 12 images are missing alt text. Specifically: hero-banner.jpg, team-photo.png, and screenshot-3.webp."

### Step 4: Write the Report

Use the output format below. Every finding must reference actual data from the API calls.

---

## Audit Framework

### Priority Order
1. **Crawlability & Indexation** (can Google find and index it?)
2. **Technical Foundations** (is the site fast and functional?)
3. **On-Page Optimization** (is content optimized?)
4. **Content Quality** (does it deserve to rank?)
5. **Authority & Links** (does it have credibility?)

---

## Technical SEO Audit

### Crawlability

**Robots.txt**
- Check for unintentional blocks
- Verify important pages allowed
- Check sitemap reference

**XML Sitemap**
- Exists and accessible
- Submitted to Search Console
- Contains only canonical, indexable URLs
- Updated regularly

**Site Architecture**
- Important pages within 3 clicks of homepage
- Logical hierarchy
- Internal linking structure (use `/seo` link counts)
- No orphan pages

### Indexation

**Index Status**
- site:domain.com check
- Search Console coverage report
- Compare indexed vs. expected

**Indexation Issues**
- Check `/seo` response for `meta.robots` directives
- Canonical tags (from `/seo` canonical field)
- Redirect chains (from `/links` redirect data)

### Site Speed & Core Web Vitals

**USE THE `/lighthouse` API DATA:**

| Metric | Target | Your Score |
|--------|--------|------------|
| Performance | ≥90 | `{lighthouse.scores.performance}` |
| LCP | <2.5s | `{lighthouse.coreWebVitals.LCP.value}` |
| INP | <200ms | `{lighthouse.coreWebVitals.INP.value}` |
| CLS | <0.1 | `{lighthouse.coreWebVitals.CLS.value}` |

**List all opportunities from Lighthouse with estimated savings.**

### Mobile-Friendliness

- Check `/seo` response `mobileFriendly` field
- Responsive design verification
- Tap target sizes (from Lighthouse accessibility)

### Security & HTTPS

- Check `/seo` response `https` field
- Mixed content warnings (from Lighthouse)
- HTTP → HTTPS redirects (from `/links` redirects)

---

## On-Page SEO Audit

### Title Tags

**FROM `/seo` API DATA:**
- Title text: `{seo.title.text}`
- Length: `{seo.title.length}` characters (target: 50-60)
- Contains keyword: `{seo.title.hasKeyword}`

**Evaluate:**
- Is it compelling and click-worthy?
- Primary keyword near beginning?
- Brand name placement?

### Meta Descriptions

**FROM `/seo` API DATA:**
- Description: `{seo.meta.description}`
- Length: `{seo.meta.length}` characters (target: 150-160)

**Evaluate:**
- Clear value proposition?
- Call to action?
- Compelling reason to click?

### Heading Structure

**FROM `/seo` API DATA:**
- H1 count: `{seo.headings.h1Count}` (should be 1)
- H1 text: `{seo.headings.h1[0]}`
- H2s: `{seo.headings.h2}`

**Check for:**
- One H1 per page
- H1 contains primary keyword
- Logical hierarchy

### Content Optimization

**FROM `/seo` API DATA:**
- Word count: `{seo.wordCount}`
- Readability score: `{seo.readabilityScore}`

**Evaluate:**
- Sufficient depth/length for topic
- Answers search intent
- Better than competitors

### Image Optimization

**FROM `/seo` API DATA:**
- Total images: `{seo.images.total}`
- Missing alt text: `{seo.images.missingAlt}`

**List specific images missing alt text from the details array.**

### Internal Linking

**FROM `/seo` API DATA:**
- Internal links: `{seo.links.internal}`
- External links: `{seo.links.external}`
- Nofollow links: `{seo.links.nofollow}`

**FROM `/links` API DATA:**
- Broken links: list each one with status code and anchor text
- Redirect chains: list each one

### Structured Data

**FROM `/seo` API DATA:**
- Schema types found: `{seo.schema}`
- Validation status for each

**Recommend missing schema types based on site type.**

### Open Graph / Social

**FROM `/seo` API DATA:**
- OG Title: `{seo.openGraph.title}`
- OG Description: `{seo.openGraph.description}`
- OG Image: `{seo.openGraph.image}`

---

## Content Quality Assessment

### E-E-A-T Signals

**Experience**
- First-hand experience demonstrated
- Original insights/data
- Real examples and case studies

**Expertise**
- Author credentials visible
- Accurate, detailed information
- Properly sourced claims

**Authoritativeness**
- Recognized in the space
- Cited by others
- Industry credentials

**Trustworthiness**
- Accurate information
- Transparent about business
- Contact information available
- Privacy policy, terms
- Secure site (HTTPS — confirmed by API: `{seo.https}`)

---

## Common Issues by Site Type

### SaaS/Product Sites
- Product pages lack content depth
- Blog not integrated with product pages
- Missing comparison/alternative pages
- Feature pages thin on content

### E-commerce
- Thin category pages
- Duplicate product descriptions
- Missing product schema
- Faceted navigation creating duplicates

### Content/Blog Sites
- Outdated content not refreshed
- Keyword cannibalization
- No topical clustering
- Poor internal linking

### Local Business
- Inconsistent NAP
- Missing local schema
- No Google Business Profile optimization

---

## Output Format

### Audit Report Structure

**Executive Summary**
- Overall SEO score: `{lighthouse.scores.seo}`/100
- Performance score: `{lighthouse.scores.performance}`/100
- Top 3-5 priority issues (from actual data)
- Quick wins identified
- Estimated cost of audit: $X.XX (list API calls made)

**Technical SEO Findings**
For each issue:
- **Issue**: What's wrong
- **Impact**: SEO impact (High/Medium/Low)
- **Evidence**: Actual data from API (quote numbers!)
- **Fix**: Specific recommendation
- **Priority**: 1-5

**On-Page SEO Findings**
Same format — always cite API data

**Content Findings**
Same format

**Broken Links Report**
- Table of all broken links with status codes, anchor text, and recommended action

**Prioritized Action Plan**
1. Critical fixes (blocking indexation/ranking)
2. High-impact improvements (backed by Lighthouse opportunities)
3. Quick wins (easy, immediate benefit)
4. Long-term recommendations

---

## References

- [API Documentation](references/api-docs.md): Full x402 API reference
- [Example Audit](examples/example-audit.md): Sample audit report with real data
- [AI Writing Detection](references/ai-writing-detection.md): Common AI writing patterns to avoid
- [AEO & GEO Patterns](references/aeo-geo-patterns.md): Content patterns optimized for answer engines

---

## Related Skills

- **x402** / **x402-layer**: Required for API payments
- **programmatic-seo**: For building SEO pages at scale
- **schema-markup**: For implementing structured data
- **page-cro**: For optimizing pages for conversion (not just ranking)
- **analytics-tracking**: For measuring SEO performance
