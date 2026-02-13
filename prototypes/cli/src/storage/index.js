import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_BACKENDS = new Set(["json", "d1"]);
const DEFAULT_D1_FILENAME = "control-plane.db";

function toText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseJson(value, fallback) {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeBackend(value = "json") {
  const backend = String(value || "json").trim().toLowerCase();
  if (!SUPPORTED_BACKENDS.has(backend)) {
    throw new Error(`unsupported storage backend: ${value}`);
  }
  return backend;
}

function writeJsonFile(filePath, payload) {
  const absolute = path.resolve(filePath);
  ensureDir(absolute);
  fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function readJsonFile(filePath, fallbackFactory) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    return fallbackFactory();
  }

  const raw = fs.readFileSync(absolute, "utf8");
  const parsed = JSON.parse(raw);
  return parsed;
}

function defaultRegistryState() {
  return {
    version: 1,
    updatedAt: null,
    tenants: [],
  };
}

function defaultControlPlaneState() {
  return {
    version: 1,
    updatedAt: null,
    users: [],
    apiKeys: [],
    ledger: [],
    withdrawals: [],
    auditEvents: [],
    walletChallenges: [],
  };
}

function buildMigrationPath(providedPath) {
  if (providedPath) return path.resolve(providedPath);
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..", "csv-api", "migrations", "0001_initial.sql");
}

function defaultD1Path(cwd = process.cwd()) {
  return path.resolve(cwd, ".402claw", DEFAULT_D1_FILENAME);
}

function makeJsonStorage() {
  return {
    backend: "json",
    loadRegistry({ registryPath } = {}) {
      if (!registryPath) throw new Error("registryPath is required");
      const parsed = readJsonFile(registryPath, defaultRegistryState);
      return {
        version: Number(parsed.version || 1),
        updatedAt: parsed.updatedAt || null,
        tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [],
      };
    },
    saveRegistry({ registryPath, registry } = {}) {
      if (!registryPath) throw new Error("registryPath is required");
      const next = {
        version: Number(registry?.version || 1),
        updatedAt: nowIso(),
        tenants: Array.isArray(registry?.tenants) ? registry.tenants : [],
      };
      return writeJsonFile(registryPath, next);
    },
    loadControlPlane({ controlPlanePath } = {}) {
      if (!controlPlanePath) throw new Error("controlPlanePath is required");
      const parsed = readJsonFile(controlPlanePath, defaultControlPlaneState);
      return {
        version: Number(parsed.version || 1),
        updatedAt: parsed.updatedAt || null,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
        ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
        walletChallenges: Array.isArray(parsed.walletChallenges) ? parsed.walletChallenges : [],
      };
    },
    saveControlPlane({ controlPlanePath, state } = {}) {
      if (!controlPlanePath) throw new Error("controlPlanePath is required");
      const next = {
        version: Number(state?.version || 1),
        updatedAt: nowIso(),
        users: Array.isArray(state?.users) ? state.users : [],
        apiKeys: Array.isArray(state?.apiKeys) ? state.apiKeys : [],
        ledger: Array.isArray(state?.ledger) ? state.ledger : [],
        withdrawals: Array.isArray(state?.withdrawals) ? state.withdrawals : [],
        auditEvents: Array.isArray(state?.auditEvents) ? state.auditEvents : [],
        walletChallenges: Array.isArray(state?.walletChallenges) ? state.walletChallenges : [],
      };
      return writeJsonFile(controlPlanePath, next);
    },
  };
}

function withTransaction(db, operation) {
  db.exec("BEGIN");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ensureTenantRowForLedger(db, tenantId, ownerUserId = "unknown") {
  const slug = toText(tenantId).toLowerCase();
  if (!slug) return;

  const insert = db.prepare(`
    INSERT INTO tenants (id, slug, owner_id, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      owner_id = excluded.owner_id,
      updated_at = excluded.updated_at
  `);

  const now = nowIso();
  const tenantConfig = {
    slug,
    tenantId: slug,
    ownerUserId,
    sourceType: "system",
  };
  insert.run(slug, slug, ownerUserId, JSON.stringify(tenantConfig), now, now);
}

function makeD1Storage({
  databasePath,
  migrationSqlPath,
  autoMigrate = true,
} = {}) {
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite");

  const resolvedDbPath = path.resolve(databasePath || defaultD1Path());
  ensureDir(resolvedDbPath);
  const migrationPath = buildMigrationPath(migrationSqlPath);
  const db = new DatabaseSync(resolvedDbPath);

  db.exec("PRAGMA foreign_keys = ON;");

  if (autoMigrate) {
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`migration file not found: ${migrationPath}`);
    }
    const sql = fs.readFileSync(migrationPath, "utf8");
    db.exec(sql);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS storage_documents (
      doc_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL CHECK (json_valid(payload)),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const getDocumentStmt = db.prepare(
    "SELECT payload FROM storage_documents WHERE doc_key = ? LIMIT 1",
  );
  const putDocumentStmt = db.prepare(`
    INSERT INTO storage_documents (doc_key, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(doc_key) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `);

  function getDocument(key, fallback) {
    const row = getDocumentStmt.get(String(key || ""));
    if (!row?.payload) return fallback;
    return parseJson(row.payload, fallback);
  }

  function putDocument(key, payload) {
    putDocumentStmt.run(String(key || ""), JSON.stringify(payload ?? null), nowIso());
  }

  const insertTenantStmt = db.prepare(`
    INSERT INTO tenants (id, slug, owner_id, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      owner_id = excluded.owner_id,
      config = excluded.config,
      updated_at = excluded.updated_at
  `);

  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, email, wallet_address, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      wallet_address = excluded.wallet_address,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `);

  const insertApiKeyStmt = db.prepare(`
    INSERT INTO api_keys (id, user_id, key_hash, scopes, created_at, last_used_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      key_hash = excluded.key_hash,
      scopes = excluded.scopes,
      created_at = excluded.created_at,
      last_used_at = excluded.last_used_at,
      revoked_at = excluded.revoked_at
  `);

  const insertLedgerStmt = db.prepare(`
    INSERT INTO ledger (id, tenant_id, type, amount, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tenant_id = excluded.tenant_id,
      type = excluded.type,
      amount = excluded.amount,
      metadata = excluded.metadata,
      created_at = excluded.created_at
  `);

  const insertAuditStmt = db.prepare(`
    INSERT INTO audit_log (id, user_id, action, metadata, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      action = excluded.action,
      metadata = excluded.metadata,
      created_at = excluded.created_at
  `);

  return {
    backend: "d1",
    databasePath: resolvedDbPath,
    migrationSqlPath: migrationPath,
    loadRegistry() {
      const meta = getDocument("registry_meta", { version: 1, updatedAt: null });
      const rows = db
        .prepare("SELECT id, slug, owner_id, config, created_at, updated_at FROM tenants ORDER BY rowid ASC")
        .all();

      const tenants = rows.map((row) => {
        const config = parseJson(row.config, {}) || {};
        return {
          ...config,
          slug: toText(config.slug || row.slug, row.slug),
          tenantId: toText(config.tenantId, row.id),
          ownerUserId: toText(config.ownerUserId, row.owner_id || "anonymous"),
          createdAt: toText(config.createdAt, row.created_at || nowIso()),
          updatedAt: toText(config.updatedAt, row.updated_at || nowIso()),
        };
      });

      return {
        version: Number(meta.version || 1),
        updatedAt: meta.updatedAt || null,
        tenants,
      };
    },
    saveRegistry({ registry } = {}) {
      const nextRegistry = {
        version: Number(registry?.version || 1),
        updatedAt: nowIso(),
        tenants: Array.isArray(registry?.tenants) ? registry.tenants : [],
      };

      withTransaction(db, () => {
        db.exec("DELETE FROM tenants");

        for (const tenant of nextRegistry.tenants) {
          const slug = toText(tenant?.slug).toLowerCase();
          if (!slug) continue;
          const ownerUserId = toText(tenant?.ownerUserId, "anonymous");
          const createdAt = toText(tenant?.createdAt, nowIso());
          const updatedAt = toText(tenant?.updatedAt, nowIso());
          const normalized = {
            ...tenant,
            slug,
            tenantId: toText(tenant?.tenantId, slug),
            ownerUserId,
            createdAt,
            updatedAt,
          };

          insertTenantStmt.run(
            slug,
            slug,
            ownerUserId,
            JSON.stringify(normalized),
            createdAt,
            updatedAt,
          );
        }

        putDocument("registry_meta", {
          version: nextRegistry.version,
          updatedAt: nextRegistry.updatedAt,
        });
      });

      return this.loadRegistry();
    },
    loadControlPlane() {
      const meta = getDocument("control_plane_meta", { version: 1, updatedAt: null });
      const apiKeyMeta = getDocument("api_key_meta", {});
      const withdrawals = getDocument("withdrawals", []);
      const walletChallenges = getDocument("wallet_challenges", []);

      const users = db.prepare("SELECT * FROM users ORDER BY rowid ASC").all().map((row) => {
        const full = parseJson(row.metadata, null);
        if (full && typeof full === "object") return full;
        return {
          userId: row.id,
          email: row.email || null,
          walletAddress: row.wallet_address || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      const apiKeys = db.prepare("SELECT * FROM api_keys ORDER BY rowid ASC").all().map((row) => {
        const scopes = parseJson(row.scopes, ["*"]);
        const keyId = row.id;
        return {
          keyId,
          userId: row.user_id,
          keyHash: row.key_hash,
          scopes: Array.isArray(scopes) ? scopes : ["*"],
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at || null,
          revokedAt: row.revoked_at || null,
          ...(apiKeyMeta?.[keyId] || {}),
        };
      });

      const ledger = db.prepare("SELECT * FROM ledger ORDER BY rowid ASC").all().map((row) => {
        const full = parseJson(row.metadata, null);
        if (full && typeof full === "object") return full;
        return {
          ledgerId: row.id,
          type: row.type,
          tenantSlug: row.tenant_id,
          amount: row.amount,
          createdAt: row.created_at,
        };
      });

      const auditEvents = db.prepare("SELECT * FROM audit_log ORDER BY rowid ASC").all().map((row) => {
        const full = parseJson(row.metadata, null);
        if (full && typeof full === "object") return full;
        return {
          auditId: row.id,
          at: row.created_at,
          actorUserId: row.user_id || "system",
          action: row.action,
          targetType: "unknown",
          targetId: "unknown",
          ok: true,
          metadata: {},
        };
      });

      return {
        version: Number(meta.version || 1),
        updatedAt: meta.updatedAt || null,
        users,
        apiKeys,
        ledger,
        withdrawals: Array.isArray(withdrawals) ? withdrawals : [],
        auditEvents,
        walletChallenges: Array.isArray(walletChallenges) ? walletChallenges : [],
      };
    },
    saveControlPlane({ state } = {}) {
      const nextState = {
        version: Number(state?.version || 1),
        updatedAt: nowIso(),
        users: Array.isArray(state?.users) ? state.users : [],
        apiKeys: Array.isArray(state?.apiKeys) ? state.apiKeys : [],
        ledger: Array.isArray(state?.ledger) ? state.ledger : [],
        withdrawals: Array.isArray(state?.withdrawals) ? state.withdrawals : [],
        auditEvents: Array.isArray(state?.auditEvents) ? state.auditEvents : [],
        walletChallenges: Array.isArray(state?.walletChallenges) ? state.walletChallenges : [],
      };

      withTransaction(db, () => {
        db.exec("DELETE FROM api_keys");
        db.exec("DELETE FROM users");
        db.exec("DELETE FROM ledger");
        db.exec("DELETE FROM audit_log");

        const userIds = new Set();
        for (const user of nextState.users) {
          const userId = toText(user?.userId || user?.id);
          if (!userId) continue;
          const payload = {
            ...user,
            userId,
          };
          const createdAt = toText(payload.createdAt, nowIso());
          const updatedAt = toText(payload.updatedAt, nowIso());
          insertUserStmt.run(
            userId,
            toText(payload.email) || null,
            toText(payload.walletAddress || payload.wallet_address) || null,
            JSON.stringify(payload),
            createdAt,
            updatedAt,
          );
          userIds.add(userId);
        }

        for (const key of nextState.apiKeys) {
          const userId = toText(key?.userId);
          if (!userId) continue;
          if (!userIds.has(userId)) {
            const createdAt = toText(key?.createdAt, nowIso());
            const fallbackUser = {
              userId,
              displayName: userId,
              status: "active",
              createdAt,
              updatedAt: createdAt,
            };
            insertUserStmt.run(
              userId,
              null,
              null,
              JSON.stringify(fallbackUser),
              createdAt,
              createdAt,
            );
            userIds.add(userId);
          }
        }

        const apiKeyMeta = {};
        for (const key of nextState.apiKeys) {
          const keyId = toText(key?.keyId || key?.id);
          const userId = toText(key?.userId);
          const keyHash = toText(key?.keyHash);
          if (!keyId || !userId || !keyHash) continue;
          const scopes = Array.isArray(key.scopes) ? key.scopes : ["*"];
          insertApiKeyStmt.run(
            keyId,
            userId,
            keyHash,
            JSON.stringify(scopes),
            toText(key.createdAt, nowIso()),
            toText(key.lastUsedAt) || null,
            toText(key.revokedAt) || null,
          );
          apiKeyMeta[keyId] = {
            keyHint: key.keyHint || null,
          };
        }

        for (const entry of nextState.ledger) {
          const ledgerId = toText(entry?.ledgerId || entry?.id);
          if (!ledgerId) continue;
          const tenantId = toText(entry?.tenantSlug || entry?.tenantId).toLowerCase();
          if (!tenantId) continue;
          ensureTenantRowForLedger(db, tenantId, toText(entry?.ownerUserId, "unknown"));
          const type = toText(entry?.type, "unknown");
          const amount = Number(
            entry?.amount ?? entry?.grossUsd ?? entry?.requestedUsd ?? entry?.netPayoutUsd ?? 0,
          );
          const createdAt = toText(entry?.createdAt, nowIso());
          insertLedgerStmt.run(
            ledgerId,
            tenantId,
            type,
            Number.isFinite(amount) ? amount : 0,
            JSON.stringify(entry),
            createdAt,
          );
        }

        for (const event of nextState.auditEvents) {
          const auditId = toText(event?.auditId || event?.id);
          if (!auditId) continue;
          const actorUserId = toText(event?.actorUserId);
          const action = toText(event?.action, "unknown_action");
          const createdAt = toText(event?.at || event?.createdAt, nowIso());
          insertAuditStmt.run(
            auditId,
            actorUserId && userIds.has(actorUserId) ? actorUserId : null,
            action,
            JSON.stringify(event),
            createdAt,
          );
        }

        putDocument("api_key_meta", apiKeyMeta);
        putDocument("withdrawals", nextState.withdrawals);
        putDocument("wallet_challenges", nextState.walletChallenges);
        putDocument("control_plane_meta", {
          version: nextState.version,
          updatedAt: nextState.updatedAt,
        });
      });

      return this.loadControlPlane();
    },
    close() {
      db.close();
    },
  };
}

export function createStorage({
  backend = "json",
  d1Path,
  migrationSqlPath,
  autoMigrate = true,
} = {}) {
  const normalizedBackend = normalizeBackend(backend);
  if (normalizedBackend === "json") {
    return makeJsonStorage();
  }

  return makeD1Storage({
    databasePath: d1Path || defaultD1Path(),
    migrationSqlPath,
    autoMigrate,
  });
}

export function resolveStorageConfig(flags = {}, env = process.env) {
  const backend = normalizeBackend(
    flags["storage-backend"] || env.CLAW_STORAGE_BACKEND || "json",
  );

  const d1Path = flags["storage-path"] || env.CLAW_STORAGE_PATH || defaultD1Path();
  const migrationSqlPath = flags["storage-migration-sql"] || env.CLAW_STORAGE_MIGRATION_SQL || undefined;

  return {
    backend,
    d1Path,
    migrationSqlPath,
  };
}

export function defaultD1StoragePath(cwd = process.cwd()) {
  return defaultD1Path(cwd);
}
