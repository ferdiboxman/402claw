#!/usr/bin/env bash
# Test script for x402 Proxy API example
set -euo pipefail

BASE="http://localhost:4023"
PASS=0
FAIL=0

check() {
  local desc="$1" url="$2" expect_status="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null) || status="000"
  if [ "$status" = "$expect_status" ]; then
    echo "✅ $desc (HTTP $status)"
    ((PASS++))
  else
    echo "❌ $desc — expected $expect_status, got $status"
    ((FAIL++))
  fi
}

echo "⛅ x402 Proxy API — Test Suite"
echo "================================"
echo ""

# Health check
check "Health endpoint returns 200" "$BASE/health" "200"

# Weather endpoint should return 402 (payment required)
check "Weather endpoint requires payment (402)" "$BASE/api/weather?lat=52.52&lon=13.41" "402"

# Forecast endpoint should return 402
check "Forecast endpoint requires payment (402)" "$BASE/api/forecast?lat=52.52&lon=13.41&days=3" "402"

# Health response has expected fields
echo ""
echo "── Health response ──"
curl -s "$BASE/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/health"

# Show 402 response details
echo ""
echo "── Weather 402 response ──"
curl -s -i "$BASE/api/weather?lat=52.52&lon=13.41" 2>/dev/null | head -20

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "🎉 All tests passed!" || exit 1
