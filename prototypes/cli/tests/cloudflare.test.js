import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildTenantDirectoryJson,
  createDispatcherUploadBody,
  deployCloudflareTenantWorker,
  deployCloudflareDispatcher,
  loadDeploymentState,
  planCloudflareTenantDeploy,
  planCloudflareDispatcherDeploy,
  rollbackCloudflareDispatcher,
} from "../src/cloudflare.js";
import { upsertDeployment } from "../src/registry.js";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "402claw-cf-test-"));
}

function bootstrapRegistryFixture() {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const datasetPath = path.join(tempDir, "data.csv");
  const scriptPath = path.join(tempDir, "worker.js");
  const statePath = path.join(tempDir, "deploy-history.json");

  fs.writeFileSync(datasetPath, "id,name\n1,Alpha\n", "utf8");
  fs.writeFileSync(scriptPath, "export default { fetch(){ return new Response('ok-v1'); } };\n", "utf8");

  upsertDeployment({
    registryPath,
    datasetPath,
    tenant: "acme",
    plan: "pro",
    priceUsd: 0.002,
    hosts: ["acme.api.402claw.dev"],
  });

  return { tempDir, registryPath, datasetPath, scriptPath, statePath };
}

function makeCloudflareFetchMock(calls) {
  return async (url, options = {}) => {
    calls.push({ url, options });

    if (url.endsWith("/subdomain")) {
      return new Response(
        JSON.stringify({ success: true, result: { enabled: true } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, result: { id: "script_upload_ok" } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

test("buildTenantDirectoryJson converts registry to byHost/bySlug JSON", () => {
  const fixture = bootstrapRegistryFixture();
  const result = buildTenantDirectoryJson(fixture.registryPath);

  assert.equal(result.registry.tenants.length, 1);
  assert.ok(result.directory.bySlug.acme);
  assert.ok(result.directory.byHost["acme.api.402claw.dev"]);
  assert.equal(typeof result.json, "string");
});

test("createDispatcherUploadBody embeds tenant directory and namespace binding", () => {
  const upload = createDispatcherUploadBody({
    scriptContent: "export default {};",
    tenantDirectoryJson: '{"byHost":{},"bySlug":{}}',
    dispatchNamespace: "dispatch-ns-123",
    usageKvNamespaceId: "kv-ns-456",
    rateKvNamespaceId: "kv-ns-789",
  });

  const metadata = JSON.parse(upload.body.get("metadata"));
  assert.equal(metadata.main_module, "index.js");
  assert.equal(metadata.bindings[0].name, "TENANT_DIRECTORY_JSON");
  assert.equal(metadata.bindings[1].type, "dispatch_namespace");
  assert.equal(metadata.bindings[2].type, "kv_namespace");
  assert.equal(metadata.bindings[2].namespace_id, "kv-ns-456");
  assert.equal(metadata.bindings[3].type, "kv_namespace");
  assert.equal(metadata.bindings[3].namespace_id, "kv-ns-789");
});

test("planCloudflareDispatcherDeploy builds dry-run plan with metadata", () => {
  const fixture = bootstrapRegistryFixture();
  const plan = planCloudflareDispatcherDeploy({
    registryPath: fixture.registryPath,
    scriptPath: fixture.scriptPath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_abcdefghijklmnopqrstuvwxyz",
    dispatchNamespace: "dispatch-ns-123",
  });

  assert.equal(plan.scriptName, "claw-dispatcher");
  assert.equal(plan.tenantCount, 1);
  assert.equal(plan.metadata.bindings[1].namespace, "dispatch-ns-123");
  assert.match(plan.maskedToken, /^toke\*\*\*/);
});

test("planCloudflareDispatcherDeploy includes imported local modules", () => {
  const fixture = bootstrapRegistryFixture();
  fs.writeFileSync(
    fixture.scriptPath,
    "import './helper.js';\nexport default { fetch(){ return new Response('ok'); } };\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(path.dirname(fixture.scriptPath), "helper.js"),
    "export const HELPER = 'ok';\n",
    "utf8",
  );

  const plan = planCloudflareDispatcherDeploy({
    registryPath: fixture.registryPath,
    scriptPath: fixture.scriptPath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_abcdefghijklmnopqrstuvwxyz",
    dispatchNamespace: "dispatch-ns-123",
  });

  assert.equal(plan.moduleCount, 1);
  assert.equal(typeof plan.additionalModules["helper.js"], "string");
  assert.ok(plan.uploadBody.get("helper.js"));
});

test("deployCloudflareDispatcher dry-run returns plan without network", async () => {
  const fixture = bootstrapRegistryFixture();

  const result = await deployCloudflareDispatcher({
    registryPath: fixture.registryPath,
    scriptPath: fixture.scriptPath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "dispatch-ns-123",
    execute: false,
    statePath: fixture.statePath,
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.plan.tenantCount, 1);
  assert.equal(result.statePath, fixture.statePath);
});

test("deploy execute records state and rollback selects previous deployment", async () => {
  const fixture = bootstrapRegistryFixture();
  const deployCalls = [];

  const firstDeploy = await deployCloudflareDispatcher({
    registryPath: fixture.registryPath,
    scriptPath: fixture.scriptPath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "dispatch-ns-123",
    execute: true,
    enableWorkersDev: true,
    fetchImpl: makeCloudflareFetchMock(deployCalls),
    statePath: fixture.statePath,
  });

  assert.equal(firstDeploy.ok, true);
  assert.equal(firstDeploy.mode, "execute");
  assert.equal(deployCalls.length, 2);

  fs.writeFileSync(
    fixture.scriptPath,
    "export default { fetch(){ return new Response('ok-v2'); } };\n",
    "utf8",
  );

  const secondDeploy = await deployCloudflareDispatcher({
    registryPath: fixture.registryPath,
    scriptPath: fixture.scriptPath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "dispatch-ns-123",
    execute: true,
    enableWorkersDev: true,
    fetchImpl: makeCloudflareFetchMock(deployCalls),
    statePath: fixture.statePath,
  });

  const stateAfterDeploys = loadDeploymentState(fixture.statePath);
  assert.equal(stateAfterDeploys.deployments.length, 2);
  assert.equal(stateAfterDeploys.deployments[0].type, "deploy");
  assert.equal(stateAfterDeploys.deployments[1].type, "deploy");

  const rollbackDryRun = await rollbackCloudflareDispatcher({
    statePath: fixture.statePath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    execute: false,
  });

  assert.equal(rollbackDryRun.ok, true);
  assert.equal(rollbackDryRun.mode, "dry-run");
  assert.equal(
    rollbackDryRun.rollback.targetDeploymentId,
    firstDeploy.deployed.deploymentId,
  );

  const rollbackCalls = [];
  const rollbackExecute = await rollbackCloudflareDispatcher({
    statePath: fixture.statePath,
    scriptName: "claw-dispatcher",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    execute: true,
    enableWorkersDev: true,
    fetchImpl: makeCloudflareFetchMock(rollbackCalls),
  });

  assert.equal(rollbackExecute.ok, true);
  assert.equal(rollbackExecute.mode, "execute");
  assert.equal(rollbackCalls.length, 2);
  assert.ok(rollbackCalls[0].url.includes("/accounts/acc_123/workers/scripts/claw-dispatcher"));
  assert.equal(rollbackCalls[0].options.headers.Authorization, "Bearer token_1234567890");

  const rollbackMetadata = JSON.parse(rollbackCalls[0].options.body.get("metadata"));
  assert.equal(rollbackMetadata.bindings[0].name, "TENANT_DIRECTORY_JSON");

  const stateAfterRollback = loadDeploymentState(fixture.statePath);
  assert.equal(stateAfterRollback.deployments.length, 3);
  const last = stateAfterRollback.deployments.at(-1);
  assert.equal(last.type, "rollback");
  assert.equal(last.sourceDeploymentId, firstDeploy.deployed.deploymentId);

  assert.notEqual(secondDeploy.deployed.deploymentId, firstDeploy.deployed.deploymentId);
});

test("tenant worker deploy plan and execute upload generated dataset api", async () => {
  const fixture = bootstrapRegistryFixture();
  const plan = planCloudflareTenantDeploy({
    registryPath: fixture.registryPath,
    tenant: "acme",
    scriptName: "tenant-acme-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
  });

  assert.equal(plan.tenant.slug, "acme");
  assert.equal(plan.tenant.records, 1);
  assert.equal(plan.scriptName, "tenant-acme-worker");
  assert.match(plan.scriptContent, /\/v1\/records/);

  const dryRun = await deployCloudflareTenantWorker({
    registryPath: fixture.registryPath,
    tenant: "acme",
    scriptName: "tenant-acme-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    execute: false,
    statePath: fixture.statePath,
  });

  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.tenantDeploy.tenant.records, 1);

  const deployCalls = [];
  const executeResult = await deployCloudflareTenantWorker({
    registryPath: fixture.registryPath,
    tenant: "acme",
    scriptName: "tenant-acme-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    execute: true,
    enableWorkersDev: true,
    fetchImpl: makeCloudflareFetchMock(deployCalls),
    statePath: fixture.statePath,
  });

  assert.equal(executeResult.ok, true);
  assert.equal(executeResult.mode, "execute");
  assert.equal(deployCalls.length, 2);
  assert.ok(deployCalls[0].url.includes("/workers/scripts/tenant-acme-worker"));
  assert.equal(deployCalls[0].options.headers.Authorization, "Bearer token_1234567890");
  const metadata = JSON.parse(deployCalls[0].options.body.get("metadata"));
  assert.equal(metadata.main_module, "index.js");
  assert.deepEqual(metadata.bindings, []);
});

test("tenant deploy uses dispatch namespace endpoint and skips workers.dev subdomain", async () => {
  const fixture = bootstrapRegistryFixture();
  const deployCalls = [];

  const result = await deployCloudflareTenantWorker({
    registryPath: fixture.registryPath,
    tenant: "acme",
    scriptName: "tenant-acme-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "clawr-staging",
    execute: true,
    enableWorkersDev: true,
    fetchImpl: makeCloudflareFetchMock(deployCalls),
    statePath: fixture.statePath,
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "execute");
  assert.equal(result.deployed.dispatchNamespace, "clawr-staging");
  assert.equal(deployCalls.length, 1);
  assert.ok(
    deployCalls[0].url.includes(
      "/workers/dispatch/namespaces/clawr-staging/scripts/tenant-acme-worker",
    ),
  );
});

test("tenant worker plan supports function resource deployment", () => {
  const fixture = bootstrapRegistryFixture();
  const functionPath = path.join(fixture.tempDir, "tenant-fn.js");
  fs.writeFileSync(functionPath, "export default async () => ({ ok: true });\n", "utf8");

  upsertDeployment({
    registryPath: fixture.registryPath,
    sourcePath: functionPath,
    tenant: "codefn",
    plan: "pro",
    priceUsd: 0.01,
    resourceType: "function",
  });

  const plan = planCloudflareTenantDeploy({
    registryPath: fixture.registryPath,
    tenant: "codefn",
    scriptName: "tenant-codefn-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "dispatch-ns-123",
  });

  assert.equal(plan.tenant.resourceType, "function");
  assert.equal(plan.scriptName, "tenant-codefn-worker");
  assert.ok(plan.moduleCount >= 1);
  assert.ok(plan.uploadBody.get("user/entry.js"));
});

test("tenant worker plan supports proxy resource deployment", () => {
  const fixture = bootstrapRegistryFixture();
  upsertDeployment({
    registryPath: fixture.registryPath,
    tenant: "proxyfn",
    plan: "free",
    priceUsd: 0.005,
    resourceType: "proxy",
    proxy: {
      upstream: "https://api.example.com/v1",
      methods: ["GET"],
      cacheTtlSeconds: 30,
    },
  });

  const plan = planCloudflareTenantDeploy({
    registryPath: fixture.registryPath,
    tenant: "proxyfn",
    scriptName: "tenant-proxyfn-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "dispatch-ns-123",
  });

  assert.equal(plan.tenant.resourceType, "proxy");
  assert.equal(plan.tenant.proxy.upstream, "https://api.example.com/v1");
  assert.equal(plan.scriptName, "tenant-proxyfn-worker");
});

test("proxy tenant plan surfaces required secret names", () => {
  const fixture = bootstrapRegistryFixture();
  upsertDeployment({
    registryPath: fixture.registryPath,
    tenant: "proxy-secret",
    plan: "free",
    priceUsd: 0.005,
    resourceType: "proxy",
    proxy: {
      upstream: "https://api.example.com/v1",
      methods: ["GET"],
      injectHeaderSecrets: {
        Authorization: "OPENAI_API_KEY",
      },
    },
  });

  const plan = planCloudflareTenantDeploy({
    registryPath: fixture.registryPath,
    tenant: "proxy-secret",
    scriptName: "tenant-proxy-secret-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "dispatch-ns-123",
  });

  assert.deepEqual(plan.requiredSecretNames, ["OPENAI_API_KEY"]);
});

test("tenant deploy fails in execute mode when required secret is missing", async () => {
  const fixture = bootstrapRegistryFixture();
  upsertDeployment({
    registryPath: fixture.registryPath,
    tenant: "proxy-secret-missing",
    plan: "free",
    priceUsd: 0.005,
    resourceType: "proxy",
    proxy: {
      upstream: "https://api.example.com/v1",
      methods: ["GET"],
      injectHeaderSecrets: {
        Authorization: "OPENAI_API_KEY",
      },
    },
  });

  await assert.rejects(
    () =>
      deployCloudflareTenantWorker({
        registryPath: fixture.registryPath,
        tenant: "proxy-secret-missing",
        scriptName: "tenant-proxy-secret-missing-worker",
        accountId: "acc_123",
        apiToken: "token_1234567890",
        dispatchNamespace: "dispatch-ns-123",
        execute: true,
        statePath: fixture.statePath,
      }),
    /missing secret values for tenant deploy: OPENAI_API_KEY/,
  );
});

test("tenant deploy uploads referenced secrets to Cloudflare", async () => {
  const fixture = bootstrapRegistryFixture();
  upsertDeployment({
    registryPath: fixture.registryPath,
    tenant: "proxy-secret-upload",
    plan: "free",
    priceUsd: 0.005,
    resourceType: "proxy",
    proxy: {
      upstream: "https://api.example.com/v1",
      methods: ["GET"],
      injectHeaderSecrets: {
        Authorization: "OPENAI_API_KEY",
        "x-extra-key": "UPSTREAM_KEY",
      },
    },
  });

  const deployCalls = [];
  const result = await deployCloudflareTenantWorker({
    registryPath: fixture.registryPath,
    tenant: "proxy-secret-upload",
    scriptName: "tenant-proxy-secret-upload-worker",
    accountId: "acc_123",
    apiToken: "token_1234567890",
    dispatchNamespace: "clawr-staging",
    execute: true,
    secrets: {
      OPENAI_API_KEY: "secret-openai",
      UPSTREAM_KEY: "secret-upstream",
    },
    fetchImpl: makeCloudflareFetchMock(deployCalls),
    statePath: fixture.statePath,
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "execute");
  assert.deepEqual(result.deployed.secretNames, ["OPENAI_API_KEY", "UPSTREAM_KEY"]);
  assert.equal(deployCalls.length, 3);
  assert.ok(deployCalls[0].url.includes("/dispatch/namespaces/clawr-staging/scripts/tenant-proxy-secret-upload-worker"));
  assert.ok(deployCalls[1].url.endsWith("/secrets"));
  assert.ok(deployCalls[2].url.endsWith("/secrets"));

  const firstSecretBody = JSON.parse(deployCalls[1].options.body);
  const secondSecretBody = JSON.parse(deployCalls[2].options.body);
  assert.equal(firstSecretBody.type, "secret_text");
  assert.equal(secondSecretBody.type, "secret_text");
  assert.deepEqual(
    [firstSecretBody.name, secondSecretBody.name].sort(),
    ["OPENAI_API_KEY", "UPSTREAM_KEY"],
  );
});
