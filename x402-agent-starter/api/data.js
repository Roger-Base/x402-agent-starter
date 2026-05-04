/**
 * x402 Agent Starter - Data Endpoint (Payment Required)
 * Vercel serverless function
 */

export default function handler(req, res) {
  const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '0x0000000000000000000000000000000000000000';
  const NETWORK = 'eip155:84532'; // Base Sepolia
  const PRICE = '0.01 USDC';

  // x402 header constants
  const X402_VERSION = 'x402-version';
  const X402_PAY_TO = 'x402-pay-to';
  const X402_PAYMENT_REQUIRED = 'x402-payment-required';
  const X402_SIGNATURE = 'x402-signature';

  // Check for existing payment headers
  const hasPayment = req.headers[X402_SIGNATURE];
  
  if (!hasPayment) {
    // Return 402 Payment Required
    res.setHeader(X402_VERSION, '1.0');
    res.setHeader(X402_PAY_TO, PAY_TO_ADDRESS);
    res.setHeader(X402_PAYMENT_REQUIRED, JSON.stringify({
      scheme: 'exact',
      network: NETWORK,
      amount: PRICE,
    }));
    return res.status(402).json({
      error: 'Payment Required',
      message: `This endpoint requires payment of ${PRICE}`,
      required: {
        scheme: 'exact',
        network: NETWORK,
        amount: PRICE,
        payTo: PAY_TO_ADDRESS,
      },
    });
  }
  
  // Payment received - return data
  res.json({
    message: 'Payment received!',
    timestamp: new Date().toISOString(),
    data: { hello: 'agent', version: '1.0.0' },
  });
}
