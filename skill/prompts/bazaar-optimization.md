# Bazaar Optimization

Help the user optimize their API listing on Bazaar (the x402 discovery registry) for maximum visibility and conversions.

## What is Bazaar?

Bazaar is the marketplace where developers and AI agents discover x402 APIs. A good listing means more callers. A bad listing means you're invisible.

## Step 1: Title & Description

### Title
- Clear, specific, searchable
- Include what it does, not your brand name
- ✅ `Real-Time Crypto Price Feed` 
- ✅ `PDF to Markdown Converter`
- ❌ `CoolAPI v2`
- ❌ `My Service`

### Description
- First sentence = what it does (this shows in search results)
- Second sentence = why it's valuable
- Include key terms people would search for
- Keep it under 200 words

Example:
> Returns real-time cryptocurrency prices for 500+ tokens across 20 exchanges. Sub-second updates with VWAP calculation. Ideal for trading bots, portfolio trackers, and price comparison tools.

## Step 2: Categories & Tags

- Pick the most specific category available
- Add 3-5 relevant tags
- Think about what a potential caller would search for
- Include both technical terms and use-case terms

Example tags: `crypto`, `prices`, `real-time`, `trading`, `market-data`

## Step 3: Documentation

Good docs convert browsers into callers. Include:

### Example Request
```bash
curl -X POST https://your-api.com/v1/price \
  -H "Content-Type: application/json" \
  -d '{"token": "ETH", "currency": "USD"}'
```

### Example Response
```json
{
  "token": "ETH",
  "price": 3245.67,
  "currency": "USD",
  "timestamp": "2025-01-15T12:00:00Z",
  "source": "aggregated"
}
```

### Schema
- Provide OpenAPI/JSON Schema for all endpoints
- Document every field in request and response
- Include error response shapes
- List all possible error codes

## Step 4: Competitive Positioning

Research similar APIs on Bazaar:

- **Price comparison:** Are you competitive? Cheaper? Justify if more expensive.
- **Feature comparison:** What do you offer that others don't?
- **Reliability:** Uptime and response time matter for ranking.

If there are no competitors, that's either a great opportunity or a sign there's no demand. Help the user figure out which.

## Step 5: Technical Optimization

These factors affect ranking and caller satisfaction:

### Response Time
- Target < 500ms for data lookups
- Target < 2s for computation
- Measure and publish your p50/p95 latency

### Reliability
- Aim for 99.9%+ uptime
- Use health checks
- Return proper error codes (don't 500 on bad input)

### CORS
- If browser-accessible, set CORS headers
- This expands your potential caller base significantly

### Metadata Endpoint
- Ensure your Bazaar metadata endpoint (`/.well-known/x402` or equivalent) returns correct info
- Price, description, and supported methods must be accurate

## Step 6: Launch Checklist

Before publishing to Bazaar:

- [ ] Title is clear and searchable
- [ ] Description explains value in first sentence
- [ ] Category and tags are set
- [ ] At least one example request/response in docs
- [ ] OpenAPI schema is published
- [ ] Pricing is displayed correctly
- [ ] API is live and responding
- [ ] Metadata endpoint returns valid data
- [ ] Tested discovery by searching for your own keywords
