# 🔍 audit-website-pro

**Comprehensive website audits with real data. No CLI required.**

A professional-grade website audit skill powered by x402 micropayments. Get actual Lighthouse scores, security analysis, accessibility violations, and broken link detection — not just checklists.

## Why This Exists

The popular `audit-website` skill (21K+ installs) requires installing a CLI tool and running local crawls. That's powerful, but heavy. This skill takes a different approach:

- **Zero setup** — No CLI installation, no local crawling
- **Real data** — API-backed scores, not "go check this yourself"
- **Fast** — Results in seconds, not minutes
- **5 dimensions** — Performance, Security, SEO, Accessibility, Links

## What You Get

| Dimension | What's Checked |
|-----------|---------------|
| 🚀 **Performance** | Lighthouse scores, Core Web Vitals (LCP, INP, CLS), load time, resource analysis |
| 🔒 **Security** | SSL certificate, security headers (CSP, HSTS, X-Frame), mixed content, info leaks |
| 📈 **SEO** | Meta tags, headings, schema markup, Open Graph, canonical URLs, mobile-friendliness |
| ♿ **Accessibility** | WCAG 2.1 AA compliance, color contrast, alt text, ARIA, keyboard navigation |
| 🔗 **Links** | Broken links (404/410), redirect chains, anchor text analysis |

## Cost

| Audit Type | Cost |
|-----------|------|
| Single page, full audit | ~$0.11 |
| Single page, one category | $0.02-$0.03 |
| 5-page site audit | ~$0.55 |
| 10-page site audit | ~$1.10 |

Paid via x402 micropayments — no API keys, no subscriptions.

## Usage

Just ask your AI agent:

> "Audit https://example.com"

> "Check the security of my website"

> "Run a full health check on mysite.com"

> "Are there any broken links on my homepage?"

The skill handles everything — API calls, data analysis, and report generation.

## Output

You get a structured report with:

- **Overall health score** (0-100) with letter grade
- **Per-category scores** with detailed breakdowns
- **Critical issues** flagged for immediate attention
- **Prioritized action plan** ordered by impact

See [examples/sample-audit-output.md](examples/sample-audit-output.md) for a full sample report.

## Requirements

- The `x402` skill (for micropayments)
- A funded x402 wallet (USDC on Base)

## vs. audit-website

| | audit-website | audit-website-pro |
|---|---|---|
| Setup | Install squirrel CLI | Nothing |
| Speed | Minutes | Seconds |
| Rules | 230+ | Focused high-impact |
| Data | Local crawl | Cloud APIs |
| Cost | Free | ~$0.11/page |
| Best for | Deep exhaustive crawls | Fast data-driven audits |

They complement each other. Use both.

## License

MIT

## Author

[402claw](https://402claw.com) — AI skills powered by x402 micropayments.
