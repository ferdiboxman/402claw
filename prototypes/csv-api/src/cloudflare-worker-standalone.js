const DEFAULT_PLAN_LIMITS = {
  free: { cpuMs: 50, subRequests: 10 },
  pro: { cpuMs: 200, subRequests: 50 },
  business: { cpuMs: 350, subRequests: 100 },
  enterprise: { cpuMs: 600, subRequests: 250 },
  quarantine: { cpuMs: 25, subRequests: 3 },
};

function toSafeInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function parseTenantDirectory(raw) {
  if (!raw) return { byHost: {}, bySlug: {} };

  let parsed;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { byHost: {}, bySlug: {} };
    }
  } else {
    parsed = raw;
  }

  if (!parsed || typeof parsed !== "object") {
    return { byHost: {}, bySlug: {} };
  }

  if (parsed.byHost || parsed.bySlug) {
    return {
      byHost: parsed.byHost || {},
      bySlug: parsed.bySlug || {},
    };
  }

  return { byHost: {}, bySlug: {} };
}

function resolveTenantFromRequest(requestUrl, directory) {
  const url = new URL(requestUrl);
  const host = url.hostname.toLowerCase();

  if (directory.byHost[host]) {
    return {
      ...directory.byHost[host],
      routeMode: "host",
      host,
      pathname: url.pathname,
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "t" && segments[1]) {
    const slug = segments[1].toLowerCase();
    if (directory.bySlug[slug]) {
      return {
        ...directory.bySlug[slug],
        routeMode: "path",
        slug,
        host,
        pathname: url.pathname,
      };
    }
  }

  return null;
}

function resolveDispatchLimits(tenant) {
  const plan = String(tenant?.plan || "free").toLowerCase();
  const base = DEFAULT_PLAN_LIMITS[plan] || DEFAULT_PLAN_LIMITS.free;

  return {
    cpuMs: toSafeInt(tenant?.limits?.cpuMs, base.cpuMs),
    subRequests: toSafeInt(tenant?.limits?.subRequests, base.subRequests),
  };
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

async function passthroughResponse(response, headers = {}) {
  const body = await response.arrayBuffer();
  const merged = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => merged.set(key, value));

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function requestId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `req_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export default {
  async fetch(request, env) {
    const traceId = requestId();
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(200, {
        ok: true,
        service: "402claw-dispatcher-standalone",
        requestId: traceId,
      }, {
        "x-request-id": traceId,
      });
    }

    if (!env?.DISPATCHER || typeof env.DISPATCHER.get !== "function") {
      return jsonResponse(500, {
        ok: false,
        error: "dispatcher_binding_missing",
        requestId: traceId,
      }, {
        "x-request-id": traceId,
      });
    }

    const directory = parseTenantDirectory(env.TENANT_DIRECTORY_JSON);
    const tenant = resolveTenantFromRequest(request.url, directory);

    if (!tenant?.workerName) {
      return jsonResponse(404, {
        ok: false,
        error: "tenant_not_found",
        requestId: traceId,
      }, {
        "x-request-id": traceId,
      });
    }

    const limits = resolveDispatchLimits(tenant);
    const worker = env.DISPATCHER.get(tenant.workerName, {}, { limits });
    const upstreamRequest = tenant.routeMode === "path" && tenant.slug
      ? rewritePathModeRequest(request, tenant.slug)
      : request;

    try {
      const upstream = await worker.fetch(upstreamRequest);
      return passthroughResponse(upstream, {
        "x-request-id": traceId,
        "x-tenant-id": tenant.tenantId || "unknown",
      });
    } catch (error) {
      return jsonResponse(502, {
        ok: false,
        error: "tenant_worker_failure",
        reason: error?.message || "unknown_error",
        requestId: traceId,
      }, {
        "x-request-id": traceId,
        "x-tenant-id": tenant.tenantId || "unknown",
      });
    }
  },
};
