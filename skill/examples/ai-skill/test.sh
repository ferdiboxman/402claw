#!/usr/bin/env bash
# Test the SEO Analyzer endpoint
# Usage: bash test.sh [url]

URL="${1:-https://example.com}"
SERVER="http://localhost:4022"

echo "🔍 Testing SEO Analyzer"
echo "   Target: $URL"
echo "   Server: $SERVER"
echo ""

# Health check
echo "--- Health Check ---"
curl -s "$SERVER/" | jq .
echo ""

# Analysis (will get 402 without payment header in production)
echo "--- SEO Analysis ---"
curl -s -X POST "$SERVER/api/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\"}" | jq .
