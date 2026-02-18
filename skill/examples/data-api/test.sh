#!/bin/bash
BASE_URL="${1:-http://localhost:4021}"

echo "Testing x402 Data API at $BASE_URL"
echo ""

echo "--- Health check (free) ---"
curl -s "$BASE_URL" | head -c 500
echo ""
echo ""

echo "--- Testing 402 response: /api/models ---"
curl -s -w "\nHTTP %{http_code}\n" "$BASE_URL/api/models"
echo ""

echo "--- Testing 402 response: /api/models/gpt-4o ---"
curl -s -w "\nHTTP %{http_code}\n" "$BASE_URL/api/models/gpt-4o"
echo ""

echo "--- Testing 402 response: /api/models/compare ---"
curl -s -w "\nHTTP %{http_code}\n" "$BASE_URL/api/models/compare?models=GPT-4o,Claude%203.5%20Sonnet"
echo ""

echo "--- To pay and access, use: ---"
echo "npx x402-fetch $BASE_URL/api/models"
echo "npx x402-fetch $BASE_URL/api/models/gpt-4o"
echo "npx x402-fetch \"$BASE_URL/api/models/compare?models=GPT-4o,Claude 3.5 Sonnet\""
