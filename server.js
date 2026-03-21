/**
 * x402 Agent Starter - Minimal payment-enabled server for AI agents
 * Deploy on Base: npm run deploy
 *
 * This server demonstrates x402 payment protocol integration.
 * For production: ensure FACILITATOR_URL is accessible.
 *
 * Usage:
 *   Set PAY_TO_ADDRESS env var to your wallet address
 *   npm start
 */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { x402 } from '@x402/express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Configuration
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '0x0000000000000000000000000000000000000000';
const NETWORK = 'eip155:84532'; // Base Sepolia

// x402 header constants
const PAYMENT_REQUIRED = '402';
const X402_VERSION = 'x402-version';
const X402_PAY_TO = 'x402-pay-to';
const X402_PAYMENT_REQUIRED = 'x402-payment-required';
const X402_SIGNATURE = 'x402-signature';
const X402_SETTLE = 'x402-settle';

// Payment configuration for routes
const paymentConfig = {
  'GET /api/data': {
    scheme: 'exact',
    price: '0.01 USDC',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
  },
};

// Simple x402 middleware (demonstrates protocol, production use @x402/express)
function x402Middleware(req, res, next) {
  const routeKey = `${req.method} ${req.path}`;
  const config = paymentConfig[routeKey];
  
  if (!config) {
    return next(); // No payment required
  }
  
  // Check for existing payment headers
  const hasPayment = req.headers[X402_SIGNATURE];
  
  if (!hasPayment) {
    // Return 402 Payment Required
    res.setHeader(X402_VERSION, '1.0');
    res.setHeader(X402_PAY_TO, config.payTo);
    res.setHeader(X402_PAYMENT_REQUIRED, JSON.stringify({
      scheme: config.scheme,
      network: config.network,
      amount: config.price,
    }));
    return res.status(402).json({
      error: 'Payment Required',
      message: `This endpoint requires payment of ${config.price}`,
      required: {
        scheme: config.scheme,
        network: config.network,
        amount: config.price,
        payTo: config.payTo,
      },
    });
  }
  
  // In production: verify payment signature here
  // For demo: just log and proceed
  console.log('Payment received from:', req.ip);
  next();
}

// Apply x402 middleware
app.use(x402Middleware);

// Paid endpoint - only executes after payment verified
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Payment received!',
    timestamp: new Date().toISOString(),
    data: { hello: 'agent', version: '1.0.0' },
  });
});

// Health check (free)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    x402: 'enabled',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
    version: '1.0.0-demo',
    note: 'For full x402 with facilitator, use @x402/express package'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦞 x402 agent server running on port ${PORT}`);
  console.log(`   Paid endpoint: GET /api/data (0.01 USDC on Base Sepolia)`);
  console.log(`   Pay to: ${PAY_TO_ADDRESS}`);
  console.log(`   Run: curl -H "x402-signature: <payment>" localhost:${PORT}/api/data`);
});
