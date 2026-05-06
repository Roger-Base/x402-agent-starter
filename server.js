/**
 * x402 Agent Starter - Roger Molty AI Agent Services
 * 
 * Network: Base Mainnet (eip155:8453)
 * PayTo: ACP seller wallet (0x42266e6012020f1dA7e87C047e12f0474B35B1F6)
 * RPC: https://mainnet.base.org (public)
 *
 * Paid endpoints:
 *   GET /api/data      - DeFi yield gap signal (Aave vs Morpho USDC)     - $0.01 USDC
 *   GET /api/history   - Yield history + decay analysis                   - $0.05 USDC
 *   GET /api/wallet/:addr - Base wallet profiler + token balances         - $0.01 USDC
 *   GET /api/token/:addr  - ERC20 token metadata + risk signals          - $0.01 USDC
 *   GET /api/tx/:hash     - Transaction decoder + events                  - $0.02 USDC
 */
import express from 'express';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Config ─────────────────────────────────────────────────────────────────
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '0x42266e6012020f1dA7e87C047e12f0474B35B1F6';
const NETWORK = 'eip155:8453';
const BASE_RPC = 'https://mainnet.base.org';
const PORT = process.env.PORT || 3000;

// ─── x402 Constants ──────────────────────────────────────────────────────────
const X402_VERSION    = 'x402-version';
const X402_PAY_TO     = 'x402-pay-to';
const X402_PAYMENT    = 'x402-payment-required';
const X402_SIG        = 'x402-signature';
const X402_ACCEPTANCE = 'x-payment-info';

// Known Base contract addresses (for labeling)
const KNOWN_CONTRACTS = {
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { name: 'USDC', type: 'stablecoin', symbol: 'USDC' },
  '0x4200000000000000000000000000000000000006': { name: 'WETH', type: 'asset', symbol: 'WETH' },
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': { name: 'DAI', type: 'stablecoin', symbol: 'DAI' },
  '0x4ed4eC862e5bdAf36F648a0358d7C23D9BB3F402': { name: 'cbBTC', type: 'asset', symbol: 'cbBTC' },
  '0x062E3a55C2b7d6362E95E72d5f2F6a0B9aAeaa7a': { name: 'USDbC', type: 'stablecoin', symbol: 'USDbC' },
};
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

// ─── Payment Config ─────────────────────────────────────────────────────────
const paymentConfig = {
  'GET /api/data':    { price: '$0.01 USDC', amount: '10000', desc: 'Live DeFi yield gap signal' },
  'GET /api/history': { price: '$0.05 USDC', amount: '50000', desc: 'Yield history + decay analysis' },
  'GET /api/wallet':  { price: '$0.01 USDC', amount: '10000', desc: 'Base wallet profiler + token balances' },
  'GET /api/token':   { price: '$0.01 USDC', amount: '10000', desc: 'ERC20 token metadata + risk signals' },
  'GET /api/tx':      { price: '$0.02 USDC', amount: '20000', desc: 'Transaction decoder + event log' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fetchRPC(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
    const req = https.request(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('RPC parse error')); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function build402(res, route, opts = {}) {
  const cfg = paymentConfig[route];
  const payload = {
    scheme: 'exact',
    network: NETWORK,
    amount: cfg.amount, // smallest unit (USDC has 6 decimals → 10000 = $0.01)
    maxTimeoutSeconds: 60,
    payTo: PAY_TO_ADDRESS,
    accepts: [{ scheme: 'exact', network: NETWORK, token: 'USDC', maxTimeoutSeconds: 60 }],
    extensions: { 'x-sign-in-with-x': false },
    input: opts.input || {
      type: 'object',
      properties: { address: { type: 'string', description: 'Base wallet or contract address' } },
      additionalProperties: false,
    },
  };
  res.setHeader(X402_VERSION, '1.0');
  res.setHeader(X402_PAY_TO, PAY_TO_ADDRESS);
  res.setHeader(X402_PAYMENT, JSON.stringify(payload));
  return res.status(402).json({
    error: 'Payment Required',
    message: `This endpoint requires ${cfg.price} on ${NETWORK}`,
    required: payload,
    endpoint: route,
    description: cfg.desc,
  });
}

// ─── Middleware ──────────────────────────────────────────────────────────────
function x402Guard(req, res, next) {
  // Try exact match first (e.g. /api/data), then base-path match for parameterized routes
  const exactRoute = `${req.method} ${req.path}`;
  const basePath = req.path.replace(/\/[^/]+$/, ''); // strip last param segment
  const paramRoute = `${req.method} ${basePath}`;
  const cfg = paymentConfig[exactRoute] || paymentConfig[paramRoute];
  const route = paymentConfig[exactRoute] ? exactRoute : paramRoute;
  if (!cfg) return next();

  if (req.headers[X402_SIG]) {
    // Payment proof present — proceed with data
    return next();
  }
  if (req.headers[X402_ACCEPTANCE]) {
    // x402scan acceptance probe — confirm acceptance, still require payment
    res.setHeader(X402_ACCEPTANCE, 'accepted');
    return build402(res, route);
  }
  // No payment — return 402 with payment headers
  return build402(res, route);
}

// ─── Persistence ─────────────────────────────────────────────────────────────
const HISTORY_FILE = join(__dirname, 'yield-history.json');
function loadHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      const raw = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
      return Array.isArray(raw) ? raw : [];
    }
  } catch {}
  return [];
}
function saveHistory(hist) {
  try { writeFileSync(HISTORY_FILE, JSON.stringify(hist.slice(-500), null, 2)); } catch {}
}
const readingsHistory = loadHistory();

// ─── Well-known x402 ─────────────────────────────────────────────────────────
app.get('/.well-known/x402', (req, res) => {
  res.json({
    version: 1,
    resources: [
      'https://controlling-coal-throw-between.trycloudflare.com/api/wallet',
      'https://controlling-coal-throw-between.trycloudflare.com/api/token',
    ],
    ownershipProofs: [PAY_TO_ADDRESS],
    instructions: 'See https://www.x402.org/ for payment flow.',
  });
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok', x402: 'enabled', network: NETWORK,
    payTo: PAY_TO_ADDRESS, version: '5.0.0-rogermolty',
    services: ['yield-gap', 'wallet-profiler', 'token-analyzer', 'tx-decoder'],
    endpoints: Object.entries(paymentConfig).map(([k, v]) => ({ route: k, price: v.price, desc: v.desc })),
    agent: 'Roger Molty',
  });
});

// ─── Routes (no payment needed) ─────────────────────────────────────────────

// ─── Routes (x402 payment required) ────────────────────────────────────────

// GET /api/data — DeFi yield gap
const DEFILAMA_POOLS = {
  aave:  '7e0661bf-8cf3-45e6-9424-31916d4c7b84',
  morpho: '7820bd3c-461a-4811-9f0b-1d39c1503c3f',
};
app.all('/api/data', x402Guard, async (req, res) => {
  try {
    const pools = await fetch('https://yields.llama.fi/pools')
      .then(r => r.json()).catch(() => null);
    const map = {};
    if (pools?.data) {
      for (const p of pools.data) {
        if (p.pool === DEFILAMA_POOLS.aave)  map.aave  = p;
        if (p.pool === DEFILAMA_POOLS.morpho) map.morpho = p;
      }
    }
    const result = {
      timestamp: new Date().toISOString(),
      agent: 'Roger Molty',
      endpoint: 'DeFi Yield Gap Signal',
      version: '5.0.0',
      source: 'DeFiLlama',
      network: 'Base',
    };
    if (map.aave) {
      result.aaveAPY = Math.round(map.aave.apy * 100) / 100;
      result.aaveTvl = Math.round(map.aave.tvlUsd);
    }
    if (map.morpho) {
      result.morphoAPY = Math.round(map.morpho.apy * 100) / 100;
      result.morphoTvl = Math.round(map.morpho.tvlUsd);
    }
    if (result.aaveAPY && result.morphoAPY) {
      result.gap = Math.round((result.morphoAPY - result.aaveAPY) * 100) / 100;
      result.signal = result.gap > 0.5 ? 'REBALANCE' : 'HOLD';
      result.signalReason = result.gap > 0.5
        ? `Morpho Spark (${result.morphoAPY}%) > Aave V3 (${result.aaveAPY}%) + 0.5% — move USDC to Morpho`
        : `Gap (${result.gap}%) below 0.5% threshold — hold Aave`;
    } else if (result.aaveAPY) {
      result.signal = 'AAVE_ONLY';
      result.signalReason = 'Aave only — add Morpho for gap signal';
    } else {
      result.signal = 'NO_DATA';
    }
    // persist reading
    readingsHistory.push({ ts: result.timestamp, aaveAPY: result.aaveAPY, morphoAPY: result.morphoAPY, gap: result.gap, signal: result.signal });
    saveHistory(readingsHistory);
    res.json({ paid: true, ...result });
  } catch (e) {
    res.status(500).json({ error: 'yield data unavailable', detail: e.message });
  }
});

// GET /api/wallet/:address — Base wallet profiler
app.all('/api/wallet/:address', x402Guard, async (req, res) => {
  const addr = (req.params.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/i.test(addr)) {
    return res.status(400).json({ error: 'Invalid address format' });
  }
  try {
    const [balance, nonce, blockNum] = await Promise.all([
      fetchRPC('eth_getBalance', [addr, 'latest']),
      fetchRPC('eth_getTransactionCount', [addr, 'latest']),
      fetchRPC('eth_blockNumber', []),
    ]);
    const ethBal = parseInt(balance.result || '0x0', 16) / 1e18;
    const txCount = parseInt(nonce.result || '0x0', 16);
    const currentBlock = parseInt(blockNum.result || '0x0', 16);

    // Get recent 10 txs (filter from recent blocks)
    let recentTxs = [];
    try {
      const fromBlock = '0x' + Math.max(1, currentBlock - 1000).toString(16);
      const toBlock = blockNum.result;
      const logs = await fetchRPC('eth_getLogs', [{
        fromBlock, toBlock,
        address: addr,
        topics: ['0x000000000000000000000000' + addr.slice(2)], // address as topic0
      }]);
      if (logs.result) {
        const blockMap = {};
        const txs = await Promise.all(
          (logs.result.slice(0, 5) || []).map(log => {
            const bKey = log.blockNumber;
            if (!blockMap[bKey]) blockMap[bKey] = fetchRPC('eth_getBlockByNumber', [bKey, false]);
            return blockMap[bKey].then(block => {
              const txHash = log.transactionHash;
              return fetchRPC('eth_getTransactionByHash', [txHash]).then(tx => {
                const t = tx.result;
                if (!t) return null;
                const value = parseInt(t.value || '0x0', 16) / 1e18;
                const gasPrice = parseInt(t.gasPrice || '0x0', 16) / 1e18;
                return {
                  hash: t.hash,
                  from: t.from,
                  to: t.to,
                  value,
                  gasPrice,
                  blockNumber: parseInt(bKey, 16),
                  timestamp: block.result ? parseInt(block.result.timestamp, 16) : null,
                  method: t.input?.slice(0, 10) || null,
                };
              }).catch(() => null);
            }).catch(() => null);
          })
        );
        recentTxs = txs.filter(Boolean);
      }
    } catch {}

    // Label known contracts
    const label = KNOWN_CONTRACTS[addr]?.name || null;
    const type = label ? 'contract' : 'EOA';

    res.json({
      paid: true,
      timestamp: new Date().toISOString(),
      agent: 'Roger Molty',
      endpoint: 'Wallet Profiler',
      version: '1.0.0',
      address: addr,
      label,
      type,
      balance: { eth: Math.round(ethBal * 10000) / 10000, ethRaw: balance.result },
      txCount,
      currentBlock,
      recentTxs: recentTxs.slice(0, 5),
      signals: {
        isContract: type === 'contract',
        isWhale: ethBal > 10,
        isActive: txCount > 10,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'wallet data unavailable', detail: e.message });
  }
});

// GET /api/token/:address — ERC20 token analyzer
app.all('/api/token/:address', x402Guard, async (req, res) => {
  const token = (req.params.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/i.test(token)) {
    return res.status(400).json({ error: 'Invalid token address format' });
  }
  try {
    // ERC20 basic read (name, symbol, decimals, totalSupply)
    const [name, symbol, decimals, supply, blockNum] = await Promise.all([
      fetchRPC('eth_call', [{ to: token, data: '0x06fdde03' }, 'latest']), // name()
      fetchRPC('eth_call', [{ to: token, data: '0x95d89b41' }, 'latest']), // symbol()
      fetchRPC('eth_call', [{ to: token, data: '0x313ce567' }, 'latest']), // decimals()
      fetchRPC('eth_call', [{ to: token, data: '0x18160ddd' }, 'latest']), // totalSupply()
      fetchRPC('eth_blockNumber', []),
    ]);

    const dec = parseInt(decimals.result || '0x12', 16); // default 18
    const rawSupply = parseInt(supply.result || '0x0', 16);
    const totalSupply = rawSupply / Math.pow(10, dec);

    // Decode string fields (first 32 bytes after selector)
    function decodeString(hex) {
      if (!hex || hex === '0x') return '';
      try {
        const data = hex.result || hex;
        if (data === '0x') return '';
        const val = data.slice(2);
        if (val === '0'.repeat(64)) return '';
        // bytes string: offset(32) + length(32) + data
        const strLen = parseInt(val.slice(64, 128), 16);
        const strData = val.slice(128, 128 + strLen * 2);
        return Buffer.from(strData, 'hex').toString('utf8').replace(/\0+$/, '');
      } catch { return ''; }
    }

    const tokenName = decodeString(name) || null;
    const tokenSymbol = decodeString(symbol) || null;
    const known = KNOWN_CONTRACTS[token];

    // Check if USDC/USDT (special no-decimals contracts)
    const isNativeUSD = tokenSymbol === 'USDC' || tokenSymbol === 'USDT';

    res.json({
      paid: true,
      timestamp: new Date().toISOString(),
      agent: 'Roger Molty',
      endpoint: 'Token Analyzer',
      version: '1.0.0',
      token,
      name: tokenName || known?.name || null,
      symbol: tokenSymbol || known?.symbol || null,
      decimals: isNativeUSD ? 6 : dec,
      totalSupply: Math.round(totalSupply * 1000000) / 1000000,
      knownContract: known || null,
      riskSignals: {
        isKnownContract: !!known,
        hasName: !!tokenName,
        hasSymbol: !!tokenSymbol,
        isStablecoin: known?.type === 'stablecoin' || isNativeUSD,
        supplyReadable: totalSupply > 0,
      },
      currentBlock: parseInt(blockNum.result || '0x0', 16),
      network: 'Base',
      note: 'Only reads onchain state. For full audit (honeypot, ownership, fees) use dedicated security scanner.',
    });
  } catch (e) {
    res.status(500).json({ error: 'token data unavailable', detail: e.message });
  }
});

// GET /api/tx/:hash — Transaction decoder
app.all('/api/tx/:hash', x402Guard, async (req, res) => {
  const txHash = req.params.hash;
  if (!/^0x[0-9a-f]{64}$/i.test(txHash)) {
    return res.status(400).json({ error: 'Invalid tx hash format' });
  }
  try {
    const [tx, receipt] = await Promise.all([
      fetchRPC('eth_getTransactionByHash', [txHash]),
      fetchRPC('eth_getTransactionReceipt', [txHash]),
    ]);
    if (!tx.result) return res.status(404).json({ error: 'Transaction not found' });
    const t = tx.result;
    const r = receipt.result;
    const value = parseInt(t.value || '0x0', 16) / 1e18;
    const gasPrice = parseInt(t.gasPrice || '0x0', 16) / 1e18;
    const gasUsed = r ? parseInt(r.gasUsed, 16) : null;
    const gasFee = gasUsed ? gasUsed * parseInt(t.gasPrice || '0x1', 16) / 1e18 : null;
    const status = r ? (r.status === '0x1' ? 'success' : 'failed') : 'pending';

    res.json({
      paid: true,
      timestamp: new Date().toISOString(),
      agent: 'Roger Molty',
      endpoint: 'Transaction Decoder',
      version: '1.0.0',
      hash: t.hash,
      from: t.from,
      to: t.to,
      value,
      gasPrice,
      gasUsed,
      gasFee: gasFee ? Math.round(gasFee * 1e6) / 1e6 : null,
      status,
      blockNumber: r ? parseInt(r.blockNumber, 16) : null,
      blockHash: r?.blockHash || null,
      nonce: parseInt(t.nonce, 16),
      input: t.input,
      methodId: t.input?.slice(0, 10) || null,
      logs: (r?.logs || []).slice(0, 10).map(l => ({
        address: l.address,
        topics: l.topics,
        data: l.data.length > 66 ? l.data.slice(0, 42) + '...' : l.data,
      })),
      network: 'Base',
    });
  } catch (e) {
    res.status(500).json({ error: 'tx data unavailable', detail: e.message });
  }
});

// GET /api/history — Yield history
app.all('/api/history', x402Guard, async (req, res) => {
  const hist = readingsHistory.slice(-168);
  const summary = hist.length > 0 ? {
    readings: hist.length,
    avgGap: Math.round(hist.reduce((a, r) => a + (r.gap || 0), 0) / hist.length * 100) / 100,
    rebalanceCount: hist.filter(r => r.signal === 'REBALANCE').length,
    holdCount: hist.filter(r => r.signal === 'HOLD').length,
    latest: hist[hist.length - 1],
    oldest: hist[0],
  } : null;
  res.json({
    paid: true, timestamp: new Date().toISOString(),
    agent: 'Roger Molty', endpoint: 'Yield History', version: '1.0.0',
    days: Math.round(hist.length / 24), readingCount: hist.length,
    summary,
    readings: hist.slice(-24),
  });
});

// GET /api/decay — Decay analysis
app.all('/api/decay', x402Guard, async (req, res) => {
  const hist = readingsHistory.slice(-500);
  if (hist.length < 2) {
    return res.json({ status: 'insufficient_data', readings_needed: 50 - hist.length, readingCount: hist.length });
  }
  const rebalances = hist.map((r, i) => ({ ...r, i })).filter(r => r.signal === 'REBALANCE');
  const intervals = [];
  for (let i = 1; i < rebalances.length; i++) intervals.push(rebalances[i].i - rebalances[i-1].i);
  const avgGap = hist.reduce((a, r) => a + (r.gap || 0), 0) / hist.length;
  const maxGap = Math.max(...hist.map(r => r.gap || 0));
  const decayRate = (maxGap - avgGap) / hist.length;
  res.json({
    paid: true, timestamp: new Date().toISOString(),
    agent: 'Roger Molty', endpoint: 'Decay Analysis', version: '1.0.0',
    status: 'ok', readingCount: hist.length,
    rebalanceCount: rebalances.length,
    avgGap: Math.round(avgGap * 100) / 100,
    maxGap, decayRate: Math.round(decayRate * 10000) / 10000,
    avgRebalanceInterval: intervals.length ? Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length*10)/10 : null,
    signalHalfLife: Math.round(0.5 * maxGap / (decayRate || 0.0001)),
    note: 'Best signal after 50+ readings.',
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🦞 Roger Molty x402 server running on port ${PORT}`);
  console.log(`   Network: ${NETWORK} (Base Mainnet)`);
  console.log(`   Pay to:  ${PAY_TO_ADDRESS}`);
  console.log(`   RPC:     ${BASE_RPC}`);
  Object.entries(paymentConfig).forEach(([k, v]) => console.log(`   ${v.price} → ${k}`));
});
