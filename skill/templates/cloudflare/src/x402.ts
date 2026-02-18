/**
 * x402 Payment Protocol helpers for Cloudflare Workers.
 *
 * Implements the server side of the x402 HTTP payment protocol:
 *   1. Return 402 + payment requirements when no payment header is present.
 *   2. Verify payment proof with the facilitator when X-PAYMENT is provided.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteConfig {
  /** Human-readable description of the endpoint */
  description: string;
  /** Price in USDC as a decimal string, e.g. "0.01" */
  price: string;
}

export interface PaymentRequirements {
  /** x402 protocol version */
  x402Version: number;
  /** Accepts header – always "exact" for now */
  accepts: string[];
  /** USDC contract on Base */
  usdcAddress: string;
  /** Payment details */
  payTo: string;
  /** Required amount in base units (6 decimals for USDC) */
  maxAmountRequired: string;
  /** Base chain ID */
  chainId: number;
  /** Extra info for the client */
  resource: string;
  /** Facilitator URL for verification */
  facilitatorUrl: string;
  /** Human-readable description */
  description: string;
  /** MIME type of the paid resource */
  mimeType?: string;
}

export interface VerifyResponse {
  valid: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** USDC contract address on Base mainnet */
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CHAIN_ID = 8453; // Base

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a human-readable USDC amount (e.g. "0.01") to base units (6 decimals).
 */
function usdcToBaseUnits(amount: string): string {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(6, "0").slice(0, 6);
  return String(BigInt(whole) * 1_000_000n + BigInt(frac));
}

/**
 * Build a 402 Payment Required response for a given route.
 */
export function createPaymentRequired(
  recipientAddress: string,
  facilitatorUrl: string,
  route: RouteConfig,
  requestUrl: string,
): Response {
  const requirements: PaymentRequirements = {
    x402Version: 1,
    accepts: ["exact"],
    usdcAddress: USDC_BASE,
    payTo: recipientAddress,
    maxAmountRequired: usdcToBaseUnits(route.price),
    chainId: CHAIN_ID,
    resource: requestUrl,
    facilitatorUrl,
    description: route.description,
    mimeType: "application/json",
  };

  return new Response(JSON.stringify(requirements, null, 2), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "X-Payment-Requirements": JSON.stringify(requirements),
    },
  });
}

/**
 * Verify a payment proof with the facilitator service.
 *
 * Sends the raw X-PAYMENT header value to the facilitator's /verify endpoint
 * and returns whether the payment is valid.
 */
export async function verifyPayment(
  facilitatorUrl: string,
  paymentHeader: string,
  recipientAddress: string,
  amount: string,
  resource: string,
): Promise<VerifyResponse> {
  const url = `${facilitatorUrl.replace(/\/+$/, "")}/verify`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payment: paymentHeader,
      payTo: recipientAddress,
      maxAmountRequired: usdcToBaseUnits(amount),
      chainId: CHAIN_ID,
      usdcAddress: USDC_BASE,
      resource,
    }),
  });

  if (!res.ok) {
    return { valid: false, reason: `Facilitator returned ${res.status}` };
  }

  return (await res.json()) as VerifyResponse;
}
