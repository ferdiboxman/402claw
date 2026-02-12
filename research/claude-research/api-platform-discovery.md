# API Platform - Discovery Document

**Date:** 2026-02-12
**Status:** Exploring

---

## Het Probleem

Agents willen APIs aanbieden, maar:
- Hosten is technisch
- Endpoints configureren is werk
- Betalingen opzetten (x402) is complex
- Discovery is gefragmenteerd

## De Value Proposition (Herzien)

**Niet:** "Vind APIs" (agents kunnen Googlen)
**Niet:** "Betaal via ons" (agents kunnen direct x402)

**Wel:** "Upload data/connectie → Krijg werkende API met payments"

### Flow:

```
Agent/Human heeft:          Platform doet:              Resultaat:
─────────────────────────────────────────────────────────────────
CSV/JSON data         →     Host + REST endpoint    →   api.platform.com/weather
Database connectie    →     Proxy + caching         →   api.platform.com/db/query
Python functie        →     Serverless deploy       →   api.platform.com/fn/analyze
Externe API + logic   →     Wrapper + payments      →   api.platform.com/wrap/twitter
```

### Vergelijking:

| Tool | Wat het doet | Voor wie |
|------|--------------|----------|
| Supabase | Postgres → instant API | Developers |
| Hasura | Any DB → GraphQL | Developers |
| Xano | No-code backend | Non-devs |
| **Ons** | Anything → paid API | Agents + humans |

---

## Core Features (MVP)

### 1. Data → API
- Upload CSV/JSON
- Krijg REST endpoint
- Automatische x402 pricing

### 2. Function → API  
- Upload Python/JS functie
- Serverless execution
- Pay per call

### 3. Wrap → API
- Connect externe API
- Voeg logic/caching toe
- Resell met markup

### 4. Connect → API
- Database connectie (read-only)
- Safe query interface
- Per-query pricing

---

## Open Vragen

### Business Model
- [ ] Wat is ons verdienmodel? Hosting fees? Take rate? Subscription?
- [ ] Hoe prijzen we compute/storage?
- [ ] Free tier? Hoe voorkomen we abuse?

### Technical
- [ ] Waar hosten we? (Cloudflare Workers? Fly.io? Railway?)
- [ ] Hoe sandboxen we user code veilig?
- [ ] Hoe schalen we serverless functions?
- [ ] Cold start latency acceptable?

### Trust/Security
- [ ] Hoe voorkomen we malicious APIs?
- [ ] Data privacy (als wij hosten)?
- [ ] Rate limiting, DDoS protection?

### Agent Experience
- [ ] Hoe makkelijk is onboarden voor een agent?
- [ ] CLI? MCP? skill.md interface?
- [ ] Kan een agent volledig autonoom een API deployen?

### Market
- [ ] Wie zijn de eerste users? (Agents? Humans? Beide?)
- [ ] Wat is de killer use case?
- [ ] Concurrentie: waarom niet Supabase + Stripe?

---

## Potentiële Killer Use Cases

1. **Agent publiceert research**
   - Agent doet research, slaat op in DB
   - Maakt API: "krijg research over X"
   - Andere agents betalen per query

2. **Agent verkoopt skills**
   - Agent is goed in summarization
   - Maakt API: "summarize this text"
   - Inkomsten uit calls

3. **Human deelt dataset**
   - Upload CSV met pricing data
   - Instant API met x402
   - Passief inkomen

4. **Agent wrapt externe service**
   - Twitter API + sentiment analysis
   - Verpakt als nieuwe API
   - Value-add reselling

---

## Technical Architecture (Sketch)

```
┌─────────────────────────────────────────────────────────┐
│                    API Platform                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Ingest    │  │   Runtime   │  │   Gateway   │      │
│  │             │  │             │  │             │      │
│  │ - CSV/JSON  │  │ - Workers   │  │ - x402      │      │
│  │ - Functions │  │ - Sandboxed │  │ - Routing   │      │
│  │ - DB conn   │  │ - Isolated  │  │ - Caching   │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│         │                │                │              │
│         └────────────────┼────────────────┘              │
│                          │                               │
│                    ┌─────────────┐                       │
│                    │   Storage   │                       │
│                    │             │                       │
│                    │ - Data      │                       │
│                    │ - Configs   │                       │
│                    │ - Metrics   │                       │
│                    └─────────────┘                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## MVP Scope Opties

### Option A: Data-only (Simplest)
- Alleen CSV/JSON upload
- Read-only REST endpoints
- x402 per request
- **Complexity:** Low
- **Value:** Medium

### Option B: Data + Functions
- CSV/JSON upload
- Simple serverless functions (JS/Python)
- x402 integrated
- **Complexity:** Medium
- **Value:** High

### Option C: Full Platform
- Data, functions, wraps, DB connections
- Dashboard, analytics, governance
- Credit lines, enterprise features
- **Complexity:** High
- **Value:** Highest (but slow to ship)

**Recommendation:** Start with Option A, add functions later

---

## Next Steps

1. [ ] Valideer de value prop met andere agents (Moltbook post?)
2. [ ] Kies MVP scope (A, B, of C)
3. [ ] Technical spike: hoe snel kunnen we data → API bouwen?
4. [ ] Domein kiezen en registreren
5. [ ] Landing page met waitlist

---

## Notities

- Dit is nu WEL data heavy (wij hosten de APIs)
- Maar de value is ook veel duidelijker
- Vergelijkbaar met Vercel: zij hosten ook, maar de DX is de value
- Moeten nadenken over pricing die sustainable is

---

*Document aangemaakt door Clawsenberg, 2026-02-12*
