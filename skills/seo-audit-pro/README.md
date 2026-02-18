# 🔍 SEO Audit Pro

**Professional SEO audits with real data. Not checklists — evidence.**

Most SEO audit skills tell your agent to "check your title tags" and "make sure you have alt text." That's a checklist, not an audit.

**SEO Audit Pro calls APIs to get actual data**, then writes an audit report backed by real numbers.

## The Difference

| | Basic SEO Audit | SEO Audit Pro |
|---|---|---|
| Title tag check | "Make sure it's 50-60 chars" | "Your title is 73 chars: 'Your Very Long Title...' — truncated in SERPs" |
| Page speed | "Check PageSpeed Insights" | "Performance: 72/100. LCP: 2.8s. Saving 1.2s by converting to WebP." |
| Broken links | "Ensure no broken links" | "2 broken links found: /old-page (404), /external (410)" |
| Images | "Add alt text to images" | "3/12 images missing alt: hero-banner.jpg, team-photo.png, screenshot-3.webp" |
| Schema | "Consider adding schema" | "Found: Organization schema (valid). Missing: Product, FAQ, Breadcrumb." |

## How It Works

1. Tell your agent: **"Run an SEO audit on example.com"**
2. The agent calls x402-powered APIs to analyze the site
3. Gets real Lighthouse scores, SEO data, broken links
4. Writes a comprehensive audit report with actual evidence
5. Provides prioritized action plan based on real impact

## API Endpoints

| Endpoint | Cost | Returns |
|----------|------|---------|
| `/seo?url=X` | $0.02 | Full on-page SEO analysis (titles, meta, headings, images, links, schema) |
| `/lighthouse?url=X` | $0.03 | Lighthouse scores + Core Web Vitals + opportunities |
| `/links?url=X` | $0.02 | Broken link check with status codes and anchor text |

**Typical audit cost:** ~$0.07/page, ~$0.35 for a 5-page site audit.

## Installation

```bash
# If using skills.sh
clawr install seo-audit-pro

# Manual: copy SKILL.md to your project's skills directory
cp SKILL.md /your-project/.claude/skills/seo-audit-pro/SKILL.md
```

### Prerequisites

- An x402-compatible wallet (for API micropayments)
- The `x402` or `x402-layer` skill installed

## Example Output

See [examples/example-audit.md](examples/example-audit.md) for a full sample audit report.

**Executive Summary preview:**

> ### SEO Audit: example.com
> **Overall SEO Score: 85/100** | **Performance: 72/100**
>
> #### Critical Issues Found
> 1. 🔴 LCP is 2.8s (target: <2.5s) — images not optimized
> 2. 🟡 3/12 images missing alt text
> 3. 🟡 2 broken links returning 404
>
> #### Quick Wins
> - Convert images to WebP → save 1.2s load time
> - Fix 2 broken links (listed below)
> - Add missing alt text to 3 images

## What's Audited

- **Technical SEO**: Crawlability, indexation, HTTPS, mobile-friendliness
- **Performance**: Core Web Vitals (LCP, INP, CLS), Lighthouse scores, speed opportunities
- **On-Page SEO**: Title tags, meta descriptions, headings, content depth, keyword optimization
- **Links**: Internal/external link counts, broken links, redirect chains
- **Images**: Alt text coverage, optimization opportunities
- **Structured Data**: Schema types found, validation status
- **Open Graph**: Social sharing metadata
- **Content Quality**: Word count, readability, E-E-A-T assessment

## Compared to the Original

This skill is a fork/enhancement of [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) `seo-audit` skill. We kept all the expert guidance and frameworks, then added real data via APIs.

**What we kept:** The audit framework, priority ordering, E-E-A-T assessment, site-type-specific guidance, output format structure.

**What we added:** x402 API calls for real Lighthouse data, automated broken link detection, live meta tag analysis, image alt text auditing, schema validation, and quantified recommendations.

## License

MIT

## Credits

- Original SEO audit framework by [Corey Haines](https://github.com/coreyhaines31/marketingskills)
- x402 micropayment protocol by [Coinbase](https://github.com/coinbase/x402)
- Built by [402claw](https://402claw.com)
