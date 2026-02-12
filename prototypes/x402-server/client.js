/**
 * x402 Client Example
 * 
 * Demonstrates how to pay for x402-protected endpoints.
 * 
 * Prerequisites:
 * - A wallet with testnet USDC on Base Sepolia
 * - Wallet private key (NEVER commit this!)
 * 
 * Usage:
 *   WALLET_PRIVATE_KEY=0x... node client.js
 */

const { createWalletClient, http, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia, base } = require('viem/chains');

// Note: In a real implementation, you'd use @x402/fetch
// For this prototype, we'll show the manual flow

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4021';

/**
 * Main client demonstration
 */
async function main() {
  console.log('=== x402 Client Example ===\n');
  
  // Step 1: Try to access a free endpoint
  console.log('Step 1: Accessing free endpoint...');
  const healthResponse = await fetch(`${SERVER_URL}/health`);
  const healthData = await healthResponse.json();
  console.log('✅ Free endpoint success:');
  console.log(JSON.stringify(healthData, null, 2));
  console.log('');
  
  // Step 2: Try to access a paid endpoint without payment
  console.log('Step 2: Accessing paid endpoint WITHOUT payment...');
  const unpaidResponse = await fetch(`${SERVER_URL}/data`);
  console.log(`Status: ${unpaidResponse.status} ${unpaidResponse.statusText}`);
  
  if (unpaidResponse.status === 402) {
    console.log('✅ Received expected 402 Payment Required');
    
    // Inspect the headers
    console.log('\nResponse Headers:');
    unpaidResponse.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    });
    
    // Look for payment requirements
    const paymentRequired = unpaidResponse.headers.get('payment-required');
    if (paymentRequired) {
      console.log('\n📋 Payment Requirements (parsed):');
      try {
        const requirements = JSON.parse(paymentRequired);
        console.log(JSON.stringify(requirements, null, 2));
      } catch (e) {
        console.log('  (Could not parse as JSON)');
        console.log(`  Raw: ${paymentRequired}`);
      }
    }
    
    // Check response body
    const body = await unpaidResponse.text();
    console.log('\nResponse Body:');
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log(body);
    }
  } else {
    console.log('❌ Unexpected response (expected 402)');
    console.log(await unpaidResponse.text());
  }
  
  console.log('');
  
  // Step 3: Show how payment would work (conceptual)
  console.log('Step 3: How to make a paid request...\n');
  console.log('To successfully pay for the endpoint, you would need to:');
  console.log('');
  console.log('1. Parse the 402 response to get payment requirements:');
  console.log('   - Recipient address (payTo)');
  console.log('   - Amount in USDC');
  console.log('   - Network (Base Sepolia)');
  console.log('   - Scheme (exact)');
  console.log('');
  console.log('2. Create a signed authorization using your wallet:');
  console.log('   - Sign a EIP-3009 transferWithAuthorization message');
  console.log('   - Or use Permit2 for non-USDC tokens');
  console.log('');
  console.log('3. Include the signed payload in PAYMENT-SIGNATURE header:');
  console.log('   - Base64-encoded JSON containing the authorization');
  console.log('');
  console.log('4. Re-send the request with the payment header:');
  console.log('   - Server verifies via facilitator');
  console.log('   - If valid, server returns data and settles payment');
  console.log('');
  
  // Step 4: Using @x402/fetch (the easy way)
  console.log('Step 4: The Easy Way - Using @x402/fetch\n');
  console.log('Install: npm install @x402/fetch @x402/evm viem');
  console.log('');
  console.log(`
// Example using @x402/fetch
import { wrapFetch } from '@x402/fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { toClientEvmSigner } from '@x402/evm';

// Create wallet client
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http()
});

// Wrap fetch with x402 payment capability
const x402Fetch = wrapFetch({
  signers: {
    'eip155:84532': toClientEvmSigner(walletClient)
  }
});

// Now requests automatically handle 402 responses
const response = await x402Fetch('http://localhost:4021/data');
const data = await response.json();
console.log(data); // Your paid data!
`);
}

/**
 * Decode a base64 payment header (if present)
 */
function decodePaymentHeader(header) {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Run the client
main().catch(console.error);
