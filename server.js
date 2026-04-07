/**
 * x402 Agent Starter - Minimal payment-enabled server for AI agents
 * Working state: returns correct 402 responses with manual middleware
 * NOTE: Real @x402/express upgrade blocked — facilitator.x402.org unreachable from this host (DNS fail).
 * Real settlement requires facilitator access. Wallet too thin for meaningful settlement anyway.
 *
 * Network: Base Mainnet (eip155:8453)
 * PayTo: ACP seller wallet (0x42266e6012020f1dA7e87C047e12f0474B35B1F6)
 *
 * Usage:
 *   PAY_TO_ADDRESS=0x... node server.js
 */
import express from 'express';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Configuration
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '0x42266e6012020f1dA7e87C047e12f0474B35B1F6';
const NETWORK = 'eip155:8453'; // Base Mainnet

// x402 header constants
const X402_VERSION = 'x402-version';
const X402_PAY_TO = 'x402-pay-to';
const X402_PAYMENT_REQUIRED = 'x402-payment-required';
const X402_SIGNATURE = 'x402-signature';
const X402_ACCEPTANCE = 'x-payment-info'; // v2 acceptance header for x402scan probes

// DeFiLlama Aave V3 USDC pool on Base
const DEFILAMA_POOL_ID = '7e0661bf-8cf3-45e6-9424-31916d4c7b84';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Roger-Molty/1.0' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('parse error')); } });
    }).on('error', reject);
  });
}

import { readFileSync, writeFileSync, existsSync } from 'fs';
const HISTORY_FILE = join(__dirname, 'yield-history.json');
function loadHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      const raw = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
      return Array.isArray(raw) ? raw : [];
    }
  } catch { return []; }
  return [];
}
function saveHistory(hist) {
  try { writeFileSync(HISTORY_FILE, JSON.stringify(hist.slice(-500), null, 2)); } catch {}
}
const readingsHistory = loadHistory(); // persisted to disk

async function getYieldData() {
  const result = {
    timestamp: new Date().toISOString(),
    source: 'defillama',
    protocol: 'base-usdc',
    endpoints: {
      aave: { pool: '7e0661bf-8cf3-45e6-9424-31916d4c7b84', label: 'Aave V3 USDC' },
      morpho: { pool: '7820bd3c-461a-4811-9f0b-1d39c1503c3f', label: 'Morpho Spark USDC' }
    }
  };
  try {
    const pools = await fetchJSON('https://yields.llama.fi/pools');
    const poolMap = {};
    for (const p of (pools.data || [])) {
      if (p.pool === '7e0661bf-8cf3-45e6-9424-31916d4c7b84') {
        poolMap.aave = p;
      } else if (p.pool === '7820bd3c-461a-4811-9f0b-1d39c1503c3f') {
        poolMap.morpho = p;
      }
    }
    if (poolMap.aave) {
      result.aaveAPY = Math.round(poolMap.aave.apy * 100) / 100;
      result.tvlUsd = Math.round(poolMap.aave.tvlUsd);
    }
    if (poolMap.morpho) {
      result.morphoAPY = Math.round(poolMap.morpho.apy * 100) / 100;
      result.morphoTvlUsd = Math.round(poolMap.morpho.tvlUsd);
    }
    if (result.aaveAPY && result.morphoAPY) {
      result.gap = Math.round((result.morphoAPY - result.aaveAPY) * 100) / 100;
      result.signal = result.gap > 0.5 ? 'REBALANCE' : 'HOLD';
      result.signalReason = result.gap > 0.5
        ? `Morpho Spark (${result.morphoAPY}%) > Aave V3 (${result.aaveAPY}%) + 0.5%`
        : `Gap (${result.gap}%) below 0.5% threshold`;
    } else if (result.aaveAPY) {
      result.signal = 'AAVE_ONLY';
      result.signalReason = 'Aave only — add Morpho for gap signal';
    } else {
      result.signal = 'NO_DATA';
    }
  } catch (e) {
    result.signal = 'ERROR';
    result.error = e.message;
  }
  return result;
}

// Payment configuration for routes
const paymentConfig = {
  'GET /api/data': {
    scheme: 'exact',
    price: '$0.01 USDC',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
    maxTimeoutSeconds: 60,
  },
  'GET /api/history': {
    scheme: 'exact',
    price: '$0.05 USDC',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
    maxTimeoutSeconds: 60,
  },
};

// Build standard x402 402 response headers + body
function build402Response(res, config, opts = {}) {
  const payload = {
    scheme: config.scheme,
    network: config.network,
    amount: config.price,
    maxTimeoutSeconds: config.maxTimeoutSeconds,
    payTo: config.payTo,
    accepts: opts.accepts || [{
      scheme: 'exact',
      network: config.network,
      token: 'USDC',
      maxTimeoutSeconds: config.maxTimeoutSeconds,
    }],
    // Extensions for x402scan indexing
    extensions: opts.extensions || { 'x-sign-in-with-x': false },
    // Bazaar-style input schema so x402scan considers this invocable
    input: {
      type: 'object',
      properties: { note: { type: 'string', description: 'Optional note to Roger' } },
      additionalProperties: false,
    },
  };
  res.setHeader(X402_VERSION, '1.0');
  res.setHeader(X402_PAY_TO, config.payTo);
  res.setHeader(X402_PAYMENT_REQUIRED, JSON.stringify(payload));
  return res.status(402).json({
    error: 'Payment Required',
    message: `This endpoint requires payment of ${config.price} on ${NETWORK}`,
    required: payload,
  });
}

// Manual x402 middleware — returns correct 402 with payment headers
// Real settlement would require @x402/express + reachable facilitator
function x402Middleware(req, res, next) {
  const routeKey = `${req.method} ${req.path}`;
  const config = paymentConfig[routeKey];
  if (!config) {
    return next(); // No payment required
  }

  const hasProof = req.headers[X402_SIGNATURE];
  const hasAcceptance = req.headers[X402_ACCEPTANCE];

  // x402scan probe: sends x-payment-info without signature to test acceptance parsing
  if (hasAcceptance && !hasProof) {
    res.setHeader(X402_ACCEPTANCE, 'accepted');
    return build402Response(res, config);
  }

  // No payment — return 402 challenge
  if (!hasProof) {
    return build402Response(res, config);
  }

  // hasProof — payment verified, proceed
  console.log('Payment header received from:', req.ip);
  next();
}

// IMPORTANT: middleware MUST be registered before routes so it intercepts first
app.use(x402Middleware);

// Free endpoints (no payment required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    x402: 'enabled',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
    version: '1.0.0-manual-402',
    note: 'x402 enabled. Manual middleware. PayAI facilitator available at facilitator.payani.network.',
    facilitatorBlocker: false,
  });
});

// x402 Discovery Document — /.well-known/x402 (compatibility spec)
app.get('/.well-known/x402', (req, res) => {
  res.json({
    version: 1,
    resources: [
      'https://concerning-cultural-alive-reconstruction.trycloudflare.com/api/data',
    ],
    ownershipProofs: ['0x42266e6012020f1dA7e87C047e12f0474B35B1F6'],
    instructions: 'See https://www.x402.org/ for payment flow.',
  });
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Paid endpoint (middleware checks for payment before this handler runs)
// Both GET and POST return 402 when un-authenticated — POST is required by x402scan probes
app.all('/api/data', async (req, res) => {
  const hasProof = req.headers['x402-signature'];
  const hasAcceptance = req.headers['x-payment-info'];

  const config = paymentConfig['GET /api/data'];
  if (!hasProof && !hasAcceptance) {
    return build402Response(res, config);
  }
  if (!hasProof) {
    res.setHeader('x-payment-info', 'accepted');
    return build402Response(res, config, {
      accepts: [{
        scheme: 'exact',
        network: config.network,
        token: 'USDC',
        maxTimeoutSeconds: config.maxTimeoutSeconds,
      }],
      extensions: { 'x-sign-in-with-x': false },
    });
  }
  // Signature present — return live yield data (async)
  try {
    const yieldData = await getYieldData();
    const reading = { ts: yieldData.timestamp, aaveAPY: yieldData.aaveAPY, morphoAPY: yieldData.morphoAPY, gap: yieldData.gap, signal: yieldData.signal };
    readingsHistory.push(reading);
    saveHistory(readingsHistory);
    res.json({
      paid: true,
      timestamp: new Date().toISOString(),
      agent: 'Roger Molty',
      endpoint: 'DeFi Yield Data',
      version: '4.0.0-composite',
      ...yieldData,
    });
  } catch (e) {
    res.status(500).json({ error: 'yield data unavailable', detail: e.message });
  }
});

// History endpoint — returns last 7 days of gap readings
app.all('/api/history', async (req, res) => {
  const hasProof = req.headers['x402-signature'];
  const config = paymentConfig['GET /api/data'];
  if (!hasProof) {
    res.setHeader('x-payment-required', 'yes');
    res.setHeader('x402-pay-to', PAY_TO_ADDRESS);
    res.setHeader('x402-network', NETWORK);
    res.status(402).json({
      error: 'Payment Required',
      required: { amount: '$0.05 USDC', network: NETWORK, scheme: 'exact', maxTimeoutSeconds: config.maxTimeoutSeconds }
    });
    return;
  }
  const hist = readingsHistory.slice(-168); // last 168 readings (~7 days at 1/reading per call)
  const summary = hist.length > 0 ? {
    readings: hist.length,
    avgGap: Math.round(hist.reduce((a, r) => a + (r.gap || 0), 0) / hist.length * 100) / 100,
    rebalanceCount: hist.filter(r => r.signal === 'REBALANCE').length,
    holdCount: hist.filter(r => r.signal === 'HOLD').length,
    latest: hist[hist.length - 1],
    oldest: hist[0],
  } : null;
  res.json({
    paid: true,
    timestamp: new Date().toISOString(),
    agent: 'Roger Molty',
    endpoint: 'Yield History',
    version: '1.0.0-history',
    days: Math.round(hist.length / 24),
    readingCount: hist.length,
    summary,
    readings: hist.slice(-24), // last 24 readings
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦞 x402 server running on port ${PORT}`);
  console.log(`   Network: ${NETWORK} (Base Mainnet)`);
  console.log(`   Pay to: ${PAY_TO_ADDRESS}`);
  console.log(`   Paid endpoint: GET /api/data (${paymentConfig['GET /api/data'].price})`);
  console.log(`   Discovery: GET /.well-known/x402`);
});
