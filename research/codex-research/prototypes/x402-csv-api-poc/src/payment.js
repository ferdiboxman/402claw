import { b64Decode, b64Encode, randomHex } from "./utils.js";

export const PAYMENT_REQUIRED_HEADER = "payment-required";
export const PAYMENT_SIGNATURE_HEADER = "payment-signature";
export const PAYMENT_RESPONSE_HEADER = "payment-response";
export const NETWORK_BASE_SEPOLIA = "eip155:84532";
export const NETWORK_BASE_MAINNET = "eip155:8453";

export function createPaymentRequirement({ resource, amount, payTo, network = NETWORK_BASE_SEPOLIA }) {
  return {
    kind: "exact",
    scheme: "exact",
    network,
    resource,
    description: "Access protected CSV API endpoint",
    maxAmountRequired: String(amount),
    payTo,
    asset: "USDC",
  };
}

export function encodePaymentPayload(payload) {
  return b64Encode(JSON.stringify(payload));
}

export function decodePaymentPayload(raw) {
  try {
    return JSON.parse(b64Decode(raw));
  } catch {
    return null;
  }
}

export function buildPaymentFromRequirement(requirement, overrides = {}) {
  const now = Date.now();
  const paymentId = overrides.paymentId ?? randomHex(12);

  return {
    paymentId,
    scheme: requirement.scheme,
    network: requirement.network,
    resource: requirement.resource,
    payTo: requirement.payTo,
    amount: String(requirement.maxAmountRequired),
    payer: overrides.payer ?? "0x1111111111111111111111111111111111111111",
    timestamp: overrides.timestamp ?? now,
    signature: overrides.signature ?? `mocksig_${paymentId}`,
  };
}

export function buildChallenge(requirement, error = "payment_required") {
  return {
    x402Version: 2,
    error,
    accepts: [requirement],
  };
}
