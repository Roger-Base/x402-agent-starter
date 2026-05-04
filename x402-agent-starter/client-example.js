/**
 * x402 Client Example
 * 
 * How to pay for x402-protected endpoints on Base.
 * 
 * Usage: node client-example.js
 */

import axios from 'axios';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

/**
 * Step 1: Make initial request (will get 402 response)
 */
async function requestWithPayment(address, amount) {
  try {
    const response = await axios.get(`${SERVER_URL}/api/data`, {
      headers: {
        'x402-pay-to': address,
      }
    });
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 402) {
      // This is expected! 402 = Payment Required
      const required = error.response.data.required;
      console.log('💰 Payment Required:', required);
      return { needsPayment: true, required };
    }
    throw error;
  }
}

/**
 * Step 2: Simulate payment (in production, this would be real onchain payment)
 * 
 * For real x402 payments:
 * 1. Get payment requirements from 402 response
 * 2. Send USDC to the pay-to address on Base
 * 3. Create x402-signature header with payment proof
 * 4. Retry request with signature
 */
async function payAndRetry(address, amount) {
  // In production, you would:
  // 1. Use a wallet to send USDC on Base
  // 2. Get transaction receipt
  // 3. Create signature from receipt + request details
  
  const paymentProof = '0xSIMULATED_SIGNATURE'; // Replace with real signature
  
  const response = await axios.get(`${SERVER_URL}/api/data`, {
    headers: {
      'x402-pay-to': address,
      'x402-signature': paymentProof
    }
  });
  
  return response.data;
}

// Example usage
async function main() {
  const myAddress = '0x1234567890123456789012345678901234567890';
  
  console.log('=== x402 Payment Demo ===\n');
  
  // Step 1: Request (expect 402)
  console.log('1. Making request to /api/data...');
  const result = await requestWithPayment(myAddress, '0.01 USDC');
  
  if (result.needsPayment) {
    console.log('\n2. In production:');
    console.log('   - Send', result.required.amount, 'to', result.required.payTo);
    console.log('   - Get payment proof from transaction');
    console.log('   - Retry request with x402-signature header');
    console.log('\n3. Demo complete - server correctly returns 402!');
  }
}

main().catch(console.error);
