import { NETWORK_BASE_MAINNET, NETWORK_BASE_SEPOLIA } from "./payment.js";

export const TEST_FACILITATOR_URL = "https://x402.org/facilitator";
export const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

function normalizeEnv(raw) {
  const value = String(raw || "test").trim().toLowerCase();
  if (value === "prod" || value === "production") return "prod";
  if (value === "test" || value === "development" || value === "dev") return "test";
  throw new Error(`invalid runtime env: ${raw}`);
}

export function resolveRuntimeEnv(raw) {
  return normalizeEnv(raw || process.env.X402_ENV || "test");
}

export function resolvePaymentNetwork(runtimeEnv) {
  return runtimeEnv === "prod" ? NETWORK_BASE_MAINNET : NETWORK_BASE_SEPOLIA;
}

export function resolveFacilitatorUrl({
  runtimeEnv,
  facilitatorUrl,
  testFacilitatorUrl = TEST_FACILITATOR_URL,
  cdpFacilitatorUrl = CDP_FACILITATOR_URL,
} = {}) {
  if (facilitatorUrl) return facilitatorUrl;
  return runtimeEnv === "prod" ? cdpFacilitatorUrl : testFacilitatorUrl;
}

function parseFacilitatorList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  return String(raw)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resolveFacilitatorUrls({
  runtimeEnv,
  facilitatorUrl,
  facilitatorUrls,
  testFacilitatorUrl = TEST_FACILITATOR_URL,
  cdpFacilitatorUrl = CDP_FACILITATOR_URL,
} = {}) {
  const explicit = parseFacilitatorList(facilitatorUrls);
  if (explicit.length > 0) return explicit;

  const fromEnv = parseFacilitatorList(process.env.FACILITATOR_URLS);
  if (fromEnv.length > 0) return fromEnv;

  return [
    resolveFacilitatorUrl({
      runtimeEnv,
      facilitatorUrl,
      testFacilitatorUrl,
      cdpFacilitatorUrl,
    }),
  ];
}

export function assertFacilitatorPolicy({ runtimeEnv, facilitatorUrl }) {
  if (!facilitatorUrl) {
    throw new Error("facilitatorUrl must be configured");
  }

  const normalized = facilitatorUrl.trim().toLowerCase();
  if (runtimeEnv === "prod" && normalized.includes("x402.org/facilitator")) {
    throw new Error(
      "prod env cannot use test facilitator (x402.org/facilitator); use CDP or custom production facilitator",
    );
  }
}

export function assertFacilitatorAuthPolicy({
  runtimeEnv,
  facilitatorUrl,
  facilitatorApiKey,
}) {
  if (
    runtimeEnv === "prod" &&
    String(facilitatorUrl || "").includes("api.cdp.coinbase.com") &&
    !String(facilitatorApiKey || "").trim()
  ) {
    throw new Error(
      "prod env with CDP facilitator requires FACILITATOR_API_KEY (Bearer token)",
    );
  }
}
