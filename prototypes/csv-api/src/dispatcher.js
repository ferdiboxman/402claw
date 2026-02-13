export const DEFAULT_PLAN_LIMITS = Object.freeze({
  free: Object.freeze({ cpuMs: 50, subRequests: 10 }),
  pro: Object.freeze({ cpuMs: 200, subRequests: 50 }),
  business: Object.freeze({ cpuMs: 350, subRequests: 100 }),
  enterprise: Object.freeze({ cpuMs: 600, subRequests: 250 }),
  quarantine: Object.freeze({ cpuMs: 25, subRequests: 3 }),
});

function toSafeInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function requestId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `req_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function parseRequestUrl(inputUrl) {
  try {
    return new URL(inputUrl);
  } catch {
    return null;
  }
}

export function resolveTenantFromRequest(requestUrl, tenantDirectory = {}) {
  const url = parseRequestUrl(requestUrl);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  const byHost = tenantDirectory.byHost || {};
  const bySlug = tenantDirectory.bySlug || {};

  if (byHost[host]) {
    return {
      ...byHost[host],
      routeMode: "host",
      host,
      pathname: url.pathname,
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "t" && segments[1]) {
    const slug = segments[1].toLowerCase();
    if (bySlug[slug]) {
      return {
        ...bySlug[slug],
        routeMode: "path",
        slug,
        host,
        pathname: url.pathname,
      };
    }
  }

  return null;
}

export function resolveDispatchLimits({
  plan,
  overrides,
  planLimits = DEFAULT_PLAN_LIMITS,
} = {}) {
  const effectivePlan = String(plan || "free").toLowerCase();
  const base = planLimits[effectivePlan] || planLimits.free || DEFAULT_PLAN_LIMITS.free;
  const normalizedOverrides = overrides && typeof overrides === "object" ? overrides : {};

  return {
    cpuMs: toSafeInt(
      normalizedOverrides.cpuMs ?? normalizedOverrides.cpu_ms,
      base.cpuMs,
    ),
    subRequests: toSafeInt(
      normalizedOverrides.subRequests ?? normalizedOverrides.subrequests,
      base.subRequests,
    ),
  };
}

export function toCloudflareDispatchLimits(limits = {}) {
  return {
    cpu_ms: toSafeInt(limits.cpuMs ?? limits.cpu_ms, DEFAULT_PLAN_LIMITS.free.cpuMs),
    subrequests: toSafeInt(
      limits.subRequests ?? limits.subrequests,
      DEFAULT_PLAN_LIMITS.free.subRequests,
    ),
  };
}

export function buildDispatchPayload({ requestUrl, tenant, planLimits }) {
  if (!tenant?.workerName) {
    throw new Error("tenant workerName is required");
  }

  const limits = resolveDispatchLimits({
    plan: tenant.plan,
    overrides: tenant.limits,
    planLimits,
  });

  return {
    tenantId: tenant.tenantId,
    workerName: tenant.workerName,
    plan: tenant.plan || "free",
    limits,
    cloudflareLimits: toCloudflareDispatchLimits(limits),
    requestUrl,
  };
}

function withRequestIdHeaders(headers = {}, traceId) {
  return {
    "x-request-id": traceId,
    ...headers,
  };
}

export function createDispatcher({
  tenantDirectory,
  fetchTenantWorker,
  planLimits = DEFAULT_PLAN_LIMITS,
  onEvent,
} = {}) {
  if (typeof fetchTenantWorker !== "function") {
    throw new Error("createDispatcher requires fetchTenantWorker function");
  }

  return async function dispatch(request) {
    const traceId = requestId();
    const targetUrl = request?.url;
    const tenant = resolveTenantFromRequest(targetUrl, tenantDirectory);

    if (!tenant) {
      return {
        status: 404,
        headers: withRequestIdHeaders({}, traceId),
        body: {
          ok: false,
          error: "tenant_not_found",
          requestId: traceId,
        },
      };
    }

    const payload = buildDispatchPayload({
      requestUrl: targetUrl,
      tenant,
      planLimits,
    });

    if (onEvent) {
      onEvent({
        eventType: "dispatch_start",
        requestId: traceId,
        tenantId: payload.tenantId,
        workerName: payload.workerName,
        limits: payload.limits,
      });
    }

    try {
      const workerResponse = await fetchTenantWorker({
        request,
        requestId: traceId,
        tenant,
        dispatch: payload,
      });

      const result = {
        status: Number(workerResponse?.status || 200),
        headers: withRequestIdHeaders(workerResponse?.headers || {}, traceId),
        body: workerResponse?.body || { ok: true, requestId: traceId },
      };

      if (onEvent) {
        onEvent({
          eventType: "dispatch_success",
          requestId: traceId,
          tenantId: payload.tenantId,
          status: result.status,
        });
      }

      return result;
    } catch (error) {
      if (onEvent) {
        onEvent({
          eventType: "dispatch_failure",
          requestId: traceId,
          tenantId: payload.tenantId,
          reason: error?.message || "unknown_error",
        });
      }

      return {
        status: 502,
        headers: withRequestIdHeaders({}, traceId),
        body: {
          ok: false,
          error: "tenant_worker_failure",
          reason: error?.message || "unknown_error",
          requestId: traceId,
        },
      };
    }
  };
}
