#!/usr/bin/env bash
set -euo pipefail

# scaffold.sh - Interactive x402 project generator
# Usage: ./scaffold.sh [--name NAME] [--target TARGET] [--wallet ADDRESS]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$SKILL_DIR/templates"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }

# Parse flags
PROJECT_NAME=""
TARGET=""
WALLET=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --name)   PROJECT_NAME="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --wallet) WALLET="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo -e "\n${GREEN}🐾 Clawr Scaffold${NC} — Create an x402 paid API\n"

# Project name
if [[ -z "$PROJECT_NAME" ]]; then
  read -rp "Project name: " PROJECT_NAME
fi
PROJECT_NAME="${PROJECT_NAME:-my-x402-api}"

# Deployment target
if [[ -z "$TARGET" ]]; then
  echo ""
  echo "Deployment target:"
  echo "  1) express    — Node.js + Express"
  echo "  2) nextjs     — Next.js API routes"
  echo "  3) cloudflare — Cloudflare Workers"
  echo "  4) fastapi    — Python + FastAPI"
  echo ""
  read -rp "Choose [1-4]: " choice
  case $choice in
    1|express)    TARGET="express" ;;
    2|nextjs)     TARGET="nextjs" ;;
    3|cloudflare) TARGET="cloudflare" ;;
    4|fastapi)    TARGET="fastapi" ;;
    *) TARGET="express" ;;
  esac
fi

# Wallet address
if [[ -z "$WALLET" ]]; then
  read -rp "Wallet address (0x...): " WALLET
fi

if [[ ! "$WALLET" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  warn "Wallet address looks invalid. Continuing anyway."
fi

# Create project directory
DEST="$(pwd)/$PROJECT_NAME"
if [[ -d "$DEST" ]]; then
  warn "Directory $PROJECT_NAME already exists."
  read -rp "Overwrite? [y/N]: " confirm
  [[ "$confirm" =~ ^[yY]$ ]] || exit 1
  rm -rf "$DEST"
fi

info "Creating $PROJECT_NAME with $TARGET template..."

TEMPLATE_SRC="$TEMPLATES_DIR/$TARGET"
if [[ ! -d "$TEMPLATE_SRC" ]]; then
  warn "Template directory not found at $TEMPLATE_SRC"
  warn "Creating minimal project structure instead."
  mkdir -p "$DEST"

  if [[ "$TARGET" == "fastapi" ]]; then
    cat > "$DEST/main.py" << 'PYEOF'
from fastapi import FastAPI, Response
import json

app = FastAPI()
WALLET = "__WALLET__"
PRICE = "$0.001"

@app.get("/api/data")
async def data(response: Response):
    # x402 paywall
    response.status_code = 402
    return {
        "x402Version": 1,
        "accepts": [{
            "scheme": "exact",
            "network": "base-mainnet",
            "maxAmountRequired": "1000",
            "resource": f"https://your-domain.com/api/data",
            "payTo": WALLET,
            "extra": {"name": "Data API", "description": "Pay-per-request data"}
        }]
    }
PYEOF
    sed -i '' "s/__WALLET__/$WALLET/g" "$DEST/main.py" 2>/dev/null || sed -i "s/__WALLET__/$WALLET/g" "$DEST/main.py"

    cat > "$DEST/requirements.txt" << 'EOF'
fastapi>=0.100.0
uvicorn>=0.23.0
EOF
    info "Installing Python dependencies..."
    cd "$DEST" && python3 -m pip install -r requirements.txt --quiet 2>/dev/null || warn "pip install failed — install manually"
  else
    # Node.js variants
    cat > "$DEST/package.json" << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "npx tsx watch server.ts",
    "start": "npx tsx server.ts"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@anthropic-ai/sdk": "^0.20.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.0.0"
  }
}
EOF

    cat > "$DEST/server.ts" << 'TSEOF'
import express from "express";

const app = express();
const WALLET = "__WALLET__";
const PORT = process.env.PORT || 3000;

app.get("/api/data", (req, res) => {
  const payment = req.headers["x-payment"];
  if (!payment) {
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: "base-mainnet",
        maxAmountRequired: "1000", // $0.001 USDC (6 decimals)
        resource: `${req.protocol}://${req.get("host")}/api/data`,
        payTo: WALLET,
        extra: { name: "__PROJECT__", description: "x402 paid API" }
      }]
    });
  }
  // Payment header present — serve content
  res.json({ message: "Paid content delivered!", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`🐾 ${PORT}`));
TSEOF
    sed -i '' "s/__WALLET__/$WALLET/g" "$DEST/server.ts" 2>/dev/null || sed -i "s/__WALLET__/$WALLET/g" "$DEST/server.ts"
    sed -i '' "s/__PROJECT__/$PROJECT_NAME/g" "$DEST/server.ts" 2>/dev/null || sed -i "s/__PROJECT__/$PROJECT_NAME/g" "$DEST/server.ts"

    info "Installing dependencies..."
    cd "$DEST" && npm install --quiet 2>/dev/null || warn "npm install failed — run manually"
  fi
else
  cp -r "$TEMPLATE_SRC" "$DEST"
  # Replace placeholders in all files
  find "$DEST" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.py" -o -name "*.toml" -o -name "*.md" \) -exec sh -c '
    sed -i "" "s/__WALLET__/'"$WALLET"'/g" "$1" 2>/dev/null || sed -i "s/__WALLET__/'"$WALLET"'/g" "$1"
    sed -i "" "s/__PROJECT__/'"$PROJECT_NAME"'/g" "$1" 2>/dev/null || sed -i "s/__PROJECT__/'"$PROJECT_NAME"'/g" "$1"
  ' _ {} \;

  cd "$DEST"
  if [[ -f "requirements.txt" ]]; then
    info "Installing Python dependencies..."
    python3 -m pip install -r requirements.txt --quiet 2>/dev/null || warn "pip install failed"
  elif [[ -f "package.json" ]]; then
    info "Installing Node dependencies..."
    npm install --quiet 2>/dev/null || warn "npm install failed"
  fi
fi

echo ""
success "Project created at ./$PROJECT_NAME"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  cd $PROJECT_NAME"
if [[ "$TARGET" == "fastapi" ]]; then
  echo "  uvicorn main:app --reload"
else
  echo "  npm run dev"
fi
echo ""
echo "  Then validate:  clawr validate http://localhost:${PORT:-3000}/api/data"
echo "  Register:       clawr register http://your-domain.com/api/data"
echo ""
