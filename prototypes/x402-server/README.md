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

# Test free endpoint
curl http://localhost:4021/health

# Test paid endpoint (returns 402)
curl -v http://localhost:4021/data
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

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4021 | Server port |
| `PAY_TO` | (hardcoded) | Recipient wallet address |
| `NETWORK` | eip155:84532 | Network (Base Sepolia) |
| `FACILITATOR_URL` | x402.org | Payment facilitator |

## Files

- `server.js` - Express server with x402 middleware
- `client.js` - Client demonstration
- `test-scenarios.sh` - Shell script for testing
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
