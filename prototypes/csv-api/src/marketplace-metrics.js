const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const TREND_WINDOWS = Object.freeze(["today", "week", "overall"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function toTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && value.length > 0) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function toInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

function toText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function startOfUtcDay(timestampMs) {
  const date = new Date(timestampMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function percentage(part, total) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

function maxValue(map) {
  let max = 0;
  for (const value of map.values()) {
    if (value > max) max = value;
  }
  return max;
}

function normalizeEndpoint(apiId, endpoint) {
  const cleanEndpoint = toText(endpoint);
  if (cleanEndpoint) return cleanEndpoint;
  const cleanApiId = toText(apiId);
  if (!cleanApiId) return "";
  return cleanApiId.startsWith("/") ? cleanApiId : `/${cleanApiId}`;
}

function isErrorStatus(status) {
  if (!Number.isFinite(status)) return false;
  if (status >= 500) return true;
  return status === 408 || status === 429;
}

function makeRange(window, nowMs) {
  if (!TREND_WINDOWS.includes(window)) {
    throw new Error(`unsupported trend window: ${window}`);
  }

  if (window === "overall") {
    return {
      window,
      startMs: null,
      endMs: nowMs,
      startAt: null,
      endAt: new Date(nowMs).toISOString(),
    };
  }

  const todayStart = startOfUtcDay(nowMs);
  const startMs = window === "today" ? todayStart : todayStart - (6 * DAY_MS);

  return {
    window,
    startMs,
    endMs: nowMs,
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(nowMs).toISOString(),
  };
}

function inRange(timestampMs, range) {
  if (range.startMs === null) return timestampMs <= range.endMs;
  return timestampMs >= range.startMs && timestampMs <= range.endMs;
}

export function normalizeUsageEvent(rawEvent) {
  const timestampMs = toTimestamp(rawEvent?.timestamp ?? rawEvent?.ts ?? rawEvent?.occurredAt);
  if (timestampMs === null) return null;

  const apiId = toText(rawEvent?.apiId ?? rawEvent?.api ?? rawEvent?.endpoint ?? rawEvent?.path);
  const endpoint = normalizeEndpoint(apiId, rawEvent?.endpoint ?? rawEvent?.path ?? rawEvent?.route);
  if (!apiId && !endpoint) return null;

  const callerId = toText(
    rawEvent?.callerId ?? rawEvent?.agentId ?? rawEvent?.buyerId ?? rawEvent?.wallet ?? "anonymous",
    "anonymous",
  );
  const requestId = toText(rawEvent?.requestId ?? rawEvent?.traceId ?? rawEvent?.id);
  const status = toInteger(rawEvent?.status ?? rawEvent?.statusCode, 200);
  const latencyMs = toNonNegativeNumber(rawEvent?.latencyMs ?? rawEvent?.durationMs, 0);
  const priceUsd = toNonNegativeNumber(rawEvent?.priceUsd ?? rawEvent?.unitPriceUsd, 0);
  const billedUsd = toNonNegativeNumber(
    rawEvent?.billedUsd ?? rawEvent?.revenueUsd ?? rawEvent?.amountUsd,
    priceUsd,
  );

  const explicitError = rawEvent?.error === true || Boolean(rawEvent?.errorCode);
  const isError = explicitError || isErrorStatus(status);
  const billable = rawEvent?.billable === true || billedUsd > 0;
  const countable = rawEvent?.countable === undefined
    ? status !== 402
    : rawEvent?.countable === true;

  return {
    timestampMs,
    apiId: apiId || endpoint,
    endpoint,
    tenantId: toText(rawEvent?.tenantId ?? rawEvent?.ownerId),
    owner: toText(rawEvent?.owner ?? rawEvent?.publisher ?? rawEvent?.creator, "@unknown"),
    directory: toText(rawEvent?.directory ?? rawEvent?.category, "Uncategorized"),
    callerId,
    requestId: requestId || undefined,
    status,
    latencyMs,
    billedUsd,
    priceUsd,
    isError,
    billable,
    countable,
    lifecycle: toText(rawEvent?.lifecycle),
  };
}

function dedupeEvents(events) {
  const normalized = [];
  const seen = new Set();

  for (const event of events || []) {
    const parsed = normalizeUsageEvent(event);
    if (!parsed) continue;

    if (parsed.requestId) {
      const key = `${parsed.apiId}:${parsed.requestId}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }

    normalized.push(parsed);
  }

  return normalized;
}

function initApiBucket(event) {
  return {
    apiId: event.apiId,
    endpoint: event.endpoint,
    tenantId: event.tenantId,
    owner: event.owner,
    directory: event.directory,
    calls: 0,
    revenueUsd: 0,
    priceUsdTotal: 0,
    latencySamples: [],
    errors: 0,
    callerCounts: new Map(),
    hourCounts: new Map(),
  };
}

function addEventToBucket(bucket, event) {
  bucket.calls += 1;
  bucket.revenueUsd += event.billedUsd;
  bucket.priceUsdTotal += event.priceUsd;

  if (event.latencyMs > 0) {
    bucket.latencySamples.push(event.latencyMs);
  }

  if (event.isError) {
    bucket.errors += 1;
  }

  const existingCallerCount = bucket.callerCounts.get(event.callerId) || 0;
  bucket.callerCounts.set(event.callerId, existingCallerCount + 1);

  const hourBucket = Math.floor(event.timestampMs / HOUR_MS);
  const existingHourCount = bucket.hourCounts.get(hourBucket) || 0;
  bucket.hourCounts.set(hourBucket, existingHourCount + 1);
}

export function computeTrendingScore({
  calls,
  revenueUsd,
  uniqueCallers,
  errorRatePct,
  p95LatencyMs,
  topCallerShare,
  maxHourShare,
}) {
  const baseCalls = Math.log10(calls + 1) * 40;
  const baseRevenue = Math.log10((revenueUsd * 100) + 1) * 25;
  const baseCallers = Math.log10(uniqueCallers + 1) * 20;
  const qualityBoost = Math.max(0, 10 - (errorRatePct * 0.7));

  const diversityRatio = calls > 0 ? uniqueCallers / calls : 0;
  const lowDiversityPenalty = clamp((0.18 - diversityRatio) * 120, 0, 20);
  const dominancePenalty = clamp((topCallerShare - 0.45) * 80, 0, 25);
  const burstPenalty = clamp((maxHourShare - 0.4) * 70, 0, 20);
  const latencyPenalty = clamp((p95LatencyMs - 800) / 75, 0, 15);

  return round(
    baseCalls + baseRevenue + baseCallers + qualityBoost
      - lowDiversityPenalty - dominancePenalty - burstPenalty - latencyPenalty,
    2,
  );
}

function finalizeApiMetrics(bucket) {
  const calls = bucket.calls;
  const uniqueCallers = bucket.callerCounts.size;
  const errorRatePct = percentage(bucket.errors, calls);
  const uptimePct = Math.max(0, 100 - errorRatePct);
  const avgLatencyMs = bucket.latencySamples.length > 0
    ? bucket.latencySamples.reduce((sum, value) => sum + value, 0) / bucket.latencySamples.length
    : 0;
  const p95LatencyMs = percentile(bucket.latencySamples, 0.95);
  const topCallerShare = calls > 0 ? maxValue(bucket.callerCounts) / calls : 0;
  const maxHourShare = calls > 0 ? maxValue(bucket.hourCounts) / calls : 0;
  const diversityRatio = calls > 0 ? uniqueCallers / calls : 0;
  const priceUsd = calls > 0 ? bucket.priceUsdTotal / calls : 0;

  return {
    id: bucket.apiId,
    endpoint: bucket.endpoint,
    owner: bucket.owner,
    tenantId: bucket.tenantId,
    directory: bucket.directory,
    priceUsd: round(priceUsd, 5),
    calls,
    revenueUsd: round(bucket.revenueUsd, 2),
    uniqueCallers,
    latencyMs: Math.round(avgLatencyMs),
    p95LatencyMs: Math.round(p95LatencyMs),
    errorRatePct: round(errorRatePct, 2),
    uptimePct: round(uptimePct, 2),
    topCallerShare: round(topCallerShare, 4),
    maxHourShare: round(maxHourShare, 4),
    diversityRatio: round(diversityRatio, 4),
    trendingScore: computeTrendingScore({
      calls,
      revenueUsd: bucket.revenueUsd,
      uniqueCallers,
      errorRatePct,
      p95LatencyMs,
      topCallerShare,
      maxHourShare,
    }),
  };
}

function sortApis(a, b) {
  if (b.trendingScore !== a.trendingScore) return b.trendingScore - a.trendingScore;
  if (b.calls !== a.calls) return b.calls - a.calls;
  if (b.revenueUsd !== a.revenueUsd) return b.revenueUsd - a.revenueUsd;
  if (a.errorRatePct !== b.errorRatePct) return a.errorRatePct - b.errorRatePct;
  return a.endpoint.localeCompare(b.endpoint);
}

function finalizeDirectoryMetrics({ directory, calls, revenueUsd, apiIds, callerIds }) {
  return {
    directory,
    calls,
    revenueUsd: round(revenueUsd, 2),
    apis: apiIds.size,
    uniqueCallers: callerIds.size,
  };
}

export function buildWindowSnapshot(events, { window, now = Date.now(), topLimit = 50 } = {}) {
  const nowMs = toTimestamp(now);
  if (nowMs === null) {
    throw new Error("buildWindowSnapshot requires valid `now`");
  }

  const range = makeRange(window, nowMs);
  const normalizedEvents = dedupeEvents(events);
  const apiBuckets = new Map();
  const directoryBuckets = new Map();
  const globalCallerIds = new Set();
  let eventsConsidered = 0;

  for (const event of normalizedEvents) {
    if (!inRange(event.timestampMs, range)) continue;
    if (!event.countable) continue;
    eventsConsidered += 1;
    globalCallerIds.add(event.callerId);

    let bucket = apiBuckets.get(event.apiId);
    if (!bucket) {
      bucket = initApiBucket(event);
      apiBuckets.set(event.apiId, bucket);
    }
    addEventToBucket(bucket, event);

    const directoryKey = event.directory;
    let directory = directoryBuckets.get(directoryKey);
    if (!directory) {
      directory = {
        directory: directoryKey,
        calls: 0,
        revenueUsd: 0,
        apiIds: new Set(),
        callerIds: new Set(),
      };
      directoryBuckets.set(directoryKey, directory);
    }

    directory.calls += 1;
    directory.revenueUsd += event.billedUsd;
    directory.apiIds.add(event.apiId);
    directory.callerIds.add(event.callerId);
  }

  const allApis = [...apiBuckets.values()].map(finalizeApiMetrics).sort(sortApis);
  const topApis = allApis.slice(0, Math.max(1, toInteger(topLimit, 50)));
  const rankedApis = topApis.map((api, index) => ({ ...api, rank: index + 1 }));

  const directories = [...directoryBuckets.values()]
    .map(finalizeDirectoryMetrics)
    .sort((a, b) => {
      if (b.calls !== a.calls) return b.calls - a.calls;
      if (b.revenueUsd !== a.revenueUsd) return b.revenueUsd - a.revenueUsd;
      return a.directory.localeCompare(b.directory);
    });

  const calls = allApis.reduce((sum, api) => sum + api.calls, 0);
  const revenueUsd = allApis.reduce((sum, api) => sum + api.revenueUsd, 0);

  return {
    window,
    generatedAt: new Date(nowMs).toISOString(),
    range: {
      startAt: range.startAt,
      endAt: range.endAt,
    },
    heroStats: {
      activeAgents: globalCallerIds.size,
      publishedApis: allApis.length,
      directories: directories.length,
      calls,
      revenueUsd: round(revenueUsd, 2),
    },
    topApis: rankedApis,
    allApis,
    directories,
    debug: {
      eventsReceived: normalizedEvents.length,
      eventsConsidered,
    },
  };
}

export function buildMarketplaceAnalytics(events, { now = Date.now(), topLimit = 50 } = {}) {
  const nowMs = toTimestamp(now);
  if (nowMs === null) {
    throw new Error("buildMarketplaceAnalytics requires valid `now`");
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    windows: {
      today: buildWindowSnapshot(events, { window: "today", now: nowMs, topLimit }),
      week: buildWindowSnapshot(events, { window: "week", now: nowMs, topLimit }),
      overall: buildWindowSnapshot(events, { window: "overall", now: nowMs, topLimit }),
    },
  };
}
