# Code Functions Prototype

This prototype adds JavaScript function deployment to the existing CLI + Workers for Platforms flow.

## What works
- `402claw deploy <file.js> --type function`
- Auto routing via dispatcher path `/t/<tenant>/...`
- x402 payment support (dispatcher layer)
- Capability guardrails in runtime wrapper:
  - `config.allowedHosts` for outbound fetch allowlist
  - `config.maxDuration` timeout guard
  - `config.exposeEnv` explicit env exposure
- Per-tenant rate limits via dispatcher (`--rate-limit-caller`, `--rate-limit-global`)

## Example deploy
```bash
cd /Users/Shared/Projects/402claw/prototypes/cli
node src/index.js deploy \
  /Users/Shared/Projects/402claw/prototypes/code-functions/examples/hello.js \
  --tenant hello-fn \
  --type function \
  --price 0.01 \
  --x402 true \
  --rate-limit-caller 50/60s \
  --publish
```

## Example function files
- `examples/hello.js`
- `examples/fetch-news.js`

## Notes
- TS (`.ts`) bundling is not added yet; use `.js` or `.mjs`.
- Local x402 fallback is disabled by default; use real facilitator in non-dev flows.
