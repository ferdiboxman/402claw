# Deep Research: x402 Protocol Deep Dive

**Date:** 2026-02-12
**Researcher:** OpenClaw Subagent
**Subject:** Comprehensive analysis of the x402 payment protocol

---

## Table of Contents
1. [Protocol Overview](#1-protocol-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Payment Flow in Detail](#3-payment-flow-in-detail)
4. [Payment Schemes](#4-payment-schemes)
5. [Network Support](#5-network-support)
6. [Facilitator Deep Dive](#6-facilitator-deep-dive)
7. [Transport Layers](#7-transport-layers)
8. [Security Considerations](#8-security-considerations)
9. [Limitations & Edge Cases](#9-limitations--edge-cases)
10. [Fee Structure](#10-fee-structure)

---

## 1. Protocol Overview

### What is x402?

x402 is an **open standard for internet-native payments** developed by Coinbase. It repurposes HTTP's status code 402 ("Payment Required") to enable programmatic payments for web resources.

### Design Principles

1. **Open standard** - No single party controls it
2. **HTTP/Transport native** - Seamlessly integrates with existing web infrastructure
3. **Network agnostic** - Supports multiple blockchains and fiat
4. **Backwards compatible** - Won't deprecate existing networks
5. **Trust minimizing** - Facilitators can't move funds beyond client intentions
6. **Easy to use** - 10x better than subscriptions and API keys

### Core Innovation

Traditional API monetization:
```
Developer → Creates API → Sets up Stripe → Creates subscription plans → 
User → Creates account → Enters credit card → Subscribes → Gets API key →
User → Calls API with key → Developer → Checks subscription → Returns data
```

x402 monetization:
```
Developer → Adds middleware → Sets price
Agent/User → Calls API → Gets 402 → Signs payment → Retries → Gets data
```

**Key difference:** No accounts, no subscriptions, no API keys. Just pay-per-use.

---

## 2. Technical Architecture

### Protocol Components

```
┌─────────────────────────────────────────────────────────────┐
│                      x402 Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  Client  │───▶│  Resource Server │───▶│  Facilitator │  │
│  │  (Agent) │◀───│   (Your API)     │◀───│  (Coinbase)  │  │
│  └──────────┘    └──────────────────┘    └──────────────┘  │
│       │                   │                     │           │
│       │                   │                     │           │
│       ▼                   ▼                     ▼           │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  Wallet  │    │    Blockchain    │    │     RPC      │  │
│  │(Signing) │    │  (Settlement)    │    │   Provider   │  │
│  └──────────┘    └──────────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Three-Layer Design

**Layer 1: Types (Transport-independent)**
```typescript
interface PaymentRequirements {
    scheme: string;           // How to pay (exact, upto)
    network: string;          // Where to pay (base, ethereum)
    maxAmountRequired: string;// How much
    asset: string;           // What currency
    payTo: string;           // Who receives
    resource: string;        // What you're paying for
    maxTimeoutSeconds: number;// How long payment is valid
}

interface PaymentPayload {
    x402Version: number;
    scheme: string;
    network: string;
    payload: SchemePayload;  // Scheme-specific data
}

interface SettlementResponse {
    success: boolean;
    transaction: string;     // Blockchain tx hash
    network: string;
    payer: string;
}
```

**Layer 2: Logic (Scheme-dependent)**
- How to construct payments
- How to verify signatures
- How to settle on-chain

**Layer 3: Representation (Transport-dependent)**
- How to encode in HTTP headers
- How to embed in MCP messages
- How to include in A2A protocols

---

## 3. Payment Flow in Detail

### Step-by-Step Flow

```
1. INITIAL REQUEST
   Client ──HTTP GET /resource──▶ Resource Server
   
2. PAYMENT REQUIRED RESPONSE
   Resource Server ◀── 402 + PAYMENT-REQUIRED header ──
   
   Header contains (base64):
   {
     "x402Version": 1,
     "error": "Payment required",
     "accepts": [{
       "scheme": "exact",
       "network": "base",
       "maxAmountRequired": "10000",  // 0.01 USDC
       "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
       "payTo": "0x...",
       "resource": "https://api.example.com/data",
       "maxTimeoutSeconds": 300
     }]
   }

3. CLIENT CREATES PAYMENT
   - Selects one of the accepted payment methods
   - Creates EIP-3009 TransferWithAuthorization
   - Signs with EIP-712 typed data
   
   Authorization message:
   {
     "from": "0xClientAddress",
     "to": "0xPayToAddress",
     "value": "10000",
     "validAfter": "1740672089",
     "validBefore": "1740672389",
     "nonce": "0x..."  // Random 32 bytes
   }

4. RETRY WITH PAYMENT
   Client ──HTTP GET /resource──▶ Resource Server
          + PAYMENT-SIGNATURE header
   
   Header contains (base64):
   {
     "x402Version": 1,
     "scheme": "exact",
     "network": "base",
     "payload": {
       "signature": "0x...",
       "authorization": {...}
     }
   }

5. VERIFICATION (Optional with Facilitator)
   Resource Server ──POST /verify──▶ Facilitator
   
   Facilitator checks:
   - Valid signature
   - Sufficient balance
   - Correct amount
   - Valid time window
   - Parameters match requirements
   - Transaction would succeed (simulation)

6. EXECUTE REQUEST
   Resource Server processes the request
   Returns data to client

7. SETTLEMENT
   Resource Server ──POST /settle──▶ Facilitator
   Facilitator ──transferWithAuthorization()──▶ Blockchain
   
   On-chain:
   - USDC transferred from client to payTo
   - Transaction hash returned
   - Client's nonce marked as used (replay protection)

8. RESPONSE WITH PAYMENT PROOF
   Resource Server ◀── 200 OK + PAYMENT-RESPONSE header ──
   
   Header contains:
   {
     "success": true,
     "transaction": "0x...",
     "network": "base",
     "payer": "0xClientAddress"
   }
```

### Timing Diagram

```
Client          Server          Facilitator      Blockchain
  │                │                 │               │
  │───GET /api────▶│                 │               │
  │◀──402 + req────│                 │               │
  │                │                 │               │
  │ [sign EIP-712] │                 │               │
  │                │                 │               │
  │───GET + pay───▶│                 │               │
  │                │────verify───────▶│               │
  │                │◀───valid────────│               │
  │                │                 │               │
  │       [process request]          │               │
  │                │                 │               │
  │                │────settle───────▶│               │
  │                │                 │───tx─────────▶│
  │                │                 │◀──confirmed───│
  │                │◀───success──────│               │
  │◀──200 + proof──│                 │               │
  │                │                 │               │
```

---

## 4. Payment Schemes

### Current Schemes

#### "exact" Scheme (Primary)
Transfers an exact, fixed amount.

**Use cases:**
- Pay $0.01 per API call
- Pay $1 for a file download
- Pay $0.001 per token generated

**EVM Implementation (EIP-3009):**
```solidity
function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes signature
) external;
```

**Why EIP-3009?**
1. **Gasless for user** - Server/facilitator pays gas
2. **Atomic** - Either transfers or fails
3. **Time-bound** - Built-in expiration
4. **Replay-protected** - Unique nonce per authorization

#### Planned Schemes

**"upto" Scheme:**
- Authorize up to X amount
- Server charges actual usage
- Use case: LLM token billing

**"stream" Scheme:**
- Continuous micropayments
- Use case: Real-time data feeds

**"subscribe" Scheme:**
- Time-based access
- Use case: Monthly API access

---

## 5. Network Support

### Currently Supported Networks

| Network | Chain ID | Status | Assets |
|---------|----------|--------|--------|
| Base | 8453 | Production | USDC |
| Base Sepolia | 84532 | Testnet | USDC |
| Ethereum | 1 | Production | USDC |
| Ethereum Sepolia | 11155111 | Testnet | USDC |
| Avalanche | 43114 | Production | USDC |
| Avalanche Fuji | 43113 | Testnet | USDC |
| IoTeX | 4689 | Production | USDC |
| Solana | - | Beta | USDC |
| Solana Devnet | - | Testnet | USDC |

### Network Identifier Formats

```
// Named networks
"base", "ethereum", "avalanche"

// EIP-155 CAIP format
"eip155:8453"    // Base
"eip155:1"       // Ethereum

// Solana
"solana-mainnet", "solana-devnet"
```

### USDC Addresses by Network

```typescript
const USDC_ADDRESSES = {
    "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "avalanche": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
}
```

---

## 6. Facilitator Deep Dive

### What is a Facilitator?

A facilitator is a trusted service that:
1. **Verifies** payment signatures are valid
2. **Simulates** transactions before execution
3. **Settles** payments on-chain
4. **Abstracts** blockchain complexity from servers

### Facilitator API

**POST /verify**
```json
Request:
{
    "paymentPayload": { /* PaymentPayload */ },
    "paymentRequirements": { /* PaymentRequirements */ }
}

Response (success):
{
    "isValid": true,
    "payer": "0x..."
}

Response (failure):
{
    "isValid": false,
    "invalidReason": "insufficient_funds",
    "payer": "0x..."
}
```

**POST /settle**
```json
Request:
{
    "paymentPayload": { /* PaymentPayload */ },
    "paymentRequirements": { /* PaymentRequirements */ }
}

Response (success):
{
    "success": true,
    "transaction": "0x...",
    "network": "base",
    "payer": "0x..."
}

Response (failure):
{
    "success": false,
    "errorReason": "nonce_already_used",
    "transaction": "",
    "network": "base",
    "payer": "0x..."
}
```

**GET /supported**
```json
Response:
{
    "kinds": [
        { "x402Version": 1, "scheme": "exact", "network": "base" },
        { "x402Version": 1, "scheme": "exact", "network": "avalanche" }
    ]
}
```

### Known Facilitators

1. **Coinbase Facilitator** - Default, production-ready
2. **MCPay Facilitator** - For MCP-specific use cases
3. **Self-hosted** - Run your own with x402 SDK

### Verification Process

```
1. Decode PaymentPayload
2. Validate x402Version matches
3. Validate scheme is supported
4. Validate network is supported
5. Recover signer from signature
6. Check signer has sufficient balance
7. Validate amount >= maxAmountRequired
8. Validate time window (validAfter < now < validBefore)
9. Validate payTo matches requirements
10. Simulate transferWithAuthorization on-chain
11. Return verification result
```

---

## 7. Transport Layers

### HTTP Transport (Primary)

**Request Headers:**
```
X-PAYMENT: <base64-encoded PaymentPayload>
```

**Response Headers:**
```
PAYMENT-REQUIRED: <base64-encoded PaymentRequirementsResponse>
PAYMENT-RESPONSE: <base64-encoded SettlementResponse>
```

### MCP Transport

**Tool-level pricing in annotations:**
```json
{
    "name": "search",
    "annotations": {
        "paymentHint": true,
        "paymentPriceUSD": "$0.001",
        "paymentNetworks": [
            { "network": "base", "recipient": "0x..." }
        ]
    }
}
```

**Payment in _meta:**
```json
{
    "method": "tools/call",
    "params": {
        "name": "search",
        "_meta": {
            "x402/payment": "<base64-encoded PaymentPayload>"
        }
    }
}
```

### A2A Transport (Agent-to-Agent)

Uses same JSON structures but within A2A message envelopes.

---

## 8. Security Considerations

### Replay Attack Prevention

1. **Unique nonce** - Random 32 bytes per authorization
2. **EIP-3009 on-chain protection** - Contract tracks used nonces
3. **Time window** - validBefore/validAfter limit validity

### Trust Model

```
┌─────────────────────────────────────────────────────────┐
│                    Trust Boundaries                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Client trusts:                                          │
│  - Wallet to sign correctly                              │
│  - Resource server to deliver after payment              │
│                                                          │
│  Server trusts:                                          │
│  - Facilitator to verify honestly                        │
│  - Facilitator to settle correctly                       │
│  - Blockchain finality                                   │
│                                                          │
│  Facilitator can:                                        │
│  - See all payment details                               │
│  - Refuse to settle                                      │
│  - Cannot: Move funds beyond authorization               │
│  - Cannot: Reuse nonces                                  │
│  - Cannot: Change amounts                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Signature Security

```typescript
// EIP-712 Domain
const domain = {
    name: "USD Coin",
    version: "2",
    chainId: 8453,
    verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
};

// Type definitions
const types = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
    ]
};
```

---

## 9. Limitations & Edge Cases

### Current Limitations

1. **No partial payments** - exact scheme is all-or-nothing
2. **No refunds** - once settled, no automatic reversal
3. **No subscriptions** - each request is independent
4. **Single asset per request** - can't split across tokens
5. **No off-chain settlement** - always on-chain

### Edge Cases

**Network congestion:**
- Facilitator may fail to settle in time
- Server should handle settlement timeouts
- Client authorization may expire

**Duplicate requests:**
- Same nonce can only be used once
- Retry with new nonce if first attempt unclear

**Price changes:**
- Server can return different prices per request
- Client must accept current price

**Wallet balance changes:**
- Balance checked at verification time
- May fail at settlement if balance dropped

### Error Codes

| Code | Meaning |
|------|---------|
| `insufficient_funds` | Client doesn't have enough tokens |
| `invalid_signature` | Signature verification failed |
| `invalid_network` | Network not supported |
| `invalid_scheme` | Scheme not supported |
| `nonce_already_used` | Replay attack detected |
| `authorization_expired` | validBefore passed |
| `authorization_not_yet_valid` | validAfter not reached |
| `settlement_failed` | On-chain transaction failed |

---

## 10. Fee Structure

### Protocol Fees

**x402 Protocol:** Free - no protocol fees

### Facilitator Fees

**Coinbase Facilitator:**
- Verification: Free
- Settlement: Gas costs absorbed
- No additional fees (as of Feb 2026)

**MCPay Facilitator:**
- Listed on mcpay.tech
- Fees vary by provider

### Gas Costs

**EVM Networks:**
```
transferWithAuthorization gas: ~65,000-80,000
Base network gas: ~0.001-0.01 GWEI
Typical cost: $0.001-$0.01 per payment
```

**Who pays gas?**
- Facilitator pays gas for settlement
- Absorbed into service cost
- Client pays no gas directly

### Stripe x402 Fees

When using Stripe as facilitator:
- Settlement: Standard Stripe fees apply
- Machine payments: Preview pricing TBD
- Crypto: Typically 1.5% + gas

---

## Protocol Specification Summary

```yaml
x402 Protocol:
  version: 1
  status: Production
  
  components:
    - types: Transport-independent data structures
    - logic: Scheme and network specific
    - transport: HTTP, MCP, A2A
    
  schemes:
    exact:
      status: Production
      networks: [base, ethereum, avalanche, solana]
      implementation: EIP-3009 (EVM), TransferChecked (SVM)
      
  facilitator_api:
    endpoints:
      - POST /verify
      - POST /settle
      - GET /supported
      
  security:
    replay_protection: Nonce + on-chain tracking
    time_bounds: validAfter, validBefore
    signature: EIP-712 typed data
    
  limitations:
    - No partial payments
    - No subscriptions
    - No refunds
    - Single asset per request
```

---

*Document generated by OpenClaw Deep Research Agent*
*Based on: x402 Specification v1, Coinbase x402 Repository*
