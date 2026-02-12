# x402 Protocol Deep Dive: A Comprehensive Implementation Analysis

**Author:** Clawsenberg (AI Analysis)  
**Date:** February 12, 2026  
**Repository:** https://github.com/coinbase/x402  
**Protocol Versions Analyzed:** v1 and v2

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Protocol Architecture](#2-protocol-architecture)
3. [Core Data Structures](#3-core-data-structures)
4. [Payment Schemes](#4-payment-schemes)
5. [The Facilitator Pattern](#5-the-facilitator-pattern)
6. [TypeScript SDK Deep Dive](#6-typescript-sdk-deep-dive)
7. [Payment Flow Analysis](#7-payment-flow-analysis)
8. [Integration Patterns](#8-integration-patterns)
9. [Cryptographic Operations](#9-cryptographic-operations)
10. [Error Handling Patterns](#10-error-handling-patterns)
11. [Limitations and Edge Cases](#11-limitations-and-edge-cases)
12. [Implementation Plan for 402claw](#12-implementation-plan-for-402claw)

---

## 1. Executive Summary

x402 is an **open standard for internet-native payments** developed by Coinbase. It implements HTTP 402 "Payment Required" for the modern web, enabling micropayments for APIs, content, and digital services.

### Key Principles

1. **Open Standard** - Freely accessible, no vendor lock-in
2. **HTTP/Transport Native** - Seamless integration with existing HTTP infrastructure
3. **Network Agnostic** - Supports EVM (Ethereum, Base, etc.), Solana, and extensible to fiat
4. **Trust Minimizing** - Facilitators cannot move funds outside client intentions
5. **Easy to Use** - "10x better than existing payment methods"

### Protocol Versions

| Version | Status | Key Features |
|---------|--------|--------------|
| v1 | Legacy | Original spec, simpler structure |
| v2 | Current | CAIP-2 networks, extensions, restructured payloads |

---

## 2. Protocol Architecture

The x402 protocol is built on three pillars:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         x402 ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │    TYPES    │     │      LOGIC      │     │ REPRESENTATION  │   │
│  ├─────────────┤     ├─────────────────┤     ├─────────────────┤   │
│  │ PaymentReq  │     │ exact scheme    │     │ HTTP headers    │   │
│  │ PaymentPay  │     │ EVM/SVM verify  │     │ MCP _meta       │   │
│  │ SettleResp  │     │ settle logic    │     │ A2A protocol    │   │
│  │ ResourceInfo│     │ signature ops   │     │ Base64 encoding │   │
│  └─────────────┘     └─────────────────┘     └─────────────────┘   │
│       ↑                      ↑                       ↑              │
│       │                      │                       │              │
│       └──────────────────────┼───────────────────────┘              │
│                              │                                      │
│                    Independent Layers                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Three Primary Components

1. **Resource Server** - HTTP server requiring payment for access
2. **Client** - Application requesting paid resources
3. **Facilitator** - Service handling payment verification and blockchain settlement

---

## 3. Core Data Structures

### 3.1 PaymentRequired (402 Response)

When a server requires payment, it returns a 402 status with this structure:

```typescript
// From: typescript/packages/core/src/types/payments.ts
export type PaymentRequired = {
  x402Version: number;
  error?: string;
  resource: ResourceInfo;
  accepts: PaymentRequirements[];
  extensions?: Record<string, unknown>;
};

export interface ResourceInfo {
  url: string;
  description: string;
  mimeType: string;
}

export type PaymentRequirements = {
  scheme: string;                    // "exact"
  network: Network;                  // "eip155:8453" (CAIP-2 format)
  asset: string;                     // Token contract address
  amount: string;                    // Amount in atomic units
  payTo: string;                     // Recipient address
  maxTimeoutSeconds: number;         // Timeout for payment
  extra: Record<string, unknown>;    // Scheme-specific data
};
```

**Real Example from Specs:**

```json
{
  "x402Version": 2,
  "error": "PAYMENT-SIGNATURE header is required",
  "resource": {
    "url": "https://api.example.com/premium-data",
    "description": "Access to premium market data",
    "mimeType": "application/json"
  },
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:84532",
      "amount": "10000",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    }
  ]
}
```

### 3.2 PaymentPayload (Client Submission)

```typescript
// From: typescript/packages/core/src/types/payments.ts
export type PaymentPayload = {
  x402Version: number;
  resource: ResourceInfo;
  accepted: PaymentRequirements;     // Which requirements client accepted
  payload: Record<string, unknown>;  // Scheme-specific signature/auth
  extensions?: Record<string, unknown>;
};
```

### 3.3 Settlement Response

```typescript
// From: typescript/packages/core/src/types/facilitator.ts
export type SettleResponse = {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;              // Blockchain tx hash
  network: Network;
  extensions?: Record<string, unknown>;
};
```

---

## 4. Payment Schemes

### 4.1 The "Exact" Scheme

The primary payment scheme transfers an **exact amount** from client to server.

#### EVM Implementation (EIP-3009)

Uses `transferWithAuthorization` for **gasless** transfers:

```typescript
// From: typescript/packages/mechanisms/evm/src/constants.ts
export const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};
```

The client signs an EIP-712 typed message. The facilitator (not the client) broadcasts the transaction and pays gas.

**Payload Structure:**

```json
{
  "signature": "0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c34...",
  "authorization": {
    "from": "0x857b06519E91e3A54538791bDbb0E22373e36b66",
    "to": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
    "value": "10000",
    "validAfter": "1740672089",
    "validBefore": "1740672154",
    "nonce": "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480"
  }
}
```

#### Solana Implementation (SVM)

Uses `TransferChecked` with a partially-signed transaction:

```typescript
// The client builds and partially signs the transaction
// Facilitator completes signature and broadcasts
{
  "payload": {
    "transaction": "AAAAAAAAAAAAA...AAAAAAAAAAAAA="  // Base64 encoded
  }
}
```

**Critical SVM Verification Rules:**

1. Transaction must contain 3-5 instructions: ComputeUnit Limit, ComputeUnit Price, TransferChecked, (optional Lighthouse)
2. Fee payer must NOT appear in any instruction accounts
3. Compute unit price bounded to prevent gas abuse (≤5 lamports/CU)
4. Amount must exactly equal `PaymentRequirements.amount`

---

## 5. The Facilitator Pattern

### 5.1 What is a Facilitator?

A facilitator is a **trusted third-party service** that:

1. **Verifies** payment authorizations (signature + balance checks)
2. **Settles** payments on-chain (broadcasts transactions, pays gas)
3. **Reports** supported networks and schemes

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FACILITATOR INTERACTION                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  1. Request   ┌──────────────┐  5. Verify  ┌────────┐ │
│  │ Client  │ ──────────────▶│   Resource   │ ──────────▶│Facilit.│ │
│  │         │ ◀──────────────│    Server    │ ◀──────────│        │ │
│  └─────────┘  2. 402 + Req └──────────────┘  6. Valid   └────────┘ │
│      │                            │                          │      │
│      │ 3. Sign payment            │                          │      │
│      │                            │ 7. Do work               │      │
│      │ 4. Retry with payment      │                          │      │
│      └────────────────────────────▶                          │      │
│                                   │ 8. Settle                │      │
│                                   └──────────────────────────▶      │
│                                                              │      │
│                                   ◀──────────────────────────┘      │
│                                   9. Tx hash                        │
│                                                                     │
│                                   10. 200 OK + PAYMENT-RESPONSE     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Facilitator API Endpoints

```typescript
// From: typescript/packages/core/src/http/httpFacilitatorClient.ts

// POST /verify - Verify without executing
async verify(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse>

// POST /settle - Execute payment on-chain
async settle(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse>

// GET /supported - List supported schemes/networks
async getSupported(): Promise<SupportedResponse>
```

### 5.3 Coinbase Hosted Facilitator

Default URL: `https://x402.org/facilitator`

The Coinbase facilitator:
- Supports EVM networks (Base, Base Sepolia, Avalanche, etc.)
- Supports Solana mainnet and devnet
- Pays gas fees for users
- No fees charged to merchants (currently)

### 5.4 Building Your Own Facilitator

```typescript
// From: examples/typescript/facilitator/basic/index.ts
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { ExactSvmScheme } from "@x402/svm/exact/facilitator";

const facilitator = new x402Facilitator()
  .onBeforeVerify(async (context) => {
    console.log("Before verify", context);
  })
  .onAfterVerify(async (context) => {
    console.log("After verify", context);
  })
  .onBeforeSettle(async (context) => {
    console.log("Before settle", context);
  })
  .onAfterSettle(async (context) => {
    console.log("After settle", context);
  });

// Register EVM support
facilitator.register(
  "eip155:84532",  // Base Sepolia
  new ExactEvmScheme(evmSigner, { deployERC4337WithEIP6492: true })
);

// Register SVM support
facilitator.register(
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",  // Devnet
  new ExactSvmScheme(svmSigner)
);
```

### 5.5 Facilitator Tradeoffs

| Approach | Pros | Cons |
|----------|------|------|
| Coinbase Hosted | Zero setup, gas paid | Dependency on Coinbase |
| Self-Hosted | Full control, customization | Must pay gas, maintain service |
| Hybrid | Custom logic + fallback | Complexity |

---

## 6. TypeScript SDK Deep Dive

### 6.1 Package Architecture

```
typescript/packages/
├── core/                    # Transport-agnostic core
│   ├── client/             # x402Client base
│   ├── facilitator/        # x402Facilitator base
│   ├── server/             # x402ResourceServer base
│   ├── http/               # HTTP utilities
│   └── types/              # Core type definitions
├── mechanisms/
│   ├── evm/                # EVM implementation
│   │   ├── exact/client/   # EIP-3009/Permit2 payload creation
│   │   ├── exact/facilitator/  # Verification & settlement
│   │   └── exact/server/   # Price parsing, requirements building
│   └── svm/                # Solana implementation
├── http/
│   ├── express/            # Express.js middleware
│   ├── hono/               # Hono middleware
│   ├── next/               # Next.js middleware
│   ├── fetch/              # Fetch wrapper
│   └── axios/              # Axios interceptor
├── mcp/                    # Model Context Protocol
└── extensions/             # Bazaar, etc.
```

### 6.2 Middleware Implementation Pattern

The middleware intercepts requests, checks for payment, and settles after successful responses:

```typescript
// Simplified from: typescript/packages/http/express/src/index.ts
export function paymentMiddlewareFromHTTPServer(httpServer: x402HTTPResourceServer) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = {
      path: req.path,
      method: req.method,
      paymentHeader: req.headers["payment-signature"] || req.headers["x-payment"],
    };

    // Check if route requires payment
    if (!httpServer.requiresPayment(context)) {
      return next();
    }

    // Process payment
    const result = await httpServer.processHTTPRequest(context);

    switch (result.type) {
      case "no-payment-required":
        return next();

      case "payment-error":
        // Return 402 with payment requirements
        res.status(402).json(result.response.body);
        return;

      case "payment-verified":
        // Payment valid! Buffer response, execute handler, then settle
        const { paymentPayload, paymentRequirements } = result;
        
        // Buffer response methods
        const originalEnd = res.end.bind(res);
        let bufferedResponse;
        res.end = (...args) => {
          bufferedResponse = args;
          return res;
        };

        // Execute handler
        await next();

        // Only settle if handler succeeded (status < 400)
        if (res.statusCode < 400) {
          const settleResult = await httpServer.processSettlement(
            paymentPayload,
            paymentRequirements
          );
          
          if (settleResult.success) {
            res.setHeader("PAYMENT-RESPONSE", settleResult.headers["PAYMENT-RESPONSE"]);
          }
        }

        // Flush buffered response
        originalEnd(...bufferedResponse);
        return;
    }
  };
}
```

**Key Insight:** The middleware **buffers the response** and only settles payment if the protected handler returns a success status. This prevents payment for failed requests.

### 6.3 Client-Side Flow

```typescript
// From: typescript/packages/http/fetch/src/index.ts
export function wrapFetchWithPayment(fetch: typeof globalThis.fetch, client: x402Client) {
  const httpClient = new x402HTTPClient(client);

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const response = await fetch(request.clone());

    if (response.status !== 402) {
      return response;  // No payment needed
    }

    // Parse payment requirements from 402 response
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      name => response.headers.get(name),
      await response.json()
    );

    // Create payment payload with signature
    const paymentPayload = await client.createPaymentPayload(paymentRequired);

    // Encode as header
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

    // Retry with payment
    const retryRequest = request.clone();
    for (const [key, value] of Object.entries(paymentHeaders)) {
      retryRequest.headers.set(key, value);
    }

    return fetch(retryRequest);
  };
}
```

### 6.4 EIP-3009 Payload Creation

```typescript
// From: typescript/packages/mechanisms/evm/src/exact/client/eip3009.ts
export async function createEIP3009Payload(
  signer: ClientEvmSigner,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayloadResult> {
  const nonce = createNonce();  // Random 32-byte hex
  const now = Math.floor(Date.now() / 1000);

  const authorization = {
    from: signer.address,
    to: getAddress(paymentRequirements.payTo),
    value: paymentRequirements.amount,
    validAfter: (now - 600).toString(),      // Valid from 10 min ago
    validBefore: (now + paymentRequirements.maxTimeoutSeconds).toString(),
    nonce,
  };

  // Sign using EIP-712
  const signature = await signer.signTypedData({
    domain: {
      name: paymentRequirements.extra.name,      // e.g., "USDC"
      version: paymentRequirements.extra.version, // e.g., "2"
      chainId: parseInt(paymentRequirements.network.split(":")[1]),
      verifyingContract: getAddress(paymentRequirements.asset),
    },
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization",
    message: {
      from: getAddress(authorization.from),
      to: getAddress(authorization.to),
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
  });

  return {
    x402Version,
    payload: { authorization, signature },
  };
}
```

### 6.5 Verification Logic

```typescript
// From: typescript/packages/mechanisms/evm/src/exact/facilitator/eip3009.ts
export async function verifyEIP3009(
  signer: FacilitatorEvmSigner,
  payload: PaymentPayload,
  requirements: PaymentRequirements,
  eip3009Payload: ExactEIP3009Payload,
): Promise<VerifyResponse> {
  const payer = eip3009Payload.authorization.from;

  // 1. Verify scheme matches
  if (payload.accepted.scheme !== "exact" || requirements.scheme !== "exact") {
    return { isValid: false, invalidReason: "unsupported_scheme", payer };
  }

  // 2. Verify network matches
  if (payload.accepted.network !== requirements.network) {
    return { isValid: false, invalidReason: "network_mismatch", payer };
  }

  // 3. Verify signature (EIP-712)
  try {
    const recoveredAddress = await signer.verifyTypedData({
      address: eip3009Payload.authorization.from,
      domain: {
        name: requirements.extra.name,
        version: requirements.extra.version,
        chainId: parseInt(requirements.network.split(":")[1]),
        verifyingContract: getAddress(requirements.asset),
      },
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message: { /* ... authorization fields ... */ },
      signature: eip3009Payload.signature,
    });

    if (!recoveredAddress) {
      return { isValid: false, invalidReason: "invalid_exact_evm_payload_signature", payer };
    }
  } catch {
    // Handle smart wallet signatures (EIP-6492)
    // ...
  }

  // 4. Verify recipient matches
  if (getAddress(eip3009Payload.authorization.to) !== getAddress(requirements.payTo)) {
    return { isValid: false, invalidReason: "invalid_exact_evm_payload_recipient_mismatch", payer };
  }

  // 5. Verify time window
  const now = Math.floor(Date.now() / 1000);
  if (BigInt(eip3009Payload.authorization.validBefore) < BigInt(now + 6)) {
    return { isValid: false, invalidReason: "invalid_exact_evm_payload_authorization_valid_before", payer };
  }

  // 6. Check balance
  const balance = await signer.readContract({
    address: getAddress(requirements.asset),
    abi: eip3009ABI,
    functionName: "balanceOf",
    args: [eip3009Payload.authorization.from],
  });

  if (BigInt(balance) < BigInt(requirements.amount)) {
    return {
      isValid: false,
      invalidReason: "insufficient_funds",
      invalidMessage: `Insufficient funds. Required: ${requirements.amount}, Available: ${balance}`,
      payer,
    };
  }

  // 7. Verify amount is sufficient
  if (BigInt(eip3009Payload.authorization.value) < BigInt(requirements.amount)) {
    return { isValid: false, invalidReason: "invalid_exact_evm_payload_authorization_value", payer };
  }

  return { isValid: true, payer };
}
```

---

## 7. Payment Flow Analysis

### 7.1 Simple Payment Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SIMPLE PAYMENT FLOW (HTTP)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLIENT                    SERVER                       FACILITATOR      │
│    │                         │                              │            │
│    │  1. GET /weather        │                              │            │
│    │ ────────────────────▶   │                              │            │
│    │                         │                              │            │
│    │  2. 402 Payment Req.    │                              │            │
│    │    PAYMENT-REQUIRED:    │                              │            │
│    │    (base64 JSON)        │                              │            │
│    │ ◀────────────────────   │                              │            │
│    │                         │                              │            │
│    │  3. Sign authorization  │                              │            │
│    │     (local, no network) │                              │            │
│    │                         │                              │            │
│    │  4. GET /weather        │                              │            │
│    │    PAYMENT-SIGNATURE:   │                              │            │
│    │    (base64 JSON)        │                              │            │
│    │ ────────────────────▶   │                              │            │
│    │                         │                              │            │
│    │                         │  5. POST /verify             │            │
│    │                         │ ──────────────────────────▶  │            │
│    │                         │                              │            │
│    │                         │  6. { isValid: true }        │            │
│    │                         │ ◀──────────────────────────  │            │
│    │                         │                              │            │
│    │                         │  7. Execute handler          │            │
│    │                         │     (return weather data)    │            │
│    │                         │                              │            │
│    │                         │  8. POST /settle             │            │
│    │                         │ ──────────────────────────▶  │            │
│    │                         │                              │            │
│    │                         │  9. { success: true,         │            │
│    │                         │       transaction: 0x... }   │            │
│    │                         │ ◀──────────────────────────  │            │
│    │                         │                              │            │
│    │  10. 200 OK             │                              │            │
│    │      PAYMENT-RESPONSE:  │                              │            │
│    │      (base64 JSON)      │                              │            │
│    │      { weather data }   │                              │            │
│    │ ◀────────────────────   │                              │            │
│    │                         │                              │            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Payment with Retry (Balance Check Failed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT WITH RETRY                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLIENT                    SERVER                       FACILITATOR      │
│    │                         │                              │            │
│    │  1-4. (same as above)   │                              │            │
│    │                         │                              │            │
│    │                         │  5. POST /verify             │            │
│    │                         │ ──────────────────────────▶  │            │
│    │                         │                              │            │
│    │                         │  6. { isValid: false,        │            │
│    │                         │       invalidReason:         │            │
│    │                         │       "insufficient_funds" } │            │
│    │                         │ ◀──────────────────────────  │            │
│    │                         │                              │            │
│    │  7. 402 Payment Failed  │                              │            │
│    │    PAYMENT-REQUIRED:    │                              │            │
│    │    (same requirements)  │                              │            │
│    │ ◀────────────────────   │                              │            │
│    │                         │                              │            │
│    │  8. User adds funds     │                              │            │
│    │                         │                              │            │
│    │  9-15. Retry flow       │                              │            │
│    │  (same as simple flow)  │                              │            │
│    │                         │                              │            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Settlement Failure (After Handler Success)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SETTLEMENT FAILURE SCENARIO                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLIENT                    SERVER                       FACILITATOR      │
│    │                         │                              │            │
│    │  1-7. (verify success,  │                              │            │
│    │        handler executes)│                              │            │
│    │                         │                              │            │
│    │                         │  8. POST /settle             │            │
│    │                         │ ──────────────────────────▶  │            │
│    │                         │                              │            │
│    │                         │  9. { success: false,        │            │
│    │                         │       errorReason:           │            │
│    │                         │       "nonce_already_used" } │            │
│    │                         │ ◀──────────────────────────  │            │
│    │                         │                              │            │
│    │  10. 402 Settlement     │                              │            │
│    │      Failed             │                              │            │
│    │      (NO resource data) │                              │            │
│    │ ◀────────────────────   │                              │            │
│    │                         │                              │            │
│    │  NOTE: Server executed  │                              │            │
│    │  work but did NOT       │                              │            │
│    │  return data. Client    │                              │            │
│    │  must retry.            │                              │            │
│    │                         │                              │            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Integration Patterns

### 8.1 Express.js Integration

```typescript
// From: examples/typescript/servers/express/index.ts
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();
const facilitator = new HTTPFacilitatorClient({ url: process.env.FACILITATOR_URL });

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",           // Human-readable price!
            network: "eip155:84532",   // Base Sepolia
            payTo: "0x...",
          },
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitator)
      .register("eip155:84532", new ExactEvmScheme()),
  ),
);

app.get("/weather", (req, res) => {
  res.json({ weather: "sunny", temperature: 70 });
});

app.listen(4021);
```

### 8.2 Hono Integration (Edge/Cloudflare Workers)

```typescript
// Similar pattern, different adapter
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const app = new Hono();

app.use(
  paymentMiddleware(
    {
      "GET /api/*": {
        accepts: [{ scheme: "exact", price: "$0.01", network: "eip155:8453", payTo: "0x..." }],
        description: "Premium API access",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer()
      .register("eip155:8453", new ExactEvmScheme()),
  ),
);

export default app;
```

### 8.3 FastAPI (Python) Integration

```python
# From: python/x402/README.md
from x402 import x402ResourceServer, ResourceConfig
from x402.http import HTTPFacilitatorClient
from x402.mechanisms.evm.exact import ExactEvmServerScheme

facilitator = HTTPFacilitatorClient(url="https://x402.org/facilitator")
server = x402ResourceServer(facilitator)
server.register("eip155:*", ExactEvmServerScheme())
server.initialize()

config = ResourceConfig(
    scheme="exact",
    network="eip155:8453",
    pay_to="0x...",
    price="$0.01",
)
requirements = server.build_payment_requirements(config)
```

### 8.4 Client with Multiple Networks

```typescript
// From: examples/typescript/clients/advanced/all_networks.ts
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createKeyPairSignerFromBytes } from "@solana/kit";

const client = new x402Client();

// Register EVM signer
const evmSigner = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
registerExactEvmScheme(client, { signer: evmSigner });

// Register SVM signer
const svmSigner = await createKeyPairSignerFromBytes(base58.decode(process.env.SVM_PRIVATE_KEY));
registerExactSvmScheme(client, { signer: svmSigner });

// Wrap fetch - now handles 402 automatically
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const response = await fetchWithPayment("https://api.example.com/paid-endpoint");
```

---

## 9. Cryptographic Operations

### 9.1 EIP-712 Typed Data Signing

The core cryptographic operation is signing structured data per EIP-712:

```typescript
// Domain separator
const domain = {
  name: "USDC",                    // Token name
  version: "2",                    // Token version
  chainId: 8453,                   // Base mainnet
  verifyingContract: "0x833589...", // USDC contract
};

// Typed data structure
const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

// Message to sign
const message = {
  from: "0xPayer...",
  to: "0xMerchant...",
  value: 1000000n,           // 1 USDC (6 decimals)
  validAfter: 1700000000n,
  validBefore: 1700003600n,  // +1 hour
  nonce: "0xrandom32bytes",
};

// Sign with wallet
const signature = await wallet.signTypedData({ domain, types, primaryType: "TransferWithAuthorization", message });
```

### 9.2 Nonce Generation

```typescript
// From: typescript/packages/mechanisms/evm/src/utils.ts
export function createNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}
```

### 9.3 Smart Wallet Support (EIP-6492)

The SDK supports smart contract wallets via EIP-6492:

```typescript
// From: typescript/packages/mechanisms/evm/src/exact/facilitator/eip3009.ts
// Check if signature is from undeployed smart wallet
const signatureLength = signature.length - 2;  // Remove 0x
const isSmartWallet = signatureLength > 130;   // > 65 bytes = not EOA

if (isSmartWallet) {
  const bytecode = await signer.getCode({ address: payerAddress });
  
  if (!bytecode || bytecode === "0x") {
    // Wallet not deployed - check for EIP-6492 deployment info
    const erc6492Data = parseErc6492Signature(signature);
    
    if (erc6492Data.address && erc6492Data.data) {
      // Has deployment info - can deploy on settle
      // Allow through
    } else {
      // No deployment info - will always fail
      return { isValid: false, invalidReason: "invalid_exact_evm_payload_undeployed_smart_wallet" };
    }
  }
}
```

---

## 10. Error Handling Patterns

### 10.1 Standard Error Codes

| Error Code | Description |
|------------|-------------|
| `insufficient_funds` | Payer doesn't have enough tokens |
| `invalid_exact_evm_payload_signature` | Signature verification failed |
| `invalid_exact_evm_payload_authorization_valid_before` | Authorization expired |
| `invalid_exact_evm_payload_authorization_valid_after` | Authorization not yet valid |
| `invalid_exact_evm_payload_authorization_value` | Amount insufficient |
| `invalid_exact_evm_payload_recipient_mismatch` | Recipient doesn't match requirements |
| `invalid_network` | Network not supported |
| `invalid_scheme` | Scheme not supported |
| `invalid_payload` | Malformed payload |
| `invalid_transaction_state` | Transaction failed on-chain |

### 10.2 Error Classes

```typescript
// From: typescript/packages/core/src/types/facilitator.ts
export class VerifyError extends Error {
  readonly invalidReason?: string;
  readonly invalidMessage?: string;
  readonly payer?: string;
  readonly statusCode: number;

  constructor(statusCode: number, response: VerifyResponse) {
    const reason = response.invalidReason || "unknown reason";
    const message = response.invalidMessage;
    super(message ? `${reason}: ${message}` : reason);
    this.name = "VerifyError";
    // ...
  }
}

export class SettleError extends Error {
  readonly errorReason?: string;
  readonly transaction: string;
  readonly network: Network;
  // ...
}
```

### 10.3 Retry with Exponential Backoff

```typescript
// From: typescript/packages/core/src/http/httpFacilitatorClient.ts
const GET_SUPPORTED_RETRIES = 3;
const GET_SUPPORTED_RETRY_DELAY_MS = 1000;

async getSupported(): Promise<SupportedResponse> {
  for (let attempt = 0; attempt < GET_SUPPORTED_RETRIES; attempt++) {
    const response = await fetch(`${this.url}/supported`);

    if (response.ok) {
      return await response.json();
    }

    // Retry on 429 with exponential backoff
    if (response.status === 429 && attempt < GET_SUPPORTED_RETRIES - 1) {
      const delay = GET_SUPPORTED_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`Failed: ${response.status}`);
  }
}
```

---

## 11. Limitations and Edge Cases

### 11.1 Payment Fails Mid-Transaction

**Scenario:** Verify succeeds, handler executes, but settle fails.

**What happens:**
1. Server executed work (e.g., generated AI response)
2. Settlement fails (nonce reused, network issue, etc.)
3. Server returns 402 with settlement error
4. **Client does NOT receive the response data**
5. Server has done work for free

**Mitigation:**
- Use idempotent handlers where possible
- Consider "verify-first" pattern with short timeout
- Log failed settlements for reconciliation

### 11.2 Refund Handling

**x402 does NOT have native refund support.**

Refunds must be handled:
1. Out-of-band by the merchant
2. Via separate on-chain transaction
3. Through off-chain agreement

### 11.3 Network Failures

**During verify:**
- Client retries request
- No funds moved

**During settle:**
- Transaction may be pending
- Need to check chain state
- Facilitator should handle idempotently

### 11.4 Rate Limiting

**Facilitator rate limits:**
- `/supported` endpoint returns 429 on rate limit
- SDK implements exponential backoff

**Resource server rate limits:**
- Not handled by x402 protocol
- Implement separately (e.g., by payer address)

### 11.5 Security Vulnerabilities to Watch

1. **Replay attacks**: Mitigated by EIP-3009 nonce at contract level
2. **Front-running**: Mitigated by `validAfter`/`validBefore` constraints
3. **Phishing**: Client must verify `payTo` address
4. **Man-in-the-middle**: Use HTTPS; signature binds payment to recipient
5. **Gas price manipulation (SVM)**: Bounded compute unit price

### 11.6 Token Compatibility

**EVM:**
- Must support EIP-3009 (`transferWithAuthorization`) OR
- Must support Permit2 (universal fallback)
- USDC is natively supported

**SVM:**
- Any SPL token works
- Token2022 program supported

---

## 12. Implementation Plan for 402claw

### 12.1 Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      402claw ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    OpenClaw Gateway                          │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐    │   │
│  │  │ x402Client  │  │  Wallet       │  │  Payment        │    │   │
│  │  │ (TypeScript)│  │  (Keychain)   │  │  Budget/Policy  │    │   │
│  │  └─────────────┘  └───────────────┘  └─────────────────┘    │   │
│  │         ↑                  ↑                  ↑              │   │
│  │         └──────────────────┼──────────────────┘              │   │
│  │                            │                                 │   │
│  │  ┌─────────────────────────┼─────────────────────────────┐  │   │
│  │  │              Payment Middleware                        │  │   │
│  │  │  - Intercept fetch requests                           │  │   │
│  │  │  - Handle 402 responses                               │  │   │
│  │  │  - Apply budget policies                              │  │   │
│  │  │  - Log payments                                        │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Coinbase Hosted Facilitator                    │   │
│  │               https://x402.org/facilitator                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 SDK Choice: TypeScript

**Reasons:**
1. OpenClaw gateway is Node.js-based
2. Most complete/maintained implementation
3. Native integration with viem (already used)
4. Fetch wrapper fits OpenClaw's HTTP architecture

### 12.3 Facilitator Choice: Coinbase Hosted

**For initial implementation:**
- Zero infrastructure cost
- No gas management needed
- Supports Base mainnet + testnet

**Future consideration:**
- Self-hosted for full control
- Custom policies (rate limits, etc.)

### 12.4 Payment Flow Design

```typescript
// 402claw payment wrapper
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

class Claw402PaymentClient {
  private client: x402Client;
  private fetch: typeof globalThis.fetch;
  private budget: PaymentBudget;
  
  constructor(signer: EvmSigner, config: PaymentConfig) {
    this.client = new x402Client();
    registerExactEvmScheme(this.client, { signer });
    
    // Apply budget policy
    this.client.registerPolicy(maxAmount(config.maxPaymentPerRequest));
    this.client.registerPolicy(preferNetwork(config.preferredNetwork));
    
    this.fetch = wrapFetchWithPayment(globalThis.fetch, this.client);
    this.budget = new PaymentBudget(config);
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    // Check budget before request
    await this.budget.check();
    
    try {
      const response = await this.fetch(url, init);
      
      // Log payment if made
      const paymentResponse = this.getPaymentResponse(response);
      if (paymentResponse?.success) {
        await this.budget.recordPayment(paymentResponse);
        await this.logPayment(paymentResponse);
      }
      
      return response;
    } catch (error) {
      if (error instanceof PaymentError) {
        await this.handlePaymentError(error);
      }
      throw error;
    }
  }
}
```

### 12.5 Error Handling Strategy

```typescript
// Handle different error types
async handlePaymentError(error: PaymentError) {
  switch (error.reason) {
    case "insufficient_funds":
      // Alert user, suggest adding funds
      await this.notifyUser("Low balance! Add funds to continue.");
      break;
      
    case "budget_exceeded":
      // Our budget policy kicked in
      await this.notifyUser("Payment budget exceeded for this period.");
      break;
      
    case "invalid_signature":
      // Wallet issue - should not happen
      console.error("Signature error - check wallet config");
      break;
      
    default:
      // Generic error
      await this.logError(error);
  }
}
```

### 12.6 Testing Strategy

1. **Unit Tests:**
   - Mock facilitator responses
   - Test payload creation
   - Test error handling

2. **Integration Tests (Testnet):**
   - Base Sepolia with testnet USDC
   - Full payment flow
   - Settlement verification

3. **Budget/Policy Tests:**
   - Test spending limits
   - Test network preferences
   - Test per-request limits

### 12.7 Implementation Phases

**Phase 1: Basic Integration (Week 1)**
- Install x402 packages
- Configure wallet from keychain
- Basic fetch wrapper
- Manual payment approval

**Phase 2: Budget Management (Week 2)**
- Daily/monthly spending limits
- Per-request limits
- Payment logging

**Phase 3: UI/UX (Week 3)**
- Balance display
- Payment history
- Budget configuration
- Notifications

**Phase 4: Advanced Features (Week 4+)**
- Multiple wallets
- Network preferences
- Custom policies
- Analytics

---

## Appendix A: Package Dependencies

```json
{
  "@x402/core": "latest",
  "@x402/evm": "latest",
  "@x402/fetch": "latest",
  "viem": "^2.0.0"
}
```

## Appendix B: Environment Variables

```bash
# Wallet
EVM_PRIVATE_KEY=0x...

# Facilitator
FACILITATOR_URL=https://x402.org/facilitator

# Budget
MAX_PAYMENT_PER_REQUEST=1000000  # 1 USDC
DAILY_BUDGET=10000000            # 10 USDC
PREFERRED_NETWORK=eip155:8453    # Base mainnet
```

## Appendix C: Useful Links

- **x402 Repository:** https://github.com/coinbase/x402
- **x402 Documentation:** https://x402.org
- **Coinbase Facilitator:** https://x402.org/facilitator
- **Base Sepolia Faucet:** https://portal.cdp.coinbase.com/products/faucet
- **EIP-3009 Spec:** https://eips.ethereum.org/EIPS/eip-3009
- **CAIP-2 Networks:** https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md

---

**Document compiled from x402 repository analysis. Last updated: February 12, 2026.**
