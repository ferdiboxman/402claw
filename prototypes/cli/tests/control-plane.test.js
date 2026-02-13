import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  appendAuditEvent,
  authenticateApiKey,
  createWalletVerificationChallenge,
  createApiKeyForUser,
  getTenantBalance,
  isAuthConfigured,
  listApiKeys,
  listAuditEvents,
  listUsers,
  processPendingWithdrawals,
  requestWithdrawal,
  recordTenantRevenue,
  rotateApiKey,
  revokeApiKey,
  verifyWalletVerificationChallenge,
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
  assert.equal(withdrawal.status, "pending");

  const batch = processPendingWithdrawals({
    controlPlanePath,
    limit: 10,
  });
  assert.equal(batch.completed, 1);
  assert.equal(batch.failedInsufficientBalance, 0);

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

test("api key rotation revokes old key and returns replacement key", () => {
  const controlPlanePath = makeTempControlPlanePath();
  const created = createApiKeyForUser({
    controlPlanePath,
    userId: "alice",
    scopes: ["deploy"],
  });
  const [firstKey] = listApiKeys(controlPlanePath);

  const rotated = rotateApiKey({
    controlPlanePath,
    keyId: firstKey.keyId,
  });

  assert.equal(rotated.previous.keyId, firstKey.keyId);
  assert.ok(rotated.previous.revokedAt);
  assert.ok(rotated.replacement.apiKey.startsWith("claw_"));
  assert.notEqual(rotated.replacement.keyRecord.keyId, firstKey.keyId);

  assert.throws(
    () => authenticateApiKey({
      controlPlanePath,
      apiKey: created.apiKey,
      requiredScope: "deploy",
    }),
    /invalid_api_key/,
  );

  const auth = authenticateApiKey({
    controlPlanePath,
    apiKey: rotated.replacement.apiKey,
    requiredScope: "deploy",
  });
  assert.equal(auth.user.userId, "alice");
});

test("wallet challenge verifies signed ownership and links wallet to user", async () => {
  const controlPlanePath = makeTempControlPlanePath();
  const wallet = Wallet.createRandom();

  const challenge = createWalletVerificationChallenge({
    controlPlanePath,
    userId: "alice",
    walletAddress: wallet.address,
    ttlMinutes: 10,
  });

  assert.equal(challenge.userId, "alice");
  assert.equal(challenge.walletAddress, wallet.address);
  assert.ok(challenge.message.includes(challenge.challengeId));

  const signature = await wallet.signMessage(challenge.message);
  const linked = verifyWalletVerificationChallenge({
    controlPlanePath,
    userId: "alice",
    walletAddress: wallet.address,
    challengeId: challenge.challengeId,
    signature,
  });

  assert.equal(linked.userId, "alice");
  assert.equal(linked.walletAddress, wallet.address);
  assert.ok(linked.walletVerifiedAt);

  assert.throws(
    () => verifyWalletVerificationChallenge({
      controlPlanePath,
      userId: "alice",
      walletAddress: wallet.address,
      challengeId: challenge.challengeId,
      signature,
    }),
    /wallet_challenge_not_found/,
  );

  const [alice] = listUsers(controlPlanePath).filter((item) => item.userId === "alice");
  assert.equal(alice.walletAddress, wallet.address);
  assert.ok(alice.walletVerifiedAt);
});
