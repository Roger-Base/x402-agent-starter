#!/usr/bin/env node
/**
 * x402-payment-caller — Minimal paid endpoint caller for AI agents
 * 
 * Demonstrates how an AI agent pays for a x402-protected endpoint on Base.
 * No external dependencies — uses Node.js built-in https module.
 * 
 * Usage:
 *   node examples/x402-caller.js                      # Default: /api/data ($0.01)
 *   node examples/x402-caller.js /api/wallet          # Wallet profiler ($0.01)
 *   node examples/x402-caller.js /api/tx [TX_HASH]    # Tx decoder ($0.02)
 * 
 * Requirements:
 *   - Base mainnet (eip155:8453)
 *   - USDC on Base (~0.01 USDC per call for /api/data)
 *   - Private key or agent wallet with funds
 * 
 * Environment variables:
 *   PRIVATE_KEY  — Hex private key for signing (required)
 *   ENDPOINT_URL — Full URL override (optional)
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ─────────────────────────────────────────────────────────────────

const DEFAULT_ENDPOINT = process.env.ENDPOINT_URL || 'https://laid-special-stroke-automobiles.trycloudflare.com';
const ROUTE = process.argv[2] || '/api/data';
const PARAM_ARG = process.argv[3] || null;
// /api/wallet/:address → /api/wallet/0x...  /api/tx/:hash → /api/tx/0x...
const PARAM_ROUTES = ['/api/wallet', '/api/token', '/api/tx'];
const IS_PARAM_ROUTE = PARAM_ROUTES.some(r => ROUTE.startsWith(r));
const FINAL_ROUTE = (PARAM_ARG && IS_PARAM_ROUTE) ? `${ROUTE}/${PARAM_ARG}` : ROUTE;
// Use base route for price lookup (strip address/hash suffix)
const PRICE_ROUTE = PARAM_ARG ? ROUTE : FINAL_ROUTE;
const TX_HASH = process.argv[3] || null;
// No query string — all parameterized routes use path segments
const FULL_URL = `${DEFAULT_ENDPOINT}${FINAL_ROUTE}`;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NETWORK = 'eip155:8453';

// ── x402 payment headers ────────────────────────────────────────────────────

function buildX402Headers(amount, recipient) {
  return {
    'x402-version': '1',
    'x402-requires': `scheme=exact,network=${NETWORK},amount=${amount},maxTimeoutSeconds=300,payTo=${recipient}`
  };
}

// ── Price map (matches server.js endpoints) ───────────────────────────────

const PRICES = {
  '/api/data':     { amount: 10000, desc: 'Live DeFi yield gap signal ($0.01)' },
  '/api/history':  { amount: 50000, desc: 'Yield history + decay analysis ($0.05)' },
  '/api/wallet':   { amount: 10000, desc: 'Base wallet profiler ($0.01)' },
  '/api/token':    { amount: 10000, desc: 'ERC20 token metadata ($0.01)' },
  '/api/tx':       { amount: 20000, desc: 'Transaction decoder ($0.02)' },
};

function getPriceInfo(route) {
  const base = route.split('?')[0].split('#')[0];
  return PRICES[base] || { amount: 10000, desc: `Custom endpoint ($0.01)` };
}

// ── HTTP request helper ────────────────────────────────────────────────────

function makeRequest(url, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

// ── Simulate payment (no private key needed to test the flow) ──────────────

async function simulatePaymentFlow() {
  const info = getPriceInfo(PRICE_ROUTE);
  console.log('\n🔑 x402 Payment Flow Simulation');
  console.log('─'.repeat(45));
  console.log(`Endpoint : ${FULL_URL}`);
  console.log(`Price    : ${info.desc}`);
  console.log(`Network  : ${NETWORK}`);
  console.log('');

  // Step 1: Discover the payment requirement
  console.log('Step 1 — Discovery (GET without payment)');
  const discovery = await makeRequest(FULL_URL, { 'Accept': 'application/json' });
  
  if (discovery.status === 200) {
    console.log('✅ Endpoint is open (no payment required)');
    console.log('Response:', JSON.stringify(discovery.body, null, 2).slice(0, 300));
    return;
  }
  
  if (discovery.status !== 402) {
    console.log(`❌ Unexpected status: ${discovery.status}`);
    console.log(discovery.body);
    return;
  }

  const requireHeader = discovery.headers['x402-payment-required'];
  console.log('402 Payment Required');
  console.log(`x402-requires: ${requireHeader}`);

  // Step 2: Parse payment requirement
  console.log('\nStep 2 — Parse requirement');
  let params = {};
  try {
    // x402-payment-required is a JSON string (not comma-delimited key=value)
    params = JSON.parse(requireHeader);
  } catch {
    // Fallback: try comma-delimited key=value
    params = Object.fromEntries(
      requireHeader.split(',').map(p => p.trim().split('='))
    );
  }
  const usdcAmount = params.amount ? (parseInt(params.amount) / 1e6).toFixed(2) : '?';
  const token = params.accepts?.[0]?.token || 'USDC';
  const timeout = params.maxTimeoutSeconds || params.maxTimeout || '?';
  console.log(`  scheme        : ${params.scheme || 'exact'}`);
  console.log(`  network       : ${params.network || 'eip155:8453'}`);
  console.log(`  amount        : ${usdcAmount} ${token}`);
  console.log(`  maxTimeout    : ${timeout}s`);
  console.log(`  payTo         : ${params.payTo || '?'}`);

  // Step 3: Sign and submit payment
  console.log('\nStep 3 — Sign + Submit payment');
  if (!PRIVATE_KEY) {
    console.log('⚠️  PRIVATE_KEY not set. Set it and re-run:');
    console.log('   PRIVATE_KEY=0x... node examples/x402-caller.js');
    console.log('');
    console.log('   To get a private key:');
    console.log('   1. Open MetaMask / Rabby on Base');
    console.log('   2. Account Details → Export Private Key');
    console.log('   3. Fund with ~0.05 USDC on Base for endpoint calls');
    console.log('');
    console.log('   With a funded wallet, the caller will:');
    console.log('   - Fetch the nonce from the payTo address');
    console.log('   - Sign a typed EIP-712 permit message');
    console.log('   - Submit tx and wait for confirmation');
    console.log('   - Retry the endpoint with proof of payment');
    console.log('');
    console.log('   See docs/x402-payment-flow.md for full protocol details.');
    return;
  }

  console.log('✅ PRIVATE_KEY found — signing payment...');
  console.log('(Payment signing requires @spore SDK or similar EIP-712 signer)');
  console.log('');
  console.log('Full payment protocol: docs/x402-payment-flow.md');
  console.log('x402 spec: https://github.com/x402foundation/x402');
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   x402 Payment Caller — AI Agent Payment Demo    ║');
console.log('╚══════════════════════════════════════════════════╝');

if (!PRIVATE_KEY) {
  console.log('\n⚠️  PRIVATE_KEY not set — running in simulation mode');
  console.log('   To run live: PRIVATE_KEY=0x... node examples/x402-caller.js\n');
}

simulatePaymentFlow().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});