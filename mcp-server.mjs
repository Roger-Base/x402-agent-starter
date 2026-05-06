#!/usr/bin/env node
/**
 * x402 MCP Server — MCP transport for x402 endpoints
 * 
 * Exposes x402-gated endpoints as MCP tools via STDIO transport.
 * AI agents using @x402/mcp client can call these tools with automatic payment.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPaymentWrapper } from "@x402/mcp";
import { z } from "zod";

const TUNNEL_URL = process.env.TUNNEL_URL || 'https://controlling-coal-throw-between.trycloudflare.com';
const PAY_TO = process.env.PAY_TO_ADDRESS || '0x42266e6012020f1dA7e87C047e12f0474B35B1F6';

async function main() {
  console.error('[x402-mcp] Starting MCP server on STDIO transport');
  
  const server = new McpServer({
    name: "x402-agent-starter",
    version: "1.1.0",
  });

  const accepts = [{
    scheme: "exact",
    network: "eip155:8453",
    amount: "0.01",
    maxTimeoutSeconds: 60,
    payTo: PAY_TO,
  }];

  const paid = createPaymentWrapper(null, { accepts });

  server.tool("x402_data", "Fetch general onchain data. Costs $0.01 USDC.", {}, paid(async () => {
    const res = await fetch(TUNNEL_URL + '/api/data');
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }));

  server.tool("x402_wallet", "Look up wallet info. Costs $0.01 USDC.", { address: z.string() }, paid(async ({ address }) => {
    const res = await fetch(TUNNEL_URL + '/api/wallet/' + address);
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }));

  server.tool("x402_token", "Look up token info. Costs $0.01 USDC.", { address: z.string() }, paid(async ({ address }) => {
    const res = await fetch(TUNNEL_URL + '/api/token/' + address);
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }));

  server.tool("x402_tx", "Look up transaction. Costs $0.02 USDC.", { hash: z.string() }, paid(async ({ hash }) => {
    const res = await fetch(TUNNEL_URL + '/api/tx/' + hash);
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }));

  server.tool("x402_history", "Fetch wallet history. Costs $0.05 USDC.", { address: z.string().optional() }, paid(async ({ address }) => {
    const url = address ? TUNNEL_URL + '/api/history?address=' + address : TUNNEL_URL + '/api/history';
    const res = await fetch(url);
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }));

  server.tool("x402_health", "Health check", {}, async () => {
    return { content: [{ type: "text", text: JSON.stringify({ status: "ok" }) }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
