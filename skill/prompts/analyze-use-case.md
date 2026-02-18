# Analyze Use Case

You are helping a user design an x402-powered paid API. Walk through these steps to produce a clear spec.

## Step 1: Discover the Asset

Ask the user what they want to monetize. Probe with:

- **What data, service, or expertise do you have?** (e.g., proprietary dataset, ML model, computation, curated content, real-time feed)
- **Does this already exist as an API, or are we building from scratch?**
- **What format is the data/output in?** (JSON, images, files, streaming)

If the user is vague, offer examples:
> "People sell things like weather data, AI image generation, stock signals, translation, domain lookups, PDF conversion, sentiment analysis..."

## Step 2: Validate Demand

- **Who would pay for this?** Developers? Businesses? Other AI agents?
- **What's the value proposition?** Why pay you vs. free alternatives?
- **Is this unique, faster, cheaper, or more convenient than existing options?**

🚩 If there's no clear buyer or differentiation, say so honestly. Help them refine or pivot.

## Step 3: Characterize the Workload

Determine the API's nature:

| Question | Options |
|----------|---------|
| Read-only or stateful? | GET (data retrieval) vs POST (processing/creation) |
| Real-time or batch? | Instant response vs queued/async |
| Deterministic or variable? | Same input = same output? |
| Payload size? | Small JSON, large files, streaming |
| Auth beyond payment? | API keys, OAuth, none |

## Step 4: Estimate Volume

- **Expected calls per day/month?** (helps with infra and pricing)
- **Burst patterns?** (steady vs spiky traffic)
- **Per-call compute cost?** (cheap lookup vs expensive GPU inference)

## Step 5: Design the Endpoint(s)

Based on the above, draft:

```
METHOD /path
  Input: { description of params }
  Output: { description of response }
  Price: $X.XX per call (preliminary)
```

Keep it simple — most x402 APIs start with 1-3 endpoints.

Guidelines:
- Use RESTful conventions
- Prefer POST for anything with a body
- Keep paths descriptive: `/api/v1/analyze`, not `/do-thing`
- Version from day one (`/v1/`)

## Step 6: Output the Spec

Produce a summary document:

```markdown
## API Spec: [Name]

**Description:** One-line summary
**Target users:** Who pays for this
**Value prop:** Why they pay

### Endpoints

#### [METHOD] /v1/[path]
- **Input:** [params]
- **Output:** [response shape]
- **Suggested price:** $X.XX
- **Avg response time:** ~Xms

### Data Model
[Key entities/types]

### Notes
- Auth requirements
- Rate limiting considerations
- Known limitations
```

Hand this spec to the next step (choose-stack or pricing-strategy).
