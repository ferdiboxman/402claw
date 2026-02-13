import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createCloudflareDispatcherWorker } from "../src/cloudflare-worker.js";
import {
  loadRegistry,
  toTenantDirectory,
  upsertDeployment,
} from "../../cli/src/registry.js";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "402claw-e2e-"));
}

test("e2e: deploy metadata from CLI routes through dispatcher", async () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const datasetPath = path.join(tempDir, "data.csv");

  fs.writeFileSync(datasetPath, "id,name\n1,Alpha\n", "utf8");

  upsertDeployment({
    registryPath,
    datasetPath,
    tenant: "acme",
    plan: "pro",
    priceUsd: 0.003,
    hosts: ["acme.api.402claw.dev"],
  });

  const registry = loadRegistry(registryPath);
  const directory = toTenantDirectory(registry);

  let observed = null;
  const worker = createCloudflareDispatcherWorker({ tenantDirectory: directory });

  const env = {
    DISPATCHER: {
      get(workerName, _opts, settings) {
        return {
          async fetch(request) {
            observed = {
              workerName,
              limits: settings.limits,
              url: request.url,
            };

            return new Response(JSON.stringify({ ok: true, from: workerName }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        };
      },
    },
  };

  const response = await worker.fetch(
    new Request("https://api.402claw.dev/t/acme/v1/records?limit=2"),
    env,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-tenant-id")?.startsWith("tenant_acme"), true);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.from, "tenant-acme-worker");

  assert.equal(observed.workerName, "tenant-acme-worker");
  assert.equal(observed.limits.cpu_ms, 200);
  assert.equal(observed.limits.subrequests, 50);
  assert.ok(observed.url.endsWith("/v1/records?limit=2"));
});
