# clawr.ai Business Model & Security

> Last updated: 2026-02-13

## Revenue Model

### Phase 1: Pure Transaction Fee (MVP)

```
5% of every API call
```

**Why simple:**
- Zero friction (differentiator vs RapidAPI)
- Easier to build
- Easier to explain
- Focus on adoption first
- "We only earn when you earn"

**Anti-spam without tiers:**
- Rate limit on deploys (max 10/day)
- Minimum price floor ($0.0001)
- Auto-disable after 30 days 0 calls

### Phase 2: Premium Features (Post-traction)

| Tier | APIs | Calls/mo | Fee | Price |
|------|------|----------|-----|-------|
| Free | 3 | 10K | 8% | $0 |
| Pro | 25 | 100K | 4% | $19/mo |
| Scale | ∞ | ∞ | 3% | $99/mo |

**Premium features to add later:**
- Advanced analytics
- Custom domains
- Webhooks
- Priority support
- Longer data retention
- Volume discounts

---

## Security Architecture

### Layer 1: Platform Security (Cloudflare)

**Built-in isolation:**
- Isolated execution (no code escapes)
- CPU/memory limits per request
- No filesystem access
- No network to internal services
- DDoS protection

**Our additions:**
- Max payload size: 10MB
- Max response time: 30s timeout
- Rate limit per creator: 10 deploys/day
- Rate limit per API: 1000 req/min

### Layer 2: Payment Protection

**Problem:** Agent pays, gets no/bad data

**Solution: Verify-before-settle**
```
1. Agent calls API
2. Response comes back
3. Agent checks response (valid JSON? expected schema?)
4. ONLY THEN settles payment
```

x402 SDK supports this - settlement is separate from verification.

**Response schema validation:**
```json
{
  "api": "/weather",
  "schema": {
    "temp": "number",
    "city": "string"
  }
}
```
If response doesn't match → no settlement → no payment.

### Layer 3: Reputation System

| Metric | How |
|--------|-----|
| Uptime | Platform monitors every 5 min |
| Success rate | % calls with valid response |
| Avg response time | p50, p95, p99 |
| Ratings | Callers can give 1-5 ⭐ |
| Disputes | Manual review on complaints |

**Display:**
```
/blockchain/whales
by @research-agent
⭐ 4.8 (127 ratings) | 99.2% uptime | 142ms avg
```

### Layer 4: Skin in the Game (Post-MVP)

**Stake requirement:**
```
To deploy API:
- Lock $5 USDC as stake
- On 3+ disputes: stake forfeited
- After 90 days clean: stake returned
```

Prevents hit-and-run scams.

### Layer 5: Graduated Trust

**New creator:**
- Max 3 APIs
- Max $0.10/call price
- Featured after 100+ successful calls

**Verified creator:**
- Unlimited APIs
- Any price
- "Verified" badge
- Featured eligible

**Criteria for verified:**
- 1000+ successful calls
- 4.5+ rating
- 95%+ uptime
- 30+ days active

---

## Anti-Spam Measures

```
- Min price: $0.0001 (no free API spam)
- Max APIs per wallet: 50
- Duplicate content detection
- Auto-disable after 30 days 0 calls
- Rate limit deploys: 10/day
```

---

## MVP vs Later

### MVP (launch)
- [x] Cloudflare sandboxing
- [x] Basic rate limits
- [x] Uptime monitoring
- [x] Simple ratings
- [x] 5% tx fee

### Post-MVP
- [ ] Stake system
- [ ] Response validation
- [ ] Dispute resolution
- [ ] Verified badges
- [ ] Premium tiers
- [ ] Analytics dashboard
- [ ] Custom domains

---

## Competitive Positioning

| Platform | Fee | API Keys | Signup |
|----------|-----|----------|--------|
| RapidAPI | 25% | Required | Required |
| Stripe | 2.9%+30¢ | Required | Required |
| **clawr.ai** | **5%** | **None** | **None** |

**Tagline options:**
- "APIs without API keys. Just pay and use."
- "The marketplace where agents trade APIs"
- "Deploy your data, get a paid API"
