import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, toTenantDirectory } from "./registry.js";

export const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
export const DEFAULT_COMPATIBILITY_DATE = "2026-02-12";

function assertNonEmpty(value, name) {
  if (!String(value || "").trim()) {
    throw new Error(`${name} is required`);
  }
}

function toText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function maskToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return "";
  if (raw.length <= 8) return `${raw.slice(0, 2)}***`;
  return `${raw.slice(0, 4)}***${raw.slice(-4)}`;
}

function uniqueStringList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )];
}

function parseApiError(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  if (errors.length === 0) return fallback;
  const first = errors[0];
  if (first?.message) return first.message;
  return fallback;
}

async function parseApiResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function nextDeploymentId() {
  return `dep_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function assertTenantSlug(tenantSlug) {
  const slug = String(tenantSlug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) {
    throw new Error("tenant slug is required");
  }
  return slug;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvDataset(csvText) {
  const lines = String(csvText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const parts = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header || `column_${index + 1}`] = parts[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function parseTenantDataset(tenant) {
  const datasetPath = path.resolve(tenant.datasetPath);
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`dataset not found for tenant ${tenant.slug}: ${tenant.datasetPath}`);
  }

  const raw = fs.readFileSync(datasetPath, "utf8");
  const datasetType = String(tenant.datasetType || "").toLowerCase();

  if (datasetType === "csv") {
    return parseCsvDataset(raw);
  }

  if (datasetType === "json") {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.items)) return parsed.items;
      return [parsed];
    }
    return [{ value: parsed }];
  }

  throw new Error(`unsupported tenant datasetType: ${tenant.datasetType}`);
}

function remapModuleGraph(moduleGraph = {}, prefix = "user/") {
  const remapped = {};
  for (const [name, content] of Object.entries(moduleGraph)) {
    const normalizedName = String(name || "").replace(/\\/g, "/");
    if (!normalizedName || normalizedName.startsWith("../") || normalizedName.includes("/../")) {
      continue;
    }
    remapped[`${prefix}${normalizedName}`] = content;
  }
  return remapped;
}

function parseTenantFunctionSource(tenant) {
  const functionPath = path.resolve(
    tenant.functionPath || tenant.sourcePath || tenant.datasetPath || "",
  );
  if (!functionPath || !fs.existsSync(functionPath)) {
    throw new Error(`function source not found for tenant ${tenant.slug}: ${tenant.functionPath || tenant.sourcePath}`);
  }

  const extension = path.extname(functionPath).toLowerCase();
  if (![".js", ".mjs"].includes(extension)) {
    throw new Error(`unsupported function extension for tenant ${tenant.slug}: ${extension}`);
  }

  const source = fs.readFileSync(functionPath, "utf8");
  const localGraph = collectLocalModuleGraph(functionPath, path.dirname(functionPath));
  const entryModuleName = "user/entry.js";

  return {
    functionPath,
    source,
    entryModuleName,
    additionalModules: {
      [entryModuleName]: source,
      ...remapModuleGraph(localGraph, "user/"),
    },
  };
}

function inferTenantResourceType(tenantRecord = {}) {
  const explicit = toText(tenantRecord.resourceType).toLowerCase();
  if (["dataset", "function", "proxy"].includes(explicit)) {
    return explicit;
  }

  if (tenantRecord.proxy && typeof tenantRecord.proxy === "object") {
    return "proxy";
  }

  if (tenantRecord.functionPath) {
    return "function";
  }

  const sourceType = toText(tenantRecord.sourceType || tenantRecord.datasetType || tenantRecord.functionType)
    .toLowerCase();
  if (["js", "mjs"].includes(sourceType)) return "function";

  return "dataset";
}

function buildFunctionWorkerScript({ tenant, entryModuleName } = {}) {
  return `import userDefault, * as userModule from "./${entryModuleName}";

const TENANT = ${JSON.stringify({
    slug: tenant.slug,
    tenantId: tenant.tenantId,
    ownerUserId: tenant.ownerUserId || "anonymous",
    priceUsd: toSafeNumber(tenant.priceUsd, 0),
    sourcePath: tenant.functionPath || tenant.sourcePath || null,
  }, null, 2)};

const USER_CONFIG = userModule && typeof userModule.config === "object" && userModule.config
  ? userModule.config
  : {};
const ALLOWED_HOSTS = Array.isArray(USER_CONFIG.allowedHosts)
  ? USER_CONFIG.allowedHosts.map((host) => String(host || "").trim().toLowerCase()).filter(Boolean)
  : [];
const EXPOSE_ENV = Array.isArray(USER_CONFIG.exposeEnv)
  ? USER_CONFIG.exposeEnv.map((key) => String(key || "").trim()).filter(Boolean)
  : [];
const MAX_DURATION_SECONDS = Number(USER_CONFIG.maxDuration || USER_CONFIG.maxDurationSeconds || 0);

function toJson(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function isAllowedUrl(rawUrl, requestUrl) {
  if (!rawUrl) return false;
  try {
    const target = new URL(rawUrl, requestUrl);
    if (ALLOWED_HOSTS.length === 0) return true;
    return ALLOWED_HOSTS.includes(target.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function buildContext(request, env, executionCtx) {
  const exposedEnv = {};
  for (const key of EXPOSE_ENV) {
    if (Object.prototype.hasOwnProperty.call(env || {}, key)) {
      exposedEnv[key] = env[key];
    }
  }

  return {
    env: exposedEnv,
    kv: env?.TENANT_KV ?? null,
    waitUntil: typeof executionCtx?.waitUntil === "function"
      ? executionCtx.waitUntil.bind(executionCtx)
      : () => {},
    fetch: async (input, init) => {
      const targetUrl = typeof input === "string" ? input : input?.url;
      if (!isAllowedUrl(targetUrl, request.url)) {
        throw new Error("host_not_allowed_by_config");
      }
      return fetch(input, init);
    },
  };
}

async function invokeUser(request, env, executionCtx) {
  if (userDefault && typeof userDefault.fetch === "function") {
    return userDefault.fetch(request, env, executionCtx);
  }

  const handler = typeof userDefault === "function"
    ? userDefault
    : (typeof userModule.handler === "function" ? userModule.handler : null);
  if (!handler) {
    throw new Error("function_export_missing");
  }

  return handler(request, buildContext(request, env, executionCtx));
}

export default {
  async fetch(request, env = {}, executionCtx) {
    try {
      const timeoutMs = Number.isFinite(MAX_DURATION_SECONDS) && MAX_DURATION_SECONDS > 0
        ? Math.floor(MAX_DURATION_SECONDS * 1000)
        : 0;
      const result = timeoutMs > 0
        ? await Promise.race([
          invokeUser(request, env, executionCtx),
          new Promise((_, reject) => setTimeout(() => reject(new Error("function_timeout")), timeoutMs)),
        ])
        : await invokeUser(request, env, executionCtx);

      if (result instanceof Response) {
        return result;
      }

      if (result === undefined) {
        return new Response(null, { status: 204 });
      }

      return toJson(200, {
        ok: true,
        tenant: TENANT.slug,
        result,
      });
    } catch (error) {
      return toJson(500, {
        ok: false,
        error: "function_execution_failed",
        reason: error?.message || "unknown_error",
        tenant: TENANT.slug,
      });
    }
  },
};
`;
}

function buildProxyWorkerScript({ tenant, proxy } = {}) {
  return `const TENANT = ${JSON.stringify({
    slug: tenant.slug,
    tenantId: tenant.tenantId,
    ownerUserId: tenant.ownerUserId || "anonymous",
    priceUsd: toSafeNumber(tenant.priceUsd, 0),
  }, null, 2)};
const UPSTREAM_BASE = ${JSON.stringify(proxy.upstream)};
const ALLOWED_METHODS = ${JSON.stringify(proxy.methods || ["GET"])};
const INJECT_HEADERS = ${JSON.stringify(proxy.injectHeaders || {})};
const INJECT_HEADER_SECRETS = ${JSON.stringify(proxy.injectHeaderSecrets || {})};
const CACHE_TTL_SECONDS = ${Math.max(0, Math.floor(Number(proxy.cacheTtlSeconds || 0)))};
const REQUEST_TIMEOUT_MS = ${Math.max(0, Math.floor(Number(proxy.timeoutMs || 0)))};
const TRANSFORM_SOURCE = ${JSON.stringify(proxy.transform || "")};

function toJson(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function withHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function buildUpstreamUrl(requestUrl) {
  const source = new URL(requestUrl);
  const upstreamBase = new URL(UPSTREAM_BASE);
  const target = new URL(upstreamBase.toString());
  target.pathname = source.pathname;
  target.search = source.search;
  return target.toString();
}

async function fetchUpstream(request) {
  const upstreamUrl = buildUpstreamUrl(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  for (const [key, value] of Object.entries(INJECT_HEADERS)) {
    headers.set(key, value);
  }
  for (const [key, envName] of Object.entries(INJECT_HEADER_SECRETS)) {
    const secretValue = env?.[envName];
    if (!secretValue) {
      throw new Error(\`missing_proxy_secret:\${envName}\`);
    }
    headers.set(key, String(secretValue));
  }

  const init = {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
  };

  if (REQUEST_TIMEOUT_MS > 0) {
    return Promise.race([
      fetch(upstreamUrl, init),
      new Promise((_, reject) => setTimeout(() => reject(new Error("upstream_timeout")), REQUEST_TIMEOUT_MS)),
    ]);
  }

  return fetch(upstreamUrl, init);
}

async function maybeTransformResponse(response, request) {
  if (!TRANSFORM_SOURCE) return response;

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return response;

  let payload;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  let transformed;
  try {
    const fn = new Function("data", "request", TRANSFORM_SOURCE);
    transformed = fn(payload, request);
  } catch (error) {
    return toJson(502, {
      ok: false,
      error: "proxy_transform_failed",
      reason: error?.message || "invalid_transform",
      tenant: TENANT.slug,
    });
  }

  return new Response(JSON.stringify(transformed), {
    status: response.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env, executionCtx) {
    if (!ALLOWED_METHODS.includes(request.method.toUpperCase())) {
      return toJson(405, {
        ok: false,
        error: "method_not_allowed",
        allowedMethods: ALLOWED_METHODS,
      });
    }

    const cacheable = request.method === "GET" && CACHE_TTL_SECONDS > 0;
    const cacheKeyRequest = new Request(buildUpstreamUrl(request.url), { method: "GET" });

    if (cacheable) {
      const hit = await caches.default.match(cacheKeyRequest);
      if (hit) {
        return withHeaders(hit, { "x-proxy-cache": "HIT" });
      }
    }

    let upstreamResponse;
    try {
      upstreamResponse = await fetchUpstream(request);
    } catch (error) {
      return toJson(502, {
        ok: false,
        error: "proxy_upstream_failure",
        reason: error?.message || "upstream_unreachable",
        tenant: TENANT.slug,
      });
    }

    const transformed = await maybeTransformResponse(upstreamResponse, request);
    const withCacheHeader = withHeaders(transformed, { "x-proxy-cache": cacheable ? "MISS" : "BYPASS" });

    if (cacheable && withCacheHeader.status >= 200 && withCacheHeader.status < 300) {
      const cacheResponse = withHeaders(withCacheHeader.clone(), {
        "cache-control": \`public, max-age=\${CACHE_TTL_SECONDS}\`,
      });
      if (executionCtx && typeof executionCtx.waitUntil === "function") {
        executionCtx.waitUntil(caches.default.put(cacheKeyRequest, cacheResponse));
      } else {
        await caches.default.put(cacheKeyRequest, cacheResponse);
      }
    }

    return withCacheHeader;
  },
};
`;
}

function collectLocalModuleGraph(entryPath, rootDir = path.dirname(entryPath), visited = new Set()) {
  const absoluteEntryPath = path.resolve(entryPath);
  if (visited.has(absoluteEntryPath)) {
    return {};
  }
  visited.add(absoluteEntryPath);

  if (!fs.existsSync(absoluteEntryPath)) {
    return {};
  }

  const source = fs.readFileSync(absoluteEntryPath, "utf8");
  const modules = {};
  const importPattern = /(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["'](\.{1,2}\/[^"']+)["']/g;
  let match = importPattern.exec(source);

  while (match) {
    const specifier = match[1];
    const resolvedBase = path.resolve(path.dirname(absoluteEntryPath), specifier);
    const resolvedPath = path.extname(resolvedBase) ? resolvedBase : `${resolvedBase}.js`;

    if (fs.existsSync(resolvedPath)) {
      const relativeName = path.relative(rootDir, resolvedPath).replace(/\\/g, "/");
      if (relativeName && !modules[relativeName]) {
        modules[relativeName] = fs.readFileSync(resolvedPath, "utf8");
      }

      const nested = collectLocalModuleGraph(resolvedPath, rootDir, visited);
      for (const [name, content] of Object.entries(nested)) {
        if (!modules[name]) {
          modules[name] = content;
        }
      }
    }

    match = importPattern.exec(source);
  }

  return modules;
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function buildTenantWorkerScript({
  tenant,
  records,
} = {}) {
  const prettyRecords = JSON.stringify(records, null, 2);
  const priceUsd = toSafeNumber(tenant.priceUsd, 0.001);

  return `const TENANT = ${JSON.stringify({
    slug: tenant.slug,
    tenantId: tenant.tenantId,
    ownerUserId: tenant.ownerUserId || "anonymous",
    priceUsd,
    datasetType: tenant.datasetType,
  }, null, 2)};

const RECORDS = ${prettyRecords};

function json(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function parseLimit(value, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(1000, Math.floor(parsed));
}

function parseOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function matchQuery(item, query) {
  if (!query) return true;
  return JSON.stringify(item).toLowerCase().includes(query);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(200, {
        ok: true,
        tenant: TENANT.slug,
        records: RECORDS.length,
      });
    }

    if (request.method === "GET" && url.pathname === "/pricing") {
      return json(200, {
        ok: true,
        tenant: TENANT.slug,
        priceUsd: TENANT.priceUsd,
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/records") {
      const query = url.searchParams.get("q")?.trim().toLowerCase() || "";
      const limit = parseLimit(url.searchParams.get("limit"), 100);
      const offset = parseOffset(url.searchParams.get("offset"));

      const filtered = RECORDS.filter((item) => matchQuery(item, query));
      const items = filtered.slice(offset, offset + limit);

      return json(200, {
        ok: true,
        tenant: TENANT.slug,
        total: filtered.length,
        offset,
        limit,
        items,
      });
    }

    return json(404, {
      ok: false,
      error: "not_found",
      tenant: TENANT.slug,
      path: url.pathname,
    });
  },
};
`;
}

function createGenericWorkerUploadBody({
  scriptContent,
  compatibilityDate = DEFAULT_COMPATIBILITY_DATE,
  bindings = [],
  additionalModules = {},
} = {}) {
  assertNonEmpty(scriptContent, "scriptContent");

  const metadata = {
    main_module: "index.js",
    compatibility_date: compatibilityDate,
    bindings,
  };

  const body = new FormData();
  body.set("metadata", JSON.stringify(metadata));
  body.set(
    "index.js",
    new Blob([scriptContent], { type: "application/javascript+module" }),
    "index.js",
  );

  for (const [moduleName, moduleContent] of Object.entries(additionalModules || {})) {
    if (!moduleName || moduleName === "index.js") continue;
    body.set(
      moduleName,
      new Blob([String(moduleContent)], { type: "application/javascript+module" }),
      moduleName,
    );
  }

  return {
    body,
    metadata,
  };
}

export function defaultDeploymentStatePath(cwd = process.cwd()) {
  return path.resolve(cwd, ".402claw", "cloudflare-dispatcher-history.json");
}

export function loadDeploymentState(statePath) {
  const absolutePath = path.resolve(statePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      version: 1,
      updatedAt: null,
      deployments: [],
    };
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.deployments)) {
    throw new Error(`invalid deployment state file: ${statePath}`);
  }

  return parsed;
}

export function saveDeploymentState(statePath, state) {
  const absolutePath = path.resolve(statePath);
  ensureDir(absolutePath);

  const next = {
    version: Number(state.version || 1),
    updatedAt: new Date().toISOString(),
    deployments: Array.isArray(state.deployments) ? state.deployments : [],
  };

  fs.writeFileSync(absolutePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function appendDeploymentState(statePath, deployment) {
  const state = loadDeploymentState(statePath);
  state.deployments.push(deployment);
  return saveDeploymentState(statePath, state);
}

export function buildTenantDirectoryJson(registryPath, options = {}) {
  const registry = loadRegistry(registryPath, options);
  const directory = toTenantDirectory(registry);
  return {
    registry,
    directory,
    json: JSON.stringify(directory),
  };
}

export function createDispatcherUploadBody({
  scriptContent,
  tenantDirectoryJson,
  compatibilityDate = DEFAULT_COMPATIBILITY_DATE,
  dispatchNamespace,
  usageKvNamespaceId,
  rateKvNamespaceId,
  additionalModules = {},
} = {}) {
  assertNonEmpty(scriptContent, "scriptContent");
  assertNonEmpty(tenantDirectoryJson, "tenantDirectoryJson");

  const bindings = [
    {
      type: "plain_text",
      name: "TENANT_DIRECTORY_JSON",
      text: tenantDirectoryJson,
    },
  ];

  if (dispatchNamespace) {
    bindings.push({
      type: "dispatch_namespace",
      name: "DISPATCHER",
      namespace: dispatchNamespace,
    });
  }

  if (usageKvNamespaceId) {
    bindings.push({
      type: "kv_namespace",
      name: "USAGE_KV",
      namespace_id: usageKvNamespaceId,
    });
  }

  if (rateKvNamespaceId) {
    bindings.push({
      type: "kv_namespace",
      name: "RATE_KV",
      namespace_id: rateKvNamespaceId,
    });
  }

  const metadata = {
    main_module: "index.js",
    compatibility_date: compatibilityDate,
    bindings,
  };

  return createGenericWorkerUploadBody({
    scriptContent,
    compatibilityDate,
    bindings: metadata.bindings,
    additionalModules,
  });
}

export function createCloudflareClient({
  accountId,
  apiToken,
  fetchImpl = fetch,
  apiBase = CLOUDFLARE_API_BASE,
} = {}) {
  assertNonEmpty(accountId, "accountId");
  assertNonEmpty(apiToken, "apiToken");

  async function request(method, pathname, { headers = {}, body } = {}) {
    const url = `${apiBase.replace(/\/$/, "")}${pathname}`;

    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        ...headers,
      },
      body,
    });

    const payload = await parseApiResponse(response);

    if (!response.ok) {
      const detail = parseApiError(payload, `HTTP ${response.status}`);
      throw new Error(`Cloudflare API error (${method} ${pathname}): ${detail}`);
    }

    if (payload && payload.success === false) {
      const detail = parseApiError(payload, "unknown error");
      throw new Error(`Cloudflare API error (${method} ${pathname}): ${detail}`);
    }

    return payload?.result ?? payload;
  }

  return {
    accountId,
    request,
    async uploadWorkerModule({ scriptName, body, dispatchNamespace } = {}) {
      assertNonEmpty(scriptName, "scriptName");
      if (!body) throw new Error("upload body is required");
      const pathname = dispatchNamespace
        ? `/accounts/${accountId}/workers/dispatch/namespaces/${dispatchNamespace}/scripts/${scriptName}`
        : `/accounts/${accountId}/workers/scripts/${scriptName}`;

      return request(
        "PUT",
        pathname,
        { body },
      );
    },
    async enableWorkersDevSubdomain({ scriptName, enabled = true } = {}) {
      assertNonEmpty(scriptName, "scriptName");
      return request(
        "POST",
        `/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`,
        {
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled: Boolean(enabled) }),
        },
      );
    },
    async putWorkerSecret({
      scriptName,
      secretName,
      secretText,
      dispatchNamespace,
    } = {}) {
      assertNonEmpty(scriptName, "scriptName");
      assertNonEmpty(secretName, "secretName");
      assertNonEmpty(secretText, "secretText");

      const pathname = dispatchNamespace
        ? `/accounts/${accountId}/workers/dispatch/namespaces/${dispatchNamespace}/scripts/${scriptName}/secrets`
        : `/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;

      return request(
        "PUT",
        pathname,
        {
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: secretName,
            text: secretText,
            type: "secret_text",
          }),
        },
      );
    },
  };
}

export function planCloudflareDispatcherDeploy({
  registryPath,
  scriptPath,
  scriptName,
  accountId,
  apiToken,
  dispatchNamespace,
  usageKvNamespaceId,
  rateKvNamespaceId,
  compatibilityDate,
  storage,
} = {}) {
  assertNonEmpty(registryPath, "registryPath");
  assertNonEmpty(scriptPath, "scriptPath");
  assertNonEmpty(scriptName, "scriptName");

  const absoluteScriptPath = path.resolve(scriptPath);
  if (!fs.existsSync(absoluteScriptPath)) {
    throw new Error(`script file not found: ${scriptPath}`);
  }

  const scriptContent = fs.readFileSync(absoluteScriptPath, "utf8");
  const additionalModules = collectLocalModuleGraph(absoluteScriptPath);
  const directoryInfo = buildTenantDirectoryJson(registryPath, { storage });

  const upload = createDispatcherUploadBody({
    scriptContent,
    tenantDirectoryJson: directoryInfo.json,
    compatibilityDate,
    dispatchNamespace,
    usageKvNamespaceId,
    rateKvNamespaceId,
    additionalModules,
  });

  return {
    registryPath: path.resolve(registryPath),
    scriptPath: absoluteScriptPath,
    scriptContent,
    tenantDirectoryJson: directoryInfo.json,
    scriptName,
    accountId: String(accountId || ""),
    maskedToken: maskToken(apiToken),
    dispatchNamespace: dispatchNamespace || null,
    usageKvNamespaceId: usageKvNamespaceId || null,
    rateKvNamespaceId: rateKvNamespaceId || null,
    compatibilityDate: upload.metadata.compatibility_date,
    tenantCount: directoryInfo.registry.tenants.length,
    metadata: upload.metadata,
    moduleCount: Object.keys(additionalModules).length,
    uploadBody: upload.body,
    additionalModules,
  };
}

export function planCloudflareTenantDeploy({
  registryPath,
  tenant,
  scriptName,
  accountId,
  apiToken,
  dispatchNamespace,
  compatibilityDate = DEFAULT_COMPATIBILITY_DATE,
  storage,
} = {}) {
  assertNonEmpty(registryPath, "registryPath");
  const slug = assertTenantSlug(tenant);
  const registry = loadRegistry(registryPath, { storage });
  const tenantRecord = registry.tenants.find((item) => item.slug === slug);

  if (!tenantRecord) {
    throw new Error(`tenant not found in registry: ${slug}`);
  }

  const resourceType = inferTenantResourceType(tenantRecord);
  let generatedScript = "";
  let additionalModules = {};
  let records = null;
  let functionSourcePath = null;
  let proxyConfig = null;
  let requiredSecretNames = [];

  if (resourceType === "dataset") {
    records = parseTenantDataset(tenantRecord);
    generatedScript = buildTenantWorkerScript({
      tenant: tenantRecord,
      records,
    });
  } else if (resourceType === "function") {
    const functionSource = parseTenantFunctionSource(tenantRecord);
    functionSourcePath = functionSource.functionPath;
    additionalModules = functionSource.additionalModules;
    generatedScript = buildFunctionWorkerScript({
      tenant: tenantRecord,
      entryModuleName: functionSource.entryModuleName,
    });
  } else if (resourceType === "proxy") {
    proxyConfig = tenantRecord.proxy && typeof tenantRecord.proxy === "object"
      ? tenantRecord.proxy
      : null;
    if (!proxyConfig?.upstream) {
      throw new Error(`proxy config missing for tenant ${tenantRecord.slug}`);
    }
    generatedScript = buildProxyWorkerScript({
      tenant: tenantRecord,
      proxy: proxyConfig,
    });
    requiredSecretNames = uniqueStringList(Object.values(proxyConfig.injectHeaderSecrets || {}));
  } else {
    throw new Error(`unsupported resource type: ${resourceType}`);
  }

  const resolvedScriptName = String(scriptName || tenantRecord.workerName || `tenant-${slug}-worker`);
  const upload = createGenericWorkerUploadBody({
    scriptContent: generatedScript,
    compatibilityDate,
    bindings: [],
    additionalModules,
  });

  return {
    registryPath: path.resolve(registryPath),
    tenant: {
      slug: tenantRecord.slug,
      tenantId: tenantRecord.tenantId,
      ownerUserId: tenantRecord.ownerUserId || "anonymous",
      workerName: tenantRecord.workerName,
      priceUsd: tenantRecord.priceUsd,
      resourceType,
      sourceType: tenantRecord.sourceType || tenantRecord.datasetType || tenantRecord.functionType,
      datasetType: tenantRecord.datasetType,
      datasetPath: tenantRecord.datasetPath,
      functionPath: functionSourcePath || tenantRecord.functionPath || tenantRecord.sourcePath,
      proxy: proxyConfig
        ? {
          upstream: proxyConfig.upstream,
          methods: proxyConfig.methods,
          cacheTtlSeconds: proxyConfig.cacheTtlSeconds,
          injectHeaderSecrets: proxyConfig.injectHeaderSecrets || {},
        }
        : undefined,
      records: Array.isArray(records) ? records.length : undefined,
    },
    scriptName: resolvedScriptName,
    accountId: String(accountId || ""),
    maskedToken: maskToken(apiToken),
    dispatchNamespace: dispatchNamespace || null,
    compatibilityDate: upload.metadata.compatibility_date,
    metadata: upload.metadata,
    moduleCount: Object.keys(additionalModules).length,
    requiredSecretNames,
    additionalModules,
    scriptContent: generatedScript,
    uploadBody: upload.body,
  };
}

function withPlanSummary(plan) {
  return {
    registryPath: plan.registryPath,
    scriptPath: plan.scriptPath,
    scriptName: plan.scriptName,
    accountId: plan.accountId,
    maskedToken: plan.maskedToken,
    dispatchNamespace: plan.dispatchNamespace,
    usageKvNamespaceId: plan.usageKvNamespaceId,
    rateKvNamespaceId: plan.rateKvNamespaceId,
    tenantCount: plan.tenantCount,
    moduleCount: plan.moduleCount,
    metadata: plan.metadata,
  };
}

export async function deployCloudflareDispatcher({
  registryPath,
  scriptPath,
  scriptName,
  accountId,
  apiToken,
  dispatchNamespace,
  usageKvNamespaceId,
  rateKvNamespaceId,
  compatibilityDate = DEFAULT_COMPATIBILITY_DATE,
  enableWorkersDev = true,
  execute = false,
  fetchImpl = fetch,
  statePath = defaultDeploymentStatePath(),
  storage,
} = {}) {
  const plan = planCloudflareDispatcherDeploy({
    registryPath,
    scriptPath,
    scriptName,
    accountId,
    apiToken,
    dispatchNamespace,
    usageKvNamespaceId,
    rateKvNamespaceId,
    compatibilityDate,
    storage,
  });

  if (!execute) {
    return {
      ok: true,
      mode: "dry-run",
      plan: withPlanSummary(plan),
      statePath: path.resolve(statePath),
    };
  }

  const client = createCloudflareClient({
    accountId,
    apiToken,
    fetchImpl,
  });

  const uploadResult = await client.uploadWorkerModule({
    scriptName,
    body: plan.uploadBody,
  });

  let subdomainResult = null;
  if (enableWorkersDev) {
    subdomainResult = await client.enableWorkersDevSubdomain({
      scriptName,
      enabled: true,
    });
  }

  const deployment = {
    id: nextDeploymentId(),
    type: "deploy",
    createdAt: new Date().toISOString(),
    scriptName,
    scriptPath: plan.scriptPath,
    accountId: String(accountId),
    dispatchNamespace: plan.dispatchNamespace,
    usageKvNamespaceId: plan.usageKvNamespaceId,
    rateKvNamespaceId: plan.rateKvNamespaceId,
    compatibilityDate: plan.compatibilityDate,
    tenantCount: plan.tenantCount,
    registryPath: plan.registryPath,
    metadata: plan.metadata,
    scriptContent: plan.scriptContent,
    additionalModules: plan.additionalModules || {},
    tenantDirectoryJson: plan.tenantDirectoryJson,
    uploadResult,
    subdomainResult,
  };

  appendDeploymentState(statePath, deployment);

  return {
    ok: true,
    mode: "execute",
    statePath: path.resolve(statePath),
    deployed: {
      deploymentId: deployment.id,
      scriptName,
      tenantCount: plan.tenantCount,
      dispatchNamespace: plan.dispatchNamespace,
      rateKvNamespaceId: plan.rateKvNamespaceId,
      uploadResult,
      subdomainResult,
    },
  };
}

export async function deployCloudflareTenantWorker({
  registryPath,
  tenant,
  scriptName,
  accountId,
  apiToken,
  dispatchNamespace,
  secrets = {},
  secretNames = [],
  compatibilityDate = DEFAULT_COMPATIBILITY_DATE,
  enableWorkersDev = true,
  execute = false,
  fetchImpl = fetch,
  statePath = defaultDeploymentStatePath(),
  storage,
} = {}) {
  const plan = planCloudflareTenantDeploy({
    registryPath,
    tenant,
    scriptName,
    accountId,
    apiToken,
    dispatchNamespace,
    compatibilityDate,
    storage,
  });

  const requestedSecretNames = uniqueStringList([
    ...(plan.requiredSecretNames || []),
    ...(Array.isArray(secretNames) ? secretNames : [secretNames]),
    ...Object.keys(secrets || {}),
  ]);

  const resolvedSecrets = {};
  for (const secretName of requestedSecretNames) {
    const value = secrets?.[secretName];
    if (value === undefined || value === null || String(value) === "") {
      continue;
    }
    resolvedSecrets[secretName] = String(value);
  }

  const missingSecretNames = requestedSecretNames.filter((name) => !(name in resolvedSecrets));

  if (!execute) {
    return {
      ok: true,
      mode: "dry-run",
      tenantDeploy: {
        registryPath: plan.registryPath,
        tenant: plan.tenant,
        scriptName: plan.scriptName,
        accountId: plan.accountId,
        maskedToken: plan.maskedToken,
        dispatchNamespace: plan.dispatchNamespace,
        moduleCount: plan.moduleCount,
        secretNames: requestedSecretNames,
        missingSecretNames,
        metadata: plan.metadata,
      },
      statePath: path.resolve(statePath),
    };
  }

  if (missingSecretNames.length > 0) {
    throw new Error(`missing secret values for tenant deploy: ${missingSecretNames.join(", ")}`);
  }

  const client = createCloudflareClient({
    accountId,
    apiToken,
    fetchImpl,
  });

  const uploadResult = await client.uploadWorkerModule({
    scriptName: plan.scriptName,
    body: plan.uploadBody,
    dispatchNamespace: plan.dispatchNamespace,
  });

  const secretResults = [];
  for (const [secretName, secretText] of Object.entries(resolvedSecrets)) {
    const secretResult = await client.putWorkerSecret({
      scriptName: plan.scriptName,
      dispatchNamespace: plan.dispatchNamespace,
      secretName,
      secretText,
    });
    secretResults.push({
      secretName,
      result: secretResult,
    });
  }

  let subdomainResult = null;
  if (enableWorkersDev && !plan.dispatchNamespace) {
    subdomainResult = await client.enableWorkersDevSubdomain({
      scriptName: plan.scriptName,
      enabled: true,
    });
  }

  const deployment = {
    id: nextDeploymentId(),
    type: "tenant_deploy",
    createdAt: new Date().toISOString(),
    scriptName: plan.scriptName,
    accountId: String(accountId),
    dispatchNamespace: plan.dispatchNamespace,
    compatibilityDate: plan.compatibilityDate,
    registryPath: plan.registryPath,
    tenant: plan.tenant,
    metadata: plan.metadata,
    additionalModules: plan.additionalModules || {},
    secretNames: requestedSecretNames,
    scriptContent: plan.scriptContent,
    uploadResult,
    secretResults,
    subdomainResult,
  };

  appendDeploymentState(statePath, deployment);

  return {
    ok: true,
    mode: "execute",
    statePath: path.resolve(statePath),
    deployed: {
      deploymentId: deployment.id,
      scriptName: plan.scriptName,
      tenant: plan.tenant,
      dispatchNamespace: plan.dispatchNamespace,
      secretNames: requestedSecretNames,
      missingSecretNames: [],
      uploadResult,
      secretResults,
      subdomainResult,
    },
  };
}

function resolveRollbackTarget(state, { scriptName, deploymentId } = {}) {
  let candidates = Array.isArray(state.deployments) ? state.deployments : [];

  if (scriptName) {
    candidates = candidates.filter((item) => item.scriptName === scriptName);
  }

  if (deploymentId) {
    const exact = candidates.find((item) => item.id === deploymentId);
    if (!exact) {
      throw new Error(`deployment not found for rollback: ${deploymentId}`);
    }
    return exact;
  }

  if (candidates.length === 0) {
    throw new Error("no deployment history found for rollback");
  }

  if (candidates.length >= 2) {
    return candidates[candidates.length - 2];
  }

  return candidates[candidates.length - 1];
}

export function planCloudflareDispatcherRollback({
  statePath = defaultDeploymentStatePath(),
  scriptName,
  deploymentId,
  accountId,
  apiToken,
} = {}) {
  const resolvedStatePath = path.resolve(statePath);
  const state = loadDeploymentState(resolvedStatePath);
  const target = resolveRollbackTarget(state, { scriptName, deploymentId });

  const upload = createDispatcherUploadBody({
    scriptContent: target.scriptContent,
    tenantDirectoryJson: target.tenantDirectoryJson,
    compatibilityDate: target.compatibilityDate,
    dispatchNamespace: target.dispatchNamespace,
    usageKvNamespaceId: target.usageKvNamespaceId,
    rateKvNamespaceId: target.rateKvNamespaceId,
    additionalModules: target.additionalModules || {},
  });

  return {
    statePath: resolvedStatePath,
    scriptName: target.scriptName,
    accountId: String(accountId || target.accountId || ""),
    maskedToken: maskToken(apiToken),
    target,
    metadata: upload.metadata,
    uploadBody: upload.body,
  };
}

export async function rollbackCloudflareDispatcher({
  statePath = defaultDeploymentStatePath(),
  scriptName,
  deploymentId,
  accountId,
  apiToken,
  execute = false,
  enableWorkersDev = true,
  fetchImpl = fetch,
} = {}) {
  const plan = planCloudflareDispatcherRollback({
    statePath,
    scriptName,
    deploymentId,
    accountId,
    apiToken,
  });

  if (!execute) {
    return {
      ok: true,
      mode: "dry-run",
      rollback: {
        statePath: plan.statePath,
        scriptName: plan.scriptName,
        accountId: plan.accountId,
        maskedToken: plan.maskedToken,
        targetDeploymentId: plan.target.id,
        targetCreatedAt: plan.target.createdAt,
        targetTenantCount: plan.target.tenantCount,
        targetDispatchNamespace: plan.target.dispatchNamespace,
        targetUsageKvNamespaceId: plan.target.usageKvNamespaceId || null,
        targetRateKvNamespaceId: plan.target.rateKvNamespaceId || null,
        metadata: plan.metadata,
      },
    };
  }

  const effectiveAccountId = plan.accountId;
  const client = createCloudflareClient({
    accountId: effectiveAccountId,
    apiToken,
    fetchImpl,
  });

  const uploadResult = await client.uploadWorkerModule({
    scriptName: plan.scriptName,
    body: plan.uploadBody,
  });

  let subdomainResult = null;
  if (enableWorkersDev) {
    subdomainResult = await client.enableWorkersDevSubdomain({
      scriptName: plan.scriptName,
      enabled: true,
    });
  }

  const rollbackDeployment = {
    id: nextDeploymentId(),
    type: "rollback",
    sourceDeploymentId: plan.target.id,
    createdAt: new Date().toISOString(),
    scriptName: plan.scriptName,
    scriptPath: plan.target.scriptPath,
    accountId: effectiveAccountId,
    dispatchNamespace: plan.target.dispatchNamespace,
    usageKvNamespaceId: plan.target.usageKvNamespaceId || null,
    rateKvNamespaceId: plan.target.rateKvNamespaceId || null,
    compatibilityDate: plan.target.compatibilityDate,
    tenantCount: plan.target.tenantCount,
    registryPath: plan.target.registryPath,
    metadata: plan.metadata,
    scriptContent: plan.target.scriptContent,
    additionalModules: plan.target.additionalModules || {},
    tenantDirectoryJson: plan.target.tenantDirectoryJson,
    uploadResult,
    subdomainResult,
  };

  appendDeploymentState(plan.statePath, rollbackDeployment);

  return {
    ok: true,
    mode: "execute",
    rollback: {
      statePath: plan.statePath,
      deploymentId: rollbackDeployment.id,
      sourceDeploymentId: plan.target.id,
      scriptName: plan.scriptName,
      uploadResult,
      subdomainResult,
    },
  };
}
