import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const WITHDRAWAL_FEE_RATE = 0.05;

function roundUsd(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

function nowIso() {
  return new Date().toISOString();
}

function assertNonEmpty(value, name) {
  if (!String(value || "").trim()) {
    throw new Error(`${name} is required`);
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(String(apiKey || ""), "utf8").digest("hex");
}

function redactApiKey(apiKey) {
  const text = String(apiKey || "");
  if (text.length <= 10) return `${text.slice(0, 3)}***`;
  return `${text.slice(0, 6)}***${text.slice(-4)}`;
}

function normalizeUserId(input) {
  const value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!value) {
    throw new Error("userId is required");
  }

  return value;
}

function normalizeScopeList(scopes) {
  const values = Array.isArray(scopes) ? scopes : [scopes || "*"];
  const clean = values
    .map((scope) => String(scope || "").trim().toLowerCase())
    .filter(Boolean);

  if (clean.length === 0) return ["*"];
  return [...new Set(clean)];
}

function hasScope(keyRecord, requiredScope) {
  const scopes = Array.isArray(keyRecord.scopes) ? keyRecord.scopes : ["*"];
  if (scopes.includes("*")) return true;
  if (!requiredScope) return true;
  return scopes.includes(requiredScope);
}

function summarizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const text = JSON.stringify(metadata);
  if (text.length <= 2000) return metadata;
  return {
    warning: "metadata_truncated",
    preview: text.slice(0, 2000),
  };
}

function computeBalancesFromLedger(ledgerEntries) {
  const balances = {};
  for (const entry of ledgerEntries || []) {
    if (entry.type === "credit") {
      const current = balances[entry.tenantSlug] || {
        tenantSlug: entry.tenantSlug,
        ownerUserId: entry.ownerUserId,
        availableUsd: 0,
        lifetimeGrossUsd: 0,
        lifetimeWithdrawnUsd: 0,
        lifetimeWithdrawalFeesUsd: 0,
      };

      current.ownerUserId = entry.ownerUserId || current.ownerUserId;
      current.availableUsd = roundUsd(current.availableUsd + entry.grossUsd);
      current.lifetimeGrossUsd = roundUsd(current.lifetimeGrossUsd + entry.grossUsd);
      balances[entry.tenantSlug] = current;
      continue;
    }

    if (entry.type === "withdrawal") {
      const current = balances[entry.tenantSlug] || {
        tenantSlug: entry.tenantSlug,
        ownerUserId: entry.ownerUserId,
        availableUsd: 0,
        lifetimeGrossUsd: 0,
        lifetimeWithdrawnUsd: 0,
        lifetimeWithdrawalFeesUsd: 0,
      };

      current.ownerUserId = entry.ownerUserId || current.ownerUserId;
      current.availableUsd = roundUsd(current.availableUsd - entry.requestedUsd);
      current.lifetimeWithdrawnUsd = roundUsd(current.lifetimeWithdrawnUsd + entry.netPayoutUsd);
      current.lifetimeWithdrawalFeesUsd = roundUsd(
        current.lifetimeWithdrawalFeesUsd + entry.platformFeeUsd,
      );
      balances[entry.tenantSlug] = current;
    }
  }

  return balances;
}

export function defaultControlPlanePath(cwd = process.cwd()) {
  return path.resolve(cwd, ".402claw", "control-plane.json");
}

export function loadControlPlane(controlPlanePath) {
  const absolute = path.resolve(controlPlanePath);
  if (!fs.existsSync(absolute)) {
    return {
      version: 1,
      updatedAt: null,
      users: [],
      apiKeys: [],
      ledger: [],
      withdrawals: [],
      auditEvents: [],
    };
  }

  const raw = fs.readFileSync(absolute, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.users)) {
    throw new Error(`invalid control plane file: ${absolute}`);
  }

  return {
    version: Number(parsed.version || 1),
    updatedAt: parsed.updatedAt || null,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
    ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
    withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
    auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
  };
}

export function saveControlPlane(controlPlanePath, state) {
  const absolute = path.resolve(controlPlanePath);
  ensureDir(absolute);
  const next = {
    version: Number(state.version || 1),
    updatedAt: nowIso(),
    users: Array.isArray(state.users) ? state.users : [],
    apiKeys: Array.isArray(state.apiKeys) ? state.apiKeys : [],
    ledger: Array.isArray(state.ledger) ? state.ledger : [],
    withdrawals: Array.isArray(state.withdrawals) ? state.withdrawals : [],
    auditEvents: Array.isArray(state.auditEvents) ? state.auditEvents : [],
  };

  fs.writeFileSync(absolute, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function ensureUser({
  controlPlanePath = defaultControlPlanePath(),
  userId,
  displayName,
} = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const state = loadControlPlane(controlPlanePath);
  let user = state.users.find((item) => item.userId === normalizedUserId);

  if (!user) {
    user = {
      userId: normalizedUserId,
      displayName: String(displayName || normalizedUserId),
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.users.push(user);
    saveControlPlane(controlPlanePath, state);
  } else if (displayName && user.displayName !== displayName) {
    user.displayName = String(displayName);
    user.updatedAt = nowIso();
    saveControlPlane(controlPlanePath, state);
  }

  return user;
}

export function createApiKeyForUser({
  controlPlanePath = defaultControlPlanePath(),
  userId,
  displayName,
  scopes = ["*"],
} = {}) {
  const user = ensureUser({ controlPlanePath, userId, displayName });
  const state = loadControlPlane(controlPlanePath);

  const apiKey = `claw_${crypto.randomBytes(18).toString("base64url")}`;
  const record = {
    keyId: uid("key"),
    userId: user.userId,
    keyHash: hashApiKey(apiKey),
    keyHint: redactApiKey(apiKey),
    scopes: normalizeScopeList(scopes),
    createdAt: nowIso(),
    lastUsedAt: null,
    revokedAt: null,
  };

  state.apiKeys.push(record);
  saveControlPlane(controlPlanePath, state);

  return {
    apiKey,
    keyRecord: {
      keyId: record.keyId,
      userId: record.userId,
      keyHint: record.keyHint,
      scopes: record.scopes,
      createdAt: record.createdAt,
    },
  };
}

export function revokeApiKey({
  controlPlanePath = defaultControlPlanePath(),
  keyId,
} = {}) {
  assertNonEmpty(keyId, "keyId");
  const state = loadControlPlane(controlPlanePath);
  const key = state.apiKeys.find((item) => item.keyId === keyId);
  if (!key) {
    throw new Error(`api key not found: ${keyId}`);
  }
  if (!key.revokedAt) {
    key.revokedAt = nowIso();
    saveControlPlane(controlPlanePath, state);
  }
  return {
    keyId: key.keyId,
    userId: key.userId,
    revokedAt: key.revokedAt,
  };
}

function activeApiKeys(state) {
  return (state.apiKeys || []).filter((key) => !key.revokedAt);
}

export function isAuthConfigured(controlPlanePath = defaultControlPlanePath()) {
  const state = loadControlPlane(controlPlanePath);
  return activeApiKeys(state).length > 0;
}

export function authenticateApiKey({
  controlPlanePath = defaultControlPlanePath(),
  apiKey,
  requiredScope = null,
} = {}) {
  assertNonEmpty(apiKey, "apiKey");
  const state = loadControlPlane(controlPlanePath);
  const digest = hashApiKey(apiKey);
  const key = state.apiKeys.find((item) => item.keyHash === digest && !item.revokedAt);
  if (!key) {
    throw new Error("invalid_api_key");
  }
  if (!hasScope(key, requiredScope)) {
    throw new Error(`missing_scope:${requiredScope}`);
  }
  const user = state.users.find((item) => item.userId === key.userId && item.status === "active");
  if (!user) {
    throw new Error("api_key_user_not_found");
  }

  key.lastUsedAt = nowIso();
  saveControlPlane(controlPlanePath, state);

  return {
    user: {
      userId: user.userId,
      displayName: user.displayName,
      status: user.status,
    },
    key: {
      keyId: key.keyId,
      keyHint: key.keyHint,
      scopes: key.scopes,
    },
  };
}

export function listUsers(controlPlanePath = defaultControlPlanePath()) {
  const state = loadControlPlane(controlPlanePath);
  return state.users;
}

export function listApiKeys(controlPlanePath = defaultControlPlanePath()) {
  const state = loadControlPlane(controlPlanePath);
  return state.apiKeys.map((key) => ({
    keyId: key.keyId,
    userId: key.userId,
    keyHint: key.keyHint,
    scopes: key.scopes,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
  }));
}

export function appendAuditEvent({
  controlPlanePath = defaultControlPlanePath(),
  actorUserId = "system",
  action,
  targetType,
  targetId,
  ok = true,
  metadata = {},
} = {}) {
  assertNonEmpty(action, "action");
  const state = loadControlPlane(controlPlanePath);
  const entry = {
    auditId: uid("audit"),
    at: nowIso(),
    actorUserId: String(actorUserId || "system"),
    action,
    targetType: String(targetType || "unknown"),
    targetId: String(targetId || "unknown"),
    ok: Boolean(ok),
    metadata: summarizeMetadata(metadata),
  };

  state.auditEvents.push(entry);
  saveControlPlane(controlPlanePath, state);
  return entry;
}

export function listAuditEvents({
  controlPlanePath = defaultControlPlanePath(),
  limit = 50,
  actorUserId,
  action,
} = {}) {
  const state = loadControlPlane(controlPlanePath);
  const max = Math.max(1, Number(limit || 50));
  let entries = state.auditEvents || [];
  if (actorUserId) {
    entries = entries.filter((item) => item.actorUserId === actorUserId);
  }
  if (action) {
    entries = entries.filter((item) => item.action === action);
  }
  return entries.slice(-max).reverse();
}

export function recordTenantRevenue({
  controlPlanePath = defaultControlPlanePath(),
  tenantSlug,
  ownerUserId,
  grossUsd,
  source = "manual",
  externalId,
} = {}) {
  assertNonEmpty(tenantSlug, "tenantSlug");
  assertNonEmpty(ownerUserId, "ownerUserId");
  const amount = roundUsd(grossUsd);
  if (amount <= 0) {
    throw new Error("grossUsd must be positive");
  }

  const state = loadControlPlane(controlPlanePath);
  const entry = {
    ledgerId: uid("rev"),
    type: "credit",
    createdAt: nowIso(),
    tenantSlug: String(tenantSlug),
    ownerUserId: String(ownerUserId),
    grossUsd: amount,
    source: String(source || "manual"),
    externalId: externalId ? String(externalId) : null,
  };
  state.ledger.push(entry);
  saveControlPlane(controlPlanePath, state);
  return entry;
}

export function requestWithdrawal({
  controlPlanePath = defaultControlPlanePath(),
  tenantSlug,
  ownerUserId,
  amountUsd,
  destination,
} = {}) {
  assertNonEmpty(tenantSlug, "tenantSlug");
  assertNonEmpty(ownerUserId, "ownerUserId");
  assertNonEmpty(destination, "destination");

  const requestedUsd = roundUsd(amountUsd);
  if (requestedUsd <= 0) {
    throw new Error("amountUsd must be positive");
  }

  const state = loadControlPlane(controlPlanePath);
  const balances = computeBalancesFromLedger(state.ledger);
  const balance = balances[tenantSlug] || {
    availableUsd: 0,
    ownerUserId,
    tenantSlug,
    lifetimeGrossUsd: 0,
    lifetimeWithdrawnUsd: 0,
    lifetimeWithdrawalFeesUsd: 0,
  };

  if (balance.ownerUserId && balance.ownerUserId !== ownerUserId) {
    throw new Error("tenant_owner_mismatch");
  }

  if (balance.availableUsd < requestedUsd) {
    throw new Error("insufficient_balance");
  }

  const platformFeeUsd = roundUsd(requestedUsd * WITHDRAWAL_FEE_RATE);
  const netPayoutUsd = roundUsd(requestedUsd - platformFeeUsd);

  const ledgerEntry = {
    ledgerId: uid("wdl"),
    type: "withdrawal",
    createdAt: nowIso(),
    tenantSlug: String(tenantSlug),
    ownerUserId: String(ownerUserId),
    requestedUsd,
    platformFeeUsd,
    netPayoutUsd,
    destination: String(destination),
  };

  const withdrawal = {
    withdrawalId: uid("withdrawal"),
    createdAt: nowIso(),
    status: "completed_simulated",
    tenantSlug: String(tenantSlug),
    ownerUserId: String(ownerUserId),
    destination: String(destination),
    requestedUsd,
    platformFeeUsd,
    netPayoutUsd,
    ledgerId: ledgerEntry.ledgerId,
  };

  state.ledger.push(ledgerEntry);
  state.withdrawals.push(withdrawal);
  saveControlPlane(controlPlanePath, state);

  return withdrawal;
}

export function getTenantBalance({
  controlPlanePath = defaultControlPlanePath(),
  tenantSlug,
} = {}) {
  assertNonEmpty(tenantSlug, "tenantSlug");
  const state = loadControlPlane(controlPlanePath);
  const balances = computeBalancesFromLedger(state.ledger);
  return (
    balances[tenantSlug] || {
      tenantSlug,
      ownerUserId: null,
      availableUsd: 0,
      lifetimeGrossUsd: 0,
      lifetimeWithdrawnUsd: 0,
      lifetimeWithdrawalFeesUsd: 0,
    }
  );
}

export function listWithdrawals({
  controlPlanePath = defaultControlPlanePath(),
  tenantSlug,
  ownerUserId,
} = {}) {
  const state = loadControlPlane(controlPlanePath);
  let rows = state.withdrawals || [];

  if (tenantSlug) {
    rows = rows.filter((item) => item.tenantSlug === tenantSlug);
  }

  if (ownerUserId) {
    rows = rows.filter((item) => item.ownerUserId === ownerUserId);
  }

  return rows.slice().reverse();
}

