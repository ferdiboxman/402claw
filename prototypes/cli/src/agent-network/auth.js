import { ethers } from 'ethers';
import crypto from 'node:crypto';

// ERC-8128 style wallet-based request authentication

function createContentDigest(body) {
  const hash = crypto.createHash('sha256').update(body).digest('base64');
  return `sha-256=:${hash}:`;
}

function buildSignatureBase(method, url, body, nonce) {
  const parsedUrl = new URL(url);
  return [
    `@method: ${method}`,
    `@path: ${parsedUrl.pathname}`,
    `@query: ${parsedUrl.search}`,
    `content-digest: ${createContentDigest(body)}`,
    `nonce: ${nonce}`,
  ].join('\n');
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

export function parseSignatureHeader(header) {
  const sigMatch = header.match(/sig=:([^:]+):/);
  const keyidMatch = header.match(/keyid="([^"]+)"/);
  const nonceMatch = header.match(/nonce="([^"]+)"/);
  return {
    signature: sigMatch?.[1],
    keyId: keyidMatch?.[1],
    nonce: nonceMatch?.[1],
  };
}

// Sign an outbound request with the agent's wallet
export async function signRequest(method, url, body, wallet) {
  const nonce = generateNonce();
  const signatureBase = buildSignatureBase(method, url, body, nonce);
  const signature = await wallet.signMessage(signatureBase);
  const signatureHeader = `sig=:${signature}:; keyid="${wallet.address}"; nonce="${nonce}"`;

  return { signature, nonce, signatureHeader, signerAddress: wallet.address };
}

// Create a fetch wrapper that auto-signs requests
export function createSignedFetch(wallet) {
  return async function signedFetch(url, init = {}) {
    const method = (init.method || 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? init.body : '';
    const { signatureHeader } = await signRequest(method, url, body, wallet);

    const headers = new Headers(init.headers);
    headers.set('Signature', signatureHeader);

    return fetch(url, { ...init, headers });
  };
}

// Verify an inbound signed request
export function verifySignature({ method, url, body, signatureHeader }) {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing Signature header' };
  }

  const { signature, keyId, nonce } = parseSignatureHeader(signatureHeader);
  if (!signature || !keyId || !nonce) {
    return { valid: false, error: 'Malformed Signature header' };
  }

  try {
    const signatureBase = buildSignatureBase(method, url, body || '', nonce);
    const recoveredAddress = ethers.verifyMessage(signatureBase, signature);

    if (recoveredAddress.toLowerCase() === keyId.toLowerCase()) {
      return { valid: true, address: recoveredAddress };
    }

    return { valid: false, error: 'Signature mismatch' };
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error}` };
  }
}

// Express-compatible middleware
export function authMiddleware(options = {}) {
  const { protectedRoutes } = options;

  return async (req, res, next) => {
    if (protectedRoutes) {
      const routeKey = `${req.method} ${req.path}`;
      if (!protectedRoutes.includes(routeKey) && !protectedRoutes.includes(req.path)) {
        return next();
      }
    }

    const result = verifySignature({
      method: req.method,
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || ''),
      signatureHeader: req.headers['signature'],
    });

    if (!result.valid) {
      return res.status(401).json({ error: 'Authentication failed', detail: result.error });
    }

    req.signerAddress = result.address;
    next();
  };
}
