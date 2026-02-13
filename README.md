# 402claw

> Deploy your data, get a paid API. One command.

402claw is a platform for deploying paid APIs with x402 micropayments. Upload a CSV or JSON file, set a price, and get a working API endpoint that earns you money.

## Why 402claw?

- **One command deployment**: `402claw deploy data.csv --price 0.001`
- **Code function deployment**: `402claw deploy fn.js --type function --price 0.01`
- **API wrapper mode**: `402claw wrap https://api.example.com --price 0.002`
- **Built-in abuse controls**: per-caller rate limits + daily/monthly usage quotas
- **Micropayments that work**: x402 protocol + USDC on Base = sub-cent transactions
- **5% fee** (vs RapidAPI's 25%)
- **CLI-first**: Built for developers and AI agents

## Status

🚧 **Under Development** - MVP in progress

## Tech Stack

- **Payments**: x402 protocol (Coinbase)
- **Currency**: USDC on Base (Ethereum L2)
- **Hosting**: Cloudflare Workers for Platforms
- **CLI**: Node.js (prototype in progress)

## Project Structure

```
402claw/
├── research/           # Market research and technical analysis
│   ├── claude-research/    # Claude's research output
│   └── codex-research/     # Codex's research output
├── prototypes/         # Working prototypes
│   ├── x402-server/        # Basic x402 Express server
│   ├── csv-api/            # Dispatcher + tenant routing prototype
│   ├── cli/                # Deploy/registry CLI prototype
│   └── ...                 # Additional runtime prototypes
├── research/codex-research/prototypes/
│   └── x402-csv-api-poc/   # CSV-to-API proof of concept
├── docs/               # Documentation (coming soon)
└── specs/              # API and protocol specifications
```

## Research

This project includes extensive research on:
- x402 protocol implementation
- Cloudflare Workers for Platforms architecture
- Competitive analysis (RapidAPI, Val.town, Seren)
- Market sizing and pricing strategy

See `/research` for details.

## Quick Start (Prototype)

```bash
# Run the x402 prototype server
cd prototypes/x402-server
npm install
npm start

# Test endpoints
curl http://localhost:4021/health        # Free
curl http://localhost:4021/data          # Returns 402 (payment required)

# Run the CSV-to-API x402 PoC
cd research/codex-research/prototypes/x402-csv-api-poc
npm test
npm run demo

# Run dispatcher prototype tests
cd /Users/Shared/Projects/402claw/prototypes/csv-api
npm test

# Run CLI prototype tests
cd /Users/Shared/Projects/402claw/prototypes/cli
npm test

# Preview Cloudflare dispatcher deployment payload (dry-run)
node src/index.js cloudflare-deploy-dispatcher \
  --registry /tmp/402claw-registry.json \
  --script-name claw-dispatcher \
  --account-id acc_demo \
  --api-token token_demo \
  --dispatch-namespace ns_demo

# Preview rollback target from deployment history
node src/index.js cloudflare-rollback-dispatcher \
  --state-path /tmp/402claw-state.json \
  --script-name claw-dispatcher \
  --account-id acc_demo \
  --api-token token_demo

# Deploy a JS function tenant
node src/index.js deploy ./examples/hello.js \
  --tenant hello-fn \
  --type function \
  --price 0.01 \
  --quota-day 5000 \
  --quota-month 100000 \
  --x402 true

# Wrap an upstream API as paid endpoint
node src/index.js wrap https://api.example.com/v1 \
  --tenant wrapped-api \
  --price 0.002 \
  --method GET \
  --cache-ttl 60 \
  --caller-rate-limit 20/60s

# Wrap with secret header references (kept out of registry plaintext)
OPENAI_API_KEY=sk-demo node src/index.js wrap https://api.example.com/v1 \
  --tenant wrapped-secret-api \
  --price 0.002 \
  --inject-header-secret "Authorization: OPENAI_API_KEY" \
  --publish \
  --dispatch-namespace clawr-staging \
  --account-id <cloudflare-account-id> \
  --api-token <cloudflare-api-token> \
  --execute
```

## Roadmap

- [x] Research phase
- [x] x402 prototype
- [ ] CLI MVP
- [ ] Cloudflare Workers integration
- [ ] Public beta

## CI

GitHub Actions pipeline is defined in `/Users/Shared/Projects/402claw/.github/workflows/ci.yml` and runs:
- frontend lint + build
- CLI tests
- dispatcher tests
- x402 server tests

## Team

Built by [Ferdi](https://github.com/ferdiboxman) with AI assistance from Claude and Codex.

## License

MIT
