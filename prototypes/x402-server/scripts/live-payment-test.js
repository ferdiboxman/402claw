/**
 * Optional live payment test against local x402 prototype server.
 *
 * Behavior:
 * - If WALLET_PRIVATE_KEY/EVM_PRIVATE_KEY is missing: SKIP (exit 0)
 * - Otherwise:
 *   1) start local server in test mode
 *   2) call protected endpoint using @x402/fetch
 *   3) require HTTP 200 + PAYMENT-RESPONSE header
 */

const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { privateKeyToAccount } = require('viem/accounts');
const { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } = require('@x402/fetch');
const { ExactEvmScheme } = require('@x402/evm');

const PORT = Number(process.env.LIVE_TEST_PORT || 4024);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for server health at ${url}/health`);
}

async function main() {
  if (!PRIVATE_KEY) {
    console.log('SKIP: WALLET_PRIVATE_KEY/EVM_PRIVATE_KEY not set; live payment test not run.');
    process.exit(0);
  }

  const server = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      X402_ENV: 'test',
      PORT: String(PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForHealth(BASE_URL);

    const account = privateKeyToAccount(PRIVATE_KEY);
    const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [
        {
          network: 'eip155:*',
          client: new ExactEvmScheme(account),
        },
      ],
    });

    const response = await paidFetch(`${BASE_URL}/data`);
    assert.equal(response.status, 200, 'paid request should return 200');

    const paymentResponse =
      response.headers.get('PAYMENT-RESPONSE') || response.headers.get('payment-response');
    assert.ok(paymentResponse, 'expected PAYMENT-RESPONSE header');

    const decoded = decodePaymentResponseHeader(paymentResponse);
    assert.ok(decoded, 'expected decodable payment response');

    console.log('Live payment test passed.');
    console.log(JSON.stringify(decoded, null, 2));
  } finally {
    server.kill('SIGTERM');
    await sleep(300);
    if (!server.killed) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(`Live payment test failed: ${error.message || error}`);
  process.exit(1);
});

