/**
 * Agent Pay Endpoint - Minimal x402-compatible payment info endpoint
 * Usage: node agent-pay.js
 */
import express from 'express';

const app = express();

const AGENT_WALLET = process.env.AGENT_WALLET || '0x42266e6012020f1dA7e87C047e12f0474B35B1F6';

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-pay', wallet: AGENT_WALLET });
});

// Agent Pay Endpoint - Returns payment info for any agent to pay
app.get('/api/agent-pay', (req, res) => {
  const { service, amount } = req.query;
  
  const serviceName = service || 'gas-tracker';
  const amountUSDC = amount || '0.1';
  
  res.json({
    service: serviceName,
    amount: amountUSDC,
    pay_to: AGENT_WALLET,
    network: 'eip155:8453',
    currency: 'USDC',
    memo: `Payment for ${serviceName} service`,
    next_step: `Send ${amountUSDC} USDC to ${AGENT_WALLET} on Base, then call service endpoint`,
    created_at: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`🦞 Agent Pay endpoint running on port ${PORT}`);
  console.log(`   Wallet: ${AGENT_WALLET}`);
});
