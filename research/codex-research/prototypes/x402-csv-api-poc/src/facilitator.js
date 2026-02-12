import http from "node:http";
import { json, randomHex } from "./utils.js";

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
    });

    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

export function createMockFacilitator(options = {}) {
  const state = {
    verified: new Map(),
    settled: new Map(),
  };

  const strict = options.strict !== false;

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { ok: true, service: "mock-facilitator" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/supported") {
      json(response, 200, {
        kinds: [
          {
            kind: "exact",
            network: "base-sepolia",
            scheme: "exact",
            asset: "USDC",
          },
        ],
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/verify") {
      let payload;
      try {
        payload = await readJsonBody(request);
      } catch {
        json(response, 400, { ok: false, error: "invalid_json" });
        return;
      }

      const payment = payload?.payment;
      const requirement = payload?.requirement;

      const issues = [];
      if (!payment || typeof payment !== "object") issues.push("missing_payment");
      if (!requirement || typeof requirement !== "object") issues.push("missing_requirement");

      if (issues.length > 0) {
        json(response, 400, { ok: false, isValid: false, issues });
        return;
      }

      if (!String(payment.signature || "").startsWith("mocksig_")) {
        json(response, 200, { ok: true, isValid: false, reason: "invalid_signature" });
        return;
      }

      if (strict) {
        if (String(payment.amount) !== String(requirement.maxAmountRequired)) {
          json(response, 200, { ok: true, isValid: false, reason: "amount_mismatch" });
          return;
        }
        if (String(payment.payTo) !== String(requirement.payTo)) {
          json(response, 200, { ok: true, isValid: false, reason: "pay_to_mismatch" });
          return;
        }
        if (String(payment.resource) !== String(requirement.resource)) {
          json(response, 200, { ok: true, isValid: false, reason: "resource_mismatch" });
          return;
        }
      }

      state.verified.set(payment.paymentId, {
        payment,
        requirement,
        verifiedAt: Date.now(),
      });

      json(response, 200, {
        ok: true,
        isValid: true,
        verificationId: randomHex(10),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/settle") {
      let payload;
      try {
        payload = await readJsonBody(request);
      } catch {
        json(response, 400, { ok: false, error: "invalid_json" });
        return;
      }

      const payment = payload?.payment;
      if (!payment?.paymentId) {
        json(response, 400, { ok: false, settled: false, reason: "missing_payment_id" });
        return;
      }

      const verified = state.verified.get(payment.paymentId);
      if (!verified) {
        json(response, 200, { ok: true, settled: false, reason: "not_verified" });
        return;
      }

      if (state.settled.has(payment.paymentId)) {
        json(response, 200, {
          ok: true,
          settled: true,
          duplicate: true,
          receipt: state.settled.get(payment.paymentId),
        });
        return;
      }

      const receipt = {
        settlementId: randomHex(12),
        txHash: randomHex(16),
        status: "confirmed",
        amount: payment.amount,
        payTo: payment.payTo,
        settledAt: Date.now(),
      };

      state.settled.set(payment.paymentId, receipt);

      json(response, 200, { ok: true, settled: true, receipt });
      return;
    }

    json(response, 404, { ok: false, error: "not_found" });
  });

  return {
    server,
    state,
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
        throw new Error("facilitator address unavailable");
      }
      return { host: addr.address, port: addr.port };
    },
  };
}
