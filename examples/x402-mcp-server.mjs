#!/usr/bin/env node
/**
 * x402 MCP Server Pattern
 * 
 * Shows how to expose x402-protected endpoints as MCP tools.
 * Pattern: createPaymentWrapper + MCP server + x402Guard middleware
 * 
 * See server.js for the full working x402 endpoints.
 * See examples/x402-mcp-demo.mjs for the client side.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPaymentWrapper, x402ResourceServer } from "@x402/mcp";
import { z } from "zod";

const PAY_TO = process.env.PAY_TO_ADDRESS || '0x42266e6012020f1dA7e87C047e12f0474B35B1F6';

console.log('x402 MCP Server Pattern');
console.log('  Pay to   :', PAY_TO);
console.log('  Network  : eip155:8453');
console.log('\nMCP tool registration:');
console.log('  const server = new McpServer({ name: "x402-tools", version: "1.0.0" });');
console.log('  const paid = createPaymentWrapper(resourceServer, { accepts });');
console.log('  server.tool("yield_gap", "DeFi yield gap", {}, paid(async (args) => ({');
console.log('    content: [{ type: "text", text: JSON.stringify(data) }]');
console.log('  })));');
console.log('  await server.connect(stdioTransport);');
