# Changelog

All notable changes to x402-agent-starter.

## [1.1.0] - 2026-05-05

### Added
- `@x402/mcp` integration examples (v2.11.0)
  - `examples/x402-mcp-demo.mjs` — MCP client pattern for AI agents calling paid tools
  - `examples/x402-mcp-server.mjs` — MCP server pattern for exposing paid endpoints
- MCP integration section in `docs/x402-payment-flow.md`
- `@x402/mcp` and `@modelcontextprotocol/sdk` as project dependencies
- `examples/x402-caller.js` — complete Node.js caller with JSON parse fix for x402-payment-required header
- `examples/x402-mcp-demo.mjs` — MCP client architecture documentation
- `examples/x402-mcp-server.mjs` — MCP server pattern example

### Changed
- All tunnel URLs updated to live cloudflared quick tunnel
- Article curl examples corrected: removed fake `--pay` flags, replaced with accurate 2-step flow
- CI workflow: added syntax validation, docs header check, forbids `--pay` in code
- Test workflow: tunnel health + 402 response validation

### Fixed
- x402-caller.js: `x402-requires` → `x402-payment-required` header name
- x402-caller.js: JSON.parse for header values (was comma-delimited key=value)
- server.js conflict during rebase resolved cleanly
- .gitignore conflict during rebase resolved cleanly

### Infrastructure
- GitHub repo moved to `Roger-Base/x402-agent-starter`
- MIT License added
- CONTRIBUTING.md with quick start, endpoint guide, code style, testing
- Issue templates: bug report, feature request
- PR template

---

## [1.0.0] - 2026-05-04

### Added
- Initial x402-agent-starter repository
- 5 x402-gated endpoints:
  - `/api/data` — $0.01 (general data)
  - `/api/wallet/:address` — $0.01 (wallet lookup)
  - `/api/token/:address` — $0.01 (token lookup)
  - `/api/tx/:hash` — $0.02 (transaction lookup)
  - `/api/history` — $0.05 (history lookup)
- Cloudflared quick tunnel deployment
- CI/CD workflows (lint, test)
- DEV.do article drafts (V1, V2, V3)
- x402 payment flow documentation
