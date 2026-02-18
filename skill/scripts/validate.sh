#!/bin/bash
# validate.sh - Validate an x402 endpoint
# Usage: ./validate.sh <endpoint-url>

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILURES=$((FAILURES+1)); }
info() { echo -e "  ${CYAN}ℹ${NC} $1"; }

FAILURES=0

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <endpoint-url>"
  exit 1
fi

URL="$1"
echo -e "\n${BOLD}x402 Endpoint Validation${NC}"
echo -e "URL: ${CYAN}${URL}${NC}\n"

# --- Test 1: Expect HTTP 402 ---
echo -e "${BOLD}[1] HTTP 402 Response${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -o /tmp/x402-validate-body.txt -D /tmp/x402-validate-headers.txt "$URL" 2>&1) || true
HTTP_CODE=$(tail -1 /tmp/x402-validate-body.txt 2>/dev/null || echo "000")
# Re-do with proper separation
HTTP_CODE=$(curl -s -o /tmp/x402-validate-body.txt -D /tmp/x402-validate-headers.txt -w "%{http_code}" "$URL" 2>/dev/null) || HTTP_CODE="000"

if [[ "$HTTP_CODE" == "402" ]]; then
  pass "Received HTTP 402 Payment Required"
else
  fail "Expected HTTP 402, got ${HTTP_CODE}"
fi

# --- Test 2: Payment info in response ---
echo -e "\n${BOLD}[2] Payment Information${NC}"
BODY=$(cat /tmp/x402-validate-body.txt 2>/dev/null || echo "")
HEADERS=$(cat /tmp/x402-validate-headers.txt 2>/dev/null || echo "")

HAS_HEADER=false
HAS_JSON=false

if echo "$HEADERS" | grep -qi "x-payment\|www-authenticate\|x402\|payment-requires"; then
  HAS_HEADER=true
  pass "Payment header found in response"
else
  info "No standard payment header detected"
fi

if echo "$BODY" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  HAS_JSON=true
  pass "Response body is valid JSON"
else
  info "Response body is not JSON"
fi

if [[ "$HAS_HEADER" == false && "$HAS_JSON" == false ]]; then
  fail "No payment information found in headers or body"
fi

# --- Test 3: Payment requirements format ---
echo -e "\n${BOLD}[3] Payment Requirements Format${NC}"

# Try to extract payment requirements from JSON body
if [[ "$HAS_JSON" == true ]]; then
  # Check for common x402 fields - could be top-level or nested under paymentRequirements/accepts
  check_field() {
    local field="$1" label="$2"
    if echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
def find(obj, key):
    if isinstance(obj, dict):
        if key in obj: return True
        return any(find(v, key) for v in obj.values())
    if isinstance(obj, list):
        return any(find(i, key) for i in obj)
    return False
sys.exit(0 if find(data, key) else 1)
" "$field" 2>/dev/null; then
      pass "Found '${label}' in payment requirements"
    else
      fail "Missing '${label}' in payment requirements"
    fi
  }

  # x402 standard fields
  check_field "maxAmountRequired" "price/maxAmountRequired"
  check_field "network" "network"
  check_field "payTo" "payTo"

  # Show parsed info
  echo ""
  info "Payment details:"
  echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(json.dumps(data, indent=2)[:500])
" 2>/dev/null || true
else
  fail "Cannot validate payment requirements format (no JSON body)"
fi

# --- Summary ---
echo -e "\n${BOLD}━━━ Summary ━━━${NC}"
if [[ $FAILURES -eq 0 ]]; then
  echo -e "${GREEN}All checks passed ✓${NC}\n"
  exit 0
else
  echo -e "${RED}${FAILURES} check(s) failed ✗${NC}\n"
  exit 1
fi
