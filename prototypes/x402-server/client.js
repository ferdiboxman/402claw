/**
 * x402 Client CLI
 *
 * Supports both:
 * - challenge inspection (unpaid 402 flow)
 * - real paid requests via @x402/fetch
 *
 * Usage:
 *   node client.js health
 *   node client.js pricing
 *   node client.js challenge /data
 *   WALLET_PRIVATE_KEY=0x... node client.js pay /data
 */

const { privateKeyToAccount } = require('viem/accounts');
const { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } = require('@x402/fetch');
const { ExactEvmScheme } = require('@x402/evm');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4021';

function parseArgs() {
  const command = process.argv[2] || 'health';
  const endpoint = process.argv[3] || '/data';
  return { command, endpoint };
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function printResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  const json = safeJsonParse(text);

  console.log(`status: ${response.status} ${response.statusText}`);
  if (json) {
    console.log(JSON.stringify(json, null, 2));
  } else if (contentType.includes('text/csv')) {
    console.log(text.slice(0, 500));
  } else {
    console.log(text);
  }
}

async function runHealth() {
  const response = await fetch(`${SERVER_URL}/health`);
  await printResponse(response);
}

async function runPricing() {
  const response = await fetch(`${SERVER_URL}/pricing`);
  await printResponse(response);
}

async function runChallenge(endpoint) {
  const url = `${SERVER_URL}${endpoint}`;
  const response = await fetch(url);
  console.log(`request: GET ${url}`);
  console.log(`status: ${response.status} ${response.statusText}`);

  const paymentRequiredHeader =
    response.headers.get('PAYMENT-REQUIRED') || response.headers.get('payment-required');

  if (paymentRequiredHeader) {
    const decoded = safeJsonParse(Buffer.from(paymentRequiredHeader, 'base64').toString('utf8'));
    console.log('payment-required header found: yes');
    if (decoded) {
      console.log(JSON.stringify(decoded, null, 2));
    } else {
      console.log('payment-required header present but could not parse as base64 JSON');
    }
  } else {
    console.log('payment-required header found: no');
  }

  const body = await response.text();
  const jsonBody = safeJsonParse(body);
  if (jsonBody) {
    console.log(JSON.stringify(jsonBody, null, 2));
  } else if (body) {
    console.log(body);
  }
}

function assertWalletPrivateKey() {
  const key = process.env.WALLET_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      'Missing WALLET_PRIVATE_KEY (or EVM_PRIVATE_KEY). Required for paid x402 requests.',
    );
  }
  return key;
}

function createPaidFetch() {
  const privateKey = assertWalletPrivateKey();
  const account = privateKeyToAccount(privateKey);

  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: 'eip155:*',
        client: new ExactEvmScheme(account),
      },
    ],
  });
}

async function runPay(endpoint) {
  const paidFetch = createPaidFetch();
  const url = `${SERVER_URL}${endpoint}`;
  console.log(`request: GET ${url}`);

  const response = await paidFetch(url, { method: 'GET' });
  await printResponse(response);

  const paymentResponseHeader =
    response.headers.get('PAYMENT-RESPONSE') || response.headers.get('payment-response');

  if (!paymentResponseHeader) {
    console.log('payment-response header: none');
    return;
  }

  try {
    const receipt = decodePaymentResponseHeader(paymentResponseHeader);
    console.log('payment-response decoded:');
    console.log(JSON.stringify(receipt, null, 2));
  } catch {
    console.log('payment-response header present but decode failed');
  }
}

async function main() {
  const { command, endpoint } = parseArgs();

  if (command === 'health') {
    await runHealth();
    return;
  }

  if (command === 'pricing') {
    await runPricing();
    return;
  }

  if (command === 'challenge') {
    await runChallenge(endpoint);
    return;
  }

  if (command === 'pay') {
    await runPay(endpoint);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

