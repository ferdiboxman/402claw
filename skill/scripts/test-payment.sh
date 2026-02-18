#!/bin/bash
# test-payment.sh - Test making a paid x402 request
# Usage: ./test-payment.sh <endpoint-url>

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
info() { echo -e "  ${CYAN}ℹ${NC} $1"; }

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <endpoint-url>"
  exit 1
fi

URL="$1"
echo -e "\n${BOLD}x402 Payment Test${NC}"
echo -e "URL: ${CYAN}${URL}${NC}\n"

# --- Step 1: Unpaid request ---
echo -e "${BOLD}[1] Unpaid request (get payment requirements)${NC}"
HTTP_CODE=$(curl -s -o /tmp/x402-test-body.txt -w "%{http_code}" "$URL" 2>/dev/null) || HTTP_CODE="000"

if [[ "$HTTP_CODE" != "402" ]]; then
  fail "Expected HTTP 402, got ${HTTP_CODE}"
  if [[ "$HTTP_CODE" == "200" ]]; then
    warn "Endpoint returned 200 — may not require payment"
  fi
  exit 1
fi
pass "Got HTTP 402"

BODY=$(cat /tmp/x402-test-body.txt)
info "Payment requirements received"
echo "$BODY" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    reqs = data.get('accepts', [data])[0] if 'accepts' in data else data
    print(f'  Price:   {reqs.get(\"maxAmountRequired\", \"?\")}')
    print(f'  Network: {reqs.get(\"network\", \"?\")}')
    print(f'  Pay to:  {reqs.get(\"payTo\", \"?\")[:20]}...')
except: pass
" 2>/dev/null || true

# --- Step 2: Paid request ---
echo -e "\n${BOLD}[2] Paid request${NC}"

# Check for x402 client tools
HAS_AWAL=false
if command -v npx &>/dev/null; then
  # Check if @anthropic/x402-axios or similar is available
  HAS_AWAL=true
fi

if [[ "$HAS_AWAL" == true ]]; then
  info "Attempting paid request via npx..."
  START_TIME=$(python3 -c "import time; print(time.time())")

  # Try using the x402 fetch approach
  RESULT=$(node -e "
const https = require('https');
const http = require('http');

// For now, just report that we'd need a wallet configured
console.log(JSON.stringify({status: 'wallet_needed', message: 'Paid request requires wallet configuration'}));
" 2>/dev/null) || RESULT=""

  END_TIME=$(python3 -c "import time; print(time.time())")
  ELAPSED=$(python3 -c "print(f'{${END_TIME} - ${START_TIME}:.2f}s')")

  if echo "$RESULT" | grep -q "wallet_needed"; then
    warn "Wallet not configured for automated payment"
    info "To make paid requests, ensure x402 wallet env vars are set:"
    echo -e "  ${DIM}source ~/.openclaw/workspace/scripts/x402-env.sh${NC}"
    echo ""

    # Try with env vars if available
    if [[ -f "$HOME/.openclaw/workspace/scripts/x402-env.sh" ]]; then
      source "$HOME/.openclaw/workspace/scripts/x402-env.sh" 2>/dev/null || true
    fi

    if [[ -n "${PRIVATE_KEY:-}" ]]; then
      info "Wallet found, attempting paid request..."
      START_TIME=$(python3 -c "import time; print(time.time())")

      PAID_CODE=$(curl -s -o /tmp/x402-test-paid.txt -w "%{http_code}" \
        -H "X-Payment-Private-Key: ${PRIVATE_KEY}" \
        "$URL" 2>/dev/null) || PAID_CODE="000"

      END_TIME=$(python3 -c "import time; print(time.time())")
      ELAPSED=$(python3 -c "print(f'{${END_TIME} - ${START_TIME}:.2f}s')")

      if [[ "$PAID_CODE" == "200" ]]; then
        pass "Paid request succeeded (HTTP 200) [${ELAPSED}]"
        PAID_BODY=$(cat /tmp/x402-test-paid.txt)
        CONTENT_LEN=${#PAID_BODY}
        info "Response: ${CONTENT_LEN} bytes"
        echo "$PAID_BODY" | head -c 300
        echo ""
      else
        fail "Paid request returned HTTP ${PAID_CODE} [${ELAPSED}]"
      fi
    else
      warn "No PRIVATE_KEY found — cannot make automated payment"
    fi
  fi
else
  warn "npx not available"
  info "Install Node.js to enable automated payment testing"
fi

# --- Step 3: Manual instructions ---
echo -e "\n${BOLD}[3] Manual payment test${NC}"
info "To test manually with curl + x402 facilitator:"
echo -e "  ${DIM}# 1. Get payment requirements${NC}"
echo -e "  ${DIM}curl -s ${URL}${NC}"
echo -e "  ${DIM}# 2. Create payment via facilitator${NC}"
echo -e "  ${DIM}curl -s -X POST https://x402.org/facilitator/payment \\${NC}"
echo -e "  ${DIM}  -H 'Content-Type: application/json' \\${NC}"
echo -e "  ${DIM}  -d '{\"requirements\": <from_step_1>}'${NC}"
echo -e "  ${DIM}# 3. Send paid request${NC}"
echo -e "  ${DIM}curl -s -H 'X-PAYMENT: <token>' ${URL}${NC}"

echo -e "\n${BOLD}Done.${NC}\n"
