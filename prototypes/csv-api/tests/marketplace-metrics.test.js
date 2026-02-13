import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMarketplaceAnalytics,
  buildWindowSnapshot,
  computeTrendingScore,
  normalizeUsageEvent,
} from "../src/marketplace-metrics.js";

const NOW = Date.parse("2026-02-13T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function makeEvent({
  apiId,
  endpoint,
  directory = "Data",
  owner = "@owner",
  callerId,
  requestId,
  timestampMs,
  status = 200,
  latencyMs = 120,
  billedUsd = 0.1,
  priceUsd = 0.1,
}) {
  return {
    apiId,
    endpoint,
    directory,
    owner,
    callerId,
    requestId,
    timestamp: timestampMs,
    status,
    latencyMs,
    billedUsd,
    priceUsd,
  };
}

function findApi(snapshot, apiId) {
  return snapshot.allApis.find((api) => api.id === apiId);
}

function approxEqual(actual, expected, epsilon = 0.05) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be ~${expected}`);
}

test("normalizeUsageEvent rejects malformed events and keeps useful defaults", () => {
  assert.equal(normalizeUsageEvent({ apiId: "x" }), null);

  const event = normalizeUsageEvent({
    timestamp: NOW,
    apiId: "api-x",
    callerId: "agent-1",
  });

  assert.equal(event.apiId, "api-x");
  assert.equal(event.endpoint, "/api-x");
  assert.equal(event.owner, "@unknown");
  assert.equal(event.directory, "Uncategorized");
  assert.equal(event.isError, false);
});

test("buildMarketplaceAnalytics splits events into today, week, and overall windows", () => {
  const events = [
    makeEvent({
      apiId: "api-a",
      endpoint: "/data/a",
      callerId: "agent-1",
      requestId: "a-1",
      timestampMs: NOW - HOUR_MS,
    }),
    makeEvent({
      apiId: "api-a",
      endpoint: "/data/a",
      callerId: "agent-2",
      requestId: "a-2",
      timestampMs: NOW - (2 * DAY_MS),
    }),
    makeEvent({
      apiId: "api-a",
      endpoint: "/data/a",
      callerId: "agent-3",
      requestId: "a-3",
      timestampMs: NOW - (9 * DAY_MS),
    }),
  ];

  const analytics = buildMarketplaceAnalytics(events, { now: NOW, topLimit: 10 });
  const today = analytics.windows.today;
  const week = analytics.windows.week;
  const overall = analytics.windows.overall;

  assert.equal(findApi(today, "api-a").calls, 1);
  assert.equal(findApi(week, "api-a").calls, 2);
  assert.equal(findApi(overall, "api-a").calls, 3);

  assert.equal(today.heroStats.activeAgents, 1);
  assert.equal(week.heroStats.activeAgents, 2);
  assert.equal(overall.heroStats.activeAgents, 3);
});

test("buildWindowSnapshot deduplicates repeated request ids", () => {
  const events = [
    makeEvent({
      apiId: "api-a",
      endpoint: "/data/a",
      callerId: "agent-1",
      requestId: "same-request",
      timestampMs: NOW - HOUR_MS,
    }),
    makeEvent({
      apiId: "api-a",
      endpoint: "/data/a",
      callerId: "agent-1",
      requestId: "same-request",
      timestampMs: NOW - HOUR_MS,
    }),
  ];

  const snapshot = buildWindowSnapshot(events, { window: "today", now: NOW });
  const api = findApi(snapshot, "api-a");

  assert.equal(api.calls, 1);
  assert.equal(snapshot.debug.eventsReceived, 1);
  assert.equal(snapshot.debug.eventsConsidered, 1);
});

test("trending rank penalizes concentrated spam traffic", () => {
  const events = [];

  for (let i = 0; i < 90; i += 1) {
    events.push(makeEvent({
      apiId: "api-spam",
      endpoint: "/ai/spam",
      directory: "AI/ML",
      callerId: "bot-1",
      requestId: `spam-${i}`,
      timestampMs: NOW - (10 * 60 * 1000),
      billedUsd: 0.1,
      priceUsd: 0.1,
      latencyMs: 95,
    }));
  }

  for (let i = 0; i < 70; i += 1) {
    events.push(makeEvent({
      apiId: "api-healthy",
      endpoint: "/ai/healthy",
      directory: "AI/ML",
      callerId: `agent-${i % 35}`,
      requestId: `healthy-${i}`,
      timestampMs: NOW - ((i % 12) * HOUR_MS),
      billedUsd: 0.12,
      priceUsd: 0.12,
      latencyMs: 130,
    }));
  }

  const snapshot = buildWindowSnapshot(events, { window: "today", now: NOW, topLimit: 10 });
  assert.equal(snapshot.topApis[0].id, "api-healthy");

  const spamApi = findApi(snapshot, "api-spam");
  const healthyApi = findApi(snapshot, "api-healthy");
  assert.ok(spamApi.topCallerShare > 0.9);
  assert.ok(healthyApi.diversityRatio > spamApi.diversityRatio);
  assert.ok(healthyApi.trendingScore > spamApi.trendingScore);
});

test("window snapshot computes quality metrics and directory rollups", () => {
  const events = [
    makeEvent({
      apiId: "api-quality",
      endpoint: "/market/quality",
      directory: "Finance",
      callerId: "agent-1",
      requestId: "q-1",
      timestampMs: NOW - HOUR_MS,
      status: 200,
      latencyMs: 100,
      billedUsd: 0.2,
      priceUsd: 0.2,
    }),
    makeEvent({
      apiId: "api-quality",
      endpoint: "/market/quality",
      directory: "Finance",
      callerId: "agent-2",
      requestId: "q-2",
      timestampMs: NOW - (2 * HOUR_MS),
      status: 502,
      latencyMs: 900,
      billedUsd: 0.2,
      priceUsd: 0.2,
    }),
    makeEvent({
      apiId: "api-quality",
      endpoint: "/market/quality",
      directory: "Finance",
      callerId: "agent-3",
      requestId: "q-3",
      timestampMs: NOW - (3 * HOUR_MS),
      status: 429,
      latencyMs: 700,
      billedUsd: 0.2,
      priceUsd: 0.2,
    }),
    makeEvent({
      apiId: "api-search",
      endpoint: "/data/search",
      directory: "Data",
      callerId: "agent-1",
      requestId: "s-1",
      timestampMs: NOW - HOUR_MS,
      status: 200,
      latencyMs: 210,
      billedUsd: 0.05,
      priceUsd: 0.05,
    }),
  ];

  const snapshot = buildWindowSnapshot(events, { window: "today", now: NOW, topLimit: 10 });
  const quality = findApi(snapshot, "api-quality");
  const finance = snapshot.directories.find((entry) => entry.directory === "Finance");
  const data = snapshot.directories.find((entry) => entry.directory === "Data");

  assert.equal(quality.calls, 3);
  approxEqual(quality.errorRatePct, 66.67);
  approxEqual(quality.uptimePct, 33.33);
  assert.equal(quality.p95LatencyMs, 900);
  approxEqual(quality.revenueUsd, 0.6);

  assert.equal(finance.calls, 3);
  approxEqual(finance.revenueUsd, 0.6);
  assert.equal(finance.apis, 1);
  assert.equal(finance.uniqueCallers, 3);

  assert.equal(data.calls, 1);
  assert.equal(snapshot.heroStats.publishedApis, 2);
  assert.equal(snapshot.heroStats.directories, 2);
  assert.equal(snapshot.heroStats.calls, 4);
});

test("computeTrendingScore stays finite for edge inputs", () => {
  const score = computeTrendingScore({
    calls: 0,
    revenueUsd: 0,
    uniqueCallers: 0,
    errorRatePct: 0,
    p95LatencyMs: 0,
    topCallerShare: 0,
    maxHourShare: 0,
  });

  assert.ok(Number.isFinite(score));
});

