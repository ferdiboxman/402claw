import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI_ENTRY = path.resolve(
  "/Users/Shared/Projects/402claw/prototypes/cli/src/index.js",
);

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "402claw-cli-index-test-"));
}

function runCli(args, { cwd, env } = {}) {
  const result = spawnSync(process.execPath, [CLI_ENTRY, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`CLI command failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

test("deploy command accepts function source and writes function tenant", () => {
  const cwd = makeTempDir();
  const source = path.join(cwd, "handler.js");
  fs.writeFileSync(source, "export default async () => ({ ok: true });\n", "utf8");

  const payload = runCli([
    "deploy",
    source,
    "--tenant",
    "function-tenant",
    "--type",
    "function",
    "--price",
    "0.01",
    "--rate-limit-caller",
    "10/60s",
  ], { cwd });

  assert.equal(payload.ok, true);
  assert.equal(payload.tenant.resourceType, "function");
  assert.equal(payload.tenant.rateLimit.perCaller.requests, 10);
  assert.equal(payload.endpoint, "/t/function-tenant/");
});

test("deploy command stores usage quota flags on tenant", () => {
  const cwd = makeTempDir();
  const source = path.join(cwd, "dataset.json");
  fs.writeFileSync(source, JSON.stringify([{ id: 1, name: "alpha" }]), "utf8");

  const payload = runCli([
    "deploy",
    source,
    "--tenant",
    "quota-tenant",
    "--price",
    "0.005",
    "--quota-day",
    "2500",
    "--quota-month",
    "40000",
  ], { cwd });

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.tenant.usageLimit, {
    dailyRequests: 2500,
    monthlyRequests: 40000,
  });
});

test("wrap command stores proxy config and caller rate limit", () => {
  const cwd = makeTempDir();

  const payload = runCli([
    "wrap",
    "https://api.example.com/v1",
    "--tenant",
    "proxy-tenant",
    "--price",
    "0.02",
    "--method",
    "GET",
    "--inject-header",
    "Authorization: Bearer $TEST_PROXY_TOKEN",
    "--caller-rate-limit",
    "5/60s",
    "--cache-ttl",
    "45",
  ], {
    cwd,
    env: {
      TEST_PROXY_TOKEN: "test_token_value",
    },
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.tenant.resourceType, "proxy");
  assert.equal(payload.tenant.proxy.cacheTtlSeconds, 45);
  assert.equal(payload.tenant.proxy.injectHeaders.Authorization, "Bearer test_token_value");
  assert.equal(payload.tenant.rateLimit.perCaller.windowSeconds, 60);
});

test("wrap command stores secret header references without plaintext values", () => {
  const cwd = makeTempDir();

  const payload = runCli([
    "wrap",
    "https://api.example.com/v1",
    "--tenant",
    "proxy-secret-tenant",
    "--price",
    "0.02",
    "--inject-header-secret",
    "Authorization: OPENAI_API_KEY",
  ], { cwd });

  assert.equal(payload.ok, true);
  assert.equal(payload.tenant.resourceType, "proxy");
  assert.equal(payload.tenant.proxy.injectHeaderSecrets.Authorization, "OPENAI_API_KEY");
  assert.equal(payload.tenant.proxy.injectHeaders?.Authorization, undefined);
});
