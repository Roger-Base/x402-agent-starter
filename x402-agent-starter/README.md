# x402 Agent Starter

Minimal Node.js starter for AI agents to accept x402 payments on Base (USDC).

## Quick Start

```bash
# Install dependencies
npm install

# Set your payment address
export PAY_TO_ADDRESS=0xYOUR_WALLET_ADDRESS

# Run locally
npm start
```

## How It Works

1. Client makes HTTP request to `/api/data`
2. Server returns `402 Payment Required` with x402 headers:
   - `x402-pay-to`: recipient address
   - `x402-payment-required`: payment details (scheme, network, amount)
3. Client pays the required amount via Base chain
4. Client includes `x402-signature` header with payment proof
5. Server verifies payment and returns data

## Demo

```bash
# Start server
npm start

# Health check (free)
curl http://localhost:3000/health

# Paid endpoint - returns 402
curl http://localhost:3000/api/data
# Returns: {"error":"Payment Required","required":{"scheme":"exact","network":"eip155:84532","amount":"0.01 USDC","payTo":"..."}}

# With payment (production only - requires valid signature)
curl -H "x402-signature: 0x..." http://localhost:3000/api/data
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAY_TO_ADDRESS` | `0x0...` | Wallet address to receive payments |
| `PORT` | `3000` | Server port |
| `FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` | Payment facilitator (for full x402) |

## Production Use

For production with facilitator integration, use `@x402/express`:

```javascript
import { paymentMiddleware } from '@x402/express';
// ... see x402 docs for full integration
```

This demo implementation shows the x402 protocol pattern. For real payments, integrate with:
- Base USDC contracts
- x402 facilitator for payment verification

## Testing the Payment Flow

### Local Demo (No Real Payment)
```bash
# Run client example to see the 402 flow
node client-example.js
```

### Base Sepolia Testnet (Real USDC)

1. **Get Base Sepolia USDC:**
   - Visit https://faucet.base.org (if available)
   - Or ask in Base Discord for testnet USDC

2. **Set your wallet address:**
   ```bash
   export PAY_TO_ADDRESS=0xYOUR_WALLET
   ```

3. **Test with a wallet that supports x402:**
   - Connect wallet to a dApp that supports x402
   - Or use a script that sends USDC and includes the signature

### Full x402 Flow (Production)

For real payments with facilitator verification:

```javascript
const { paymentMiddleware } = require('@x402/express');

app.use(paymentMiddleware({
  facilitator: 'https://api.cdp.coinbase.com/platform/v2/x402',
  payTo: process.env.PAY_TO_ADDRESS
}));
```

## Networks

| Network | Chain ID | USDC Address | Status |
|---------|----------|--------------|--------|
| Base Sepolia | 84532 | 0x... | Testnet |
| Base Mainnet | 8453 | 0x833589fCD6eDb6E08F4c7C32D4f71b54bdA02913 | Production |

### Base Mainnet Deployment

For production on Base mainnet:

1. **Get USDC on Base:**
   - Bridge from Ethereum: https://bridge.base.org
   - Buy directly on Base: https://coinbase.com/buy-usdc

2. **Update payment settings:**
   ```bash
   export PAY_TO_ADDRESS=0xYOUR_MAINNET_WALLET
   # Network is automatically detected from chain
   ```

3. **Production considerations:**
   - Use a permanent wallet address (not a hot wallet)
   - Consider using a multisig for large amounts
   - Monitor payments via BaseScan

## Deployment

### Prerequisites
- GitHub account
- Platform account (Railway, Render, or Vercel)

### Authentication Required

Before deploying, you need to authenticate:

**Railway:**
```bash
railway login
railway init
```

**Vercel:**
```bash
vercel login
```

Then deploy:

### Render / Railway / Fly.io

1. Connect repo or push to GitHub
2. Set environment variables:
   - `PAY_TO_ADDRESS`: your wallet address
   - `PORT`: 10000 (Render/Railway default)
3. Build command: `npm install`
4. Start command: `npm start`

### Vercel

```bash
npm i -g vercel
vercel --prod
```

Set `PAY_TO_ADDRESS` in Vercel dashboard.

### Local with Base

For local testing with real Base Sepolia USDC:
1. Get some Base Sepolia USDC from faucet
2. Set `PAY_TO_ADDRESS` to your wallet
3. Use a wallet that can sign x402 payment headers

## License

ISC
