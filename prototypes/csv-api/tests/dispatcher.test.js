import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PLAN_LIMITS,
  buildDispatchPayload,
  createDispatcher,
  toCloudflareDispatchLimits,
  resolveDispatchLimits,
  resolveTenantFromRequest,
} from "../src/dispatcher.js";

const tenantDirectory = {
  byHost: {
    "acme.api.402claw.dev": {
      tenantId: "tenant_acme",
      workerName: "tenant-acme-worker",
      plan: "pro",
    },
  },
  bySlug: {
    beta: {
      tenantId: "tenant_beta",
      workerName: "tenant-beta-worker",
      plan: "free",
      limits: { cpuMs: 75 },
    },
  },
};

test("resolveTenantFromRequest supports host routing", () => {
  const tenant = resolveTenantFromRequest("https://acme.api.402claw.dev/v1/data", tenantDirectory);
  assert.equal(tenant.tenantId, "tenant_acme");
  assert.equal(tenant.routeMode, "host");
});

test("resolveTenantFromRequest supports path routing fallback", () => {
  const tenant = resolveTenantFromRequest("https://api.402claw.dev/t/beta/v1/data", tenantDirectory);
  assert.equal(tenant.tenantId, "tenant_beta");
  assert.equal(tenant.routeMode, "path");
});

test("resolveDispatchLimits applies plan defaults and overrides", () => {
  assert.deepEqual(resolveDispatchLimits({ plan: "pro" }), DEFAULT_PLAN_LIMITS.pro);
  assert.deepEqual(
    resolveDispatchLimits({ plan: "free", overrides: { cpuMs: 80, subRequests: 12 } }),
    { cpuMs: 80, subRequests: 12 },
  );
  assert.deepEqual(
    resolveDispatchLimits({ plan: "free", overrides: { cpu_ms: 70, subrequests: 9 } }),
    { cpuMs: 70, subRequests: 9 },
  );
});

test("buildDispatchPayload includes worker and limits", () => {
  const payload = buildDispatchPayload({
    requestUrl: "https://acme.api.402claw.dev/v1/data",
    tenant: tenantDirectory.byHost["acme.api.402claw.dev"],
  });

  assert.equal(payload.workerName, "tenant-acme-worker");
  assert.deepEqual(payload.limits, DEFAULT_PLAN_LIMITS.pro);
  assert.deepEqual(payload.cloudflareLimits, { cpu_ms: 200, subrequests: 50 });
});

test("toCloudflareDispatchLimits maps to snake_case keys", () => {
  assert.deepEqual(
    toCloudflareDispatchLimits({ cpuMs: 88, subRequests: 14 }),
    { cpu_ms: 88, subrequests: 14 },
  );
});

test("createDispatcher returns 404 when tenant is missing", async () => {
  const dispatch = createDispatcher({
    tenantDirectory,
    fetchTenantWorker: async () => ({ status: 200, body: { ok: true } }),
  });

  const response = await dispatch({ url: "https://unknown.api.402claw.dev/v1/data", method: "GET" });
  assert.equal(response.status, 404);
  assert.equal(response.body.error, "tenant_not_found");
  assert.ok(response.headers["x-request-id"]);
});

test("createDispatcher passes computed dispatch payload to worker", async () => {
  let observed = null;

  const dispatch = createDispatcher({
    tenantDirectory,
    fetchTenantWorker: async ({ dispatch }) => {
      observed = dispatch;
      return { status: 201, body: { ok: true } };
    },
  });

  const response = await dispatch({ url: "https://acme.api.402claw.dev/v1/data", method: "GET" });
  assert.equal(response.status, 201);
  assert.equal(observed.workerName, "tenant-acme-worker");
  assert.deepEqual(observed.limits, DEFAULT_PLAN_LIMITS.pro);
});

test("createDispatcher surfaces worker failure as 502", async () => {
  const events = [];
  const dispatch = createDispatcher({
    tenantDirectory,
    onEvent: (event) => events.push(event),
    fetchTenantWorker: async () => {
      throw new Error("worker timeout");
    },
  });

  const response = await dispatch({ url: "https://acme.api.402claw.dev/v1/data", method: "GET" });
  assert.equal(response.status, 502);
  assert.equal(response.body.error, "tenant_worker_failure");
  assert.ok(events.some((event) => event.eventType === "dispatch_failure"));
});
