#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://clawr-dispatcher.ferdiboxman.workers.dev";
const baseUrl = (process.env.DISPATCHER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const timeoutMs = Number.parseInt(process.env.MONITOR_TIMEOUT_MS || "8000", 10);
const maxHealthLatencyMs = Number.parseInt(process.env.MONITOR_MAX_HEALTH_LATENCY_MS || "1200", 10);
const maxAnalyticsLatencyMs = Number.parseInt(process.env.MONITOR_MAX_ANALYTICS_LATENCY_MS || "2500", 10);
const platformToken = process.env.CLAWR_EVENTS_API_TOKEN || "";

function nowIso() {
  return new Date().toISOString();
}

function buildTimeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout_${ms}ms`)), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function timedFetch(url, options = {}) {
  const startedAt = Date.now();
  const timeout = buildTimeoutSignal(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: timeout.signal,
      headers: {
        accept: "application/json",
        ...(options.headers || {}),
      },
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      body,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      body: null,
      error: error instanceof Error ? error.message : "request_failed",
    };
  } finally {
    timeout.clear();
  }
}

function evaluate(result) {
  const failures = [];

  if (!result.health.ok) {
    failures.push(`health_http_${result.health.status || "failed"}`);
  }
  if (result.health.latencyMs > maxHealthLatencyMs) {
    failures.push(`health_latency_${result.health.latencyMs}ms`);
  }

  if (!result.analytics.ok) {
    failures.push(`analytics_http_${result.analytics.status || "failed"}`);
  }
  if (result.analytics.latencyMs > maxAnalyticsLatencyMs) {
    failures.push(`analytics_latency_${result.analytics.latencyMs}ms`);
  }

  if (result.events) {
    if (!result.events.ok) {
      failures.push(`events_http_${result.events.status || "failed"}`);
    }
  }

  return failures;
}

async function run() {
  const healthUrl = `${baseUrl}/health`;
  const analyticsUrl = `${baseUrl}/__platform/analytics?window=today&top=5`;
  const eventsUrl = `${baseUrl}/__platform/events?limit=1`;

  const [health, analytics] = await Promise.all([
    timedFetch(healthUrl),
    timedFetch(analyticsUrl),
  ]);

  let events = null;
  if (platformToken) {
    events = await timedFetch(eventsUrl, {
      headers: {
        authorization: `Bearer ${platformToken}`,
      },
    });
  }

  const summary = {
    ok: true,
    checkedAt: nowIso(),
    baseUrl,
    thresholds: {
      timeoutMs,
      maxHealthLatencyMs,
      maxAnalyticsLatencyMs,
    },
    health,
    analytics,
    events,
    failures: [],
  };

  summary.failures = evaluate(summary);
  summary.ok = summary.failures.length === 0;

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        checkedAt: nowIso(),
        baseUrl,
        error: error instanceof Error ? error.message : "monitor_failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
