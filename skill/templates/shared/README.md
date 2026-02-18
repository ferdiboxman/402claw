# Shared x402 Configs

Template files shared across all x402 server implementations.

## Files

### `bazaar-metadata.json`

Example metadata for registering your API with the x402 Bazaar discovery service. Served at `/.well-known/x402` by your API. Clients and agents use this to discover available paid endpoints, their prices, and payment details.

**Fields:**
- `name` / `description` – Human-readable API info
- `url` – Your API's base URL
- `endpoints[]` – Each paid endpoint with path, method, price, and currency
- `tags` – Categories for discovery
- `docs` – Link to API documentation
- `facilitator` – Facilitator URL for payment verification
- `recipient` – Wallet address receiving payments

### `x402-response.json`

Example 402 response body. This is what your server returns when a client hits a paid endpoint without an `X-PAYMENT` header. The client uses these fields to construct and submit a USDC payment on Base, then retries with the payment proof.

**Key fields:**
- `maxAmountRequired` – Amount in USDC base units (6 decimals, so `10000` = $0.01)
- `payTo` – Recipient wallet address
- `chainId` – `8453` (Base)
- `usdcAddress` – USDC contract on Base
- `facilitatorUrl` – Where to verify payment proof
