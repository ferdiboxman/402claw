# x402 Prototype

A minimal implementation of the x402 payment protocol to understand how it works in practice.

## What is x402?

x402 is a payment protocol that uses the HTTP 402 "Payment Required" status code to enable programmatic payments over HTTP. It allows APIs to be monetized without accounts, sessions, or complex authentication.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Explicit test mode (default)
X402_ENV=test npm start

# Production mode (uses CDP facilitator + Base mainnet defaults)
X402_ENV=prod FACILITATOR_API_KEY=your_cdp_bearer_token npm start

# Test free endpoint
curl http://localhost:4021/health

# Test paid endpoint (returns 402)
curl -v http://localhost:4021/data

# Run unit + scenario tests
npm test

# Optional: run a real paid call (skips if key missing)
WALLET_PRIVATE_KEY=0x... npm run test:live
```

## Architecture

```
┌─────────────┐    Request     ┌──────────────────┐
│   Client    │───────────────▶│  Express Server  │
│             │◀───────────────│  + x402 Middleware│
└─────────────┘    402 + Info   └────────┬─────────┘
       │                                 │
       │ Create signed payment           │ Verify/Settle
       │                                 │
       ▼                                 ▼
┌─────────────┐                 ┌──────────────────┐
│   Wallet    │                 │   Facilitator    │
│ (Signs tx)  │                 │ (x402.org/CDP)   │
└─────────────┘                 └──────────────────┘
```

## Endpoints

### Free Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /pricing` | View all endpoint prices |

### Paid Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /data` | $0.001 | Basic JSON data |
| `GET /data/premium` | $0.01 | Premium JSON with analytics |
| `GET /csv` | $0.005 | CSV file download |
| `GET /csv/filtered` | $0.002 | Filtered/paginated CSV |

## 402 Response Structure

When accessing a paid endpoint without payment, the server returns:

```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <base64-encoded-JSON>
```

Decoded payment requirements:

```json
{
  "x402Version": 2,
  "error": "Payment required",
  "resource": {
    "url": "http://localhost:4021/data",
    "description": "Get mock JSON data",
    "mimeType": "application/json"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:84532",
      "amount": "1000",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
      "maxTimeoutSeconds": 300,
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    }
  ]
}
```

## Making a Paid Request

To access paid endpoints, use the `@x402/fetch` client SDK:

```javascript
import { wrapFetch } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { toClientEvmSigner } from '@x402/evm';

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http()
});

const x402Fetch = wrapFetch({
  signers: {
    'eip155:84532': toClientEvmSigner(walletClient)
  }
});

// Automatically handles 402 and payment
const response = await x402Fetch('http://localhost:4021/data');
const data = await response.json();
```

CLI shortcut in this prototype:

```bash
# Inspect 402 challenge
node client.js challenge /data

# Execute real payment (requires funded wallet key)
WALLET_PRIVATE_KEY=0x... node client.js pay /data
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `X402_ENV` | `test` | Runtime mode (`test` or `prod`) |
| `PORT` | 4021 | Server port |
| `PAY_TO` | (hardcoded) | Recipient wallet address |
| `NETWORK` | env-based | Optional override (`eip155:84532` test / `eip155:8453` prod) |
| `FACILITATOR_URL` | env-based | Optional override (`x402.org/facilitator` test / CDP prod) |
| `FACILITATOR_API_KEY` | (none) | Required for CDP facilitator in prod mode (`Authorization: Bearer ...`) |

Guardrail:
- In `X402_ENV=prod`, using `https://x402.org/facilitator` is blocked at startup.
- In `X402_ENV=prod` with CDP facilitator, `FACILITATOR_API_KEY` is required.

## Files

- `server.js` - Express server with x402 middleware
- `client.js` - Client CLI (`health`, `pricing`, `challenge`, `pay`)
- `config.js` - Env/network/facilitator policy helpers
- `test-scenarios.sh` - Shell script for testing (auto-starts server by default)
- `tests/config.test.js` - Unit tests for runtime config rules
- `scripts/live-payment-test.js` - Optional live paid-flow test
- `data/sample.csv` - Sample CSV data

## Networks

| Network | Chain ID | CAIP-2 Format |
|---------|----------|---------------|
| Base Sepolia | 84532 | eip155:84532 |
| Base Mainnet | 8453 | eip155:8453 |

## Learn More

- [x402 Documentation](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 GitHub](https://github.com/coinbase/x402)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
