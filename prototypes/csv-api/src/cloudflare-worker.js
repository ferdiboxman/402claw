import { buildMarketplaceAnalytics } from "./marketplace-metrics.js";
import {
  DEFAULT_PLAN_LIMITS,
  buildDispatchPayload,
  resolveTenantFromRequest,
} from "./dispatcher.js";

const PAYMENT_REQUIRED_HEADER = "payment-required";
const PAYMENT_SIGNATURE_HEADER = "payment-signature";
const PAYMENT_RESPONSE_HEADER = "payment-response";

const DEFAULT_X402_NETWORK = "eip155:84532";
const DEFAULT_PAY_TO = "0x402c1aw000000000000000000000000000000000";
const DEFAULT_USAGE_EVENT_LIMIT = 5000;
const USAGE_EVENTS_KV_KEY = "usage_events_v1";
const RATE_LIMIT_MEMORY_PREFIX = "rl_v1";
const USAGE_QUOTA_MEMORY_PREFIX = "uq_v1";

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function nextRequestId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `req_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function randomHex(bytes = 8) {
  const out = new Uint8Array(bytes);
  crypto.getRandomValues(out);
  return Array.from(out).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function toText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function toPositiveNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function normalizeLimits(value) {
  if (!value || typeof value !== "object") return undefined;

  const cpuMs = toPositiveInt(value.cpuMs ?? value.cpu_ms, 0);
  const subRequests = toPositiveInt(value.subRequests ?? value.subrequests, 0);
  const out = {};

  if (cpuMs > 0) out.cpuMs = cpuMs;
  if (subRequests > 0) out.subRequests = subRequests;

  if (!out.cpuMs && !out.subRequests) return undefined;
  return out;
}

function normalizeOwner(record = {}) {
  const explicit = toText(record.owner);
  if (explicit) return explicit.startsWith("@") ? explicit : `@${explicit}`;

  const fromUserId = toText(record.ownerUserId);
  if (fromUserId) return fromUserId.startsWith("@") ? fromUserId : `@${fromUserId}`;

  return "@unknown";
}

function normalizeRateLimitBucket(value) {
  if (!value || typeof value !== "object") return undefined;
  const requests = toPositiveInt(value.requests, 0);
  const windowSeconds = toPositiveInt(value.windowSeconds ?? value.window, 0);
  if (requests <= 0 || windowSeconds <= 0) return undefined;
  return { requests, windowSeconds };
}

function normalizeRateLimit(value) {
  if (!value || typeof value !== "object") return undefined;

  const source = value;
  const out = {};
  const perCaller = normalizeRateLimitBucket(source.perCaller ?? source.caller);
  const global = normalizeRateLimitBucket(source.global);
  const burst = toPositiveInt(source.burst, 0);

  if (perCaller) out.perCaller = perCaller;
  if (global) out.global = global;
  if (burst > 0) out.burst = burst;

  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeUsageLimit(value) {
  if (!value || typeof value !== "object") return undefined;

  const out = {};
  const dailyRequests = toPositiveInt(
    value.dailyRequests ?? value.dayRequests ?? value.daily ?? value.day,
    0,
  );
  const monthlyRequests = toPositiveInt(
    value.monthlyRequests ?? value.monthRequests ?? value.monthly ?? value.month,
    0,
  );

  if (dailyRequests > 0) out.dailyRequests = dailyRequests;
  if (monthlyRequests > 0) out.monthlyRequests = monthlyRequests;

  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeTenantRecord(record = {}) {
  const workerName = toText(record.workerName);
  if (!workerName) return null;

  const slug = toText(record.slug || record.tenantSlug);
  const priceUsd = toPositiveNumber(record.priceUsd ?? record.priceUSD ?? record.price, 0);
  const paymentMode = toText(record.paymentMode || record.payment?.mode).toLowerCase();

  const x402Enabled = toBoolean(
    record.x402Enabled ?? record.requirePayment,
    paymentMode === "edge",
  );

  return {
    slug,
    tenantId: toText(record.tenantId, `tenant_${slug || "unknown"}`),
    workerName,
    plan: toText(record.plan, "free").toLowerCase(),
    limits: normalizeLimits(record.limits),
    ownerUserId: toText(record.ownerUserId, "unknown"),
    owner: normalizeOwner(record),
    directory: toText(record.directory, "APIs"),
    priceUsd,
    payTo: toText(record.payTo),
    paymentNetwork: toText(record.paymentNetwork || record.network),
    x402Enabled,
    rateLimit: normalizeRateLimit(record.rateLimit),
    usageLimit: normalizeUsageLimit(record.usageLimit),
  };
}

function normalizeDirectoryMaps(raw = {}) {
  const bySlug = {};
  const byHost = {};

  const rawBySlug = raw.bySlug && typeof raw.bySlug === "object" ? raw.bySlug : {};
  for (const [slugKey, record] of Object.entries(rawBySlug)) {
    const normalizedSlug = toText(slugKey).toLowerCase();
    if (!normalizedSlug) continue;

    const normalized = normalizeTenantRecord({ ...record, slug: normalizedSlug });
    if (!normalized) continue;
    bySlug[normalizedSlug] = normalized;
  }

  const rawByHost = raw.byHost && typeof raw.byHost === "object" ? raw.byHost : {};
  for (const [hostKey, record] of Object.entries(rawByHost)) {
    const normalizedHost = toText(hostKey).toLowerCase();
    if (!normalizedHost) continue;

    const normalized = normalizeTenantRecord(record);
    if (!normalized) continue;
    byHost[normalizedHost] = normalized;
  }

  return { byHost, bySlug };
}

export function parseTenantDirectory(input) {
  if (!input) return { byHost: {}, bySlug: {} };

  let raw = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return { byHost: {}, bySlug: {} };
    }
  }

  if (!raw || typeof raw !== "object") {
    return { byHost: {}, bySlug: {} };
  }

  if (raw.byHost || raw.bySlug) {
    return normalizeDirectoryMaps(raw);
  }

  const byHost = {};
  const bySlug = {};
  const tenants = Array.isArray(raw.tenants) ? raw.tenants : [];

  for (const tenant of tenants) {
    const slug = toText(tenant.slug).toLowerCase();
    if (!slug) continue;

    const normalized = normalizeTenantRecord({ ...tenant, slug });
    if (!normalized) continue;

    bySlug[slug] = normalized;

    const hosts = Array.isArray(tenant.hosts) ? tenant.hosts : [];
    for (const host of hosts) {
      const normalizedHost = toText(host).toLowerCase();
      if (!normalizedHost) continue;
      byHost[normalizedHost] = normalized;
    }
  }

  return { byHost, bySlug };
}

function rewritePathModeRequest(request, slug) {
  const url = new URL(request.url);
  const prefix = `/t/${slug}`;

  if (url.pathname === prefix) {
    url.pathname = "/";
  } else if (url.pathname.startsWith(`${prefix}/`)) {
    url.pathname = url.pathname.slice(prefix.length);
  }

  if (!url.pathname.startsWith("/")) {
    url.pathname = `/${url.pathname}`;
  }

  return new Request(url.toString(), request);
}

async function passthroughResponse(response, extraHeaders = {}) {
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function readTenantDirectoryFromEnv(env = {}) {
  if (env.TENANT_DIRECTORY) {
    return parseTenantDirectory(env.TENANT_DIRECTORY);
  }
  if (env.TENANT_DIRECTORY_JSON) {
    return parseTenantDirectory(env.TENANT_DIRECTORY_JSON);
  }
  return { byHost: {}, bySlug: {} };
}

function toBase64(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const remainder = normalized.length % 4;
  if (remainder === 0) return normalized;
  return `${normalized}${"=".repeat(4 - remainder)}`;
}

function decodePaymentPayload(rawValue) {
  const raw = toText(rawValue);
  if (!raw) return null;

  try {
    return JSON.parse(atob(toBase64(raw)));
  } catch {
    return null;
  }
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const normalized = toText(value).replace(/\/$/, "");
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function resolveFacilitatorUrls(env = {}) {
  return uniqueStrings([
    env.FACILITATOR_URL,
    env.X402_FACILITATOR_URL,
    env.X402_FACILITATOR_PROD_URL,
  ]);
}

function createPaymentRequirement({ tenant, resourcePath, env }) {
  const priceUsd = toPositiveNumber(tenant.priceUsd, 0);
  const amountMicrounit = Math.max(1, Math.round(priceUsd * 1_000_000));

  return {
    kind: "exact",
    scheme: "exact",
    network: toText(tenant.paymentNetwork || env.X402_NETWORK || env.X402_NETWORK_PROD, DEFAULT_X402_NETWORK),
    resource: resourcePath,
    description: `Access paid API endpoint ${tenant.slug || tenant.workerName}`,
    maxAmountRequired: String(amountMicrounit),
    payTo: toText(tenant.payTo || env.PAY_TO_ADDRESS, DEFAULT_PAY_TO),
    asset: "USDC",
  };
}

function buildPaymentChallenge(requirement, reason = "payment_required") {
  return {
    x402Version: 2,
    error: reason,
    accepts: [requirement],
  };
}

function paymentMissingResponse({
  requirement,
  requestId,
  tenantId,
  reason,
  extraHeaders = {},
}) {
  const challenge = buildPaymentChallenge(requirement, reason || "payment_required");

  return jsonResponse(402, challenge, {
    "x-request-id": requestId,
    "x-tenant-id": tenantId,
    [PAYMENT_REQUIRED_HEADER]: JSON.stringify(challenge),
    ...extraHeaders,
  });
}

function verifyLocally(payment, requirement) {
  if (!payment || typeof payment !== "object") {
    return {
      isValid: false,
      reason: "missing_payment_signature",
      attempts: [{ facilitatorUrl: "local", reason: "missing_payment_signature" }],
    };
  }

  if (String(payment.amount || "") !== String(requirement.maxAmountRequired)) {
    return {
      isValid: false,
      reason: "amount_mismatch",
      attempts: [{ facilitatorUrl: "local", reason: "amount_mismatch" }],
    };
  }

  if (String(payment.payTo || "") !== String(requirement.payTo)) {
    return {
      isValid: false,
      reason: "pay_to_mismatch",
      attempts: [{ facilitatorUrl: "local", reason: "pay_to_mismatch" }],
    };
  }

  if (String(payment.resource || "") !== String(requirement.resource)) {
    return {
      isValid: false,
      reason: "resource_mismatch",
      attempts: [{ facilitatorUrl: "local", reason: "resource_mismatch" }],
    };
  }

  if (!toText(payment.signature)) {
    return {
      isValid: false,
      reason: "missing_signature",
      attempts: [{ facilitatorUrl: "local", reason: "missing_signature" }],
    };
  }

  return {
    isValid: true,
    facilitatorUrl: "local",
    verification: { mode: "local" },
    attempts: [{ facilitatorUrl: "local", reason: "ok" }],
  };
}

function authHeaders(facilitatorApiKey) {
  const apiKey = toText(facilitatorApiKey);
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}

function shouldAllowLocalPaymentFallback(env = {}) {
  return toBoolean(
    env.ALLOW_LOCAL_X402_VERIFICATION ?? env.X402_ALLOW_LOCAL_FALLBACK,
    false,
  );
}

async function verifyPayment({
  payment,
  requirement,
  facilitatorUrls,
  facilitatorApiKey,
  allowLocalFallback = false,
}) {
  if (!Array.isArray(facilitatorUrls) || facilitatorUrls.length === 0) {
    if (allowLocalFallback) {
      return verifyLocally(payment, requirement);
    }
    return {
      isValid: false,
      reason: "facilitator_unconfigured",
      attempts: [{ facilitatorUrl: "none", reason: "facilitator_unconfigured" }],
    };
  }

  const attempts = [];

  for (const facilitatorUrl of facilitatorUrls) {
    try {
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(facilitatorApiKey),
        },
        body: JSON.stringify({ payment, requirement }),
      });

      if (!response.ok) {
        attempts.push({ facilitatorUrl, reason: `facilitator_verify_http_${response.status}` });
        continue;
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        attempts.push({ facilitatorUrl, reason: "facilitator_verify_invalid_json" });
        continue;
      }

      if (payload?.isValid) {
        return {
          isValid: true,
          facilitatorUrl,
          verification: payload,
          attempts,
        };
      }

      attempts.push({ facilitatorUrl, reason: payload?.reason || "invalid_payment" });
    } catch {
      attempts.push({ facilitatorUrl, reason: "facilitator_verify_unreachable" });
    }
  }

  return {
    isValid: false,
    facilitatorUrl: null,
    attempts,
    reason: attempts.at(-1)?.reason || "facilitator_verify_failed",
  };
}

async function settlePayment({
  payment,
  facilitatorUrls,
  facilitatorApiKey,
  allowLocalFallback = false,
}) {
  if (!Array.isArray(facilitatorUrls) || facilitatorUrls.length === 0) {
    if (allowLocalFallback) {
      return {
        settled: true,
        facilitatorUrl: "local",
        receipt: {
          mode: "local",
          settlementId: `settle_${randomHex(6)}`,
          settledAt: new Date().toISOString(),
        },
        attempts: [{ facilitatorUrl: "local", reason: "ok" }],
      };
    }
    return {
      settled: false,
      facilitatorUrl: null,
      attempts: [{ facilitatorUrl: "none", reason: "facilitator_unconfigured" }],
      reason: "facilitator_unconfigured",
    };
  }

  const attempts = [];

  for (const facilitatorUrl of facilitatorUrls) {
    try {
      const response = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(facilitatorApiKey),
        },
        body: JSON.stringify({ payment }),
      });

      if (!response.ok) {
        attempts.push({ facilitatorUrl, reason: `facilitator_settle_http_${response.status}` });
        continue;
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        attempts.push({ facilitatorUrl, reason: "facilitator_settle_invalid_json" });
        continue;
      }

      if (payload?.settled) {
        return {
          settled: true,
          facilitatorUrl,
          receipt: payload.receipt || {},
          attempts,
        };
      }

      attempts.push({ facilitatorUrl, reason: payload?.reason || "facilitator_settle_failed" });
    } catch {
      attempts.push({ facilitatorUrl, reason: "facilitator_settle_unreachable" });
    }
  }

  return {
    settled: false,
    facilitatorUrl: null,
    attempts,
    reason: attempts.at(-1)?.reason || "facilitator_settle_failed",
  };
}

function hashIdentifier(value) {
  const input = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `id_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function resolveRawCallerId(request) {
  const headers = request.headers;
  const candidates = [
    headers.get("x-agent-id"),
    headers.get("x-caller-id"),
    headers.get("x-api-key"),
    headers.get("cf-connecting-ip"),
  ];

  for (const candidate of candidates) {
    const normalized = toText(candidate);
    if (normalized) return normalized;
  }

  return "anonymous";
}

function resolveCallerId(request) {
  return hashIdentifier(resolveRawCallerId(request));
}

function shouldApplyX402(tenant) {
  return Boolean(tenant?.x402Enabled) && toPositiveNumber(tenant?.priceUsd, 0) > 0;
}

function clampUsageEventLimit(value) {
  return Math.min(toPositiveInt(value, DEFAULT_USAGE_EVENT_LIMIT), 20000);
}

function parseTopLimit(value) {
  return Math.min(toPositiveInt(value, 25), 100);
}

function isEventsApiAuthorized(request, env = {}) {
  if (toBoolean(env.ALLOW_PUBLIC_PLATFORM_EVENTS, false)) {
    return true;
  }

  const expected = toText(env.PLATFORM_ANALYTICS_TOKEN);
  if (!expected) {
    return false;
  }

  const url = new URL(request.url);
  const provided = toText(
    request.headers.get("x-platform-token")
      || request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "")
      || url.searchParams.get("token"),
  );
  return provided === expected;
}

function hasKvRateBinding(env = {}) {
  return Boolean(env.RATE_KV && typeof env.RATE_KV.get === "function" && typeof env.RATE_KV.put === "function");
}

async function readRateCounter({ env, memoryRateCounters, key }) {
  if (hasKvRateBinding(env)) {
    try {
      const raw = await env.RATE_KV.get(key);
      if (!raw) return 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
    } catch {
      return 0;
    }
  }

  return memoryRateCounters.get(key) || 0;
}

async function writeRateCounter({ env, memoryRateCounters, key, value, windowSeconds }) {
  if (hasKvRateBinding(env)) {
    await env.RATE_KV.put(key, String(value), {
      expirationTtl: Math.max(5, windowSeconds * 2),
    });
    return;
  }

  memoryRateCounters.set(key, value);
}

async function checkRateLimitBucket({
  env,
  memoryRateCounters,
  keyPrefix,
  requests,
  windowSeconds,
  nowMs,
}) {
  const nowSeconds = Math.floor(nowMs / 1000);
  const bucketStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const key = `${RATE_LIMIT_MEMORY_PREFIX}:${keyPrefix}:${bucketStart}`;

  const current = await readRateCounter({ env, memoryRateCounters, key });
  if (current >= requests) {
    return {
      allowed: false,
      limit: requests,
      remaining: 0,
      resetAt: bucketStart + windowSeconds,
      retryAfter: Math.max(1, bucketStart + windowSeconds - nowSeconds),
    };
  }

  const next = current + 1;
  await writeRateCounter({
    env,
    memoryRateCounters,
    key,
    value: next,
    windowSeconds,
  });

  return {
    allowed: true,
    limit: requests,
    remaining: Math.max(0, requests - next),
    resetAt: bucketStart + windowSeconds,
    retryAfter: 0,
  };
}

async function enforceTenantRateLimit({
  env,
  memoryRateCounters,
  tenantId,
  callerId,
  rateLimit,
  nowMs,
}) {
  if (!rateLimit || typeof rateLimit !== "object") {
    return { allowed: true, headers: {} };
  }

  let callerResult = null;
  let globalResult = null;

  if (rateLimit.perCaller) {
    callerResult = await checkRateLimitBucket({
      env,
      memoryRateCounters,
      keyPrefix: `${tenantId}:caller:${callerId}`,
      requests: rateLimit.perCaller.requests,
      windowSeconds: rateLimit.perCaller.windowSeconds,
      nowMs,
    });
  }

  if (callerResult && !callerResult.allowed) {
    return {
      allowed: false,
      retryAfter: callerResult.retryAfter,
      headers: {
        "Retry-After": String(callerResult.retryAfter),
        "X-RateLimit-Limit": String(callerResult.limit),
        "X-RateLimit-Remaining": String(callerResult.remaining),
        "X-RateLimit-Reset": String(callerResult.resetAt),
      },
    };
  }

  if (rateLimit.global) {
    globalResult = await checkRateLimitBucket({
      env,
      memoryRateCounters,
      keyPrefix: `${tenantId}:global`,
      requests: rateLimit.global.requests,
      windowSeconds: rateLimit.global.windowSeconds,
      nowMs,
    });
  }

  if (globalResult && !globalResult.allowed) {
    return {
      allowed: false,
      retryAfter: globalResult.retryAfter,
      headers: {
        "Retry-After": String(globalResult.retryAfter),
        "X-RateLimit-Limit": String(globalResult.limit),
        "X-RateLimit-Remaining": String(globalResult.remaining),
        "X-RateLimit-Reset": String(globalResult.resetAt),
      },
    };
  }

  const baseline = callerResult || globalResult;
  const headers = baseline
    ? {
      "X-RateLimit-Limit": String(baseline.limit),
      "X-RateLimit-Remaining": String(baseline.remaining),
      "X-RateLimit-Reset": String(baseline.resetAt),
    }
    : {};

  return { allowed: true, headers };
}

function formatUtcMonthBucket(nowMs) {
  const date = new Date(nowMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

function buildUsageQuotaWindows(nowMs) {
  const nowSeconds = Math.floor(nowMs / 1000);

  const dayStartMs = Math.floor(nowMs / 86_400_000) * 86_400_000;
  const nextDayMs = dayStartMs + 86_400_000;
  const dayResetAt = Math.floor(nextDayMs / 1000);

  const current = new Date(nowMs);
  const nextMonthMs = Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1);
  const monthResetAt = Math.floor(nextMonthMs / 1000);

  return {
    day: {
      bucket: String(Math.floor(nowMs / 86_400_000)),
      resetAt: dayResetAt,
      secondsToReset: Math.max(1, dayResetAt - nowSeconds),
    },
    month: {
      bucket: formatUtcMonthBucket(nowMs),
      resetAt: monthResetAt,
      secondsToReset: Math.max(1, monthResetAt - nowSeconds),
    },
  };
}

async function enforceTenantUsageLimit({
  env,
  memoryRateCounters,
  tenantId,
  usageLimit,
  nowMs,
}) {
  if (!usageLimit || typeof usageLimit !== "object") {
    return { allowed: true, headers: {} };
  }

  const windows = buildUsageQuotaWindows(nowMs);
  const checks = [];

  if (toPositiveInt(usageLimit.dailyRequests, 0) > 0) {
    checks.push({
      windowName: "day",
      key: `${USAGE_QUOTA_MEMORY_PREFIX}:${tenantId}:day:${windows.day.bucket}`,
      limit: usageLimit.dailyRequests,
      resetAt: windows.day.resetAt,
      windowSeconds: windows.day.secondsToReset,
    });
  }

  if (toPositiveInt(usageLimit.monthlyRequests, 0) > 0) {
    checks.push({
      windowName: "month",
      key: `${USAGE_QUOTA_MEMORY_PREFIX}:${tenantId}:month:${windows.month.bucket}`,
      limit: usageLimit.monthlyRequests,
      resetAt: windows.month.resetAt,
      windowSeconds: windows.month.secondsToReset,
    });
  }

  if (checks.length === 0) {
    return { allowed: true, headers: {} };
  }

  for (const check of checks) {
    const current = await readRateCounter({
      env,
      memoryRateCounters,
      key: check.key,
    });
    check.current = current;

    if (current >= check.limit) {
      return {
        allowed: false,
        quotaWindow: check.windowName,
        retryAfter: Math.max(1, check.resetAt - Math.floor(nowMs / 1000)),
        headers: {
          "Retry-After": String(Math.max(1, check.resetAt - Math.floor(nowMs / 1000))),
          "X-Usage-Limit": String(check.limit),
          "X-Usage-Remaining": "0",
          "X-Usage-Reset": String(check.resetAt),
          "X-Usage-Window": check.windowName,
        },
      };
    }
  }

  for (const check of checks) {
    const next = (check.current || 0) + 1;
    await writeRateCounter({
      env,
      memoryRateCounters,
      key: check.key,
      value: next,
      windowSeconds: check.windowSeconds,
    });
    check.remaining = Math.max(0, check.limit - next);
  }

  const headers = {};
  for (const check of checks) {
    const prefix = check.windowName === "day" ? "X-Usage-Day" : "X-Usage-Month";
    headers[`${prefix}-Limit`] = String(check.limit);
    headers[`${prefix}-Remaining`] = String(check.remaining ?? 0);
    headers[`${prefix}-Reset`] = String(check.resetAt);
  }

  return {
    allowed: true,
    headers,
  };
}

function hasKvUsageBinding(env = {}) {
  return Boolean(env.USAGE_KV && typeof env.USAGE_KV.get === "function" && typeof env.USAGE_KV.put === "function");
}

function dedupeUsageEvents(events = []) {
  const seen = new Set();
  const deduped = [];

  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const requestId = toText(event.requestId);
    const apiId = toText(event.apiId);
    const key = requestId && apiId ? `${apiId}:${requestId}` : null;

    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduped.push(event);
  }

  return deduped;
}

async function readPersistedUsageEvents(env) {
  if (!hasKvUsageBinding(env)) {
    return [];
  }

  try {
    const raw = await env.USAGE_KV.get(USAGE_EVENTS_KV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendPersistedUsageEvent(env, event, usageEventLimit) {
  if (!hasKvUsageBinding(env)) return;

  const existing = await readPersistedUsageEvents(env);
  existing.push(event);
  const trimmed = existing.slice(-usageEventLimit);
  await env.USAGE_KV.put(USAGE_EVENTS_KV_KEY, JSON.stringify(trimmed));
}

export function createCloudflareDispatcherWorker(options = {}) {
  const staticTenantDirectory = options.tenantDirectory
    ? parseTenantDirectory(options.tenantDirectory)
    : null;

  const planLimits = options.planLimits || DEFAULT_PLAN_LIMITS;
  const usageEventLimit = clampUsageEventLimit(
    options.usageEventLimit ?? options.maxUsageEvents,
  );
  const usageEvents = [];
  const memoryRateCounters = new Map();

  function recordUsageEvent(event, { env, ctx } = {}) {
    usageEvents.push(event);
    if (usageEvents.length > usageEventLimit) {
      usageEvents.splice(0, usageEvents.length - usageEventLimit);
    }

    const persistPromise = appendPersistedUsageEvent(env, event, usageEventLimit);
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(persistPromise);
    } else {
      persistPromise.catch(() => {});
    }

    if (typeof options.onUsageEvent === "function") {
      options.onUsageEvent(event);
    }
  }

  return {
    async fetch(request, env = {}, ctx) {
      const requestId = nextRequestId();
      const url = new URL(request.url);
      const startedAt = Date.now();

      if (request.method === "GET" && url.pathname === "/health") {
        return jsonResponse(200, {
          ok: true,
          service: "402claw-dispatcher",
          requestId,
        }, {
          "x-request-id": requestId,
        });
      }

      if (request.method === "GET" && url.pathname === "/__platform/events") {
        if (!isEventsApiAuthorized(request, env)) {
          return jsonResponse(401, {
            ok: false,
            error: "events_auth_required",
            requestId,
          }, {
            "x-request-id": requestId,
          });
        }

        const limit = Math.min(toPositiveInt(url.searchParams.get("limit"), 100), 2000);
        const mergedEvents = dedupeUsageEvents([
          ...(await readPersistedUsageEvents(env)),
          ...usageEvents,
        ]);

        return jsonResponse(200, {
          ok: true,
          requestId,
          total: mergedEvents.length,
          returned: Math.min(limit, mergedEvents.length),
          events: mergedEvents.slice(-limit),
        }, {
          "x-request-id": requestId,
        });
      }

      if (request.method === "GET" && url.pathname === "/__platform/analytics") {
        const topLimit = parseTopLimit(url.searchParams.get("top"));
        const mergedEvents = dedupeUsageEvents([
          ...(await readPersistedUsageEvents(env)),
          ...usageEvents,
        ]);
        const analytics = buildMarketplaceAnalytics(mergedEvents, {
          now: Date.now(),
          topLimit,
        });

        const requestedWindow = toText(url.searchParams.get("window")).toLowerCase();
        if (!requestedWindow) {
          return jsonResponse(200, {
            ok: true,
            requestId,
            ...analytics,
            debug: {
              persistedEvents: mergedEvents.length,
            },
          }, {
            "x-request-id": requestId,
          });
        }

        const windowSnapshot = analytics.windows[requestedWindow];
        if (!windowSnapshot) {
          return jsonResponse(400, {
            ok: false,
            error: "invalid_window",
            requestId,
            expected: ["today", "week", "overall"],
          }, {
            "x-request-id": requestId,
          });
        }

        return jsonResponse(200, {
          ok: true,
            requestId,
            generatedAt: analytics.generatedAt,
            window: requestedWindow,
            snapshot: windowSnapshot,
            debug: {
              persistedEvents: mergedEvents.length,
            },
          }, {
            "x-request-id": requestId,
          });
      }

      const tenantDirectory = staticTenantDirectory || readTenantDirectoryFromEnv(env);
      const tenant = resolveTenantFromRequest(request.url, tenantDirectory);
      if (!tenant) {
        return jsonResponse(404, {
          ok: false,
          error: "tenant_not_found",
          requestId,
        }, {
          "x-request-id": requestId,
        });
      }

      if (!env.DISPATCHER || typeof env.DISPATCHER.get !== "function") {
        return jsonResponse(500, {
          ok: false,
          error: "dispatcher_binding_missing",
          requestId,
        }, {
          "x-request-id": requestId,
        });
      }

      const dispatch = buildDispatchPayload({
        requestUrl: request.url,
        tenant,
        planLimits,
      });

      const worker = env.DISPATCHER.get(dispatch.workerName, {}, {
        limits: dispatch.cloudflareLimits,
      });

      const forwardedRequest = tenant.routeMode === "path" && tenant.slug
        ? rewritePathModeRequest(request, tenant.slug)
        : request;

      const forwardedPath = new URL(forwardedRequest.url).pathname;
      const callerId = resolveCallerId(request);
      const priceUsd = toPositiveNumber(tenant.priceUsd, 0);
      const useEdgePayment = shouldApplyX402(tenant);
      const rateLimitResult = await enforceTenantRateLimit({
        env,
        memoryRateCounters,
        tenantId: dispatch.tenantId,
        callerId,
        rateLimit: tenant.rateLimit,
        nowMs: startedAt,
      });
      if (!rateLimitResult.allowed) {
        recordUsageEvent({
          timestamp: Date.now(),
          requestId,
          tenantId: dispatch.tenantId,
          apiId: tenant.slug || dispatch.workerName,
          endpoint: forwardedPath,
          owner: tenant.owner || "@unknown",
          directory: tenant.directory || "APIs",
          callerId,
          status: 429,
          latencyMs: Date.now() - startedAt,
          billedUsd: 0,
          priceUsd,
          lifecycle: "rate_limited",
          billable: false,
          countable: false,
        }, { env, ctx });

        return jsonResponse(429, {
          ok: false,
          error: "rate_limited",
          requestId,
          tenantId: dispatch.tenantId,
        }, {
          "x-request-id": requestId,
          "x-tenant-id": dispatch.tenantId,
          ...rateLimitResult.headers,
        });
      }

      const responseRateHeaders = rateLimitResult.headers || {};
      const facilitatorUrls = resolveFacilitatorUrls(env);
      const facilitatorApiKey = env.FACILITATOR_API_KEY;
      const allowLocalPaymentFallback = shouldAllowLocalPaymentFallback(env);
      let payment = null;
      let settlement = null;

      if (useEdgePayment) {
        const requirement = createPaymentRequirement({
          tenant,
          resourcePath: forwardedPath,
          env,
        });

        payment = decodePaymentPayload(request.headers.get(PAYMENT_SIGNATURE_HEADER));
        if (!payment) {
          const response = paymentMissingResponse({
            requirement,
            requestId,
            tenantId: dispatch.tenantId,
            reason: "missing_payment_signature",
            extraHeaders: responseRateHeaders,
          });

          recordUsageEvent({
            timestamp: Date.now(),
            requestId,
            tenantId: dispatch.tenantId,
            apiId: tenant.slug || dispatch.workerName,
            endpoint: forwardedPath,
            owner: tenant.owner || "@unknown",
            directory: tenant.directory || "APIs",
            callerId,
            status: 402,
            latencyMs: Date.now() - startedAt,
            billedUsd: 0,
            priceUsd,
            lifecycle: "payment_challenged",
            billable: false,
            countable: false,
          }, { env, ctx });

          return response;
        }

        const verified = await verifyPayment({
          payment,
          requirement,
          facilitatorUrls,
          facilitatorApiKey,
          allowLocalFallback: allowLocalPaymentFallback,
        });

        if (!verified.isValid) {
          const response = paymentMissingResponse({
            requirement,
            requestId,
            tenantId: dispatch.tenantId,
            reason: verified.reason || "invalid_payment",
            extraHeaders: responseRateHeaders,
          });

          recordUsageEvent({
            timestamp: Date.now(),
            requestId,
            tenantId: dispatch.tenantId,
            apiId: tenant.slug || dispatch.workerName,
            endpoint: forwardedPath,
            owner: tenant.owner || "@unknown",
            directory: tenant.directory || "APIs",
            callerId,
            status: 402,
            latencyMs: Date.now() - startedAt,
            billedUsd: 0,
            priceUsd,
            lifecycle: "payment_invalid",
            billable: false,
            countable: false,
          }, { env, ctx });

          return response;
        }
      }

      const usageLimitResult = await enforceTenantUsageLimit({
        env,
        memoryRateCounters,
        tenantId: dispatch.tenantId,
        usageLimit: tenant.usageLimit,
        nowMs: startedAt,
      });
      if (!usageLimitResult.allowed) {
        recordUsageEvent({
          timestamp: Date.now(),
          requestId,
          tenantId: dispatch.tenantId,
          apiId: tenant.slug || dispatch.workerName,
          endpoint: forwardedPath,
          owner: tenant.owner || "@unknown",
          directory: tenant.directory || "APIs",
          callerId,
          status: 429,
          latencyMs: Date.now() - startedAt,
          billedUsd: 0,
          priceUsd,
          lifecycle: "usage_quota_exceeded",
          billable: false,
          countable: false,
        }, { env, ctx });

        return jsonResponse(429, {
          ok: false,
          error: "usage_quota_exceeded",
          requestId,
          tenantId: dispatch.tenantId,
          quotaWindow: usageLimitResult.quotaWindow || "unknown",
        }, {
          "x-request-id": requestId,
          "x-tenant-id": dispatch.tenantId,
          ...responseRateHeaders,
          ...(usageLimitResult.headers || {}),
        });
      }

      const responseLimitHeaders = {
        ...responseRateHeaders,
        ...(usageLimitResult.headers || {}),
      };

      try {
        const upstream = await worker.fetch(forwardedRequest);

        if (useEdgePayment && upstream.status < 400) {
          settlement = await settlePayment({
            payment,
            facilitatorUrls,
            facilitatorApiKey,
            allowLocalFallback: allowLocalPaymentFallback,
          });

          if (!settlement.settled) {
            const requirement = createPaymentRequirement({
              tenant,
              resourcePath: forwardedPath,
              env,
            });

            const response = paymentMissingResponse({
              requirement,
              requestId,
              tenantId: dispatch.tenantId,
              reason: settlement.reason || "payment_settlement_failed",
              extraHeaders: responseLimitHeaders,
            });

            recordUsageEvent({
              timestamp: Date.now(),
              requestId,
              tenantId: dispatch.tenantId,
              apiId: tenant.slug || dispatch.workerName,
              endpoint: forwardedPath,
              owner: tenant.owner || "@unknown",
              directory: tenant.directory || "APIs",
              callerId,
              status: 402,
              latencyMs: Date.now() - startedAt,
              billedUsd: 0,
              priceUsd,
              lifecycle: "payment_settlement_failed",
              billable: false,
              countable: false,
            }, { env, ctx });

            return response;
          }
        }

        const extraHeaders = {
          "x-request-id": requestId,
          "x-tenant-id": dispatch.tenantId,
          ...responseLimitHeaders,
        };

        if (settlement?.settled) {
          extraHeaders[PAYMENT_RESPONSE_HEADER] = JSON.stringify(settlement.receipt || {});
        }

        const response = await passthroughResponse(upstream, extraHeaders);

        recordUsageEvent({
          timestamp: Date.now(),
          requestId,
          tenantId: dispatch.tenantId,
          apiId: tenant.slug || dispatch.workerName,
          endpoint: forwardedPath,
          owner: tenant.owner || "@unknown",
          directory: tenant.directory || "APIs",
          callerId,
          status: response.status,
          latencyMs: Date.now() - startedAt,
          billedUsd: settlement?.settled ? priceUsd : 0,
          priceUsd,
          lifecycle: settlement?.settled ? "payment_settled" : "served",
          billable: Boolean(settlement?.settled) || priceUsd <= 0,
          countable: true,
        }, { env, ctx });

        return response;
      } catch (error) {
        recordUsageEvent({
          timestamp: Date.now(),
          requestId,
          tenantId: dispatch.tenantId,
          apiId: tenant.slug || dispatch.workerName,
          endpoint: forwardedPath,
          owner: tenant.owner || "@unknown",
          directory: tenant.directory || "APIs",
          callerId,
          status: 502,
          latencyMs: Date.now() - startedAt,
          billedUsd: 0,
          priceUsd,
          error: true,
          errorCode: "tenant_worker_failure",
          lifecycle: "worker_error",
          billable: false,
          countable: true,
        }, { env, ctx });

        return jsonResponse(502, {
          ok: false,
          error: "tenant_worker_failure",
          reason: error?.message || "unknown_error",
          requestId,
        }, {
          "x-request-id": requestId,
          "x-tenant-id": dispatch.tenantId,
          ...responseLimitHeaders,
        });
      }
    },
  };
}

export default createCloudflareDispatcherWorker();
