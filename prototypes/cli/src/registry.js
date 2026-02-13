import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SUPPORTED_DATASET_EXTENSIONS = new Set([".csv", ".json"]);
const SUPPORTED_FUNCTION_EXTENSIONS = new Set([".js", ".mjs"]);
const SUPPORTED_RESOURCE_TYPES = new Set(["dataset", "function", "proxy"]);
const SUPPORTED_PLANS = new Set(["free", "pro", "business", "enterprise", "quarantine"]);

export function defaultRegistryPath(cwd = process.cwd()) {
  return path.resolve(cwd, ".402claw", "tenants.json");
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toPositiveInt(value, fallback = undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function cloneJsonValue(value, fallback = undefined) {
  if (value === undefined || value === null) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function normalizeHostList(hosts, fallback = []) {
  if (hosts === undefined) {
    return Array.isArray(fallback) ? [...fallback] : [];
  }

  return (Array.isArray(hosts) ? hosts : [hosts])
    .map((value) => toText(String(value || "")).toLowerCase())
    .filter(Boolean);
}

function parseWindowSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  const raw = toText(value);
  if (!raw) return undefined;

  const compact = raw.replace(/\s+/g, "").toLowerCase();
  const match = compact.match(/^(\d+)(s|m|h)?$/);
  if (!match) {
    throw new Error(`invalid rate limit window: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] || "s";
  const multipliers = { s: 1, m: 60, h: 3600 };
  return amount * multipliers[unit];
}

function normalizeRateLimitBucket(bucket, fieldName, fallback) {
  if (bucket === undefined || bucket === null || bucket === false) {
    return fallback ? cloneJsonValue(fallback) : undefined;
  }

  if (typeof bucket === "string") {
    const compact = bucket.replace(/\s+/g, "").toLowerCase();
    const parts = compact.split("/");
    if (parts.length !== 2) {
      throw new Error(`${fieldName} must use requests/window format`);
    }

    const requests = toPositiveInt(parts[0]);
    const windowSeconds = parseWindowSeconds(parts[1]);
    if (!requests || !windowSeconds) {
      throw new Error(`${fieldName} must use requests/window format`);
    }

    return { requests, windowSeconds };
  }

  if (typeof bucket !== "object") {
    throw new Error(`${fieldName} must be an object or requests/window string`);
  }

  const requests = toPositiveInt(bucket.requests, undefined);
  const windowSeconds = parseWindowSeconds(bucket.windowSeconds ?? bucket.window);

  if (!requests || !windowSeconds) {
    throw new Error(`${fieldName} requires positive requests and windowSeconds`);
  }

  return { requests, windowSeconds };
}

function normalizeRateLimit(value, fallback) {
  const hasFallback = Boolean(fallback && typeof fallback === "object");
  if (value === undefined || value === null || value === false) {
    return hasFallback ? cloneJsonValue(fallback) : undefined;
  }

  if (typeof value !== "object") {
    throw new Error("rateLimit must be an object");
  }

  const source = value;
  const output = {};

  const perCaller = normalizeRateLimitBucket(
    source.perCaller ?? source.caller,
    "rateLimit.perCaller",
    fallback?.perCaller,
  );
  if (perCaller) output.perCaller = perCaller;

  const globalLimit = normalizeRateLimitBucket(
    source.global,
    "rateLimit.global",
    fallback?.global,
  );
  if (globalLimit) output.global = globalLimit;

  const burst = toPositiveInt(source.burst, undefined);
  if (burst) {
    output.burst = burst;
  } else if (Number.isFinite(Number(fallback?.burst)) && Number(fallback.burst) > 0) {
    output.burst = Math.floor(Number(fallback.burst));
  }

  if (Object.keys(output).length === 0) {
    return hasFallback ? cloneJsonValue(fallback) : undefined;
  }

  return output;
}

function normalizeUsageLimit(value, fallback) {
  const hasFallback = Boolean(fallback && typeof fallback === "object");
  if (value === undefined || value === null || value === false) {
    return hasFallback ? cloneJsonValue(fallback) : undefined;
  }

  if (typeof value !== "object") {
    throw new Error("usageLimit must be an object");
  }

  const output = {};
  const source = value;

  const dailyRequests = toPositiveInt(
    source.dailyRequests ?? source.dayRequests ?? source.daily ?? source.day,
    undefined,
  );
  if (dailyRequests) {
    output.dailyRequests = dailyRequests;
  } else {
    const fallbackDaily = toPositiveInt(fallback?.dailyRequests, undefined);
    if (fallbackDaily) output.dailyRequests = fallbackDaily;
  }

  const monthlyRequests = toPositiveInt(
    source.monthlyRequests ?? source.monthRequests ?? source.monthly ?? source.month,
    undefined,
  );
  if (monthlyRequests) {
    output.monthlyRequests = monthlyRequests;
  } else {
    const fallbackMonthly = toPositiveInt(fallback?.monthlyRequests, undefined);
    if (fallbackMonthly) output.monthlyRequests = fallbackMonthly;
  }

  if (Object.keys(output).length === 0) {
    return hasFallback ? cloneJsonValue(fallback) : undefined;
  }

  return output;
}

function normalizeProxyConfig(value, fallback) {
  const source = value && typeof value === "object"
    ? value
    : fallback && typeof fallback === "object"
      ? fallback
      : null;

  if (!source) return undefined;

  const upstreamRaw = toText(source.upstream || fallback?.upstream);
  if (!upstreamRaw) {
    throw new Error("proxy.upstream is required");
  }

  let upstream;
  try {
    upstream = new URL(upstreamRaw);
  } catch {
    throw new Error(`invalid proxy.upstream URL: ${upstreamRaw}`);
  }

  if (!["http:", "https:"].includes(upstream.protocol)) {
    throw new Error("proxy.upstream must use http or https");
  }

  const methodsSource = source.methods ?? source.allowMethods ?? fallback?.methods;
  const methods = (Array.isArray(methodsSource) ? methodsSource : [methodsSource || "GET"])
    .map((method) => toText(String(method || "")).toUpperCase())
    .filter(Boolean);

  const injectHeadersSource = source.injectHeaders && typeof source.injectHeaders === "object"
    ? source.injectHeaders
    : fallback?.injectHeaders && typeof fallback.injectHeaders === "object"
      ? fallback.injectHeaders
      : {};

  const injectHeaders = Object.fromEntries(
    Object.entries(injectHeadersSource)
      .map(([key, headerValue]) => [toText(key), toText(String(headerValue || ""))])
      .filter(([key, headerValue]) => key && headerValue),
  );

  const injectHeaderSecretsSource = source.injectHeaderSecrets
    && typeof source.injectHeaderSecrets === "object"
    ? source.injectHeaderSecrets
    : fallback?.injectHeaderSecrets && typeof fallback.injectHeaderSecrets === "object"
      ? fallback.injectHeaderSecrets
      : {};

  const injectHeaderSecrets = Object.fromEntries(
    Object.entries(injectHeaderSecretsSource)
      .map(([key, secretName]) => [toText(key), toText(String(secretName || "")).toUpperCase()])
      .filter(([key, secretName]) => key && secretName),
  );

  const cacheTtlSeconds = toPositiveInt(
    source.cacheTtlSeconds ?? source.cacheTtl ?? source.cache?.ttl,
    toPositiveInt(fallback?.cacheTtlSeconds, undefined),
  );

  const timeoutMs = toPositiveInt(source.timeoutMs, toPositiveInt(fallback?.timeoutMs, undefined));
  const transform = toText(source.transform, toText(fallback?.transform));

  return {
    upstream: upstream.toString().replace(/\/$/, ""),
    methods: methods.length > 0 ? [...new Set(methods)] : ["GET"],
    injectHeaders,
    injectHeaderSecrets,
    cacheTtlSeconds: cacheTtlSeconds || 0,
    timeoutMs: timeoutMs || 0,
    transform: transform || undefined,
  };
}

function normalizeResourceType(resourceType, fallback = "dataset") {
  const normalized = toText(resourceType || fallback, fallback).toLowerCase();
  if (!SUPPORTED_RESOURCE_TYPES.has(normalized)) {
    throw new Error(`invalid resourceType: ${resourceType}`);
  }
  return normalized;
}

function resolveFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (SUPPORTED_DATASET_EXTENSIONS.has(ext)) {
    return { resourceType: "dataset", extension: ext };
  }
  if (SUPPORTED_FUNCTION_EXTENSIONS.has(ext)) {
    return { resourceType: "function", extension: ext };
  }
  return null;
}

function assertSupportedDataset(datasetPath) {
  const absolute = path.resolve(datasetPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`dataset file not found: ${datasetPath}`);
  }

  const extension = path.extname(absolute).toLowerCase();
  if (!SUPPORTED_DATASET_EXTENSIONS.has(extension)) {
    throw new Error("dataset must be .csv or .json");
  }

  return {
    absolute,
    extension,
  };
}

function assertSupportedFunction(functionPath) {
  const absolute = path.resolve(functionPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`function file not found: ${functionPath}`);
  }

  const extension = path.extname(absolute).toLowerCase();
  if (!SUPPORTED_FUNCTION_EXTENSIONS.has(extension)) {
    throw new Error("function must be .js or .mjs");
  }

  return {
    absolute,
    extension,
  };
}

function inferResourceType({
  resourceType,
  sourcePath,
  datasetPath,
  functionPath,
  proxy,
  existing,
} = {}) {
  if (resourceType) {
    return normalizeResourceType(resourceType);
  }

  if (proxy && typeof proxy === "object") {
    return "proxy";
  }

  const candidatePath = sourcePath || datasetPath || functionPath;
  if (candidatePath) {
    const resolved = resolveFileType(candidatePath);
    if (resolved) return resolved.resourceType;
  }

  if (existing?.resourceType) {
    return normalizeResourceType(existing.resourceType);
  }

  if (existing?.datasetPath || existing?.datasetType) {
    return "dataset";
  }

  return "dataset";
}

export function slugifyTenant(input) {
  const value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!value) {
    throw new Error("tenant slug is required");
  }

  return value;
}

export function normalizePlan(plan = "free") {
  const normalized = String(plan || "free").trim().toLowerCase();
  if (!SUPPORTED_PLANS.has(normalized)) {
    throw new Error(`invalid plan: ${plan}`);
  }
  return normalized;
}

export function loadRegistry(registryPath) {
  const absolutePath = path.resolve(registryPath);
  if (!fs.existsSync(absolutePath)) {
    return {
      version: 1,
      updatedAt: null,
      tenants: [],
    };
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.tenants)) {
    throw new Error(`invalid registry file: ${registryPath}`);
  }

  return parsed;
}

export function saveRegistry(registryPath, registry) {
  const absolutePath = path.resolve(registryPath);
  ensureDir(absolutePath);

  const next = {
    version: Number(registry.version || 1),
    updatedAt: new Date().toISOString(),
    tenants: Array.isArray(registry.tenants) ? registry.tenants : [],
  };

  fs.writeFileSync(absolutePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function makeWorkerName(slug) {
  return `tenant-${slug}-worker`;
}

function nextTenantId(slug) {
  return `tenant_${slug}_${crypto.randomBytes(2).toString("hex")}`;
}

function normalizeLimits(value, fallback) {
  const source = value && typeof value === "object" ? value : {};
  const rawCpuMs = source.cpuMs ?? source.cpu_ms;
  const rawSubRequests = source.subRequests ?? source.subrequests;

  const out = {};

  if (rawCpuMs !== undefined) {
    const cpuMs = Number(rawCpuMs);
    if (!Number.isFinite(cpuMs) || cpuMs <= 0) {
      throw new Error("limits.cpuMs must be a positive number");
    }
    out.cpuMs = Math.floor(cpuMs);
  }

  if (rawSubRequests !== undefined) {
    const subRequests = Number(rawSubRequests);
    if (!Number.isFinite(subRequests) || subRequests <= 0) {
      throw new Error("limits.subRequests must be a positive number");
    }
    out.subRequests = Math.floor(subRequests);
  }

  if (Object.keys(out).length > 0) {
    return out;
  }

  if (fallback && typeof fallback === "object") {
    const saved = {};
    if (Number.isFinite(Number(fallback.cpuMs)) && Number(fallback.cpuMs) > 0) {
      saved.cpuMs = Math.floor(Number(fallback.cpuMs));
    }
    if (Number.isFinite(Number(fallback.subRequests)) && Number(fallback.subRequests) > 0) {
      saved.subRequests = Math.floor(Number(fallback.subRequests));
    }
    if (Object.keys(saved).length > 0) return saved;
  }

  return undefined;
}

function normalizeOptionalBoolean(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`${fieldName} must be true or false`);
}

export function upsertDeployment({
  registryPath,
  datasetPath,
  sourcePath,
  functionPath,
  resourceType,
  proxy,
  rateLimit,
  usageLimit,
  tenant,
  ownerUserId,
  plan = "free",
  priceUsd,
  hosts,
  workerName,
  limits,
  x402Enabled,
} = {}) {
  if (!registryPath) {
    throw new Error("registryPath is required");
  }

  const slug = slugifyTenant(tenant);
  const normalizedPlan = normalizePlan(plan);
  const parsedPrice = Number(priceUsd);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw new Error("priceUsd must be a positive number");
  }

  const registry = loadRegistry(registryPath);
  const now = new Date().toISOString();
  const foundIndex = registry.tenants.findIndex((item) => item.slug === slug);

  const existing = foundIndex >= 0 ? registry.tenants[foundIndex] : null;
  const effectiveOwnerUserId = String(ownerUserId || existing?.ownerUserId || "anonymous");

  const normalizedResourceType = inferResourceType({
    resourceType,
    sourcePath,
    datasetPath,
    functionPath,
    proxy,
    existing,
  });

  const entry = {
    slug,
    tenantId: existing?.tenantId || nextTenantId(slug),
    ownerUserId: effectiveOwnerUserId,
    workerName: workerName || existing?.workerName || makeWorkerName(slug),
    plan: normalizedPlan,
    resourceType: normalizedResourceType,
    priceUsd: parsedPrice,
    hosts: normalizeHostList(hosts, existing?.hosts),
    routeBase: `/t/${slug}`,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const normalizedLimits = normalizeLimits(limits, existing?.limits);
  if (normalizedLimits) {
    entry.limits = normalizedLimits;
  }

  const normalizedX402 = normalizeOptionalBoolean(x402Enabled, "x402Enabled");
  if (normalizedX402 !== undefined) {
    entry.x402Enabled = normalizedX402;
  } else if (typeof existing?.x402Enabled === "boolean") {
    entry.x402Enabled = existing.x402Enabled;
  }

  if (normalizedResourceType === "dataset") {
    const resolvedDatasetPath = sourcePath || datasetPath || existing?.datasetPath;
    if (!resolvedDatasetPath) {
      throw new Error("datasetPath is required");
    }

    const dataset = assertSupportedDataset(resolvedDatasetPath);
    entry.sourcePath = dataset.absolute;
    entry.sourceType = dataset.extension.slice(1);
    entry.datasetPath = dataset.absolute;
    entry.datasetType = dataset.extension.slice(1);
    delete entry.functionPath;
    delete entry.functionType;
    delete entry.proxy;
  } else if (normalizedResourceType === "function") {
    const resolvedFunctionPath = sourcePath || functionPath || existing?.functionPath || existing?.sourcePath;
    if (!resolvedFunctionPath) {
      throw new Error("function path is required");
    }

    const fn = assertSupportedFunction(resolvedFunctionPath);
    entry.sourcePath = fn.absolute;
    entry.sourceType = fn.extension.slice(1);
    entry.functionPath = fn.absolute;
    entry.functionType = fn.extension.slice(1);
    delete entry.datasetPath;
    delete entry.datasetType;
    delete entry.proxy;
  } else if (normalizedResourceType === "proxy") {
    const normalizedProxy = normalizeProxyConfig(proxy, existing?.proxy);
    if (!normalizedProxy) {
      throw new Error("proxy config is required");
    }

    entry.sourcePath = normalizedProxy.upstream;
    entry.sourceType = "proxy";
    entry.proxy = normalizedProxy;
    delete entry.datasetPath;
    delete entry.datasetType;
    delete entry.functionPath;
    delete entry.functionType;
  }

  const normalizedRateLimit = normalizeRateLimit(rateLimit, existing?.rateLimit);
  if (normalizedRateLimit) {
    entry.rateLimit = normalizedRateLimit;
  }

  const normalizedUsageLimit = normalizeUsageLimit(usageLimit, existing?.usageLimit);
  if (normalizedUsageLimit) {
    entry.usageLimit = normalizedUsageLimit;
  }

  if (foundIndex >= 0) {
    registry.tenants[foundIndex] = entry;
  } else {
    registry.tenants.push(entry);
  }

  const saved = saveRegistry(registryPath, registry);
  return {
    registry: saved,
    tenant: entry,
  };
}

export function getTenant(registryPath, tenant) {
  const slug = slugifyTenant(tenant);
  const registry = loadRegistry(registryPath);
  return registry.tenants.find((item) => item.slug === slug) || null;
}

export function toTenantDirectory(registry) {
  const byHost = {};
  const bySlug = {};

  for (const tenant of registry.tenants || []) {
    const shared = {
      slug: tenant.slug,
      tenantId: tenant.tenantId,
      ownerUserId: tenant.ownerUserId || "anonymous",
      workerName: tenant.workerName,
      plan: tenant.plan,
      resourceType: tenant.resourceType || (tenant.datasetPath ? "dataset" : "dataset"),
      sourceType: tenant.sourceType
        || tenant.datasetType
        || tenant.functionType
        || "unknown",
      sourcePath: tenant.sourcePath
        || tenant.datasetPath
        || tenant.functionPath
        || null,
      priceUsd: Number(tenant.priceUsd || 0),
    };

    if (tenant.proxy && typeof tenant.proxy === "object") {
      shared.proxy = {
        upstream: tenant.proxy.upstream,
        methods: Array.isArray(tenant.proxy.methods) ? tenant.proxy.methods : ["GET"],
        cacheTtlSeconds: Number(tenant.proxy.cacheTtlSeconds || 0),
      };
    }

    if (tenant.limits && typeof tenant.limits === "object") {
      shared.limits = {
        cpuMs: Number(tenant.limits.cpuMs || 0),
        subRequests: Number(tenant.limits.subRequests || 0),
      };
    }

    if (tenant.rateLimit && typeof tenant.rateLimit === "object") {
      shared.rateLimit = cloneJsonValue(tenant.rateLimit, undefined);
    }

    if (tenant.usageLimit && typeof tenant.usageLimit === "object") {
      shared.usageLimit = cloneJsonValue(tenant.usageLimit, undefined);
    }

    if (typeof tenant.x402Enabled === "boolean") {
      shared.x402Enabled = tenant.x402Enabled;
    }

    bySlug[tenant.slug] = shared;
    for (const host of tenant.hosts || []) {
      byHost[host] = shared;
    }
  }

  return { byHost, bySlug };
}

export function listTenants(registryPath) {
  const registry = loadRegistry(registryPath);
  return registry.tenants || [];
}
