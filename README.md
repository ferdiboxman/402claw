# 402claw

> Deploy your data, get a paid API. One command.

402claw is a platform for deploying paid APIs with x402 micropayments. Upload a CSV or JSON file, set a price, and get a working API endpoint that earns you money.

## Why 402claw?

- **One command deployment**: `402claw deploy data.csv --price 0.001`
- **Micropayments that work**: x402 protocol + USDC on Base = sub-cent transactions
- **5% fee** (vs RapidAPI's 25%)
- **CLI-first**: Built for developers and AI agents

## Status

🚧 **Under Development** - MVP in progress

## Tech Stack

- **Payments**: x402 protocol (Coinbase)
- **Currency**: USDC on Base (Ethereum L2)
- **Hosting**: Cloudflare Workers for Platforms
- **CLI**: Node.js + Commander.js

## Project Structure

```
402claw/
├── research/           # Market research and technical analysis
│   ├── claude-research/    # Claude's research output
│   └── codex-research/     # Codex's research output
├── prototypes/         # Working prototypes
│   ├── x402-server/        # Basic x402 Express server
│   └── x402-csv-api-poc/   # CSV-to-API proof of concept
├── docs/               # Documentation (coming soon)
├── packages/           # Monorepo packages (coming soon)
│   ├── cli/               # 402claw CLI
│   ├── sdk/               # Client SDK
│   └── worker/            # Cloudflare Worker runtime
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
```

## Roadmap

- [x] Research phase
- [x] x402 prototype
- [ ] CLI MVP
- [ ] Cloudflare Workers integration
- [ ] Public beta

## Team

Built by [Ferdi](https://github.com/ferdiboxman) with AI assistance from Claude and Codex.

## License

MIT
