const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveRuntimeEnv,
  resolveNetwork,
  resolveFacilitatorUrl,
  assertFacilitatorPolicy,
  loadConfig,
} = require('../config');

test('resolveRuntimeEnv normalizes aliases', () => {
  assert.equal(resolveRuntimeEnv('test'), 'test');
  assert.equal(resolveRuntimeEnv('dev'), 'test');
  assert.equal(resolveRuntimeEnv('production'), 'prod');
  assert.equal(resolveRuntimeEnv('prod'), 'prod');
});

test('resolveRuntimeEnv rejects unsupported env', () => {
  assert.throws(() => resolveRuntimeEnv('staging'), /Invalid X402_ENV/);
});

test('resolveNetwork returns env defaults', () => {
  assert.equal(resolveNetwork({ runtimeEnv: 'test' }), 'eip155:84532');
  assert.equal(resolveNetwork({ runtimeEnv: 'prod' }), 'eip155:8453');
});

test('resolveFacilitatorUrl returns env defaults', () => {
  assert.equal(
    resolveFacilitatorUrl({ runtimeEnv: 'test' }),
    'https://x402.org/facilitator',
  );
  assert.equal(
    resolveFacilitatorUrl({ runtimeEnv: 'prod' }),
    'https://api.cdp.coinbase.com/platform/v2/x402',
  );
});

test('assertFacilitatorPolicy rejects prod test facilitator', () => {
  assert.throws(
    () =>
      assertFacilitatorPolicy({
        runtimeEnv: 'prod',
        facilitatorUrl: 'https://x402.org/facilitator',
      }),
    /Prod mode cannot use x402.org\/facilitator/,
  );
});

test('CDP prod config requires facilitator api key', () => {
  const prev = {
    X402_ENV: process.env.X402_ENV,
    FACILITATOR_URL: process.env.FACILITATOR_URL,
    FACILITATOR_API_KEY: process.env.FACILITATOR_API_KEY,
  };

  process.env.X402_ENV = 'prod';
  process.env.FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';
  process.env.FACILITATOR_API_KEY = '';

  try {
    assert.throws(() => loadConfig(), /requires FACILITATOR_API_KEY/);
  } finally {
    if (prev.X402_ENV === undefined) delete process.env.X402_ENV;
    else process.env.X402_ENV = prev.X402_ENV;

    if (prev.FACILITATOR_URL === undefined) delete process.env.FACILITATOR_URL;
    else process.env.FACILITATOR_URL = prev.FACILITATOR_URL;

    if (prev.FACILITATOR_API_KEY === undefined) delete process.env.FACILITATOR_API_KEY;
    else process.env.FACILITATOR_API_KEY = prev.FACILITATOR_API_KEY;
  }
});
