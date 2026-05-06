#!/bin/bash
TUNNEL="${ENDPOINT_URL:-https://citizenship-edward-jets-properties.trycloudflare.com}"
echo "Testing x402 endpoints at $TUNNEL"
test_endpoint() {
  echo -n "GET $1 ... "
  code=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL$1" 2>/dev/null)
  echo "HTTP $code"
}
test_endpoint "/health"
test_endpoint "/api/data"
test_endpoint "/api/wallet/0x42266e6012020f1dA7e87C047e12f0474B35B1F6"
test_endpoint "/api/token/0xA0b86991c6218b36c1d19D4a2e9EbefC0F000000"
test_endpoint "/api/tx/0x0000000000000000000000000000000000000000000000000000000000000000"
test_endpoint "/api/history"
echo "Done."
