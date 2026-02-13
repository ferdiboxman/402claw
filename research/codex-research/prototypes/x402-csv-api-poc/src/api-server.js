import http from "node:http";
import path from "node:path";
import { parseCsvFile } from "./csv.js";
import {
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  buildChallenge,
  createPaymentRequirement,
  decodePaymentPayload,
} from "./payment.js";
import {
  assertFacilitatorAuthPolicy,
  assertFacilitatorPolicy,
  resolveFacilitatorUrls,
  resolvePaymentNetwork,
  resolveRuntimeEnv,
} from "./config.js";
import { json, randomHex } from "./utils.js";

const REQUEST_ID_HEADER = "x-request-id";
const DEFAULT_MAX_TELEMETRY_EVENTS = 200;

function makeQueryResult(records, search, limit) {
  const needle = (search || "").trim().toLowerCase();
  const filtered = needle
    ? records.filter((row) => {
        return Object.values(row).some((value) => String(value).toLowerCase().includes(needle));
      })
    : records;

  return {
    total: filtered.length,
    items: filtered.slice(0, limit),
  };
}

function authHeaders(facilitatorApiKey) {
  if (!facilitatorApiKey) return {};
  return { Authorization: `Bearer ${facilitatorApiKey}` };
}

function clampTelemetryLimit(value, fallback = DEFAULT_MAX_TELEMETRY_EVENTS) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 2000);
}

async function verifyPayment({ facilitatorUrls, facilitatorApiKey, payment, requirement }) {
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

async function settlePayment({ facilitatorUrls, facilitatorApiKey, payment }) {
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

export function createCsvApiServer(options = {}) {
  const csvPath =
    options.csvPath ?? path.resolve(process.cwd(), "fixtures", "airports.csv");
  const records = parseCsvFile(csvPath);

  const resourcePath = "/v1/records";
  const amount = options.amount ?? 1000;
  const payTo = options.payTo ?? "0x402c1aw000000000000000000000000000000000";
  const runtimeEnv = resolveRuntimeEnv(options.runtimeEnv);
  const paymentNetwork = options.network ?? resolvePaymentNetwork(runtimeEnv);
  const facilitatorApiKey = options.facilitatorApiKey ?? process.env.FACILITATOR_API_KEY ?? "";
  const facilitatorUrls = resolveFacilitatorUrls({
    runtimeEnv,
    facilitatorUrl: options.facilitatorUrl,
    facilitatorUrls: options.facilitatorUrls,
    cdpFacilitatorUrl: options.cdpFacilitatorUrl,
    testFacilitatorUrl: options.testFacilitatorUrl,
  });

  facilitatorUrls.forEach((facilitatorUrl) => {
    assertFacilitatorPolicy({ runtimeEnv, facilitatorUrl });
    assertFacilitatorAuthPolicy({ runtimeEnv, facilitatorUrl, facilitatorApiKey });
  });

  const maxTelemetryEvents = clampTelemetryLimit(
    options.maxTelemetryEvents,
    DEFAULT_MAX_TELEMETRY_EVENTS,
  );
  const telemetryEvents = [];
  const telemetryHook =
    typeof options.onTelemetryEvent === "function"
      ? options.onTelemetryEvent
      : typeof options.onEvent === "function"
        ? options.onEvent
        : null;

  function emitTelemetry(eventType, payload = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      runtimeEnv,
      paymentNetwork,
      facilitatorUrls,
      ...payload,
    };

    telemetryEvents.push(event);
    if (telemetryEvents.length > maxTelemetryEvents) {
      telemetryEvents.splice(0, telemetryEvents.length - maxTelemetryEvents);
    }

    if (telemetryHook) {
      telemetryHook(event);
    }

    return event;
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const requestId = randomHex(8);
    const startedAt = Date.now();

    const traceHeaders = (headers = {}) => ({
      [REQUEST_ID_HEADER]: requestId,
      ...headers,
    });

    emitTelemetry("request_received", {
      requestId,
      method: request.method,
      path: url.pathname,
      query: url.search,
    });

    if (request.method === "GET" && url.pathname === "/health") {
      const durationMs = Date.now() - startedAt;
      json(
        response,
        200,
        { ok: true, service: "x402-csv-api", requestId, durationMs },
        traceHeaders(),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/schema") {
      const durationMs = Date.now() - startedAt;
      json(
        response,
        200,
        {
          dataset: path.basename(csvPath),
          fields: Object.keys(records[0] || {}),
          protectedRoutes: [resourcePath],
          runtimeEnv,
          paymentNetwork,
          facilitatorUrl: facilitatorUrls[0],
          facilitatorUrls,
          requestId,
          durationMs,
        },
        traceHeaders(),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/telemetry") {
      const limit = clampTelemetryLimit(url.searchParams.get("limit"), 50);
      const events = telemetryEvents.slice(-limit);
      json(
        response,
        200,
        {
          ok: true,
          requestId,
          total: telemetryEvents.length,
          returned: events.length,
          events,
        },
        traceHeaders(),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === resourcePath) {
      const requirement = createPaymentRequirement({
        resource: resourcePath,
        amount,
        payTo,
        network: paymentNetwork,
      });

      const rawPayment = request.headers[PAYMENT_SIGNATURE_HEADER];
      const payment = rawPayment ? decodePaymentPayload(String(rawPayment)) : null;

      if (!payment) {
        const challenge = buildChallenge(requirement);
        const durationMs = Date.now() - startedAt;
        emitTelemetry("payment_challenge_issued", {
          requestId,
          path: resourcePath,
          reason: "missing_payment_signature",
          durationMs,
        });
        json(
          response,
          402,
          challenge,
          traceHeaders({
            [PAYMENT_REQUIRED_HEADER]: JSON.stringify(challenge),
          }),
        );
        return;
      }

      const verified = await verifyPayment({
        facilitatorUrls,
        facilitatorApiKey,
        payment,
        requirement,
      });
      if (!verified.isValid) {
        const challenge = buildChallenge(requirement, verified.reason || "invalid_payment");
        const durationMs = Date.now() - startedAt;
        emitTelemetry("payment_verify_failed", {
          requestId,
          path: resourcePath,
          reason: verified.reason || "invalid_payment",
          facilitatorAttempts: verified.attempts,
          durationMs,
        });
        json(
          response,
          402,
          challenge,
          traceHeaders({
            [PAYMENT_REQUIRED_HEADER]: JSON.stringify(challenge),
          }),
        );
        return;
      }

      const limit = Number(url.searchParams.get("limit") || "10");
      const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10;
      const search = url.searchParams.get("q") || "";

      const data = makeQueryResult(records, search, safeLimit);

      const settlement = await settlePayment({ facilitatorUrls, facilitatorApiKey, payment });
      if (!settlement.settled) {
        const durationMs = Date.now() - startedAt;
        emitTelemetry("payment_settlement_failed", {
          requestId,
          path: resourcePath,
          reason: settlement.reason || "unknown",
          facilitatorAttempts: settlement.attempts,
          durationMs,
        });
        json(
          response,
          502,
          {
            ok: false,
            error: "settlement_failed",
            reason: settlement.reason || "unknown",
            requestId,
          },
          traceHeaders(),
        );
        return;
      }

      const durationMs = Date.now() - startedAt;
      emitTelemetry("payment_settled", {
        requestId,
        path: resourcePath,
        verifyFacilitatorUrl: verified.facilitatorUrl,
        settleFacilitatorUrl: settlement.facilitatorUrl,
        verifyAttempts: verified.attempts,
        settleAttempts: settlement.attempts,
        resultCount: data.items.length,
        durationMs,
      });

      json(
        response,
        200,
        {
          ok: true,
          paymentStatus: "settled",
          requestId,
          query: { q: search, limit: safeLimit },
          ...data,
        },
        traceHeaders({
          [PAYMENT_RESPONSE_HEADER]: JSON.stringify(settlement.receipt || {}),
        }),
      );
      return;
    }

    const durationMs = Date.now() - startedAt;
    emitTelemetry("route_not_found", {
      requestId,
      method: request.method,
      path: url.pathname,
      durationMs,
    });

    json(response, 404, { ok: false, error: "not_found", requestId }, traceHeaders());
  });

  return {
    server,
    telemetry() {
      return [...telemetryEvents];
    },
    async start(port = 0) {
      await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
      return this.address();
    },
    async stop() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
    address() {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        throw new Error("api address unavailable");
      }
      return { host: addr.address, port: addr.port };
    },
  };
}
