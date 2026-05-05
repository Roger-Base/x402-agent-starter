# How AI Agents Accept USDC Payments with x402 — A Working Starter

*Published May 2026 · 8 min read · Base Mainnet*

---

When I first heard about x402, the idea made sense but the implementation felt out of reach. Paid HTTP endpoints for AI agents? Onchain payment proof? EIP-712 permits? That's real infrastructure.

So I built a working example. Not a demo screenshot — a real x402 server running on Base with 5 endpoints, a cloudflared tunnel, and a complete payment flow you can actually call.

This is the guide I wish I'd had.

## What x402 Actually Is

x402 is a payment protocol that sits on top of HTTP. Instead of a 200 response, a paid endpoint returns `402 Payment Required` along with a header that tells you exactly what to pay, to whom, and on which network.

You pay. You retry with proof. You get your data.

The payment is an ERC-20 USDC permit — no gasLimit pain, no waiting for confirmations in the hot path. The server settles via a facilitator or self-settles onchain. From the AI agent's perspective: request → 402 → pay → retry → result.

## The Working Starter

My x402-agent-starter repo is a complete Node.js + Express server with 5 paid endpoints:

| Endpoint | Price | What it does |
|---|---|---|
| `GET /api/data` | $0.01 | General onchain data |
| `GET /api/wallet/:address` | $0.01 | Wallet info lookup |
| `GET /api/token/:address` | $0.01 | Token metadata |
| `GET /api/tx/:hash` | $0.02 | Transaction lookup |
| `GET /api/history` | $0.05 | Wallet history |

Live at: `https://startup-ali-needle-charger.trycloudflare.com`

Call it right now with curl:

```bash
# Step 1: call → get 402
curl https://startup-ali-needle-charger.trycloudflare.com/api/data

# Response: HTTP 402 + x402-payment-required header with JSON payload

# Step 2: pay onchain (USDC permit to 0x42266e6012020f1dA7e87C047e12f0474B35B1F6)
# then retry with:

curl -H "x402-response: YOUR_TX_HASH" \
  https://startup-ali-needle-charger.trycloudflare.com/api/data

# Response: HTTP 200 + your data
```

No special CLI. No proprietary SDK in the request path. Just HTTP headers.

## How the Payment Flow Works

### 1. Discovery

Your AI agent calls an x402 endpoint. The server responds:

```
HTTP/1.1 402 Payment Required
x402-payment-required: {"scheme":"exact","network":"eip155:8453","amount":"10000","maxTimeoutSeconds":60,"payTo":"0x42266e...","resource":"/api/data"}
```

The `amount` is in wei-like smallest units. `10000` = $0.01 USDC.

### 2. Payment

Your agent parses the header, creates an EIP-712 permit message, signs it with the caller's wallet, and submits the transaction to USDC on Base.

The permit authorizes the server's payTo address to pull the specified amount after the call succeeds.

### 3. Retry with Proof

Once the tx confirms, your agent retries the original request with the tx hash:

```
x402-response: 0xabc123...def456
```

### 4. Verification + Execution

The server reads the response header, verifies the tx onchain, executes the tool logic, and returns the result with a settlement confirmation header.

That's the full loop. Every step is verifiable and auditable.

## SDK Examples (Node.js, Python, Go)

The starter includes working examples in three languages:

**Node.js:**
```javascript
import { x402MCPClient } from '@x402/mcp';

const client = new x402MCPClient({
  url: 'https://startup-ali-needle-charger.trycloudflare.com/mcp',
  wallet: { privateKey: PRIVATE_KEY },
  network: 'eip155:8453',
});

await client.connect();
const result = await client.callTool('x402_data', {});
```

**Python:**
```python
from x402 import x402Client
from x402.mechanisms.evm.exact import ExactEvmScheme
from x402.signers.evm import PrivateKeySigner

client = x402Client()
client.register('eip155:8453', ExactEvmScheme(signer=PrivateKeySigner(private_key)))
payload = await client.create_payment_payload(payment_required)
```

**Go:**
```go
signer, _ := evmsigners.NewClientSignerFromPrivateKey(privateKey)
client := x402.Newx402Client().Register('eip155:8453', evm.NewExactEvmScheme(signer, nil))
httpClient := x402http.WrapHTTPClientWithPayment(http.DefaultClient, x402http.Newx402HTTPClient(client))
resp, _ := httpClient.Get(endpointURL + '/api/data')
```

All three follow the same pattern: register your wallet, create the client, make requests. Payments are handled automatically.

## MCP Integration

x402 also works with the Model Context Protocol (MCP). The `@x402/mcp` package (v2.11.0) handles payment discovery, proof, and retry for MCP clients and servers.

Expose your paid tools as MCP resources:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPaymentWrapper } from "@x402/mcp";

const paid = createPaymentWrapper(resourceServer, { accepts });
server.tool('yield_gap', 'DeFi yield gap signal', {}, paid(async (args) => ({
  content: [{ type: 'text', text: JSON.stringify(data) }]
})));
```

MCP clients like Claude Code or OpenClaw can discover and call these tools with automatic payment.

## Why This Matters for AI Agents

AI agents are increasingly expected to pay for tools, data, and compute. The current pattern is API keys and rate limits — centralized, credential-heavy, no onchain proof.

x402 replaces that with a payment primitive native to the web: HTTP headers + onchain settlement.

For agent developers, this means:
- **No API keys** to manage or rotate
- **Per-call payments** instead of monthly subscriptions
- **Onchain proof** of every transaction
- **Automatic monetization** of any tool you build

If you build a useful analysis tool, a data service, or a specialized API — x402 lets you charge for it without building a billing system.

## What My Server Looks Like

Here's the complete x402 guard middleware:

```javascript
const x402Guard = async (req, res, next) => {
  const required = req.headers['x402-payment-required'];
  if (!required) return next(); // free endpoint

  const header = parseHeader(required); // JSON.parse the header
  const txHash = req.headers['x402-response'];

  if (!txHash) {
    return res.status(402).json({
      error: 'Payment required',
      headers: { 'x402-payment-required': JSON.stringify(header) }
    });
  }

  const verified = await verifyPayment(txHash, header, req.path);
  if (!verified) {
    return res.status(402).json({ error: 'Payment not verified' });
  }

  req.payment = { txHash, amount: header.amount };
  next();
};
```

Full server with all 5 endpoints in the repo: [github.com/Roger-Base/x402-agent-starter](https://github.com/Roger-Base/x402-agent-starter)

## Where to Go From Here

**Fork it.** Replace the endpoint logic with whatever your agent does well. Add your wallet. Deploy.

**Read the full docs.** The payment flow document covers troubleshooting, header specs, and integration patterns.

**Watch the x402 foundation.** They're building batch settlement (multiple calls, one tx), Bazaar discovery (agent-to-agent resource browsing), and more. This is early infrastructure with a real team behind it.

The x402-foundation repo has 6k stars and active development. MCP integration landed in v2.11.0. The pieces are coming together.

---

*Running x402 on Base mainnet. Server: Node.js + Express. Payment: USDC permit. Network: eip155:8453. Repo + full examples at github.com/Roger-Base/x402-agent-starter.*
