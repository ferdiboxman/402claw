import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getAddress, verifyMessage } from "ethers";

const WITHDRAWAL_FEE_RATE = 0.05;
const DEFAULT_WALLET_CHALLENGE_TTL_MINUTES = 15;

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

function randomHex(bytes = 6) {
  return crypto.randomBytes(bytes).toString("hex");
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

function walletNonce(size = 12) {
  return crypto.randomBytes(size).toString("hex");
}

function normalizeWalletAddress(input) {
  const value = String(input || "").trim();
  if (!value) {
    throw new Error("walletAddress is required");
  }

  try {
    return getAddress(value);
  } catch {
    throw new Error("walletAddress must be a valid EVM address");
  }
}

function parseTtlMinutes(value) {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_WALLET_CHALLENGE_TTL_MINUTES;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("ttlMinutes must be a positive number");
  }
  return Math.floor(parsed);
}

function buildWalletLinkMessage({
  userId,
  walletAddress,
  challengeId,
  nonce,
  issuedAt,
  expiresAt,
} = {}) {
  return [
    "402claw Wallet Verification",
    `User: ${userId}`,
    `Wallet: ${walletAddress}`,
    `Challenge: ${challengeId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`,
    "Purpose: Link wallet for creator withdrawals.",
  ].join("\n");
}

function nowMs() {
  return Date.now();
}

function pruneWalletChallenges(state, now = nowMs()) {
  state.walletChallenges = (state.walletChallenges || []).filter((challenge) => {
    if (!challenge || typeof challenge !== "object") return false;
    if (challenge.usedAt) return false;
    const expiresAt = Date.parse(String(challenge.expiresAt || ""));
    if (!Number.isFinite(expiresAt)) return false;
    return expiresAt > now;
  });
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

export function loadControlPlane(controlPlanePath, options = {}) {
  const storage = options?.storage;
  if (storage && typeof storage.loadControlPlane === "function") {
    return storage.loadControlPlane({ controlPlanePath });
  }

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
      walletChallenges: [],
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
    walletChallenges: Array.isArray(parsed.walletChallenges) ? parsed.walletChallenges : [],
  };
}

export function saveControlPlane(controlPlanePath, state, options = {}) {
  const storage = options?.storage;
  if (storage && typeof storage.saveControlPlane === "function") {
    return storage.saveControlPlane({ controlPlanePath, state });
  }

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
    walletChallenges: Array.isArray(state.walletChallenges) ? state.walletChallenges : [],
  };

  fs.writeFileSync(absolute, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function ensureUser({
  controlPlanePath = defaultControlPlanePath(),
  userId,
  displayName,
  storage,
} = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const state = loadControlPlane(controlPlanePath, { storage });
  let user = state.users.find((item) => item.userId === normalizedUserId);

  if (!user) {
    user = {
      userId: normalizedUserId,
      displayName: String(displayName || normalizedUserId),
      walletAddress: null,
      walletVerifiedAt: null,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.users.push(user);
    saveControlPlane(controlPlanePath, state, { storage });
  } else if (displayName && user.displayName !== displayName) {
    user.displayName = String(displayName);
    user.updatedAt = nowIso();
    saveControlPlane(controlPlanePath, state, { storage });
  }

  return user;
}

export function createApiKeyForUser({
  controlPlanePath = defaultControlPlanePath(),
  userId,
  displayName,
  scopes = ["*"],
  storage,
} = {}) {
  const user = ensureUser({ controlPlanePath, userId, displayName, storage });
  const state = loadControlPlane(controlPlanePath, { storage });

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
  saveControlPlane(controlPlanePath, state, { storage });

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
  storage,
} = {}) {
  assertNonEmpty(keyId, "keyId");
  const state = loadControlPlane(controlPlanePath, { storage });
  const key = state.apiKeys.find((item) => item.keyId === keyId);
  if (!key) {
    throw new Error(`api key not found: ${keyId}`);
  }
  if (!key.revokedAt) {
    key.revokedAt = nowIso();
    saveControlPlane(controlPlanePath, state, { storage });
  }
  return {
    keyId: key.keyId,
    userId: key.userId,
    revokedAt: key.revokedAt,
  };
}

export function rotateApiKey({
  controlPlanePath = defaultControlPlanePath(),
  keyId,
  scopes,
  storage,
} = {}) {
  assertNonEmpty(keyId, "keyId");
  const state = loadControlPlane(controlPlanePath, { storage });
  const existing = state.apiKeys.find((item) => item.keyId === keyId);
  if (!existing) {
    throw new Error(`api key not found: ${keyId}`);
  }
  if (existing.revokedAt) {
    throw new Error(`api key already revoked: ${keyId}`);
  }

  const apiKey = `claw_${crypto.randomBytes(18).toString("base64url")}`;
  const now = nowIso();
  const nextRecord = {
    keyId: uid("key"),
    userId: existing.userId,
    keyHash: hashApiKey(apiKey),
    keyHint: redactApiKey(apiKey),
    scopes: normalizeScopeList(
      scopes === undefined || scopes === null
        ? existing.scopes
        : scopes,
    ),
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  };

  existing.revokedAt = now;
  state.apiKeys.push(nextRecord);
  saveControlPlane(controlPlanePath, state, { storage });

  return {
    previous: {
      keyId: existing.keyId,
      userId: existing.userId,
      revokedAt: existing.revokedAt,
    },
    replacement: {
      apiKey,
      keyRecord: {
        keyId: nextRecord.keyId,
        userId: nextRecord.userId,
        keyHint: nextRecord.keyHint,
        scopes: nextRecord.scopes,
        createdAt: nextRecord.createdAt,
      },
    },
  };
}

function activeApiKeys(state) {
  return (state.apiKeys || []).filter((key) => !key.revokedAt);
}

export function isAuthConfigured(controlPlanePath = defaultControlPlanePath(), options = {}) {
  const state = loadControlPlane(controlPlanePath, options);
  return activeApiKeys(state).length > 0;
}

export function authenticateApiKey({
  controlPlanePath = defaultControlPlanePath(),
  apiKey,
  requiredScope = null,
  storage,
} = {}) {
  assertNonEmpty(apiKey, "apiKey");
  const state = loadControlPlane(controlPlanePath, { storage });
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
  saveControlPlane(controlPlanePath, state, { storage });

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

export function listUsers(controlPlanePath = defaultControlPlanePath(), options = {}) {
  const state = loadControlPlane(controlPlanePath, options);
  return state.users;
}

export function listApiKeys(controlPlanePath = defaultControlPlanePath(), options = {}) {
  const state = loadControlPlane(controlPlanePath, options);
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

export function createWalletVerificationChallenge({
  controlPlanePath = defaultControlPlanePath(),
  userId,
  walletAddress,
  ttlMinutes = DEFAULT_WALLET_CHALLENGE_TTL_MINUTES,
  storage,
} = {}) {
  const user = ensureUser({ controlPlanePath, userId, storage });
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const ttl = parseTtlMinutes(ttlMinutes);
  const state = loadControlPlane(controlPlanePath, { storage });
  const now = nowMs();

  pruneWalletChallenges(state, now);

  const challengeId = uid("wallet_challenge");
  const nonce = walletNonce(12);
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + (ttl * 60 * 1000)).toISOString();
  const message = buildWalletLinkMessage({
    userId: user.userId,
    walletAddress: normalizedWallet,
    challengeId,
    nonce,
    issuedAt,
    expiresAt,
  });

  const challenge = {
    challengeId,
    userId: user.userId,
    walletAddress: normalizedWallet,
    nonce,
    message,
    issuedAt,
    expiresAt,
    usedAt: null,
  };

  state.walletChallenges.push(challenge);
  saveControlPlane(controlPlanePath, state, { storage });

  return challenge;
}

export function verifyWalletVerificationChallenge({
  controlPlanePath = defaultControlPlanePath(),
  userId,
  walletAddress,
  challengeId,
  signature,
  storage,
} = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  assertNonEmpty(challengeId, "challengeId");
  assertNonEmpty(signature, "signature");

  const state = loadControlPlane(controlPlanePath, { storage });
  const now = nowMs();
  pruneWalletChallenges(state, now);

  const challenge = state.walletChallenges.find((item) => {
    if (!item || typeof item !== "object") return false;
    return (
      item.challengeId === String(challengeId)
      && item.userId === normalizedUserId
      && item.walletAddress === normalizedWallet
      && !item.usedAt
    );
  });

  if (!challenge) {
    throw new Error("wallet_challenge_not_found");
  }

  const expiresAtMs = Date.parse(challenge.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
    throw new Error("wallet_challenge_expired");
  }

  let recoveredAddress = "";
  try {
    recoveredAddress = getAddress(verifyMessage(challenge.message, String(signature)));
  } catch {
    throw new Error("wallet_signature_invalid");
  }

  if (recoveredAddress !== normalizedWallet) {
    throw new Error("wallet_signature_mismatch");
  }

  const user = state.users.find((item) => item.userId === normalizedUserId);
  if (!user) {
    throw new Error("wallet_user_not_found");
  }

  const linkedAt = nowIso();
  user.walletAddress = normalizedWallet;
  user.walletVerifiedAt = linkedAt;
  user.updatedAt = linkedAt;

  challenge.usedAt = linkedAt;
  saveControlPlane(controlPlanePath, state, { storage });

  return {
    userId: user.userId,
    walletAddress: normalizedWallet,
    walletVerifiedAt: linkedAt,
    challengeId: challenge.challengeId,
  };
}

export function appendAuditEvent({
  controlPlanePath = defaultControlPlanePath(),
  actorUserId = "system",
  action,
  targetType,
  targetId,
  ok = true,
  metadata = {},
  storage,
} = {}) {
  assertNonEmpty(action, "action");
  const state = loadControlPlane(controlPlanePath, { storage });
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
  saveControlPlane(controlPlanePath, state, { storage });
  return entry;
}

export function listAuditEvents({
  controlPlanePath = defaultControlPlanePath(),
  limit = 50,
  actorUserId,
  action,
  storage,
} = {}) {
  const state = loadControlPlane(controlPlanePath, { storage });
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
  storage,
} = {}) {
  assertNonEmpty(tenantSlug, "tenantSlug");
  assertNonEmpty(ownerUserId, "ownerUserId");
  const amount = roundUsd(grossUsd);
  if (amount <= 0) {
    throw new Error("grossUsd must be positive");
  }

  const state = loadControlPlane(controlPlanePath, { storage });
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
  saveControlPlane(controlPlanePath, state, { storage });
  return entry;
}

function pendingWithdrawalReservedUsd(withdrawals, tenantSlug) {
  let total = 0;
  for (const withdrawal of withdrawals || []) {
    if (!withdrawal || withdrawal.tenantSlug !== tenantSlug) continue;
    if (withdrawal.status !== "pending") continue;
    total += roundUsd(withdrawal.requestedUsd);
  }
  return roundUsd(total);
}

export function requestWithdrawal({
  controlPlanePath = defaultControlPlanePath(),
  tenantSlug,
  ownerUserId,
  amountUsd,
  destination,
  storage,
} = {}) {
  assertNonEmpty(tenantSlug, "tenantSlug");
  assertNonEmpty(ownerUserId, "ownerUserId");
  assertNonEmpty(destination, "destination");

  const requestedUsd = roundUsd(amountUsd);
  if (requestedUsd <= 0) {
    throw new Error("amountUsd must be positive");
  }

  const state = loadControlPlane(controlPlanePath, { storage });
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

  const pendingReservedUsd = pendingWithdrawalReservedUsd(state.withdrawals, tenantSlug);
  const spendableUsd = roundUsd(balance.availableUsd - pendingReservedUsd);

  if (spendableUsd < requestedUsd) {
    throw new Error("insufficient_balance");
  }

  const platformFeeUsd = roundUsd(requestedUsd * WITHDRAWAL_FEE_RATE);
  const netPayoutUsd = roundUsd(requestedUsd - platformFeeUsd);

  const withdrawal = {
    withdrawalId: uid("withdrawal"),
    createdAt: nowIso(),
    status: "pending",
    tenantSlug: String(tenantSlug),
    ownerUserId: String(ownerUserId),
    destination: String(destination),
    requestedUsd,
    platformFeeUsd,
    netPayoutUsd,
    ledgerId: null,
    processedAt: null,
    payoutReference: null,
  };

  state.withdrawals.push(withdrawal);
  saveControlPlane(controlPlanePath, state, { storage });

  return withdrawal;
}

export function processPendingWithdrawals({
  controlPlanePath = defaultControlPlanePath(),
  limit = 100,
  payoutReferencePrefix = "sim_payout",
  dryRun = false,
  storage,
} = {}) {
  const state = loadControlPlane(controlPlanePath, { storage });
  const max = Math.max(1, Math.floor(Number(limit || 100)));
  const pending = (state.withdrawals || [])
    .filter((item) => item?.status === "pending")
    .slice(0, max);

  const balances = computeBalancesFromLedger(state.ledger);
  const summary = {
    totalPending: pending.length,
    processed: 0,
    completed: 0,
    failedInsufficientBalance: 0,
    dryRun: Boolean(dryRun),
    withdrawals: [],
  };

  for (const withdrawal of pending) {
    const tenantSlug = String(withdrawal.tenantSlug);
    const current = balances[tenantSlug] || {
      tenantSlug,
      ownerUserId: withdrawal.ownerUserId,
      availableUsd: 0,
      lifetimeGrossUsd: 0,
      lifetimeWithdrawnUsd: 0,
      lifetimeWithdrawalFeesUsd: 0,
    };
    const requestedUsd = roundUsd(withdrawal.requestedUsd);

    summary.processed += 1;

    if (current.availableUsd < requestedUsd) {
      summary.failedInsufficientBalance += 1;
      summary.withdrawals.push({
        withdrawalId: withdrawal.withdrawalId,
        tenantSlug,
        status: "failed_insufficient_balance",
        requestedUsd,
        availableUsd: current.availableUsd,
      });
      continue;
    }

    const processedAt = nowIso();
    const ledgerId = uid("wdl");
    const payoutReference = `${String(payoutReferencePrefix || "sim_payout").trim() || "sim_payout"}_${randomHex(6)}`;
    const ledgerEntry = {
      ledgerId,
      type: "withdrawal",
      createdAt: processedAt,
      tenantSlug,
      ownerUserId: withdrawal.ownerUserId,
      requestedUsd,
      platformFeeUsd: roundUsd(withdrawal.platformFeeUsd),
      netPayoutUsd: roundUsd(withdrawal.netPayoutUsd),
      destination: String(withdrawal.destination),
      withdrawalId: withdrawal.withdrawalId,
      payoutReference,
    };

    if (!dryRun) {
      state.ledger.push(ledgerEntry);
      withdrawal.status = "completed_simulated";
      withdrawal.ledgerId = ledgerId;
      withdrawal.processedAt = processedAt;
      withdrawal.payoutReference = payoutReference;
    }

    current.availableUsd = roundUsd(current.availableUsd - requestedUsd);
    balances[tenantSlug] = current;

    summary.completed += 1;
    summary.withdrawals.push({
      withdrawalId: withdrawal.withdrawalId,
      tenantSlug,
      status: dryRun ? "would_complete_simulated" : "completed_simulated",
      requestedUsd,
      ledgerId,
      payoutReference,
      processedAt,
    });
  }

  if (!dryRun) {
    saveControlPlane(controlPlanePath, state, { storage });
  }

  return summary;
}

export function getTenantBalance({
  controlPlanePath = defaultControlPlanePath(),
  tenantSlug,
  storage,
} = {}) {
  assertNonEmpty(tenantSlug, "tenantSlug");
  const state = loadControlPlane(controlPlanePath, { storage });
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
  storage,
} = {}) {
  const state = loadControlPlane(controlPlanePath, { storage });
  let rows = state.withdrawals || [];

  if (tenantSlug) {
    rows = rows.filter((item) => item.tenantSlug === tenantSlug);
  }

  if (ownerUserId) {
    rows = rows.filter((item) => item.ownerUserId === ownerUserId);
  }

  return rows.slice().reverse();
}
