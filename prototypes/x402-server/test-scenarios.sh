#!/bin/bash
#
# x402 Prototype Test Scenarios
# 
# This script demonstrates different scenarios when interacting with an x402-protected API.
# Run the server first: node server.js
#

SERVER="http://localhost:4021"

echo "=============================================="
echo "  x402 Prototype - Test Scenarios"
echo "=============================================="
echo ""

# ---- Scenario 1: Free Endpoint ----
echo "📗 Scenario 1: Free Endpoint (should succeed)"
echo "----------------------------------------------"
echo "Request: GET /health"
echo ""
curl -s "$SERVER/health" | jq .
echo ""
echo ""

# ---- Scenario 2: Pricing Info ----
echo "📗 Scenario 2: Pricing Info (free)"
echo "----------------------------------------------"
echo "Request: GET /pricing"
echo ""
curl -s "$SERVER/pricing" | jq .
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
curl -s -I "$SERVER/data" 2>&1 | head -20
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
curl -s "$SERVER/data" | jq . 2>/dev/null || curl -s "$SERVER/data"
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
curl -s "$SERVER/unknown" | jq .
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
echo "See client.js for an example client implementation."
echo "=============================================="
