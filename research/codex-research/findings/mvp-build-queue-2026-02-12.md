# MVP Build Queue (Post-Hardening) - 2026-02-12

## Goal
Translate research + prototype learnings into shippable MVP increments with clear sequencing.

## Progress Snapshot (2026-02-12)
- Priority 0.1 (Cloudflare dispatcher skeleton): prototype completed in `prototypes/csv-api` with tests.
- Priority 0.3 (CLI MVP deploy/status baseline): local registry/deploy prototype completed in `prototypes/cli`.
- Cloudflare API adapter for dispatcher deployment is now prototyped in `prototypes/cli/src/cloudflare.js` (dry-run + execute modes).
- Rollback baseline is now prototyped via deployment history + `cloudflare-rollback-dispatcher`.
- Remaining for both: production credential management hardening and persistent multi-user control-plane storage.

## Priority 0 (Must Build Next)
1. Cloudflare dispatcher skeleton (Workers for Platforms)
- Deliverable: request router with tenant resolution and per-request custom limits.
- Acceptance:
  - tenant routing table lookup
  - per-plan `cpuMs` and `subRequests` limits enforced
  - structured logs with request id, tenant id, route, status

2. Shared runtime package extraction
- Deliverable: reusable x402 paywall middleware package.
- Source baseline: `research/codex-research/prototypes/x402-csv-api-poc/src/api-server.js`
- Acceptance:
  - challenge/verify/settle lifecycle hooks
  - fallback facilitator support
  - typed telemetry events

3. CLI MVP (`deploy` + `status`)
- Deliverable: initial `402claw` CLI that can deploy CSV/JSON API specs to staging runtime.
- Acceptance:
  - validate runtime env config (`test`/`prod`)
  - validate facilitator policy guardrails
  - output endpoint URL and pricing metadata

## Priority 1 (Ship-Readiness)
1. Settlement idempotency key strategy
- Add idempotency key per request to avoid duplicate settlement side effects.

2. Facilitator health scoring + circuit breaker
- Track failure rates and temporarily quarantine unhealthy facilitators.

3. Durable telemetry sink
- Replace in-memory telemetry with persistent event stream/log sink.

4. Abuse controls
- Rate limiting and simple anomaly detection at dispatcher layer.

## Priority 2 (Go-To-Market)
1. Pricing comparison guardrail automation
- Script or doc lint that blocks undated competitor-fee claims in external copy.

2. Creator onboarding template set
- Starter APIs for CSV and JSON with one-command deploy presets.

3. Minimal catalog page
- Publish endpoint metadata (name, price, response schema, uptime sample).

## Dependencies
- `findings/canonical-architecture-decisions-v2.md`
- `deep-dives/canonical-research-baseline-2026-02-12.md`
- `findings/mvp-hardening-sprint-2026-02-12.md`

## Notes
- Keep Stripe machine payments out of MVP scope until public GA terms stabilize.
- Keep Base-only network scope for MVP (`eip155:8453` prod, `eip155:84532` test).
