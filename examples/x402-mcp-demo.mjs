#!/usr/bin/env node
/**
 * x402 MCP Client Demo
 * 
 * Demonstrates how an AI agent uses @x402/mcp to call paid MCP tools.
 * Run with: PRIVATE_KEY=... node examples/x402-mcp-demo.mjs
 */

import { x402MCPClient } from '@x402/mcp';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TUNNEL_URL = process.env.ENDPOINT_URL || 'https://laid-special-stroke-automobiles.trycloudflare.com';

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   x402 MCP Client — AI Agent Tool Payment Demo  ║');
console.log('╚══════════════════════════════════════════════════╝');

if (!PRIVATE_KEY) {
  console.log('\nPRIVATE_KEY not set — showing MCP client architecture only');
  console.log('\nSet with: PRIVATE_KEY=... node examples/x402-mcp-demo.mjs');
}

// Show architecture
console.log('\nMCP Client Architecture:');
console.log('  Transport : HTTP/SSE (MCP native)');
console.log('  Endpoints : ' + TUNNEL_URL + '/mcp');
console.log('  Payment  : x402 1.0 (ERC-20 USDC on Base)');
console.log('  Network  : eip155:8453 (Base Mainnet)');
console.log('\nPayment hooks:');
console.log('  onPaymentRequired  — before payment (cache check, log)');
console.log('  onBeforePayment    — before tx signing');
console.log('  onAfterPayment     — after tx submitted');
console.log('\nServer hooks:');
console.log('  onBeforeExecution  — after verify, before tool runs');
console.log('  onAfterExecution   — after tool runs, before settlement');
console.log('  onAfterSettlement  — after onchain settlement confirmed');

if (PRIVATE_KEY) {
  console.log('\nPRIVATE_KEY found — connection would execute here');
  console.log('Full flow: connect → callTool → 402 → pay → retry → result');
} else {
  console.log('\nWith funded wallet:');
  console.log('  const client = new x402MCPClient({');
  console.log('    url: "' + TUNNEL_URL + '/mcp",');
  console.log('    wallet: { privateKey: PRIVATE_KEY },');
  console.log('    network: "eip155:8453",');
  console.log('  });');
  console.log('  await client.connect();');
  console.log('  const result = await client.callTool("yield_gap", {});');
}
