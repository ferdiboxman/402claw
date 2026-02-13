import test from "node:test";
import assert from "node:assert/strict";
import {
  createCloudflareDispatcherWorker,
  parseTenantDirectory,
} from "../src/cloudflare-worker.js";
import { createMockFacilitator } from "../../../research/codex-research/prototypes/x402-csv-api-poc/src/facilitator.js";

test("parseTenantDirectory supports tenants[] registry shape", () => {
  const directory = parseTenantDirectory({
    tenants: [
      {
        slug: "acme",
        tenantId: "tenant_acme",
        workerName: "tenant-acme-worker",
        plan: "pro",
        hosts: ["acme.api.402claw.dev"],
      },
    ],
  });

  assert.equal(directory.bySlug.acme.workerName, "tenant-acme-worker");
  assert.equal(directory.byHost["acme.api.402claw.dev"].tenantId, "tenant_acme");
});

test("worker returns health response", async () => {
  const worker = createCloudflareDispatcherWorker();
  const response = await worker.fetch(new Request("https://api.402claw.dev/health"), {});

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(response.headers.get("x-request-id"));
});

test("worker dispatches host-routed tenant with limits", async () => {
  const calls = [];

  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      byHost: {
        "acme.api.402claw.dev": {
          tenantId: "tenant_acme",
          workerName: "tenant-acme-worker",
          plan: "pro",
        },
      },
      bySlug: {},
    },
  });

  const env = {
    DISPATCHER: {
      get(workerName, _opts, settings) {
        calls.push({ workerName, limits: settings?.limits });
        return {
          async fetch(request) {
            return new Response(JSON.stringify({ ok: true, url: request.url }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const response = await worker.fetch(new Request("https://acme.api.402claw.dev/v1/data"), env);
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(calls[0].workerName, "tenant-acme-worker");
  assert.equal(calls[0].limits.cpu_ms, 200);
  assert.equal(calls[0].limits.subrequests, 50);
  assert.ok(response.headers.get("x-request-id"));
  assert.equal(response.headers.get("x-tenant-id"), "tenant_acme");
});

test("worker issues x402 challenge for priced tenant without payment signature", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        paid: {
          tenantId: "tenant_paid",
          workerName: "tenant-paid-worker",
          slug: "paid",
          plan: "pro",
          priceUsd: 0.001,
          x402Enabled: true,
        },
      },
      byHost: {},
    },
  });

  const env = {
    ALLOW_LOCAL_X402_VERIFICATION: "true",
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response("ok", { status: 200 });
          },
        };
      },
    },
  };

  const response = await worker.fetch(new Request("https://api.402claw.dev/t/paid/v1/data"), env);
  assert.equal(response.status, 402);

  const challengeHeader = response.headers.get("payment-required");
  assert.ok(challengeHeader);
  const challenge = JSON.parse(challengeHeader);
  assert.equal(challenge.x402Version, 2);
  assert.equal(challenge.accepts[0].resource, "/v1/data");
  assert.equal(challenge.accepts[0].maxAmountRequired, "1000");
});

test("worker accepts x402 payment and attaches payment receipt header", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        paid: {
          tenantId: "tenant_paid",
          workerName: "tenant-paid-worker",
          slug: "paid",
          plan: "pro",
          priceUsd: 0.001,
          x402Enabled: true,
        },
      },
      byHost: {},
    },
  });

  const env = {
    ALLOW_LOCAL_X402_VERIFICATION: "true",
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const challengeResponse = await worker.fetch(
    new Request("https://api.402claw.dev/t/paid/v1/data"),
    env,
  );
  const challenge = JSON.parse(challengeResponse.headers.get("payment-required"));
  const requirement = challenge.accepts[0];

  const payment = {
    paymentId: "payment_1",
    scheme: requirement.scheme,
    network: requirement.network,
    resource: requirement.resource,
    payTo: requirement.payTo,
    amount: requirement.maxAmountRequired,
    payer: "0x1111111111111111111111111111111111111111",
    timestamp: Date.now(),
    signature: "sig_local_test",
  };
  const encoded = Buffer.from(JSON.stringify(payment), "utf8").toString("base64url");

  const paidResponse = await worker.fetch(
    new Request("https://api.402claw.dev/t/paid/v1/data", {
      headers: { "payment-signature": encoded },
    }),
    env,
  );

  assert.equal(paidResponse.status, 200);
  assert.ok(paidResponse.headers.get("payment-response"));
});

test("worker rejects paid flow when facilitator is missing and local fallback is disabled", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        paid: {
          tenantId: "tenant_paid",
          workerName: "tenant-paid-worker",
          slug: "paid",
          plan: "pro",
          priceUsd: 0.001,
          x402Enabled: true,
        },
      },
      byHost: {},
    },
  });

  const env = {
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const challengeResponse = await worker.fetch(
    new Request("https://api.402claw.dev/t/paid/v1/data"),
    env,
  );
  const challenge = JSON.parse(challengeResponse.headers.get("payment-required"));
  const requirement = challenge.accepts[0];
  const payment = {
    paymentId: "payment_1",
    scheme: requirement.scheme,
    network: requirement.network,
    resource: requirement.resource,
    payTo: requirement.payTo,
    amount: requirement.maxAmountRequired,
    payer: "0x1111111111111111111111111111111111111111",
    timestamp: Date.now(),
    signature: "sig_local_test",
  };
  const encoded = Buffer.from(JSON.stringify(payment), "utf8").toString("base64url");

  const paidResponse = await worker.fetch(
    new Request("https://api.402claw.dev/t/paid/v1/data", {
      headers: { "payment-signature": encoded },
    }),
    env,
  );

  assert.equal(paidResponse.status, 402);
  const body = await paidResponse.json();
  assert.equal(body.error, "facilitator_unconfigured");
});

test("worker exposes platform analytics from tracked usage events", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        acme: {
          tenantId: "tenant_acme",
          workerName: "tenant-acme-worker",
          slug: "acme",
          plan: "free",
          priceUsd: 0,
        },
      },
      byHost: {},
    },
  });

  const env = {
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  await worker.fetch(new Request("https://api.402claw.dev/t/acme/v1/data"), env);
  const analytics = await worker.fetch(
    new Request("https://api.402claw.dev/__platform/analytics?window=today"),
    env,
  );

  assert.equal(analytics.status, 200);
  const payload = await analytics.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.window, "today");
  assert.ok(payload.snapshot.heroStats.calls >= 1);
});

test("worker analytics can read persisted usage events from USAGE_KV binding", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        kv: {
          tenantId: "tenant_kv",
          workerName: "tenant-kv-worker",
          slug: "kv",
          plan: "free",
          priceUsd: 0,
        },
      },
      byHost: {},
    },
  });

  let raw = "";
  const kv = {
    async get() {
      return raw;
    },
    async put(_key, value) {
      raw = value;
    },
  };

  const env = {
    USAGE_KV: kv,
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const pending = [];
  await worker.fetch(new Request("https://api.402claw.dev/t/kv/v1/data"), env, {
    waitUntil(promise) {
      pending.push(promise);
    },
  });
  await Promise.all(pending);

  const analytics = await worker.fetch(
    new Request("https://api.402claw.dev/__platform/analytics?window=today"),
    env,
  );

  const payload = await analytics.json();
  assert.equal(payload.ok, true);
  assert.ok(payload.snapshot.heroStats.calls >= 1);
  assert.ok(payload.debug.persistedEvents >= 1);
});

test("worker protects __platform/events without token", async () => {
  const worker = createCloudflareDispatcherWorker();
  const response = await worker.fetch(
    new Request("https://api.402claw.dev/__platform/events"),
    {},
  );

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "events_auth_required");
});

test("worker serves __platform/events with platform token", async () => {
  const worker = createCloudflareDispatcherWorker();
  const response = await worker.fetch(
    new Request("https://api.402claw.dev/__platform/events", {
      headers: { "x-platform-token": "secret_token" },
    }),
    { PLATFORM_ANALYTICS_TOKEN: "secret_token" },
  );

  assert.equal(response.status, 200);
});

test("worker enforces per-caller rate limits with standard headers", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        rate: {
          tenantId: "tenant_rate",
          workerName: "tenant-rate-worker",
          slug: "rate",
          plan: "free",
          priceUsd: 0,
          rateLimit: {
            perCaller: {
              requests: 1,
              windowSeconds: 60,
            },
          },
        },
      },
      byHost: {},
    },
  });

  const env = {
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const request = new Request("https://api.402claw.dev/t/rate/v1/data", {
    headers: { "x-caller-id": "agent-1" },
  });
  const first = await worker.fetch(request, env);
  const second = await worker.fetch(request, env);

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("x-ratelimit-limit"), "1");
  assert.equal(second.headers.get("x-ratelimit-remaining"), "0");
  assert.ok(Number(second.headers.get("retry-after")) >= 1);
});

test("worker enforces tenant daily usage quota", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        quota: {
          tenantId: "tenant_quota",
          workerName: "tenant-quota-worker",
          slug: "quota",
          plan: "free",
          priceUsd: 0,
          usageLimit: {
            dailyRequests: 1,
          },
        },
      },
      byHost: {},
    },
  });

  const env = {
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const request = new Request("https://api.402claw.dev/t/quota/v1/data");
  const first = await worker.fetch(request, env);
  const second = await worker.fetch(request, env);

  assert.equal(first.status, 200);
  assert.equal(first.headers.get("x-usage-day-limit"), "1");
  assert.equal(first.headers.get("x-usage-day-remaining"), "0");
  assert.equal(second.status, 429);
  assert.equal(second.headers.get("x-usage-window"), "day");
  assert.equal(second.headers.get("x-usage-limit"), "1");
  assert.equal(second.headers.get("x-usage-remaining"), "0");
  assert.ok(Number(second.headers.get("retry-after")) >= 1);
});

test("x402 challenge responses do not consume usage quota", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        paidquota: {
          tenantId: "tenant_paidquota",
          workerName: "tenant-paidquota-worker",
          slug: "paidquota",
          plan: "pro",
          priceUsd: 0.001,
          x402Enabled: true,
          usageLimit: {
            dailyRequests: 1,
          },
        },
      },
      byHost: {},
    },
  });

  const env = {
    ALLOW_LOCAL_X402_VERIFICATION: "true",
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const challengeOne = await worker.fetch(
    new Request("https://api.402claw.dev/t/paidquota/v1/data"),
    env,
  );
  const challengeTwo = await worker.fetch(
    new Request("https://api.402claw.dev/t/paidquota/v1/data"),
    env,
  );

  assert.equal(challengeOne.status, 402);
  assert.equal(challengeTwo.status, 402);

  const challenge = JSON.parse(challengeOne.headers.get("payment-required"));
  const requirement = challenge.accepts[0];
  const payment = {
    paymentId: "payment_paid_quota_1",
    scheme: requirement.scheme,
    network: requirement.network,
    resource: requirement.resource,
    payTo: requirement.payTo,
    amount: requirement.maxAmountRequired,
    payer: "0x1111111111111111111111111111111111111111",
    timestamp: Date.now(),
    signature: "sig_local_test_paid_quota",
  };
  const encoded = Buffer.from(JSON.stringify(payment), "utf8").toString("base64url");

  const paid = await worker.fetch(
    new Request("https://api.402claw.dev/t/paidquota/v1/data", {
      headers: { "payment-signature": encoded },
    }),
    env,
  );
  const paidAgain = await worker.fetch(
    new Request("https://api.402claw.dev/t/paidquota/v1/data", {
      headers: { "payment-signature": encoded },
    }),
    env,
  );

  assert.equal(paid.status, 200);
  assert.equal(paidAgain.status, 429);
  assert.equal(paidAgain.headers.get("x-usage-window"), "day");
});

test("worker analytics excludes non-countable payment challenge events", async () => {
  const facilitator = createMockFacilitator();
  const address = await facilitator.start(0);
  const facilitatorUrl = `http://${address.host}:${address.port}`;

  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        paid: {
          tenantId: "tenant_paid",
          workerName: "tenant-paid-worker",
          slug: "paid",
          plan: "pro",
          priceUsd: 0.001,
          x402Enabled: true,
        },
      },
      byHost: {},
    },
  });

  const env = {
    FACILITATOR_URL: facilitatorUrl,
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  try {
    await worker.fetch(new Request("https://api.402claw.dev/t/paid/v1/data"), env);
    const analytics = await worker.fetch(
      new Request("https://api.402claw.dev/__platform/analytics?window=today"),
      env,
    );
    const payload = await analytics.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.snapshot.heroStats.calls, 0);
  } finally {
    await facilitator.stop();
  }
});

test("worker rewrites /t/:slug path mode before forwarding", async () => {
  let forwardedUrl = null;

  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      byHost: {},
      bySlug: {
        beta: {
          tenantId: "tenant_beta",
          workerName: "tenant-beta-worker",
          plan: "free",
        },
      },
    },
  });

  const env = {
    DISPATCHER: {
      get() {
        return {
          async fetch(request) {
            forwardedUrl = request.url;
            return new Response("ok", { status: 200 });
          },
        };
      },
    },
  };

  const response = await worker.fetch(
    new Request("https://api.402claw.dev/t/beta/v1/records?limit=3"),
    env,
  );

  assert.equal(response.status, 200);
  assert.ok(forwardedUrl.endsWith("/v1/records?limit=3"));
});

test("worker returns 404 for unknown tenant", async () => {
  const worker = createCloudflareDispatcherWorker({ tenantDirectory: { byHost: {}, bySlug: {} } });
  const response = await worker.fetch(new Request("https://api.402claw.dev/v1/data"), {
    DISPATCHER: { get() {} },
  });

  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error, "tenant_not_found");
});

test("worker returns 500 if DISPATCHER binding is missing", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      bySlug: {
        acme: { tenantId: "tenant_acme", workerName: "tenant-acme-worker", plan: "free" },
      },
      byHost: {},
    },
  });

  const response = await worker.fetch(new Request("https://api.402claw.dev/t/acme/v1/data"), {});
  assert.equal(response.status, 500);
});

test("worker maps tenant worker exceptions to 502", async () => {
  const worker = createCloudflareDispatcherWorker({
    tenantDirectory: {
      byHost: {
        "acme.api.402claw.dev": {
          tenantId: "tenant_acme",
          workerName: "tenant-acme-worker",
          plan: "pro",
        },
      },
      bySlug: {},
    },
  });

  const env = {
    DISPATCHER: {
      get() {
        return {
          async fetch() {
            throw new Error("upstream timeout");
          },
        };
      },
    },
  };

  const response = await worker.fetch(new Request("https://acme.api.402claw.dev/v1/data"), env);
  assert.equal(response.status, 502);

  const body = await response.json();
  assert.equal(body.error, "tenant_worker_failure");
  assert.equal(body.reason, "upstream timeout");
});
