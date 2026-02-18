#!/bin/bash
# register-bazaar.sh - Verify Bazaar discovery for an x402 endpoint
# Usage: ./register-bazaar.sh <endpoint-url> [facilitator-url]
#
# Bazaar registration is AUTOMATIC via the @x402/extensions/bazaar extension.
# This script validates that your endpoint is properly configured for discovery.

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
info() { echo -e "  ${CYAN}ℹ${NC} $1"; }

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <endpoint-url> [facilitator-url]"
  echo ""
  echo "Validates that an x402 endpoint is configured for Bazaar discovery."
  echo "Bazaar registration happens automatically via the bazaarResourceServerExtension."
  echo ""
  echo "To enable Bazaar discovery in your code:"
  echo "  1. npm install @x402/extensions"
  echo "  2. server.registerExtension(bazaarResourceServerExtension)"
  echo "  3. Add declareDiscoveryExtension() to route configs"
  echo "  4. The facilitator catalogs metadata on first payment"
  exit 1
fi

URL="$1"
FACILITATOR="${2:-https://x402.org/facilitator}"

echo -e "\n${BOLD}x402 Bazaar Discovery Validator${NC}"
echo -e "Endpoint:    ${CYAN}${URL}${NC}"
echo -e "Facilitator: ${CYAN}${FACILITATOR}${NC}\n"

# --- Step 1: Fetch 402 response ---
echo -e "${BOLD}[1] Fetching payment requirements${NC}"
HTTP_CODE=$(curl -s -o /tmp/x402-bazaar-body.txt -D /tmp/x402-bazaar-headers.txt -w "%{http_code}" "$URL" 2>/dev/null) || HTTP_CODE="000"

if [[ "$HTTP_CODE" != "402" ]]; then
  fail "Expected HTTP 402, got ${HTTP_CODE}"
  echo -e "  Your endpoint must return 402 Payment Required for unauthenticated requests."
  exit 1
fi
pass "Got HTTP 402 response"

BODY=$(cat /tmp/x402-bazaar-body.txt 2>/dev/null || echo "")

# --- Step 2: Parse payment requirements ---
echo -e "\n${BOLD}[2] Parsing payment requirements${NC}"
PARSED=$(echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)

reqs = data
if 'accepts' in data and isinstance(data['accepts'], list) and len(data['accepts']) > 0:
    reqs = data['accepts'][0]

result = {
    'payTo': reqs.get('payTo', ''),
    'network': reqs.get('network', ''),
    'maxAmountRequired': reqs.get('maxAmountRequired', reqs.get('price', '')),
    'scheme': reqs.get('scheme', 'exact'),
    'description': reqs.get('description', ''),
    'mimeType': reqs.get('mimeType', ''),
    'extensions': reqs.get('extensions', {}),
}
print(json.dumps(result))
" 2>/dev/null) || { fail "Failed to parse payment requirements"; exit 1; }

pass "Parsed payment requirements"
PAY_TO=$(echo "$PARSED" | python3 -c "import sys,json; print(json.load(sys.stdin)['payTo'])")
NETWORK=$(echo "$PARSED" | python3 -c "import sys,json; print(json.load(sys.stdin)['network'])")
AMOUNT=$(echo "$PARSED" | python3 -c "import sys,json; print(json.load(sys.stdin)['maxAmountRequired'])")
DESCRIPTION=$(echo "$PARSED" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))")

info "Pay to:      ${PAY_TO}"
info "Network:     ${NETWORK}"
info "Amount:      ${AMOUNT}"
[[ -n "$DESCRIPTION" && "$DESCRIPTION" != "None" ]] && info "Description: ${DESCRIPTION}"

# --- Step 3: Check for discovery extension metadata ---
echo -e "\n${BOLD}[3] Checking Bazaar discovery metadata${NC}"
HAS_EXTENSIONS=$(echo "$PARSED" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ext = d.get('extensions', {})
has_discovery = bool(ext)
print('yes' if has_discovery else 'no')
" 2>/dev/null)

if [[ "$HAS_EXTENSIONS" == "yes" ]]; then
  pass "Discovery extension metadata found"
  info "Your endpoint includes declareDiscoveryExtension() metadata"
else
  warn "No discovery extension metadata detected"
  info "Add declareDiscoveryExtension() to your route config for Bazaar indexing"
  info "See: npm install @x402/extensions && import { declareDiscoveryExtension } from '@x402/extensions/bazaar'"
fi

# --- Step 4: Check facilitator discovery endpoint ---
echo -e "\n${BOLD}[4] Checking facilitator discovery${NC}"
ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URL'))")
DISC_CODE=$(curl -s -o /tmp/x402-discovery.txt -w "%{http_code}" \
  "${FACILITATOR}/discovery/resources?type=http&limit=5" 2>/dev/null) || DISC_CODE="000"

if [[ "$DISC_CODE" =~ ^2 ]]; then
  pass "Facilitator discovery endpoint is reachable (HTTP ${DISC_CODE})"
  
  # Check if our endpoint is listed
  FOUND=$(cat /tmp/x402-discovery.txt | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    items = data.get('items', [])
    found = any('$URL' in item.get('resource', '') for item in items)
    print('yes' if found else 'no')
except:
    print('error')
" 2>/dev/null)
  
  if [[ "$FOUND" == "yes" ]]; then
    pass "Endpoint found in Bazaar discovery!"
  else
    warn "Endpoint not yet in Bazaar discovery"
    info "The facilitator catalogs endpoints after processing the first payment"
    info "Make a test payment to trigger cataloging"
  fi
elif [[ "$DISC_CODE" == "000" ]]; then
  warn "Could not connect to facilitator discovery endpoint"
else
  warn "Facilitator discovery returned HTTP ${DISC_CODE}"
fi

# --- Summary ---
echo -e "\n${BOLD}Summary${NC}"
if [[ "$HAS_EXTENSIONS" == "yes" ]]; then
  pass "Endpoint is configured for Bazaar discovery"
  info "Make a payment to trigger facilitator cataloging (if not already listed)"
else
  warn "Endpoint works for x402 payments but lacks Bazaar discovery metadata"
  echo -e "\n  To enable Bazaar discovery, add to your server setup:"
  echo -e "    ${CYAN}import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';${NC}"
  echo -e "    ${CYAN}server.registerExtension(bazaarResourceServerExtension);${NC}"
  echo -e "    ${CYAN}// Then add declareDiscoveryExtension() to each route's extensions${NC}"
fi

echo -e "\n${BOLD}Done.${NC}\n"
