import {
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  buildPaymentFromRequirement,
  encodePaymentPayload,
} from "./payment.js";

function mergeHeaders(existingHeaders, nextHeaders) {
  const merged = new Headers(existingHeaders || {});
  Object.entries(nextHeaders).forEach(([key, value]) => {
    merged.set(key, value);
  });
  return merged;
}

export async function fetchWithX402(url, options = {}) {
  const first = await fetch(url, options);

  if (first.status !== 402) {
    return {
      response: first,
      retried: false,
      payment: null,
      receipt: null,
    };
  }

  const rawChallenge = first.headers.get(PAYMENT_REQUIRED_HEADER);
  if (!rawChallenge) {
    return {
      response: first,
      retried: false,
      payment: null,
      receipt: null,
      error: "missing_payment_required_header",
    };
  }

  let challenge;
  try {
    challenge = JSON.parse(rawChallenge);
  } catch {
    return {
      response: first,
      retried: false,
      payment: null,
      receipt: null,
      error: "invalid_payment_required_header",
    };
  }

  const requirement = challenge?.accepts?.[0];
  if (!requirement) {
    return {
      response: first,
      retried: false,
      payment: null,
      receipt: null,
      error: "empty_accepts",
    };
  }

  const payment = buildPaymentFromRequirement(requirement, options.paymentOverrides || {});
  const encoded = encodePaymentPayload(payment);

  const second = await fetch(url, {
    ...options,
    headers: mergeHeaders(options.headers, {
      [PAYMENT_SIGNATURE_HEADER]: encoded,
    }),
  });

  let receipt = null;
  const rawReceipt = second.headers.get(PAYMENT_RESPONSE_HEADER);
  if (rawReceipt) {
    try {
      receipt = JSON.parse(rawReceipt);
    } catch {
      receipt = null;
    }
  }

  return {
    response: second,
    retried: true,
    payment,
    receipt,
  };
}
