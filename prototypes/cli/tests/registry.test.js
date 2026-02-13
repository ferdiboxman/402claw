import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  defaultRegistryPath,
  getTenant,
  listTenants,
  loadRegistry,
  normalizePlan,
  slugifyTenant,
  toTenantDirectory,
  upsertDeployment,
} from "../src/registry.js";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "402claw-cli-test-"));
}

test("defaultRegistryPath points to .402claw/tenants.json", () => {
  const value = defaultRegistryPath("/tmp/my-project");
  assert.equal(value, path.resolve("/tmp/my-project", ".402claw", "tenants.json"));
});

test("slugifyTenant normalizes input", () => {
  assert.equal(slugifyTenant(" ACME Corp "), "acme-corp");
  assert.throws(() => slugifyTenant("***"), /tenant slug is required/);
});

test("normalizePlan validates supported plans", () => {
  assert.equal(normalizePlan("PRO"), "pro");
  assert.throws(() => normalizePlan("starter"), /invalid plan/);
});

test("upsertDeployment creates and updates tenant entries", () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const datasetPath = path.join(tempDir, "airports.csv");

  fs.writeFileSync(datasetPath, "id,name\n1,Alpha\n", "utf8");

  const first = upsertDeployment({
    registryPath,
    datasetPath,
    tenant: "acme",
    ownerUserId: "alice",
    plan: "free",
    priceUsd: "0.001",
    hosts: ["acme.api.402claw.dev"],
    limits: { cpuMs: 120, subRequests: 22 },
    x402Enabled: true,
    usageLimit: { dailyRequests: 1000, monthlyRequests: 20000 },
  });

  assert.equal(first.tenant.slug, "acme");
  assert.equal(first.tenant.ownerUserId, "alice");
  assert.equal(first.tenant.plan, "free");
  assert.deepEqual(first.tenant.limits, { cpuMs: 120, subRequests: 22 });
  assert.equal(first.tenant.x402Enabled, true);
  assert.deepEqual(first.tenant.usageLimit, { dailyRequests: 1000, monthlyRequests: 20000 });
  assert.equal(first.registry.tenants.length, 1);

  const second = upsertDeployment({
    registryPath,
    datasetPath,
    tenant: "acme",
    plan: "pro",
    priceUsd: "0.005",
    hosts: ["acme-pro.api.402claw.dev"],
  });

  assert.equal(second.registry.tenants.length, 1);
  assert.equal(second.tenant.plan, "pro");
  assert.equal(second.tenant.priceUsd, 0.005);
  assert.deepEqual(second.tenant.limits, { cpuMs: 120, subRequests: 22 });
  assert.equal(second.tenant.x402Enabled, true);
  assert.deepEqual(second.tenant.usageLimit, { dailyRequests: 1000, monthlyRequests: 20000 });

  const fetched = getTenant(registryPath, "acme");
  assert.equal(fetched.workerName, "tenant-acme-worker");
});

test("upsertDeployment rejects unsupported dataset extension", () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const datasetPath = path.join(tempDir, "not-allowed.txt");
  fs.writeFileSync(datasetPath, "hello", "utf8");

  assert.throws(
    () =>
      upsertDeployment({
        registryPath,
        datasetPath,
        tenant: "acme",
        plan: "free",
        priceUsd: 1,
      }),
    /dataset must be .csv or .json/,
  );
});

test("upsertDeployment supports function resource with auto type", () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const functionPath = path.join(tempDir, "hello.js");
  fs.writeFileSync(functionPath, "export default async () => ({ ok: true });\n", "utf8");

  const result = upsertDeployment({
    registryPath,
    sourcePath: functionPath,
    tenant: "fn-tenant",
    plan: "pro",
    priceUsd: 0.01,
    rateLimit: {
      perCaller: { requests: 100, windowSeconds: 60 },
      global: { requests: 1000, windowSeconds: 3600 },
    },
  });

  assert.equal(result.tenant.resourceType, "function");
  assert.equal(result.tenant.functionType, "js");
  assert.ok(result.tenant.functionPath.endsWith("hello.js"));
  assert.equal(result.tenant.rateLimit.perCaller.requests, 100);
});

test("upsertDeployment supports proxy resource config", () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");

  const result = upsertDeployment({
    registryPath,
    tenant: "proxy-tenant",
    resourceType: "proxy",
    plan: "free",
    priceUsd: 0.002,
    proxy: {
      upstream: "https://api.example.com/v1",
      methods: ["GET", "POST"],
      injectHeaders: { Authorization: "Bearer test" },
      cacheTtlSeconds: 30,
      transform: "return data;",
    },
  });

  assert.equal(result.tenant.resourceType, "proxy");
  assert.equal(result.tenant.proxy.upstream, "https://api.example.com/v1");
  assert.equal(result.tenant.proxy.cacheTtlSeconds, 30);
  assert.deepEqual(result.tenant.proxy.methods, ["GET", "POST"]);
});

test("toTenantDirectory exports bySlug and byHost maps", () => {
  const registry = {
    version: 1,
    updatedAt: null,
    tenants: [
      {
        slug: "acme",
        tenantId: "tenant_acme",
        priceUsd: 0.002,
        workerName: "tenant-acme-worker",
        plan: "pro",
        resourceType: "dataset",
        sourceType: "csv",
        sourcePath: "/tmp/data.csv",
        rateLimit: {
          perCaller: { requests: 100, windowSeconds: 60 },
        },
        usageLimit: {
          dailyRequests: 5000,
          monthlyRequests: 150000,
        },
        limits: { cpuMs: 75, subRequests: 9 },
        x402Enabled: true,
        hosts: ["acme.api.402claw.dev"],
      },
    ],
  };

  const directory = toTenantDirectory(registry);
  assert.equal(directory.bySlug.acme.tenantId, "tenant_acme");
  assert.equal(directory.bySlug.acme.slug, "acme");
  assert.equal(directory.bySlug.acme.priceUsd, 0.002);
  assert.deepEqual(directory.bySlug.acme.limits, { cpuMs: 75, subRequests: 9 });
  assert.equal(directory.bySlug.acme.resourceType, "dataset");
  assert.equal(directory.bySlug.acme.sourceType, "csv");
  assert.equal(directory.bySlug.acme.rateLimit.perCaller.requests, 100);
  assert.equal(directory.bySlug.acme.usageLimit.dailyRequests, 5000);
  assert.equal(directory.bySlug.acme.usageLimit.monthlyRequests, 150000);
  assert.equal(directory.bySlug.acme.x402Enabled, true);
  assert.equal(directory.bySlug.acme.ownerUserId, "anonymous");
  assert.equal(directory.byHost["acme.api.402claw.dev"].workerName, "tenant-acme-worker");
});

test("listTenants returns empty list for missing registry", () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "missing.json");

  const loaded = loadRegistry(registryPath);
  assert.deepEqual(loaded.tenants, []);
  assert.deepEqual(listTenants(registryPath), []);
});
