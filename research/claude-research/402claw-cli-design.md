# 402claw CLI Design Specification

> The simplest way to deploy paid APIs. For agents and humans.

## Overview

```
402claw <command> [options]
```

**Global Flags (all commands):**
| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for programmatic use) |
| `--quiet`, `-q` | Suppress non-essential output |
| `--verbose`, `-v` | Show detailed output |
| `--help`, `-h` | Show help for command |
| `--version` | Show version |

---

## 1. Authentication

### `402claw login`

Link your wallet and authenticate with the 402claw registry.

```bash
402claw login [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--wallet <address>` | Ethereum wallet address | Interactive prompt |
| `--private-key <key>` | Private key (not recommended, use env) | - |
| `--keychain` | Use macOS Keychain / system keyring | ✓ (default) |
| `--network <network>` | Blockchain network | `base` |

**Example:**
```bash
# Interactive login (recommended)
$ 402claw login
? Enter your wallet address: 0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
? How do you want to store your private key?
  > System Keychain (recommended)
    Environment variable
    Config file (not recommended)

✓ Wallet linked: 0x5C78...D0F
✓ Network: Base (Chain ID 8453)
✓ Credentials stored in system keychain

You're ready to deploy! Try: 402claw deploy --help

# Non-interactive (for CI/agents)
$ 402claw login --wallet 0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F --keychain
✓ Logged in as 0x5C78...D0F
```

**JSON Output:**
```json
{
  "success": true,
  "wallet": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "network": "base",
  "chainId": 8453
}
```

---

### `402claw logout`

Remove stored credentials.

```bash
402claw logout [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--force`, `-f` | Skip confirmation |

**Example:**
```bash
$ 402claw logout
? Are you sure? This will remove all stored credentials. (y/N) y
✓ Logged out. Credentials removed.
```

---

### `402claw whoami`

Show current authentication status.

```bash
402claw whoami
```

**Example:**
```bash
$ 402claw whoami
Wallet:  0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
Network: Base (8453)
Balance: $12.45 USDC
APIs:    3 deployed
Earned:  $847.23 lifetime
```

**JSON Output:**
```json
{
  "wallet": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "network": "base",
  "chainId": 8453,
  "balance": {
    "usdc": "12.45",
    "raw": "12450000"
  },
  "stats": {
    "apiCount": 3,
    "lifetimeEarnings": "847.23"
  }
}
```

---

## 2. Deployment

### `402claw deploy`

Deploy a file or function as a paid API.

```bash
402claw deploy <source> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<source>` | File to deploy (CSV, JSON, Python, JavaScript) |

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--price <amount>` | Price per request in USDC | `0.001` |
| `--name <name>` | API name (slug) | Derived from filename |
| `--description <desc>` | Human-readable description | - |
| `--public` | List in public registry | `true` |
| `--private` | Don't list publicly | `false` |
| `--rate-limit <n>` | Max requests per minute per caller | `60` |
| `--timeout <ms>` | Request timeout in milliseconds | `30000` |
| `--env <KEY=value>` | Environment variable (repeatable) | - |
| `--env-file <path>` | Load env vars from file | - |
| `--dry-run` | Validate without deploying | `false` |

**Example:**
```bash
# Deploy a CSV dataset
$ 402claw deploy companies.csv --price 0.001 --name fortune500
Deploying companies.csv...

✓ Deployed: fortune500
  URL:      https://api.402claw.com/v1/fortune500
  Price:    $0.001 per request
  Type:     CSV (500 rows, 12 columns)

  Auto-generated endpoints:
    GET  /v1/fortune500           → All data (paginated)
    GET  /v1/fortune500/:id       → Single row by ID
    GET  /v1/fortune500/search    → Search by any column
    GET  /v1/fortune500/schema    → Column definitions

  Test it:
    402claw call fortune500 --params '{"limit": 5}'
```

**JSON Output:**
```json
{
  "success": true,
  "api": {
    "name": "fortune500",
    "url": "https://api.402claw.com/v1/fortune500",
    "price": "0.001",
    "type": "csv",
    "endpoints": [
      {"method": "GET", "path": "/v1/fortune500", "description": "All data (paginated)"},
      {"method": "GET", "path": "/v1/fortune500/:id", "description": "Single row by ID"},
      {"method": "GET", "path": "/v1/fortune500/search", "description": "Search"},
      {"method": "GET", "path": "/v1/fortune500/schema", "description": "Schema"}
    ],
    "metadata": {
      "rows": 500,
      "columns": 12
    }
  }
}
```

---

### `402claw update`

Update an existing deployment.

```bash
402claw update <name> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--source <file>` | New source file |
| `--price <amount>` | Update price |
| `--description <desc>` | Update description |
| `--rate-limit <n>` | Update rate limit |
| `--pause` | Pause the API (stops serving) |
| `--resume` | Resume a paused API |

**Example:**
```bash
$ 402claw update fortune500 --price 0.002
✓ Updated fortune500
  Price: $0.001 → $0.002
```

---

### `402claw undeploy`

Remove an API deployment.

```bash
402claw undeploy <name> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--force`, `-f` | Skip confirmation |

**Example:**
```bash
$ 402claw undeploy fortune500
? This will permanently remove the API. Continue? (y/N) y
✓ Removed: fortune500
```

---

## 3. List & Status

### `402claw list`

List your deployed APIs.

```bash
402claw list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--all`, `-a` | Include paused APIs | `false` |
| `--sort <field>` | Sort by: name, price, calls, earnings | `name` |

**Example:**
```bash
$ 402claw list

Your APIs (3 deployed)

  NAME          PRICE    CALLS (24h)  EARNINGS (24h)  STATUS
  ─────────────────────────────────────────────────────────
  fortune500    $0.001   1,234        $1.23           ✓ active
  weather-api   $0.002   567          $1.13           ✓ active  
  ai-summary    $0.01    89           $0.89           ⏸ paused

  Total earnings (24h): $3.25
```

**JSON Output:**
```json
{
  "apis": [
    {
      "name": "fortune500",
      "url": "https://api.402claw.com/v1/fortune500",
      "price": "0.001",
      "status": "active",
      "stats": {
        "calls24h": 1234,
        "earnings24h": "1.23"
      }
    }
  ],
  "summary": {
    "total": 3,
    "active": 2,
    "paused": 1,
    "earnings24h": "3.25"
  }
}
```

---

### `402claw stats`

Detailed statistics for an API or all APIs.

```bash
402claw stats [name] [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--period <period>` | Time period: 1h, 24h, 7d, 30d, all | `24h` |
| `--breakdown` | Show hourly/daily breakdown | `false` |

**Example:**
```bash
$ 402claw stats fortune500 --period 7d

fortune500 - Last 7 days

  Calls:        8,432
  Earnings:     $8.43
  Avg latency:  45ms
  Error rate:   0.2%

  Daily breakdown:
    Mon   1,205  $1.21
    Tue   1,189  $1.19
    Wed   1,342  $1.34
    Thu   1,156  $1.16
    Fri   1,287  $1.29
    Sat     934  $0.93
    Sun   1,319  $1.32

  Top callers:
    0x1234...abcd  2,341 calls  $2.34
    0x5678...efgh  1,892 calls  $1.89
    0x9abc...ijkl  1,203 calls  $1.20
```

**JSON Output:**
```json
{
  "api": "fortune500",
  "period": "7d",
  "stats": {
    "calls": 8432,
    "earnings": "8.43",
    "avgLatencyMs": 45,
    "errorRate": 0.002
  },
  "daily": [
    {"date": "2026-02-05", "calls": 1205, "earnings": "1.21"},
    {"date": "2026-02-06", "calls": 1189, "earnings": "1.19"}
  ],
  "topCallers": [
    {"wallet": "0x1234...abcd", "calls": 2341, "spent": "2.34"}
  ]
}
```

---

## 4. Payouts

### `402claw balance`

Check your current balance.

```bash
402claw balance
```

**Example:**
```bash
$ 402claw balance

Wallet: 0x5C78...D0F

  Available:   $142.67 USDC
  Pending:     $12.34 USDC (clears in ~10 min)
  ─────────────────────────
  Total:       $155.01 USDC

  Lifetime earnings: $847.23
```

---

### `402claw withdraw`

Withdraw earnings to your wallet.

```bash
402claw withdraw [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--amount <amount>` | Amount to withdraw | All available |
| `--to <address>` | Destination wallet | Your linked wallet |
| `--force`, `-f` | Skip confirmation | `false` |

**Example:**
```bash
$ 402claw withdraw --amount 100
? Withdraw $100.00 USDC to 0x5C78...D0F? (y/N) y

Processing withdrawal...
✓ Withdrawn: $100.00 USDC
  Tx: 0xabc123...
  View: https://basescan.org/tx/0xabc123...

  New balance: $42.67 USDC
```

**JSON Output:**
```json
{
  "success": true,
  "amount": "100.00",
  "currency": "USDC",
  "to": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "txHash": "0xabc123...",
  "explorerUrl": "https://basescan.org/tx/0xabc123...",
  "newBalance": "42.67"
}
```

---

### `402claw payouts`

View payout history.

```bash
402claw payouts [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Number of payouts to show | `10` |

**Example:**
```bash
$ 402claw payouts

Recent payouts:

  DATE        AMOUNT      TX
  ────────────────────────────────────
  2026-02-10  $100.00     0xabc1...
  2026-02-03  $250.00     0xdef2...
  2026-01-28  $75.50      0xghi3...

  Total withdrawn: $425.50
```

---

## 5. Configuration

### `402claw config`

View or modify configuration.

```bash
402claw config [key] [value]
```

**Subcommands:**
| Command | Description |
|---------|-------------|
| `402claw config` | Show all config |
| `402claw config <key>` | Get specific value |
| `402claw config <key> <value>` | Set value |
| `402claw config --reset` | Reset to defaults |

**Example:**
```bash
# View all config
$ 402claw config

Configuration (~/.402claw/config.json):

  wallet:       0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
  network:      base
  defaultPrice: 0.001
  rateLimit:    60
  timeout:      30000
  apiUrl:       https://api.402claw.com

# Set default price
$ 402claw config defaultPrice 0.005
✓ Set defaultPrice = 0.005
```

---

## 6. Discovery

### `402claw search`

Search the public API registry.

```bash
402claw search <query> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--type <type>` | Filter by type: csv, json, function | - |
| `--max-price <price>` | Maximum price per request | - |
| `--sort <field>` | Sort by: relevance, price, popularity | `relevance` |
| `--limit <n>` | Number of results | `10` |

**Example:**
```bash
$ 402claw search "company data" --max-price 0.01

Found 12 APIs matching "company data":

  NAME              OWNER         PRICE    CALLS/DAY  DESCRIPTION
  ────────────────────────────────────────────────────────────────
  fortune500        0x5C78...     $0.001   1,234      Fortune 500 companies
  sp500-companies   0xabcd...     $0.002   892        S&P 500 with financials
  startup-db        0xefgh...     $0.005   456        Startup database

  Call an API:
    402claw call fortune500 --params '{"limit": 10}'
```

---

### `402claw info`

Get detailed info about an API.

```bash
402claw info <name>
```

**Example:**
```bash
$ 402claw info fortune500

fortune500
══════════════════════════════════════════

  Owner:        0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F
  Price:        $0.001 per request
  Type:         CSV dataset
  Created:      2026-01-15
  Last updated: 2026-02-10

  Description:
    Complete Fortune 500 list with revenue, employees,
    headquarters, and industry classification.

  Endpoints:
    GET  /v1/fortune500           All data (paginated)
    GET  /v1/fortune500/:id       Single row by ID
    GET  /v1/fortune500/search    Search by any column
    GET  /v1/fortune500/schema    Column definitions

  Schema:
    id          (int)     Company rank
    name        (string)  Company name
    revenue     (float)   Revenue in millions
    employees   (int)     Number of employees
    industry    (string)  Industry classification
    hq_city     (string)  Headquarters city
    hq_state    (string)  Headquarters state

  Stats (30 days):
    Calls:      34,521
    Avg rating: 4.8/5 (127 reviews)

  Try it:
    402claw call fortune500 --params '{"limit": 5}'
```

---

## 7. Calling APIs

### `402claw call`

Call any 402claw API.

```bash
402claw call <name> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--endpoint <path>` | Specific endpoint (e.g., /search) | Base endpoint |
| `--params <json>` | Query parameters as JSON | `{}` |
| `--body <json>` | Request body for POST | - |
| `--method <method>` | HTTP method | `GET` |
| `--dry-run` | Show request without executing | `false` |
| `--raw` | Output raw response (no formatting) | `false` |

**Example:**
```bash
# Simple call
$ 402claw call fortune500 --params '{"limit": 3}'

Calling fortune500... (cost: $0.001)

[
  {"id": 1, "name": "Walmart", "revenue": 572754, "employees": 2300000},
  {"id": 2, "name": "Amazon", "revenue": 469822, "employees": 1541000},
  {"id": 3, "name": "Apple", "revenue": 365817, "employees": 164000}
]

  ✓ Paid: $0.001 USDC
  ✓ Latency: 42ms

# Search endpoint
$ 402claw call fortune500 --endpoint /search --params '{"industry": "Technology", "limit": 5}'

# Dry run (no payment)
$ 402claw call fortune500 --dry-run
Would call: GET https://api.402claw.com/v1/fortune500
Price: $0.001 USDC
Headers: X-402-Payer: 0x5C78...D0F
```

**JSON Output:**
```json
{
  "response": [
    {"id": 1, "name": "Walmart", "revenue": 572754, "employees": 2300000}
  ],
  "meta": {
    "cost": "0.001",
    "currency": "USDC",
    "latencyMs": 42,
    "txHash": "0xpayment..."
  }
}
```

---

## 8. Deploy Format Specifications

### CSV Files

**Source file:** `companies.csv`
```csv
id,name,revenue,employees,industry
1,Walmart,572754,2300000,Retail
2,Amazon,469822,1541000,Technology
3,Apple,365817,164000,Technology
```

**Deploy:**
```bash
402claw deploy companies.csv --price 0.001 --name fortune500
```

**Auto-generated endpoints:**

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /v1/{name}` | All rows (paginated) | `?limit=10&offset=0` |
| `GET /v1/{name}/:id` | Single row by first column | `/v1/fortune500/1` |
| `GET /v1/{name}/search` | Search any column | `?industry=Technology` |
| `GET /v1/{name}/schema` | Column definitions | Returns column types |
| `GET /v1/{name}/count` | Total row count | Returns `{"count": 500}` |

**Query parameters for main endpoint:**
- `limit` (int): Max rows to return (default: 100, max: 1000)
- `offset` (int): Skip N rows (for pagination)
- `sort` (string): Column to sort by
- `order` (string): `asc` or `desc`
- `{column}` (any): Filter by column value

---

### JSON Files

**Source file:** `products.json`
```json
{
  "products": [
    {"id": "prod_1", "name": "Widget", "price": 29.99, "stock": 150},
    {"id": "prod_2", "name": "Gadget", "price": 49.99, "stock": 75}
  ],
  "metadata": {
    "updated": "2026-02-12",
    "currency": "USD"
  }
}
```

**Deploy:**
```bash
402claw deploy products.json --price 0.002 --name product-catalog
```

**Auto-generated endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /v1/{name}` | Full JSON object |
| `GET /v1/{name}/{path}` | Access nested path (e.g., `/products`, `/metadata`) |
| `GET /v1/{name}/products/:id` | If array detected, access by id field |

---

### Python Functions

**Source file:** `summarize.py`
```python
"""
402claw API: AI-powered text summarization
price: 0.01
description: Summarize any text using GPT-4
"""

import os
from openai import OpenAI

def handler(request):
    """
    Summarize text.
    
    Args:
        text (str): The text to summarize
        max_length (int, optional): Maximum summary length. Default: 100
    
    Returns:
        dict: {"summary": "...", "word_count": N}
    """
    text = request.get("text")
    max_length = request.get("max_length", 100)
    
    if not text:
        return {"error": "text is required"}, 400
    
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"Summarize in under {max_length} words."},
            {"role": "user", "content": text}
        ]
    )
    
    summary = response.choices[0].message.content
    
    return {
        "summary": summary,
        "word_count": len(summary.split())
    }
```

**Deploy:**
```bash
402claw deploy summarize.py --env OPENAI_API_KEY=sk-xxx
# or
402claw deploy summarize.py --env-file .env
```

**Generated endpoint:**
- `POST /v1/summarize` → Calls `handler(request)` with JSON body

**Function requirements:**
1. Must have a `handler(request)` function
2. `request` is a dict with the JSON body
3. Return a dict (response) or tuple (response, status_code)
4. Optional docstring metadata at top of file
5. Use `requirements.txt` in same directory for dependencies

**requirements.txt:**
```
openai>=1.0.0
```

---

### JavaScript Functions

**Source file:** `translate.js`
```javascript
/**
 * 402claw API: Text translation
 * @price 0.005
 * @description Translate text between languages
 */

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Translate text to a target language.
 * @param {Object} request - The request object
 * @param {string} request.text - Text to translate
 * @param {string} request.target - Target language (e.g., "Spanish")
 * @param {string} [request.source] - Source language (auto-detected if not provided)
 * @returns {Object} - {translated: "...", detected_language: "..."}
 */
async function handler(request) {
    const { text, target, source } = request;
    
    if (!text || !target) {
        return { error: "text and target are required" };
    }
    
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
            role: "user",
            content: `Translate to ${target}: "${text}"`
        }]
    });
    
    return {
        translated: message.content[0].text,
        target_language: target,
        source_language: source || "auto-detected"
    };
}

module.exports = { handler };
```

**Deploy:**
```bash
402claw deploy translate.js --env ANTHROPIC_API_KEY=sk-xxx
```

**Generated endpoint:**
- `POST /v1/translate` → Calls `handler(request)`

**Function requirements:**
1. Export a `handler` function
2. Can be sync or async
3. Receives request object with JSON body
4. Return object (or throw for errors)
5. Use `package.json` in same directory for dependencies

---

## 9. Configuration File

**Location:** `~/.402claw/config.json`

```json
{
  "wallet": "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F",
  "network": "base",
  "chainId": 8453,
  "apiUrl": "https://api.402claw.com",
  "defaults": {
    "price": "0.001",
    "rateLimit": 60,
    "timeout": 30000,
    "public": true
  },
  "credentials": {
    "storage": "keychain",
    "keyName": "402claw-wallet"
  }
}
```

**Credentials storage options:**
1. **keychain** (default): macOS Keychain / Linux secret-service
2. **env**: `WALLET_PRIVATE_KEY` environment variable
3. **file**: `~/.402claw/credentials` (encrypted, not recommended)

---

## 10. Environment Variables

| Variable | Description | Used by |
|----------|-------------|---------|
| `CLAW402_WALLET` | Override wallet address | All commands |
| `CLAW402_PRIVATE_KEY` | Wallet private key | Signing |
| `CLAW402_NETWORK` | Network (base, base-sepolia) | All commands |
| `CLAW402_API_URL` | API server URL | All commands |
| `CLAW402_CONFIG` | Custom config file path | All commands |

---

## 11. Error Messages

### Authentication Errors

```bash
# Not logged in
$ 402claw deploy data.csv
✗ Error: Not authenticated
  Run: 402claw login

# Invalid wallet
$ 402claw login --wallet invalid
✗ Error: Invalid wallet address
  Expected: 0x followed by 40 hex characters

# Insufficient balance
$ 402claw call expensive-api
✗ Error: Insufficient balance
  Required: $1.00 USDC
  Available: $0.50 USDC
  Fund your wallet: 0x5C78...D0F
```

### Deployment Errors

```bash
# Invalid file
$ 402claw deploy data.xlsx
✗ Error: Unsupported file type: .xlsx
  Supported: .csv, .json, .py, .js

# Missing handler
$ 402claw deploy broken.py
✗ Error: No handler function found in broken.py
  Your file must export: def handler(request): ...

# Name taken
$ 402claw deploy data.csv --name fortune500
✗ Error: API name 'fortune500' is already taken
  Try: 402claw deploy data.csv --name fortune500-v2

# Validation failed
$ 402claw deploy bad.csv
✗ Error: CSV validation failed
  Line 15: Expected 5 columns, found 4
  Fix the file and try again
```

### Runtime Errors

```bash
# API not found
$ 402claw call nonexistent
✗ Error: API 'nonexistent' not found
  Search for APIs: 402claw search <query>

# Rate limited
$ 402claw call busy-api
✗ Error: Rate limited
  Try again in 45 seconds
  Or: 402claw call busy-api --retry

# Timeout
$ 402claw call slow-api
✗ Error: Request timed out after 30s
  Try: 402claw call slow-api --timeout 60000
```

### JSON Error Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance",
    "details": {
      "required": "1.00",
      "available": "0.50",
      "currency": "USDC"
    }
  }
}
```

---

## 12. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Authentication required |
| 4 | Insufficient funds |
| 5 | Network error |
| 6 | API not found |
| 7 | Rate limited |
| 8 | Validation error |

---

## 13. Quick Reference

```bash
# Setup
402claw login                    # Link wallet
402claw whoami                   # Check status

# Deploy
402claw deploy data.csv          # Deploy CSV
402claw deploy api.py            # Deploy Python function
402claw list                     # See your APIs
402claw undeploy <name>          # Remove API

# Earn
402claw stats                    # View earnings
402claw balance                  # Check balance
402claw withdraw                 # Cash out

# Use
402claw search "weather"         # Find APIs
402claw info <name>              # API details
402claw call <name>              # Call an API

# All commands support:
--json                           # JSON output
--help                           # Command help
```

---

## 14. Agent-Friendly Design

The CLI is optimized for agent use:

1. **Predictable output:** Use `--json` for structured responses
2. **Non-interactive mode:** All prompts can be bypassed with flags (`--force`, etc.)
3. **Exit codes:** Clear success/failure indication
4. **Idempotent deploys:** Re-deploying updates instead of erroring
5. **Dry-run support:** Test without side effects
6. **Minimal dependencies:** Single binary, no runtime required

**Agent workflow example:**
```bash
# Check auth status
result=$(402claw whoami --json)
if [ "$(echo $result | jq -r '.wallet')" == "null" ]; then
    402claw login --wallet $WALLET --keychain
fi

# Deploy API
402claw deploy data.csv --price 0.001 --name my-api --json

# Check earnings
earnings=$(402claw stats my-api --period 24h --json | jq -r '.stats.earnings')
echo "Made $earnings today"

# Auto-withdraw if over threshold
balance=$(402claw balance --json | jq -r '.available')
if (( $(echo "$balance > 100" | bc -l) )); then
    402claw withdraw --force --json
fi
```

---

## Appendix: Full Command Tree

```
402claw
├── login           # Authenticate with wallet
├── logout          # Remove credentials
├── whoami          # Show current user
├── deploy          # Deploy new API
├── update          # Update existing API
├── undeploy        # Remove API
├── list            # List your APIs
├── stats           # View statistics
├── balance         # Check earnings balance
├── withdraw        # Withdraw to wallet
├── payouts         # View payout history
├── config          # View/set configuration
├── search          # Search public APIs
├── info            # Get API details
├── call            # Call an API
├── help            # Show help
└── version         # Show version
```
