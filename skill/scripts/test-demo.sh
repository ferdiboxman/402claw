#!/bin/bash
# test-demo.sh - Test our live x402 demo endpoint
# Endpoint: https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILURES=$((FAILURES+1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
info() { echo -e "  ${CYAN}ℹ${NC} $1"; }

FAILURES=0
ENDPOINT="https://clawr-dispatcher.ferdiboxman.workers.dev/t/demo/v1/records"

echo -e "\n${BOLD}════════════════════════════════════════${NC}"
echo -e "${BOLD}  x402 Demo Endpoint Test${NC}"
echo -e "${BOLD}════════════════════════════════════════${NC}"
echo -e "Endpoint: ${CYAN}${ENDPOINT}${NC}\n"

# --- Step 1: Validate 402 ---
echo -e "${BOLD}[1] Validate 402 Response${NC}"
HTTP_CODE=$(curl -s -o /tmp/x402-demo-body.txt -D /tmp/x402-demo-headers.txt -w "%{http_code}" "$ENDPOINT" 2>/dev/null) || HTTP_CODE="000"

if [[ "$HTTP_CODE" == "402" ]]; then
  pass "HTTP 402 Payment Required"
elif [[ "$HTTP_CODE" == "000" ]]; then
  fail "Could not connect to endpoint"
  exit 1
else
  fail "Expected 402, got ${HTTP_CODE}"
fi

BODY=$(cat /tmp/x402-demo-body.txt 2>/dev/null || echo "")
HEADERS=$(cat /tmp/x402-demo-headers.txt 2>/dev/null || echo "")

# --- Step 2: Parse payment requirements ---
echo -e "\n${BOLD}[2] Payment Requirements${NC}"

if echo "$BODY" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "Valid JSON response"

  echo "$BODY" | python3 -c "
import sys, json

data = json.load(sys.stdin)

# Handle various formats
if 'accepts' in data:
    reqs_list = data['accepts']
elif isinstance(data, list):
    reqs_list = data
else:
    reqs_list = [data]

for i, reqs in enumerate(reqs_list):
    if len(reqs_list) > 1:
        print(f'\n  Payment option {i+1}:')
    fields = [
        ('Pay To', 'payTo'),
        ('Network', 'network'),
        ('Amount', 'maxAmountRequired'),
        ('Scheme', 'scheme'),
        ('Resource', 'resource'),
        ('Description', 'description'),
        ('MIME Type', 'mimeType'),
    ]
    for label, key in fields:
        val = reqs.get(key, '')
        if val:
            print(f'  {label:14s}: {val}')

    extra = reqs.get('extra', {})
    if extra:
        print(f'  Extra:')
        for k, v in extra.items():
            print(f'    {k}: {v}')
" 2>/dev/null || warn "Could not parse requirements"

  # Validate required fields
  for field in payTo network maxAmountRequired; do
    if echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
reqs = data.get('accepts', [data])[0] if 'accepts' in data else data
assert reqs.get('$field')
" 2>/dev/null; then
      pass "Has '${field}'"
    else
      fail "Missing '${field}'"
    fi
  done
else
  fail "Response is not valid JSON"
  info "Raw body: ${BODY:0:200}"
fi

# --- Step 3: Bazaar registration info ---
echo -e "\n${BOLD}[3] Bazaar Discovery${NC}"
info "To validate Bazaar discovery for this endpoint:"
echo -e "  ${DIM}${SCRIPT_DIR}/register-bazaar.sh ${ENDPOINT}${NC}"
echo ""

# --- Step 4: Bazaar Discovery Validation ---
echo -e "${BOLD}[4] Bazaar Discovery Validation${NC}"
if [[ -x "${SCRIPT_DIR}/register-bazaar.sh" ]]; then
  info "Running register-bazaar.sh (discovery validator)..."
  echo ""
  "${SCRIPT_DIR}/register-bazaar.sh" "$ENDPOINT" || warn "Validation script exited with error"
else
  warn "register-bazaar.sh not found or not executable"
  info "Run: chmod +x ${SCRIPT_DIR}/register-bazaar.sh"
fi

# --- Summary ---
echo -e "\n${BOLD}════════════════════════════════════════${NC}"
if [[ $FAILURES -eq 0 ]]; then
  echo -e "  ${GREEN}All checks passed ✓${NC}"
else
  echo -e "  ${RED}${FAILURES} check(s) failed ✗${NC}"
fi
echo -e "${BOLD}════════════════════════════════════════${NC}\n"

exit $([[ $FAILURES -eq 0 ]] && echo 0 || echo 1)
