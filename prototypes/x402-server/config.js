/**
 * Runtime configuration helpers for x402 prototype.
 *
 * Enforces clear test/prod behavior:
 * - test: Base Sepolia + x402.org facilitator
 * - prod: Base mainnet + CDP facilitator
 */

const TEST_FACILITATOR_URL = 'https://x402.org/facilitator';
const PROD_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';

const NETWORK_BASE_SEPOLIA = 'eip155:84532';
const NETWORK_BASE_MAINNET = 'eip155:8453';

function resolveRuntimeEnv(rawEnv) {
  const value = String(rawEnv || process.env.X402_ENV || 'test').trim().toLowerCase();

  if (value === 'test' || value === 'dev' || value === 'development') {
    return 'test';
  }

  if (value === 'prod' || value === 'production') {
    return 'prod';
  }

  throw new Error(`Invalid X402_ENV value: ${rawEnv}`);
}

function resolveNetwork({ runtimeEnv, explicitNetwork }) {
  if (explicitNetwork) return explicitNetwork;
  return runtimeEnv === 'prod' ? NETWORK_BASE_MAINNET : NETWORK_BASE_SEPOLIA;
}

function resolveFacilitatorUrl({ runtimeEnv, explicitFacilitatorUrl }) {
  if (explicitFacilitatorUrl) return explicitFacilitatorUrl;
  return runtimeEnv === 'prod' ? PROD_FACILITATOR_URL : TEST_FACILITATOR_URL;
}

function assertFacilitatorPolicy({ runtimeEnv, facilitatorUrl }) {
  if (!facilitatorUrl) {
    throw new Error('FACILITATOR_URL is required');
  }

  const normalized = facilitatorUrl.trim().toLowerCase();
  if (runtimeEnv === 'prod' && normalized.includes('x402.org/facilitator')) {
    throw new Error(
      'Prod mode cannot use x402.org/facilitator (test/demo). Use CDP or another production facilitator.',
    );
  }
}

function loadConfig() {
  const runtimeEnv = resolveRuntimeEnv();
  const facilitatorApiKey = process.env.FACILITATOR_API_KEY || '';
  const facilitatorUrl = resolveFacilitatorUrl({
    runtimeEnv,
    explicitFacilitatorUrl: process.env.FACILITATOR_URL,
  });
  const network = resolveNetwork({
    runtimeEnv,
    explicitNetwork: process.env.NETWORK,
  });

  assertFacilitatorPolicy({ runtimeEnv, facilitatorUrl });

  if (
    runtimeEnv === 'prod' &&
    facilitatorUrl.includes('api.cdp.coinbase.com') &&
    !facilitatorApiKey
  ) {
    throw new Error(
      'Prod mode with CDP facilitator requires FACILITATOR_API_KEY (Bearer token for /verify,/settle,/supported).',
    );
  }

  return {
    runtimeEnv,
    facilitatorUrl,
    facilitatorApiKey,
    network,
    payTo: process.env.PAY_TO || '0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F',
    port: Number(process.env.PORT || 4021),
  };
}

module.exports = {
  TEST_FACILITATOR_URL,
  PROD_FACILITATOR_URL,
  NETWORK_BASE_SEPOLIA,
  NETWORK_BASE_MAINNET,
  resolveRuntimeEnv,
  resolveNetwork,
  resolveFacilitatorUrl,
  assertFacilitatorPolicy,
  loadConfig,
};
