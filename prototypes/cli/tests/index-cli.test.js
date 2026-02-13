import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Wallet } from "ethers";

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

test("deploy command stores spend cap flags on tenant", () => {
  const cwd = makeTempDir();
  const source = path.join(cwd, "dataset.json");
  fs.writeFileSync(source, JSON.stringify([{ id: 1, name: "alpha" }]), "utf8");

  const payload = runCli([
    "deploy",
    source,
    "--tenant",
    "spend-tenant",
    "--price",
    "0.005",
    "--spend-day",
    "12.5",
    "--spend-month",
    "300",
  ], { cwd });

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.tenant.spendLimit, {
    dailySpendUsd: 12.5,
    monthlySpendUsd: 300,
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

test("wallet challenge + verify commands link wallet to user", async () => {
  const cwd = makeTempDir();
  const wallet = Wallet.createRandom();

  runCli([
    "user-create",
    "--user",
    "alice",
    "--name",
    "Alice",
  ], { cwd });

  const challengeResponse = runCli([
    "wallet-challenge",
    "--user",
    "alice",
    "--wallet",
    wallet.address,
  ], { cwd });

  const signature = await wallet.signMessage(challengeResponse.challenge.message);
  const verifyResponse = runCli([
    "wallet-verify",
    "--user",
    "alice",
    "--wallet",
    wallet.address,
    "--challenge-id",
    challengeResponse.challenge.challengeId,
    "--signature",
    signature,
  ], { cwd });

  assert.equal(verifyResponse.ok, true);
  assert.equal(verifyResponse.linked.userId, "alice");
  assert.equal(verifyResponse.linked.walletAddress, wallet.address);

  const authList = runCli(["auth-list"], { cwd });
  const alice = authList.users.find((item) => item.userId === "alice");
  assert.equal(alice.walletAddress, wallet.address);
  assert.ok(alice.walletVerifiedAt);
});

test("auth-rotate-key revokes old key and returns a replacement key", () => {
  const cwd = makeTempDir();

  const created = runCli([
    "auth-create-key",
    "--user",
    "alice",
    "--scope",
    "admin",
  ], { cwd });

  const before = runCli(["auth-list"], { cwd });
  const keyToRotate = before.apiKeys.find((item) => item.userId === "alice" && !item.revokedAt);
  assert.ok(keyToRotate);

  const rotated = runCli([
    "auth-rotate-key",
    "--key-id",
    keyToRotate.keyId,
    "--api-key",
    created.apiKey,
  ], { cwd });

  assert.equal(rotated.previous.keyId, keyToRotate.keyId);
  assert.ok(rotated.previous.revokedAt);
  assert.ok(rotated.apiKey.startsWith("claw_"));
  assert.notEqual(rotated.replacement.keyId, keyToRotate.keyId);
  assert.notEqual(rotated.apiKey, created.apiKey);
});

test("withdraw command creates pending request and withdraw-batch settles it", () => {
  const cwd = makeTempDir();
  const source = path.join(cwd, "dataset.json");
  fs.writeFileSync(source, JSON.stringify([{ id: 1, name: "alpha" }]), "utf8");

  runCli([
    "deploy",
    source,
    "--tenant",
    "payout-tenant",
    "--price",
    "0.01",
  ], { cwd });

  runCli([
    "revenue-credit",
    "--tenant",
    "payout-tenant",
    "--amount",
    "20",
  ], { cwd });

  const requested = runCli([
    "withdraw",
    "--tenant",
    "payout-tenant",
    "--amount",
    "5",
    "--to",
    "0xabc123",
  ], { cwd });

  assert.equal(requested.withdrawal.status, "pending");
  assert.equal(requested.balance.availableUsd, 20);

  const batch = runCli([
    "withdraw-batch",
    "--limit",
    "10",
  ], { cwd });

  assert.equal(batch.batch.completed, 1);

  const after = runCli([
    "balance",
    "--tenant",
    "payout-tenant",
  ], { cwd });
  assert.equal(after.balance.availableUsd, 15);
});

test("storage migrate json->d1 and rollback commands work end-to-end", () => {
  const cwd = makeTempDir();
  const source = path.join(cwd, "dataset.json");
  const d1Path = path.join(cwd, ".402claw", "control-plane.db");
  fs.writeFileSync(source, JSON.stringify([{ id: 1, name: "alpha" }]), "utf8");

  runCli([
    "deploy",
    source,
    "--tenant",
    "migrate-tenant",
    "--price",
    "0.01",
  ], { cwd });

  runCli([
    "user-create",
    "--user",
    "alice",
    "--name",
    "Alice",
  ], { cwd });

  const dryRun = runCli([
    "storage-migrate-json-to-d1",
    "--storage-path",
    d1Path,
  ], { cwd });
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.mode, "dry-run");
  assert.equal(dryRun.summary.registryTenants, 1);
  assert.equal(dryRun.summary.users, 1);

  const execute = runCli([
    "storage-migrate-json-to-d1",
    "--storage-path",
    d1Path,
    "--execute",
  ], { cwd });
  assert.equal(execute.ok, true);
  assert.equal(execute.mode, "execute");
  assert.ok(fs.existsSync(path.join(execute.backup.dir, "registry.json")));

  const d1Tenants = runCli([
    "list",
    "--storage-backend",
    "d1",
    "--storage-path",
    d1Path,
  ], { cwd });
  assert.equal(d1Tenants.total, 1);
  assert.equal(d1Tenants.tenants[0].slug, "migrate-tenant");

  const d1AuthList = runCli([
    "auth-list",
    "--storage-backend",
    "d1",
    "--storage-path",
    d1Path,
  ], { cwd });
  assert.equal(d1AuthList.users.length, 1);
  assert.equal(d1AuthList.users[0].userId, "alice");

  runCli([
    "deploy",
    source,
    "--tenant",
    "temp-tenant",
    "--price",
    "0.01",
    "--storage-backend",
    "d1",
    "--storage-path",
    d1Path,
  ], { cwd });

  const rollbackDryRun = runCli([
    "storage-rollback-d1",
    "--backup-dir",
    execute.backup.dir,
    "--storage-path",
    d1Path,
  ], { cwd });
  assert.equal(rollbackDryRun.ok, true);
  assert.equal(rollbackDryRun.mode, "dry-run");
  assert.equal(rollbackDryRun.summary.registryTenants, 1);

  const rollbackExecute = runCli([
    "storage-rollback-d1",
    "--backup-dir",
    execute.backup.dir,
    "--storage-path",
    d1Path,
    "--execute",
  ], { cwd });
  assert.equal(rollbackExecute.ok, true);
  assert.equal(rollbackExecute.mode, "execute");

  const afterRollback = runCli([
    "list",
    "--storage-backend",
    "d1",
    "--storage-path",
    d1Path,
  ], { cwd });
  assert.equal(afterRollback.total, 1);
  assert.equal(afterRollback.tenants[0].slug, "migrate-tenant");
});
