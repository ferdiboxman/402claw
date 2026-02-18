# clawr

CLI for deploying and monetizing APIs with [x402](https://www.x402.org/) payment protocol.

## Installation

```bash
npm install -g clawr
```

## Quick Start

```bash
# Deploy a dataset with x402 paywall
clawr deploy data.csv --tenant my-api --price 0.01

# Wrap an existing API with monetization
clawr wrap https://api.example.com/endpoint --tenant my-proxy --price 0.001

# List all tenants
clawr list

# Show tenant details
clawr show my-api
```

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `deploy <source>` | Deploy a dataset or function |
| `wrap <url>` | Wrap an upstream API with x402 paywall |
| `list` | List all deployed tenants |
| `show <tenant>` | Show details for a tenant |

### Deploy Options

```bash
clawr deploy <source-path> \
  --tenant <slug> \
  --price <usd> \
  [--type <dataset|function>] \
  [--plan <plan>] \
  [--host <hostname>] \
  [--publish]
```

### Wrap Options

```bash
clawr wrap <upstream-url> \
  --tenant <slug> \
  --price <usd> \
  [--method <http-method>] \
  [--inject-header "Name: Value"] \
  [--cache-ttl <seconds>] \
  [--publish]
```

### Cloudflare Deployment

```bash
# Deploy dispatcher worker
clawr cloudflare-deploy-dispatcher \
  --script-name my-dispatcher \
  --account-id <id> \
  --api-token <token> \
  --execute

# Deploy tenant worker
clawr cloudflare-deploy-tenant \
  --tenant my-api \
  --account-id <id> \
  --api-token <token> \
  --execute
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_DISPATCH_NAMESPACE` | Workers for Platforms namespace |
| `CLAW_API_KEY` | API key for authenticated commands |

## Help

```bash
clawr help
```

## License

MIT
