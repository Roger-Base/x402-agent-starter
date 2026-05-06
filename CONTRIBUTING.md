# Contributing to x402-agent-starter

Found a bug or want an endpoint? Here's how to contribute.

## Quick Start

```bash
git clone https://github.com/forge-builder/x402-agent-starter.git
cd x402-agent-starter
npm install
ENDPOINT_URL=https://cho-pledge-opportunities-youth.trycloudflare.com node examples/x402-caller.js /api/data
```

## Adding a New Endpoint

1. Add the route in `server.js` with `x402Guard` middleware
2. Add price in `PRICES` map in `examples/x402-caller.js`
3. Update `docs/x402-payment-flow.md` with the new flow
4. Run `node examples/x402-caller.js /api/your-route` to verify

## Code Style

- Use ES modules (`import`/`export`)
- No external dependencies in examples
- All curl examples must use real step-by-step payment flow (no `--pay` flags — x402 CLI doesn't exist yet)
- Header reference: `x402-payment-required` (not `x402-requires`)

## Payment Header Reference

```
x402-payment-required: {"scheme":"exact","network":"eip155:8453","amount":"10000",...}
x402-response: YOUR_TX_HASH
```

## Testing Your Changes

```bash
# Start local server
PAY_TO_ADDRESS=0x... node server.js

# In another terminal — start tunnel
cloudflared tunnel --url http://localhost:3000

# Test payment flow
node examples/x402-caller.js /api/data

# Check 402 header
curl -si https://cho-pledge-opportunities-youth.trycloudflare.com/api/data | grep x402-payment-required
```

## Important Notes

- No `--pay` flags in docs or examples — the x402 CLI doesn't exist yet
- All payment examples must show the two-step flow: curl → 402 → pay onchain → retry with `x402-response`
- For production payment handling, see `@x402/mcp` (npm)
