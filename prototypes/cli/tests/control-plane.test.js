import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendAuditEvent,
  authenticateApiKey,
  createApiKeyForUser,
  getTenantBalance,
  isAuthConfigured,
  listApiKeys,
  listAuditEvents,
  listUsers,
  requestWithdrawal,
  recordTenantRevenue,
  revokeApiKey,
} from "../src/control-plane.js";

function makeTempControlPlanePath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "402claw-control-plane-"));
  return path.join(tempDir, "control-plane.json");
}

test("control plane supports users, api keys, and authentication", () => {
  const controlPlanePath = makeTempControlPlanePath();
  assert.equal(isAuthConfigured(controlPlanePath), false);

  const created = createApiKeyForUser({
    controlPlanePath,
    userId: "alice",
    displayName: "Alice",
    scopes: ["deploy", "withdraw"],
  });

  assert.ok(created.apiKey.startsWith("claw_"));
  assert.equal(isAuthConfigured(controlPlanePath), true);
  assert.equal(listUsers(controlPlanePath).length, 1);
  assert.equal(listApiKeys(controlPlanePath).length, 1);

  const auth = authenticateApiKey({
    controlPlanePath,
    apiKey: created.apiKey,
    requiredScope: "deploy",
  });
  assert.equal(auth.user.userId, "alice");

  assert.throws(
    () =>
      authenticateApiKey({
        controlPlanePath,
        apiKey: created.apiKey,
        requiredScope: "admin",
      }),
    /missing_scope:admin/,
  );
});

test("control plane writes audit events with filtering", () => {
  const controlPlanePath = makeTempControlPlanePath();

  appendAuditEvent({
    controlPlanePath,
    actorUserId: "alice",
    action: "deploy",
    targetType: "tenant",
    targetId: "acme",
    ok: true,
    metadata: { mode: "execute" },
  });

  appendAuditEvent({
    controlPlanePath,
    actorUserId: "bob",
    action: "withdraw",
    targetType: "tenant",
    targetId: "beta",
    ok: false,
    metadata: { reason: "insufficient_balance" },
  });

  const all = listAuditEvents({ controlPlanePath, limit: 10 });
  const aliceOnly = listAuditEvents({
    controlPlanePath,
    actorUserId: "alice",
    limit: 10,
  });

  assert.equal(all.length, 2);
  assert.equal(aliceOnly.length, 1);
  assert.equal(aliceOnly[0].targetId, "acme");
});

test("control plane tracks revenue and applies 5 percent withdrawal fee", () => {
  const controlPlanePath = makeTempControlPlanePath();

  recordTenantRevenue({
    controlPlanePath,
    tenantSlug: "acme",
    ownerUserId: "alice",
    grossUsd: 50,
    source: "settled_request",
  });

  const before = getTenantBalance({
    controlPlanePath,
    tenantSlug: "acme",
  });
  assert.equal(before.availableUsd, 50);
  assert.equal(before.lifetimeGrossUsd, 50);

  const withdrawal = requestWithdrawal({
    controlPlanePath,
    tenantSlug: "acme",
    ownerUserId: "alice",
    amountUsd: 20,
    destination: "0xabc123",
  });

  assert.equal(withdrawal.requestedUsd, 20);
  assert.equal(withdrawal.platformFeeUsd, 1);
  assert.equal(withdrawal.netPayoutUsd, 19);
  assert.equal(withdrawal.status, "completed_simulated");

  const after = getTenantBalance({
    controlPlanePath,
    tenantSlug: "acme",
  });
  assert.equal(after.availableUsd, 30);
  assert.equal(after.lifetimeWithdrawnUsd, 19);
  assert.equal(after.lifetimeWithdrawalFeesUsd, 1);
});

test("revoked api key can no longer authenticate", () => {
  const controlPlanePath = makeTempControlPlanePath();
  const created = createApiKeyForUser({
    controlPlanePath,
    userId: "alice",
    scopes: ["*"],
  });

  const [firstKey] = listApiKeys(controlPlanePath);
  revokeApiKey({
    controlPlanePath,
    keyId: firstKey.keyId,
  });

  assert.throws(
    () =>
      authenticateApiKey({
        controlPlanePath,
        apiKey: created.apiKey,
        requiredScope: "deploy",
      }),
    /invalid_api_key/,
  );
});

