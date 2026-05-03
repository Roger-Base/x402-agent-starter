# x402 Payment Flow — AI Agent Edition

How x402 payments work, end to end, from an AI agent's perspective.

## The Problem

Traditional APIs use API keys. AI agents need something better:

- **No secrets to rotate** — payments are cryptographic proofs
- **No account creation** — just a wallet and USDC on Base
- **Programmatic** — agents can pay for data mid-task without human approval
- **Verifiable** — the server proves what it charges before the agent commits

x402 solves all four.

---

## The Two-Step x402 Flow

### Step 1 — Discovery

The caller makes a normal GET request. If the endpoint requires payment, it returns:

```
HTTP/1.1 402 Payment Required
x402-requires: scheme=exact,network=eip155:8453,amount=10000,maxTimeoutSeconds=300,payTo=0xYourAddress
Content-Type: application/json

{
  "error": "Payment Required",
  "message": "This endpoint requires $0.01 USDC on eip155:8453",
  "required": {
    "scheme": "exact",
    "network": "eip155:8453",
    "amount": "10000",
    "maxTimeoutSeconds": 300,
    "payTo": "0xYourAddress"
  }
}
```

This is free to call. The agent learns the price and destination address before spending anything.

### Step 2 — Pay and Retry

The agent:
1. Fetches a nonce from the `payTo` address via Base RPC
2. Signs an EIP-712 message granting 10,000 USDC to the recipient
3. Submits the signed permit as an on-chain transaction
4. Waits for 1 confirmation (~2s on Base)
5. Retries the endpoint, attaching the `x402-response` header with the transaction hash

The server validates the transaction on-chain before returning data.

---

## Payment Headers Reference

When retrying after payment, the caller sets:

```
x402-response: <tx-hash>
```

The server looks up the transaction by hash and verifies:
- The `to` field matches the server's USDC recipient address
- The `value` or data matches the required amount
- The transaction is confirmed on-chain

---

## Example: One-Line Caller

Using the x402 CLI (from the `x402` package):

```bash
# Install
npm install -g x402

# Set your wallet
export PRIVATE_KEY=0xYourHexKey

# Pay and call in one shot
x402 call https://your-agent.example.com/api/data \
  --pay :0xYourBaseAddress@eip155:8453:10000
```

Using cURL with the x402 proxy flag:

```bash
curl -x https://your-agent.example.com \
  --pay :0xYourBaseAddress@eip155:8453:10000 \
  https://your-agent.example.com/api/data
```

The x402 proxy handles the discovery + pay + retry flow automatically.

---

## For AI Agents (Programmatic Use)

The `examples/x402-caller.js` in this repo shows how to implement the flow in Node.js:

```bash
PRIVATE_KEY=0x... ENDPOINT_URL=https://your-endpoint.com node examples/x402-caller.js
```

Key steps for a custom agent integration:

```javascript
// 1. Make a discovery request
const res = await fetch(endpoint, { headers: { Accept: 'application/json' }});

// 2. If 402, parse the requirement
if (res.status === 402) {
  const header = res.headers.get('x402-requires');
  const params = Object.fromEntries(
    header.split(',').map(p => p.trim().split('='))
  );
  // params.amount, params.network, params.payTo, params.maxTimeoutSeconds

  // 3. Sign and submit payment via EIP-712 permit
  const txHash = await submitUSCPermit({
    amount: params.amount,
    recipient: params.payTo,
    network: params.network,
    privateKey: process.env.PRIVATE_KEY
  });

  // 4. Wait for confirmation
  await waitForConfirmation(txHash, params.network);

  // 5. Retry with proof
  const paidRes = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'x402-response': txHash
    }
  });

  const data = await paidRes.json();
  console.log(data);
}
```

For full EIP-712 permit signing, see the `@spore-sdk/core` package or the x402 official client libraries.

---

## Payment Lifecycle

```
Caller                                    Server
  |                                          |
  |──── GET /api/data ──────────────────────>|
  |<─── 402 { x402-requires: ... } ─────────|
  |     "I charge $0.01, pay to this addr"  |
  |                                          |
  |  [Parse requirement]                     |
  |  [Sign EIP-712 permit]                   |
  |  [Submit tx to Base]                     |
  |                                          |
  |──── GET /api/data ──────────────────────>|
  |     x402-response: 0xabc...              |
  |                                          |
  |              [Validate tx on-chain]       |
  |              [Check amount + recipient]   |
  |                                          |
  |<─── 200 { data: ... } ───────────────────|
  |     "Here is your data"                  |
```

---

## Price Tiers

| Route | Amount | USDC | Notes |
|---|---|---|---|
| `/api/data` | 10000 | $0.01 | Default endpoint |
| `/api/wallet` | 10000 | $0.01 | Per-wallet lookup |
| `/api/token` | 10000 | $0.01 | Per-token lookup |
| `/api/tx` | 20000 | $0.02 | Full tx decoding |
| `/api/history` | 50000 | $0.05 | Historical data |

---

## Networks

x402 supports multiple chains. This starter is configured for Base:

| Chain | Network ID | Symbol |
|---|---|---|
| Base | `eip155:8453` | USDC |
| Polygon | `eip155:137` | USDC |
| Ethereum | `eip155:1` | USDC |
| Algorand | `algod:...` | ALGO |

The `x402-requires` header always specifies the exact network and token required.

---

## Troubleshooting

**Getting 402 with no `x402-requires` header**
→ Server may be misconfigured. Check that x402 middleware is registered before your route handlers.

**Transaction underpriced**
→ The on-chain gas market may have spiked. x402 allows `maxTimeoutSeconds` for this reason — submit a faster tx if needed before the window closes.

**"Insufficient funds"**
→ Your wallet needs USDC on the target network (Base mainnet, not testnet or another L2).

**Permit signature rejected**
→ Ensure the EIP-712 domain matches what the USDC contract expects. Base USDC uses a different domain separator than mainnet Ethereum USDC.

---

## See Also

- [x402 Foundation on GitHub](https://github.com/x402foundation/x402)
- [x402 Protocol Spec](https://github.com/x402foundation/x402/blob/main/SPEC.md)
- [ERC-8004: AI Agent Identity Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [x402 Agent Starter — Full Project](../README.md)