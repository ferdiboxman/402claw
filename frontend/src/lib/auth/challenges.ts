import { getAddress } from "ethers";

const CHALLENGE_TTL_SECONDS = 5 * 60;

export type WalletChallenge = {
  challengeId: string;
  walletAddress: string;
  nonce: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
};

const activeChallenges = new Map<string, WalletChallenge>();

function randomHex(bytes = 16): string {
  const out = new Uint8Array(bytes);
  crypto.getRandomValues(out);
  return Array.from(out, (value) => value.toString(16).padStart(2, "0")).join("");
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeWalletAddress(walletAddress: string): string {
  const value = String(walletAddress || "").trim();
  if (!value) {
    throw new Error("wallet_address_required");
  }

  try {
    return getAddress(value);
  } catch {
    throw new Error("wallet_address_invalid");
  }
}

function pruneExpiredChallenges(now = Date.now()): void {
  for (const [challengeId, challenge] of activeChallenges.entries()) {
    if (challenge.usedAt) {
      activeChallenges.delete(challengeId);
      continue;
    }

    const expiresAtMs = Date.parse(challenge.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
      activeChallenges.delete(challengeId);
    }
  }
}

function buildChallengeMessage({
  challengeId,
  walletAddress,
  nonce,
  issuedAt,
  expiresAt,
  origin,
}: {
  challengeId: string;
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  origin: string;
}): string {
  return [
    "Sign in to clawr.ai",
    "",
    "This request will not trigger a blockchain transaction.",
    `Wallet: ${walletAddress}`,
    `Challenge: ${challengeId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`,
    `Origin: ${origin}`,
  ].join("\n");
}

export function createWalletChallenge({
  walletAddress,
  origin,
}: {
  walletAddress: string;
  origin: string;
}): WalletChallenge {
  pruneExpiredChallenges();

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const now = Date.now();
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + (CHALLENGE_TTL_SECONDS * 1000)).toISOString();
  const challengeId = `chl_${randomHex(10)}`;
  const nonce = randomHex(12);
  const message = buildChallengeMessage({
    challengeId,
    walletAddress: normalizedWallet,
    nonce,
    issuedAt,
    expiresAt,
    origin,
  });

  const challenge: WalletChallenge = {
    challengeId,
    walletAddress: normalizedWallet,
    nonce,
    message,
    issuedAt,
    expiresAt,
    usedAt: null,
  };

  activeChallenges.set(challengeId, challenge);
  return challenge;
}

export function getWalletChallenge({
  challengeId,
  walletAddress,
}: {
  challengeId: string;
  walletAddress: string;
}): WalletChallenge {
  pruneExpiredChallenges();

  const challenge = activeChallenges.get(String(challengeId || "").trim());
  if (!challenge) {
    throw new Error("wallet_challenge_not_found");
  }
  if (challenge.usedAt) {
    throw new Error("wallet_challenge_used");
  }

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (challenge.walletAddress !== normalizedWallet) {
    throw new Error("wallet_challenge_wallet_mismatch");
  }

  const expiresAtMs = Date.parse(challenge.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    activeChallenges.delete(challenge.challengeId);
    throw new Error("wallet_challenge_expired");
  }

  return challenge;
}

export function markWalletChallengeUsed(challengeId: string): void {
  const challenge = activeChallenges.get(String(challengeId || "").trim());
  if (!challenge) return;
  challenge.usedAt = nowIso();
}
