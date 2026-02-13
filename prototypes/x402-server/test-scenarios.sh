#!/bin/bash
#
# x402 Prototype Test Scenarios
#
# This script demonstrates different scenarios when interacting with an x402-protected API.
# It starts/stops the local server automatically by default.
#

set -euo pipefail

SERVER="http://localhost:4021"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_PID=""

print_json() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

if [[ "${SKIP_START:-0}" != "1" ]]; then
  trap cleanup EXIT
  X402_ENV=test PORT=4021 node "$ROOT_DIR/server.js" >/tmp/x402-server.log 2>&1 &
  SERVER_PID=$!

  for _ in {1..40}; do
    if curl -s "$SERVER/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
fi

echo "=============================================="
echo "  x402 Prototype - Test Scenarios"
echo "=============================================="
echo ""

# ---- Scenario 1: Free Endpoint ----
echo "📗 Scenario 1: Free Endpoint (should succeed)"
echo "----------------------------------------------"
echo "Request: GET /health"
echo ""
curl -s "$SERVER/health" | print_json
echo ""
echo ""

# ---- Scenario 2: Pricing Info ----
echo "📗 Scenario 2: Pricing Info (free)"
echo "----------------------------------------------"
echo "Request: GET /pricing"
echo ""
curl -s "$SERVER/pricing" | print_json
echo ""
echo ""

# ---- Scenario 3: Paid Endpoint Without Payment ----
echo "📕 Scenario 3: Paid Endpoint WITHOUT Payment"
echo "----------------------------------------------"
echo "Request: GET /data (no payment header)"
echo "Expected: HTTP 402 Payment Required"
echo ""
echo "Response Status:"
curl -s -o /dev/null -w "%{http_code}" "$SERVER/data"
echo ""
echo ""
echo "Full Response Headers:"
curl -s -D - -o /dev/null "$SERVER/data" | head -20
echo ""
echo ""

# ---- Scenario 4: Inspect 402 Response ----
echo "📙 Scenario 4: Inspect 402 Response Details"
echo "----------------------------------------------"
echo "Looking at PAYMENT-REQUIRED header..."
echo ""
# Get the full response with headers
PAYMENT_REQUIRED=$(curl -s -D - "$SERVER/data" | grep -i "payment-required" || echo "Header not found - checking body...")
echo "PAYMENT-REQUIRED Header:"
echo "$PAYMENT_REQUIRED"
echo ""
echo "Response Body:"
curl -s "$SERVER/data" | print_json
echo ""
echo ""

# ---- Scenario 5: Different Endpoints ----
echo "📙 Scenario 5: Different Paid Endpoints"
echo "----------------------------------------------"
echo ""
echo "GET /data/premium (1 cent):"
curl -s -o /dev/null -w "  Status: %{http_code}\n" "$SERVER/data/premium"
echo ""
echo "GET /csv (0.5 cents):"
curl -s -o /dev/null -w "  Status: %{http_code}\n" "$SERVER/csv"
echo ""
echo "GET /csv/filtered (0.2 cents):"
curl -s -o /dev/null -w "  Status: %{http_code}\n" "$SERVER/csv/filtered"
echo ""
echo ""

# ---- Scenario 6: 404 for unknown endpoints ----
echo "📗 Scenario 6: Unknown Endpoint"
echo "----------------------------------------------"
echo "Request: GET /unknown"
echo ""
curl -s "$SERVER/unknown" | print_json
echo ""
echo ""

echo "=============================================="
echo "  Summary"
echo "=============================================="
echo ""
echo "✅ Free endpoints (/health, /pricing) - No payment required"
echo "❌ Paid endpoints (/data, /csv) - Return 402 without payment"
echo ""
echo "To make a paid request, you need:"
echo "1. A wallet with testnet USDC on Base Sepolia"
echo "2. An x402 client SDK to sign the payment"
echo "3. Include the PAYMENT-SIGNATURE header in your request"
echo ""
if [[ -n "$SERVER_PID" ]]; then
  echo "Server logs were written to /tmp/x402-server.log"
  echo ""
fi
echo "See client.js for an example client implementation."
echo "=============================================="
