# AI Skill Example

Sell AI inference as a paid API using x402.

## What it does

Exposes an endpoint that calls OpenAI's GPT-4 and charges $0.01 per request via x402. Turn your AI expertise into a monetized API.

## Setup

```bash
npm install
export OPENAI_API_KEY=sk-...
export WALLET=0x...
npm run dev
```

## Test

```bash
# Get pricing
curl http://localhost:3000/api/ask

# Pay and query
npx x402-fetch "http://localhost:3000/api/ask?q=What+is+x402"
```
