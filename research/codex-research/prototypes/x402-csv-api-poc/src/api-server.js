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
import { json } from "./utils.js";

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

async function verifyPayment({ facilitatorUrl, payment, requirement }) {
  const response = await fetch(`${facilitatorUrl}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payment, requirement }),
  });

  if (!response.ok) {
    return { isValid: false, reason: `facilitator_verify_http_${response.status}` };
  }

  return response.json();
}

async function settlePayment({ facilitatorUrl, payment }) {
  const response = await fetch(`${facilitatorUrl}/settle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payment }),
  });

  if (!response.ok) {
    return { settled: false, reason: `facilitator_settle_http_${response.status}` };
  }

  return response.json();
}

export function createCsvApiServer(options = {}) {
  const csvPath =
    options.csvPath ?? path.resolve(process.cwd(), "fixtures", "airports.csv");
  const records = parseCsvFile(csvPath);

  const resourcePath = "/v1/records";
  const amount = options.amount ?? 1000;
  const payTo = options.payTo ?? "0x402c1aw000000000000000000000000000000000";
  const facilitatorUrl = options.facilitatorUrl;

  if (!facilitatorUrl) {
    throw new Error("createCsvApiServer requires facilitatorUrl");
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { ok: true, service: "x402-csv-api" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/schema") {
      json(response, 200, {
        dataset: path.basename(csvPath),
        fields: Object.keys(records[0] || {}),
        protectedRoutes: [resourcePath],
      });
      return;
    }

    if (request.method === "GET" && url.pathname === resourcePath) {
      const requirement = createPaymentRequirement({
        resource: resourcePath,
        amount,
        payTo,
      });

      const rawPayment = request.headers[PAYMENT_SIGNATURE_HEADER];
      const payment = rawPayment ? decodePaymentPayload(String(rawPayment)) : null;

      if (!payment) {
        const challenge = buildChallenge(requirement);
        json(
          response,
          402,
          challenge,
          {
            [PAYMENT_REQUIRED_HEADER]: JSON.stringify(challenge),
          },
        );
        return;
      }

      const verified = await verifyPayment({ facilitatorUrl, payment, requirement });
      if (!verified.isValid) {
        const challenge = buildChallenge(requirement, verified.reason || "invalid_payment");
        json(
          response,
          402,
          challenge,
          {
            [PAYMENT_REQUIRED_HEADER]: JSON.stringify(challenge),
          },
        );
        return;
      }

      const limit = Number(url.searchParams.get("limit") || "10");
      const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10;
      const search = url.searchParams.get("q") || "";

      const data = makeQueryResult(records, search, safeLimit);

      const settlement = await settlePayment({ facilitatorUrl, payment });
      if (!settlement.settled) {
        json(response, 502, {
          ok: false,
          error: "settlement_failed",
          reason: settlement.reason || "unknown",
        });
        return;
      }

      json(
        response,
        200,
        {
          ok: true,
          paymentStatus: "settled",
          query: { q: search, limit: safeLimit },
          ...data,
        },
        {
          [PAYMENT_RESPONSE_HEADER]: JSON.stringify(settlement.receipt || {}),
        },
      );
      return;
    }

    json(response, 404, { ok: false, error: "not_found" });
  });

  return {
    server,
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
