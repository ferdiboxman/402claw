# Clawr Skill — Task Breakdown

> Every task needed to build the Clawr skill, organized by phase.

---

## Phase 1: Core Skill Structure

### T1.1 — Create SKILL.md
- **Description**: Write the main skill file with YAML frontmatter and decision-tree instructions. This is the brain — must cover all user intents (new endpoint, monetize existing, analyze market, test endpoint).
- **Files**: `clawr/SKILL.md`
- **Dependencies**: None
- **Complexity**: L

### T1.2 — Create scaffold.sh
- **Description**: Script that copies a template directory, performs variable substitution (wallet address, price, network, endpoint path, project name), and initializes the project.
- **Files**: `clawr/scripts/scaffold.sh`
- **Dependencies**: T1.5 (templates must exist)
- **Complexity**: M

### T1.3 — Create validate-config.sh
- **Description**: Validates x402 route configuration: checks required fields (scheme, price, network, payTo), validates CAIP-2 network format, checks price format, validates JSON schemas in discovery extensions.
- **Files**: `clawr/scripts/validate-config.sh`
- **Dependencies**: None
- **Complexity**: S

### T1.4 — Create test-endpoint.sh
- **Description**: Makes a test request to a deployed x402 endpoint. First without payment (expects 402), then with payment via @x402/fetch (expects 200 + PAYMENT-RESPONSE header). Reports success/failure.
- **Files**: `clawr/scripts/test-endpoint.sh`
- **Dependencies**: None
- **Complexity**: M

### T1.5 — Create deploy.sh
- **Description**: Platform-aware deploy script. Detects target (CF Workers → `wrangler deploy`, Vercel → `vercel --prod`, generic Node → provides instructions). Sets environment variables.
- **Files**: `clawr/scripts/deploy.sh`
- **Dependencies**: None
- **Complexity**: M

### T1.6 — Write X402-PROTOCOL.md reference
- **Description**: Condensed x402 protocol reference for agent context. Covers: flow, headers (PAYMENT-REQUIRED, PAYMENT-SIGNATURE, PAYMENT-RESPONSE), schemes (exact, upto), CAIP-2 networks, facilitator endpoints (/verify, /settle). Must be < 200 lines.
- **Files**: `clawr/references/X402-PROTOCOL.md`
- **Dependencies**: None
- **Complexity**: S

### T1.7 — Write TROUBLESHOOTING.md reference
- **Description**: Common errors and fixes: 402 not being returned (middleware order), facilitator rejection (wrong network), settlement failures (insufficient gas), CORS issues with browser clients.
- **Files**: `clawr/references/TROUBLESHOOTING.md`
- **Dependencies**: None
- **Complexity**: S

---

## Phase 2: Scaffolding Templates

### T2.1 — Express.js template
- **Description**: Complete Express.js project template with x402 payment middleware, Bazaar discovery extension, environment variable handling, and a sample route.
- **Files**: `clawr/assets/templates/express/index.ts`, `package.json`, `tsconfig.json`, `.env.example`
- **Dependencies**: T1.6
- **Complexity**: M

### T2.2 — Next.js template
- **Description**: Next.js app router template with payment proxy in middleware.ts, sample API route with x402, and Bazaar discovery.
- **Files**: `clawr/assets/templates/next/middleware.ts`, `app/api/[endpoint]/route.ts`, `package.json`
- **Dependencies**: T1.6
- **Complexity**: M

### T2.3 — Cloudflare Workers (Hono) template
- **Description**: Hono-based Cloudflare Worker with x402 middleware, wrangler.toml config, and Bazaar extension.
- **Files**: `clawr/assets/templates/hono-cf-worker/index.ts`, `package.json`, `wrangler.toml`
- **Dependencies**: T1.6
- **Complexity**: M

### T2.4 — Vercel Edge Functions template
- **Description**: Vercel serverless/edge function template with x402 via @x402/next.
- **Files**: `clawr/assets/templates/vercel-edge/api/route.ts`, `package.json`, `vercel.json`
- **Dependencies**: T1.6
- **Complexity**: S

### T2.5 — FastAPI (Python) template
- **Description**: Python FastAPI template with x402 ASGI middleware, uvicorn config, and Bazaar discovery metadata.
- **Files**: `clawr/assets/templates/fastapi/main.py`, `requirements.txt`
- **Dependencies**: T1.6
- **Complexity**: M

### T2.6 — Go (Gin) template
- **Description**: Go Gin template with x402 middleware and Bazaar extension.
- **Files**: `clawr/assets/templates/gin/main.go`, `go.mod`
- **Dependencies**: T1.6
- **Complexity**: M

### T2.7 — Template variable substitution system
- **Description**: Define placeholder variables used across all templates (e.g., `{{PAY_TO}}`, `{{PRICE}}`, `{{NETWORK}}`, `{{ENDPOINT_PATH}}`, `{{DESCRIPTION}}`). Document in scaffold.sh.
- **Files**: Update all template files + `clawr/scripts/scaffold.sh`
- **Dependencies**: T2.1–T2.6
- **Complexity**: S

---

## Phase 3: Bazaar Integration

### T3.1 — Create bazaar-search.sh
- **Description**: Query the facilitator's `/discovery/resources` endpoint. Accept query/filter params. Output formatted list of endpoints with pricing, descriptions, schemas.
- **Files**: `clawr/scripts/bazaar-search.sh`
- **Dependencies**: None
- **Complexity**: S

### T3.2 — Create bazaar-register.sh
- **Description**: Verify that a deployed endpoint has proper Bazaar discovery metadata by triggering a payment cycle (facilitator catalogs metadata on payment). Then verify listing via discovery API.
- **Files**: `clawr/scripts/bazaar-register.sh`
- **Dependencies**: T3.1
- **Complexity**: M

### T3.3 — Write BAZAAR-API.md reference
- **Description**: Document the Bazaar discovery API: endpoints, request/response formats, `declareDiscoveryExtension()` usage for Node.js/Go/Python, input/output schema format, v1 vs v2 differences.
- **Files**: `clawr/references/BAZAAR-API.md`
- **Dependencies**: None
- **Complexity**: M

### T3.4 — Discovery metadata templates
- **Description**: Create reusable JSON Schema snippets for common API types (weather, AI inference, data lookup, file conversion, search). Agent uses these as starting points for discovery extension config.
- **Files**: `clawr/assets/schemas/weather.json`, `ai-inference.json`, `data-lookup.json`, `file-conversion.json`, `search.json`
- **Dependencies**: T3.3
- **Complexity**: S

---

## Phase 4: Pricing & Market Analysis

### T4.1 — Create pricing-analyze.sh
- **Description**: Fetches Bazaar listings for a category, computes min/median/max pricing, identifies gaps, and outputs a pricing recommendation report.
- **Files**: `clawr/scripts/pricing-analyze.sh`
- **Dependencies**: T3.1
- **Complexity**: M

### T4.2 — Write PRICING-GUIDE.md reference
- **Description**: Pricing strategy guide: per-request pricing, cost-plus pricing, competitive positioning, pricing psychology for micropayments, volume considerations, scheme selection (exact vs upto).
- **Files**: `clawr/references/PRICING-GUIDE.md`
- **Dependencies**: None
- **Complexity**: M

### T4.3 — Cost estimation logic
- **Description**: Add logic to SKILL.md for estimating compute costs: API call duration × compute cost, external API costs (if proxying), storage costs. Help users set profitable prices.
- **Files**: Update `clawr/SKILL.md`
- **Dependencies**: T1.1, T4.2
- **Complexity**: S

---

## Phase 5: Testing & Validation

### T5.1 — End-to-end test script
- **Description**: Full test flow: scaffold → deploy locally → test 402 response → test paid response → validate Bazaar metadata. Uses local facilitator or testnet.
- **Files**: `clawr/scripts/e2e-test.sh`
- **Dependencies**: T1.2, T1.3, T1.4, T1.5
- **Complexity**: L

### T5.2 — Template validation tests
- **Description**: For each template, verify: installs without errors, starts server, returns 402 on protected route, accepts payment. Can be CI-driven.
- **Files**: `clawr/tests/test-templates.sh`
- **Dependencies**: T2.1–T2.6
- **Complexity**: M

### T5.3 — SKILL.md self-test
- **Description**: Validate SKILL.md against Agent Skills spec: frontmatter format, name constraints, description length, file references resolve, total size < 500 lines.
- **Files**: `clawr/tests/validate-skill.sh`
- **Dependencies**: T1.1
- **Complexity**: S

### T5.4 — Write DEPLOYMENT-TARGETS.md reference
- **Description**: Per-platform deployment checklist: required env vars, deploy commands, post-deploy verification steps, common pitfalls.
- **Files**: `clawr/references/DEPLOYMENT-TARGETS.md`
- **Dependencies**: T2.1–T2.6
- **Complexity**: M

---

## Phase 6: Documentation & Copy

### T6.1 — README.md
- **Description**: Project README with: what Clawr is, quick install, demo GIF/video placeholder, supported platforms, links to docs.
- **Files**: `clawr/README.md`
- **Dependencies**: T1.1
- **Complexity**: S

### T6.2 — CONTRIBUTING.md
- **Description**: How to add new templates, extend pricing logic, contribute deployment targets.
- **Files**: `clawr/CONTRIBUTING.md`
- **Dependencies**: None
- **Complexity**: S

### T6.3 — LICENSE
- **Description**: Choose and add license file (MIT recommended for max adoption).
- **Files**: `clawr/LICENSE`
- **Dependencies**: None
- **Complexity**: S

### T6.4 — Example walkthroughs
- **Description**: 3 worked examples in references/: (1) "Monetize a weather API with Express", (2) "Add payments to existing Next.js app", (3) "Deploy AI inference endpoint on CF Workers".
- **Files**: `clawr/references/examples/weather-express.md`, `nextjs-existing.md`, `ai-inference-cf.md`
- **Dependencies**: T2.1, T2.2, T2.3
- **Complexity**: M

---

## Phase 7: Publishing

### T7.1 — GitHub repository setup
- **Description**: Create `402claw/clawr-skill` repo, configure CI (lint SKILL.md, run template tests), add badges.
- **Files**: `.github/workflows/ci.yml`, repo settings
- **Dependencies**: T5.2, T5.3
- **Complexity**: M

### T7.2 — skills.sh registration
- **Description**: Ensure repo structure is compatible with `npx skills add 402claw/clawr-skill`. Test installation in Claude Code and Cursor. Verify skill appears on skills.sh leaderboard.
- **Files**: Repo structure validation
- **Dependencies**: T7.1
- **Complexity**: S

### T7.3 — playbooks.com listing
- **Description**: Submit skill to playbooks.com/skills. Create listing page with description, screenshots, install instructions.
- **Files**: Listing metadata
- **Dependencies**: T7.1, T6.1
- **Complexity**: S

### T7.4 — npm package (optional)
- **Description**: Publish as `@clawr/skill` on npm for programmatic installation. Add package.json with bin entry pointing to scaffold script.
- **Files**: `package.json`, npm publish config
- **Dependencies**: T7.1
- **Complexity**: S

### T7.5 — Claude Code Plugin manifest
- **Description**: Create plugin manifest for Claude Code marketplace. Define skill sets (core skill, templates).
- **Files**: Plugin manifest files per Claude Code spec
- **Dependencies**: T7.1
- **Complexity**: S

### T7.6 — Launch announcement
- **Description**: Write launch copy for Twitter/X, Discord (x402 community, CDP Discord), and blog post draft.
- **Files**: `clawr/docs/launch-copy.md`
- **Dependencies**: T6.1
- **Complexity**: S

---

## Dependency Graph (Critical Path)

```
T1.1 (SKILL.md) ──────────────────────────────────────────┐
T1.6 (Protocol ref) ──→ T2.1–T2.6 (Templates) ──→ T2.7 ──┤
                                                    │      │
T1.3 (validate) ───────────────────────────────────┐│      │
T1.4 (test) ───────────────────────────────────────┤│      │
T1.5 (deploy) ─────────────────────────────────────┤│      │
T1.2 (scaffold) ←── T2.7 ─────────────────────────┤│      │
                                                    ││      │
T3.1 (bazaar search) ──→ T3.2 (register) ─────────┤│      │
T3.3 (bazaar ref) ──→ T3.4 (schemas) ─────────────┤│      │
T4.1 (pricing) ←── T3.1 ──────────────────────────┤│      │
T4.2 (pricing ref) ────────────────────────────────┤│      │
                                                    ││      │
T5.1 (e2e test) ←── T1.2,T1.3,T1.4,T1.5 ─────────┤│      │
T5.2 (template tests) ←── T2.1–T2.6 ──────────────┤│      │
T5.3 (skill validate) ←── T1.1 ───────────────────┤│      │
T5.4 (deploy ref) ←── T2.1–T2.6 ──────────────────┘│      │
                                                     │      │
T6.1–T6.4 (docs) ──────────────────────────────────→│      │
                                                     ↓      ↓
                                              T7.1 (GitHub repo)
                                                     │
                                    ┌────────────────┼────────────┐
                                    ↓                ↓            ↓
                              T7.2 (skills.sh)  T7.3 (playbooks) T7.4–T7.6
```

---

## Effort Summary

| Phase | Tasks | S | M | L | Est. Total |
|-------|-------|---|---|---|------------|
| 1. Core | 7 | 3 | 3 | 1 | ~3 days |
| 2. Templates | 7 | 2 | 5 | 0 | ~3 days |
| 3. Bazaar | 4 | 2 | 2 | 0 | ~1.5 days |
| 4. Pricing | 3 | 1 | 2 | 0 | ~1 day |
| 5. Testing | 4 | 1 | 2 | 1 | ~2 days |
| 6. Docs | 4 | 3 | 1 | 0 | ~1 day |
| 7. Publishing | 6 | 5 | 1 | 0 | ~1.5 days |
| **Total** | **35** | **17** | **16** | **2** | **~13 days** |

---

## Recommended Build Order

1. **T1.6** → X402 protocol reference (foundational knowledge)
2. **T2.1** → Express template (simplest, validates approach)
3. **T1.1** → SKILL.md (core brain, can iterate)
4. **T1.3** → validate-config.sh
5. **T1.4** → test-endpoint.sh
6. **T3.1** → bazaar-search.sh
7. **T1.2** → scaffold.sh
8. **T1.5** → deploy.sh
9. **T2.2–T2.6** → Remaining templates
10. **T3.2–T3.4** → Bazaar integration
11. **T4.1–T4.3** → Pricing features
12. **T5.1–T5.4** → Testing
13. **T6.1–T6.4** → Documentation
14. **T7.1–T7.6** → Publishing
