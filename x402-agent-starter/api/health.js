/**
 * x402 Agent Starter - Health Check Endpoint
 * Vercel serverless function
 */

export default function handler(req, res) {
  const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '0x0000000000000000000000000000000000000000';
  const NETWORK = 'eip155:84532'; // Base Sepolia

  res.json({ 
    status: 'ok', 
    x402: 'enabled',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
    version: '1.0.0-demo',
    note: 'For full x402 with facilitator, use @x402/express package'
  });
}
