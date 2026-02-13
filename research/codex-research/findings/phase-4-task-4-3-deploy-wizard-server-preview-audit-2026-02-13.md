# Phase 4 Task 4.3: Deploy Wizard Server Preview + Audit Trail (2026-02-13)

## Executive Summary
Creator dashboard deploy wizard now calls authenticated backend routes for command preview and validation instead of only local client-side command generation.
Each preview request is logged as a session-scoped deploy intent, giving an audit surface for creator actions.

## Changes

### New server modules
- `/Users/Shared/Projects/402claw/frontend/src/lib/deploy/wizard.ts`
  - Normalizes deploy payload
  - Validates tenant/price/source path/proxy URL/rate limits/quotas/spend caps
  - Builds sanitized CLI command string
- `/Users/Shared/Projects/402claw/frontend/src/lib/deploy/intents.ts`
  - In-memory intent store keyed by wallet
  - Records and lists recent deploy intents

### New API routes
- `/Users/Shared/Projects/402claw/frontend/src/app/api/deploy/preview/route.ts`
  - Auth required via session cookie
  - Returns validated command preview
  - Writes audit intent record
- `/Users/Shared/Projects/402claw/frontend/src/app/api/deploy/intents/route.ts`
  - Auth required
  - Returns recent wallet-scoped intent history

### Dashboard wiring
- `/Users/Shared/Projects/402claw/frontend/src/app/dashboard/page.tsx`
  - Wizard now auto-requests server preview
  - Shows validation issues from server
  - Shows recent intent timeline
  - Keeps copy-command flow for operator handoff

## Validation
- `cd /Users/Shared/Projects/402claw/frontend && npm run lint` -> pass
- `cd /Users/Shared/Projects/402claw/frontend && npm run build` -> pass
- Build confirms new routes:
  - `/api/deploy/preview`
  - `/api/deploy/intents`

## Risks / Follow-ups
- Intent audit is currently in-memory; move to D1 for durable multi-instance history.
- `preview` route currently generates command but does not execute deploy; add secured execution pipeline with role/scopes.
- Add explicit per-wallet deploy rate limiting to preview/execute routes.

## Sources
- Next.js route handlers:
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js middleware/proxy:
  - https://nextjs.org/docs/app/building-your-application/routing/middleware
