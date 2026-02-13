# API Proxy Prototype

This prototype is implemented through the `wrap` command in the CLI.

## What works
- `402claw wrap <upstream-url> --tenant <slug> --price <usd>`
- Method allowlist (`--method`)
- Header injection (`--inject-header "Name: Value"`)
- GET response caching (`--cache-ttl`)
- Optional JSON transform (`--transform`)
- Caller-level throttling (`--caller-rate-limit`)

## Example
```bash
cd /Users/Shared/Projects/402claw/prototypes/cli
node src/index.js wrap https://api.coingecko.com/api/v3 \
  --tenant coingecko-wrap \
  --price 0.002 \
  --method GET \
  --cache-ttl 300 \
  --caller-rate-limit 20/60s \
  --transform "return data;" \
  --publish
```

## Security defaults
- Upstream URL is validated to HTTP(S)
- Injected headers are never echoed back to caller
- Transform runs server-side in tenant worker context
- Dispatcher payment check happens before upstream call when x402 is enabled
