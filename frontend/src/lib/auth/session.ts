const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_ISSUER = "clawr.ai";
const SESSION_AUDIENCE = "clawr_dashboard";
const INSECURE_DEV_SECRET = "clawr_dev_only_change_me";

export const SESSION_COOKIE_NAME = "clawr_session";

type JwtHeader = {
  alg: "HS256";
  typ: "JWT";
};

export type SessionClaims = {
  iss: string;
  aud: string;
  sub: string;
  walletAddress: string;
  iat: number;
  exp: number;
};

const textEncoder = new TextEncoder();

function sessionSecret(): string {
  return process.env.CLAWR_SESSION_SECRET || INSECURE_DEV_SECRET;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function encodeJsonBase64Url(value: object): string {
  return bytesToBase64Url(textEncoder.encode(JSON.stringify(value)));
}

function decodeJsonBase64Url<T>(input: string): T | null {
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(input));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacSign(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(input));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken({
  walletAddress,
  subject,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
}: {
  walletAddress: string;
  subject?: string;
  ttlSeconds?: number;
}): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header: JwtHeader = {
    alg: "HS256",
    typ: "JWT",
  };
  const payload: SessionClaims = {
    iss: SESSION_ISSUER,
    aud: SESSION_AUDIENCE,
    sub: (subject || walletAddress).toLowerCase(),
    walletAddress,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };

  const encodedHeader = encodeJsonBase64Url(header);
  const encodedPayload = encodeJsonBase64Url(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSign(signingInput);
  return `${signingInput}.${signature}`;
}

function isSessionClaims(value: unknown): value is SessionClaims {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<SessionClaims>;
  return (
    typeof source.iss === "string"
    && typeof source.aud === "string"
    && typeof source.sub === "string"
    && typeof source.walletAddress === "string"
    && typeof source.iat === "number"
    && typeof source.exp === "number"
  );
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const parsedHeader = decodeJsonBase64Url<JwtHeader>(encodedHeader);
  if (!parsedHeader || parsedHeader.alg !== "HS256" || parsedHeader.typ !== "JWT") {
    return null;
  }

  const parsedPayload = decodeJsonBase64Url<SessionClaims>(encodedPayload);
  if (!isSessionClaims(parsedPayload)) {
    return null;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = await hmacSign(signingInput);
  if (!safeEquals(expectedSignature, signature)) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsedPayload.exp <= nowSeconds) {
    return null;
  }
  if (parsedPayload.iss !== SESSION_ISSUER || parsedPayload.aud !== SESSION_AUDIENCE) {
    return null;
  }

  return parsedPayload;
}
