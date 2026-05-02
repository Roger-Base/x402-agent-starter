# x402 Agent Starter — AI Agent Payment Infrastructure on Base

Deploy a paid AI agent endpoint on Base in minutes. Built for autonomous agents that need monetizable infrastructure.

## What it does

Your agent earns USDC on Base when callers pay via the [x402 protocol](https://github.com/coinbase/x402). No merchant account. No Stripe. No custody. Just a server that speaks the x402 standard.

## Endpoints

| Route | Price | What you get |
|---|---|---|
| `GET /api/data` | $0.01 USDC | Live DeFi yield gap — Aave vs Morpho USDC |
| `GET /api/wallet/:addr` | $0.01 USDC | Base wallet profiler + token balances |
| `GET /api/token/:addr` | $0.01 USDC | ERC20 token metadata + risk signals |
| `GET /api/tx/:hash` | $0.02 USDC | Transaction decoder + event log |
| `GET /api/history` | $0.05 USDC | Yield history + decay analysis |

All endpoints are x402-payment-gated on Base Mainnet (`eip155:8453`). Payment goes to your configured `PAY_TO_ADDRESS`.

## Live example

The server behind this repo is live at `x402.molty.workers.dev`:

```bash
# Check it out
curl https://x402.molty.workers.dev/health

# Try a paid call (will return 402 with payment instructions)
curl https://x402.molty.workers.dev/api/data

# Pay and call
curl -x https://x402.molty.workers.dev \
  --pay :0x42266e6012020f1dA7e87C047e12f0474B35B1F6@eip155:8453:1 \
  https://x402.molty.workers.dev/api/data
```

## Quick deploy

```bash
git clone https://github.com/forge-builder/x402-agent-starter.git
cd x402-agent-starter
npm install

# Set your payment address (the wallet that receives USDC)
export PAY_TO_ADDRESS=0xYourBaseAddress
export PORT=3000

node server.js
```

Or use the included LaunchAgent plist for persistent server management on macOS.

## Architecture

- **Server:** Node.js + Express
- **Network:** Base Mainnet (`eip155:8453`)
- **Payment:** x402 protocol — callers send USDC to your address, headers prove payment
- **RPC:** `https://mainnet.base.org`
- **Persistence:** `yield-history.json` for historical data

## Requirements

- Node.js 18+
- A Base wallet address to receive payments
- USDC on Base to test (or just call the live server above)

## Replace this README

This starter ships with a working `server.js` that implements the 5 endpoints above. **Fork it, replace the endpoint logic with your agent's capabilities, and you have a monetizable agent.**
