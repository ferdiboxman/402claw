# CLI Reference

## Core Commands

### `deploy`

Deploy a dataset or function as a paid API.

```bash
402claw deploy <source-path> --tenant <slug> --price <usd> [options]
```

**Arguments:**
- `<source-path>` — Path to CSV, JSON, or JS file

**Required flags:**
- `--tenant <slug>` — Unique identifier for your API
- `--price <usd>` — Price per request in USD (e.g., `0.001`)

**Options:**
| Flag | Description |
|------|-------------|
| `--type <dataset\|function>` | Resource type (auto-detected from extension) |
| `--quota-day <n>` | Max requests per caller per day |
| `--quota-month <n>` | Max requests per caller per month |
| `--caller-rate-limit <n/window>` | Rate limit per caller (e.g., `100/60s`) |
| `--rate-limit-global <n/window>` | Global rate limit across all callers |
| `--spend-day <usd>` | Max spend per caller per day |
| `--spend-month <usd>` | Max spend per caller per month |
| `--x402 <true\|false>` | Enable x402 payments (default: true) |
| `--publish` | Deploy to Cloudflare immediately |
| `--execute` | Execute deployment (vs dry-run) |

**Examples:**

```bash
# Deploy a CSV dataset
402claw deploy products.csv --tenant products --price 0.001

# Deploy a JS function with quotas
402claw deploy handler.js --tenant my-fn --type function --price 0.01 \
  --quota-day 5000 --quota-month 100000

# Deploy and publish to Cloudflare
402claw deploy data.json --tenant my-data --price 0.002 \
  --publish --dispatch-namespace prod
```

---

### `wrap`

Wrap an existing API as a paid endpoint.

```bash
402claw wrap <upstream-url> --tenant <slug> --price <usd> [options]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--method <HTTP-METHOD>` | Allowed HTTP method (default: GET) |
| `--inject-header "Name: Value"` | Add header to upstream requests |
| `--inject-header-secret "Name: ENV_NAME"` | Inject header from env var |
| `--cache-ttl <seconds>` | Cache upstream responses |
| `--transform <js-expression>` | Transform response |

**Examples:**

```bash
# Wrap a public API
402claw wrap https://api.weather.com/v1 --tenant weather --price 0.002

# Wrap with auth header (secret in env)
OPENAI_API_KEY=sk-xxx 402claw wrap https://api.openai.com/v1 \
  --tenant openai-proxy --price 0.01 \
  --inject-header-secret "Authorization: OPENAI_API_KEY"

# Wrap with caching
402claw wrap https://api.example.com --tenant cached-api --price 0.001 \
  --cache-ttl 60 --caller-rate-limit 20/60s
```

---

### `list`

List all deployed tenants.

```bash
402claw list [--registry <path>]
```

---

### `show`

Show details for a specific tenant.

```bash
402claw show <tenant-slug> [--registry <path>]
```

---

## Cloudflare Commands

### `cloudflare-deploy-dispatcher`

Deploy the dispatcher worker to Cloudflare.

```bash
402claw cloudflare-deploy-dispatcher \
  --script-name <name> \
  --account-id <id> \
  --api-token <token> \
  [--dispatch-namespace <ns>] \
  [--execute]
```

### `cloudflare-deploy-tenant`

Deploy a specific tenant worker.

```bash
402claw cloudflare-deploy-tenant \
  --tenant <slug> \
  --account-id <id> \
  --api-token <token> \
  [--dispatch-namespace <ns>] \
  [--execute]
```

### `cloudflare-rollback-dispatcher`

Rollback to a previous dispatcher deployment.

```bash
402claw cloudflare-rollback-dispatcher \
  --account-id <id> \
  --api-token <token> \
  [--deployment-id <id>] \
  [--execute]
```

---

## Payout Commands

### `balance`

Check tenant balance.

```bash
402claw balance --tenant <slug>
```

### `withdraw`

Request withdrawal to wallet.

```bash
402claw withdraw --tenant <slug> --amount <usd> --to <wallet-address>
```

### `withdrawals`

List withdrawal history.

```bash
402claw withdrawals [--tenant <slug>] [--owner <user-id>]
```

---

## Auth Commands

### `user-create`

Create a new user.

```bash
402claw user-create --user <id> [--name <display-name>]
```

### `auth-create-key`

Create API key for a user.

```bash
402claw auth-create-key --user <id> [--scope <scope>]
```

### `auth-revoke-key`

Revoke an API key.

```bash
402claw auth-revoke-key --key-id <id>
```

---

## Global Options

| Flag | Description |
|------|-------------|
| `--registry <path>` | Path to registry JSON |
| `--control-plane <path>` | Path to control plane JSON |
| `--api-key <key>` | API key for authenticated commands |
| `--storage-backend <json\|d1>` | Storage backend type |
