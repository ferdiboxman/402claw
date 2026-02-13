import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStorage } from "../src/storage/index.js";

const D1_MIGRATION_PATH = path.resolve(
  "/Users/Shared/Projects/402claw/prototypes/csv-api/migrations/0001_initial.sql",
);

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "402claw-storage-test-"));
}

test("json storage adapter round-trips registry and control-plane", () => {
  const tempDir = makeTempDir();
  const registryPath = path.join(tempDir, "tenants.json");
  const controlPlanePath = path.join(tempDir, "control-plane.json");
  const storage = createStorage({ backend: "json" });

  const registry = {
    version: 1,
    updatedAt: null,
    tenants: [
      {
        slug: "acme",
        tenantId: "tenant_acme",
        ownerUserId: "alice",
        workerName: "tenant-acme-worker",
        plan: "pro",
        resourceType: "dataset",
        sourceType: "csv",
        sourcePath: "/tmp/acme.csv",
        priceUsd: 0.01,
      },
    ],
  };

  const controlPlane = {
    version: 1,
    updatedAt: null,
    users: [{ userId: "alice", displayName: "Alice", status: "active" }],
    apiKeys: [],
    ledger: [],
    withdrawals: [],
    auditEvents: [],
    walletChallenges: [
      {
        challengeId: "wallet_challenge_1",
        userId: "alice",
        walletAddress: "0x1111111111111111111111111111111111111111",
        nonce: "abc",
        message: "sign me",
        issuedAt: "2026-02-13T00:00:00.000Z",
        expiresAt: "2026-02-13T00:10:00.000Z",
      },
    ],
  };

  storage.saveRegistry({ registryPath, registry });
  storage.saveControlPlane({ controlPlanePath, state: controlPlane });

  const loadedRegistry = storage.loadRegistry({ registryPath });
  const loadedControlPlane = storage.loadControlPlane({ controlPlanePath });
  assert.equal(loadedRegistry.tenants.length, 1);
  assert.equal(loadedRegistry.tenants[0].slug, "acme");
  assert.equal(loadedControlPlane.users.length, 1);
  assert.equal(loadedControlPlane.users[0].userId, "alice");
  assert.equal(loadedControlPlane.walletChallenges.length, 1);
});

test("d1 storage adapter round-trips registry and control-plane", () => {
  const tempDir = makeTempDir();
  const dbPath = path.join(tempDir, "control-plane.db");
  const storage = createStorage({
    backend: "d1",
    d1Path: dbPath,
    migrationSqlPath: D1_MIGRATION_PATH,
  });

  try {
    storage.saveRegistry({
      registry: {
        version: 1,
        updatedAt: null,
        tenants: [
          {
            slug: "acme",
            tenantId: "tenant_acme",
            ownerUserId: "alice",
            workerName: "tenant-acme-worker",
            plan: "pro",
            resourceType: "dataset",
            sourceType: "csv",
            sourcePath: "/tmp/acme.csv",
            priceUsd: 0.01,
          },
        ],
      },
    });

    storage.saveControlPlane({
      state: {
        version: 1,
        updatedAt: null,
        users: [
          {
            userId: "alice",
            displayName: "Alice",
            status: "active",
            createdAt: "2026-02-13T00:00:00.000Z",
            updatedAt: "2026-02-13T00:00:00.000Z",
          },
        ],
        apiKeys: [
          {
            keyId: "key_1",
            userId: "alice",
            keyHash: "hash_1",
            keyHint: "claw_abc***1234",
            scopes: ["deploy"],
            createdAt: "2026-02-13T00:00:00.000Z",
            revokedAt: null,
            lastUsedAt: null,
          },
        ],
        ledger: [
          {
            ledgerId: "rev_1",
            type: "credit",
            createdAt: "2026-02-13T00:01:00.000Z",
            tenantSlug: "acme",
            ownerUserId: "alice",
            grossUsd: 12.4,
          },
        ],
        withdrawals: [
          {
            withdrawalId: "withdrawal_1",
            tenantSlug: "acme",
            ownerUserId: "alice",
            requestedUsd: 5,
          },
        ],
        auditEvents: [
          {
            auditId: "audit_1",
            at: "2026-02-13T00:02:00.000Z",
            actorUserId: "alice",
            action: "tenant_registry_upsert",
            targetType: "tenant",
            targetId: "acme",
            ok: true,
            metadata: { command: "deploy" },
          },
        ],
        walletChallenges: [
          {
            challengeId: "wallet_challenge_1",
            userId: "alice",
            walletAddress: "0x1111111111111111111111111111111111111111",
            nonce: "abc",
            message: "sign me",
            issuedAt: "2026-02-13T00:00:00.000Z",
            expiresAt: "2026-02-13T00:10:00.000Z",
            usedAt: null,
          },
        ],
      },
    });

    const loadedRegistry = storage.loadRegistry();
    assert.equal(loadedRegistry.tenants.length, 1);
    assert.equal(loadedRegistry.tenants[0].slug, "acme");
    assert.equal(loadedRegistry.tenants[0].tenantId, "tenant_acme");

    const loadedControlPlane = storage.loadControlPlane();
    assert.equal(loadedControlPlane.users.length, 1);
    assert.equal(loadedControlPlane.apiKeys.length, 1);
    assert.equal(loadedControlPlane.apiKeys[0].keyHint, "claw_abc***1234");
    assert.equal(loadedControlPlane.ledger.length, 1);
    assert.equal(loadedControlPlane.withdrawals.length, 1);
    assert.equal(loadedControlPlane.auditEvents.length, 1);
    assert.equal(loadedControlPlane.walletChallenges.length, 1);
  } finally {
    if (typeof storage.close === "function") {
      storage.close();
    }
  }
});
