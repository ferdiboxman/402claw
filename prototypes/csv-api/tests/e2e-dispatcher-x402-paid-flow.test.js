import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createCloudflareDispatcherWorker } from "../src/cloudflare-worker.js";
import {
  loadRegistry,
  toTenantDirectory,
  upsertDeployment,
} from "../../cli/src/registry.js";
import { createMockFacilitator } from "../../../research/codex-research/prototypes/x402-csv-api-poc/src/facilitator.js";
import { createCsvApiServer } from "../../../research/codex-research/prototypes/x402-csv-api-poc/src/api-server.js";
import { fetchWithX402 } from "../../../research/codex-research/prototypes/x402-csv-api-poc/src/client.js";
import { PAYMENT_REQUIRED_HEADER } from "../../../research/codex-research/prototypes/x402-csv-api-poc/src/payment.js";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "402claw-dispatch-paid-"));
}

async function startGateway(worker, env) {
  const server = http.createServer(async (req, res) => {
    const origin = `http://${req.headers.host}`;
    const incoming = new Request(new URL(req.url || "/", origin), {
      method: req.method,
      headers: req.headers,
    });

    const response = await worker.fetch(incoming, env);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("gateway address unavailable");
  }

  return {
    server,
    url: `http://${address.address}:${address.port}`,
    async stop() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

test("e2e: dispatcher routes paid x402 flow from challenge to settled response", async () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const datasetPath = path.join(tempDir, "dataset.csv");

  fs.writeFileSync(datasetPath, "id,name\n1,Alpha\n2,Beta\n", "utf8");

  upsertDeployment({
    registryPath,
    datasetPath,
    tenant: "acme",
    plan: "pro",
    priceUsd: 0.001,
    hosts: ["api.402claw.dev"],
    workerName: "tenant-acme-worker",
  });

  const facilitator = createMockFacilitator();
  const facilitatorAddress = await facilitator.start(0);
  const facilitatorUrl = `http://${facilitatorAddress.host}:${facilitatorAddress.port}`;

  const api = createCsvApiServer({
    csvPath: datasetPath,
    facilitatorUrl,
    runtimeEnv: "test",
  });
  const apiAddress = await api.start(0);
  const apiOrigin = `http://${apiAddress.host}:${apiAddress.port}`;

  const registry = loadRegistry(registryPath);
  const tenantDirectory = toTenantDirectory(registry);

  const worker = createCloudflareDispatcherWorker({ tenantDirectory });
  const env = {
    FACILITATOR_URL: facilitatorUrl,
    DISPATCHER: {
      get(workerName, _opts, settings) {
        return {
          async fetch(request) {
            assert.equal(workerName, "tenant-acme-worker");
            assert.equal(settings?.limits?.cpu_ms, 200);
            assert.equal(settings?.limits?.subrequests, 50);

            const target = new URL(request.url);
            const upstream = new URL(target.pathname + target.search, apiOrigin);
            return fetch(upstream, {
              method: request.method,
              headers: request.headers,
            });
          },
        };
      },
    },
  };

  const gateway = await startGateway(worker, env);

  try {
    const unpaid = await fetch(`${gateway.url}/t/acme/v1/records?limit=2`);
    assert.equal(unpaid.status, 402);
    assert.ok(unpaid.headers.get(PAYMENT_REQUIRED_HEADER));

    const paid = await fetchWithX402(`${gateway.url}/t/acme/v1/records?limit=2&q=alpha`);
    assert.equal(paid.response.status, 200);
    assert.equal(paid.retried, true);

    const body = await paid.response.json();
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.items));
    assert.equal(body.items.length, 1);

    assert.ok(paid.response.headers.get("x-request-id"));
    assert.ok(paid.response.headers.get("x-tenant-id"));
  } finally {
    await gateway.stop();
    await api.stop();
    await facilitator.stop();
  }
});
