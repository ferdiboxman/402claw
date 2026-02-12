# CSV-to-API Tools Analysis & 402claw Integration Strategy

**Date:** 2026-02-12  
**Purpose:** Evaluate existing open-source CSV-to-API tools for potential integration with 402claw

---

## 1. Individual Tool Analysis

### 1.1 csv2api (Node.js)
**Repository:** https://github.com/jai0651/csv2api

#### Features
- 📊 CSV loading with automatic column detection
- 🔍 Full-text search across all fields
- 📄 Pagination with customizable page sizes
- 🔄 **Real-time file watching** (auto-reload on changes)
- 📈 Built-in statistics for numeric columns
- 🔒 CORS support (enabled by default)
- 📚 Dual-mode: CLI tool AND importable library

#### Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **CSV Parser:** csv-parser
- **File Watching:** chokidar
- **CLI:** Commander.js

#### Deployment
```bash
# CLI (instant)
npx csv2api data.csv --port 8080

# As library
npm install csv2api
```

#### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API docs & metadata |
| `/health` | GET | Health check |
| `/data` | GET | All data w/ filtering, search, pagination |
| `/data/:id` | GET | Single row by ID |
| `/columns` | GET | Column names |
| `/stats` | GET | Numeric column statistics |
| `/unique/:column` | GET | Unique values for column |

#### Query Parameters
- `search` - Case-insensitive full-text search
- `columns` - Comma-separated column filter
- `page` / `limit` - Pagination
- `sort` / `order` - Sorting (asc/desc)

#### Limitations
- No authentication/authorization
- No payment integration
- Express-only (no alternative servers)
- No database persistence (in-memory)

#### Maintenance Status
- **Activity:** New/Recent project (2024-2025)
- **Pros:** Well-documented, modern codebase
- **License:** MIT

---

### 1.2 fastapi-csv (Python)
**Repository:** https://github.com/jrieke/fastapi-csv

#### Features
- Auto-generated endpoints from CSV column names
- Auto-generated query parameters based on data types
- **SQLite backend** for fast queries on large files
- Smart type-based query operators:
  - `_greaterThan`, `_lessThanEqual` for numbers
  - `_contains` for strings
- Interactive Swagger/OpenAPI docs
- Hot-reload data via `app.update_database()`

#### Tech Stack
- **Runtime:** Python 3.7+
- **Framework:** FastAPI (async)
- **Database:** SQLite (temporary)
- **Server:** Uvicorn

#### Deployment
```bash
# CLI
pip install fastapi-csv
fastapi-csv data.csv

# Or from URL
fastapi-csv https://example.com/data.csv

# As library
from fastapi_csv import FastAPI_CSV
app = FastAPI_CSV("data.csv")
```

#### API Endpoints
Auto-generated based on filename:
- `/people` (from people.csv)
- Query with column names: `/people?first_name=Rachel&age_greaterThan=25`

#### Limitations
- No pagination (returns all matching results)
- No built-in file watching
- Updating data doesn't update schema (requires restart)
- Limited filter operators
- No authentication

#### Maintenance Status
- **Activity:** Moderate (last significant updates ~2021-2022)
- **Stars:** ~150+
- **License:** MIT

---

### 1.3 csvapi (Python - etalab)
**Repository:** https://github.com/etalab/csvapi

#### Features
- Instant JSON API from any CSV URL
- **Excel (.xls/.xlsx) support**
- SQLite backend (via agate)
- Flexible output shapes (arrays or objects)
- Production-ready (used by data.gouv.fr)
- SSL support with Hypercorn
- Optional caching with APC

#### Tech Stack
- **Runtime:** Python 3.9+
- **Framework:** Quart (async Flask-like)
- **Database:** SQLite
- **Server:** Hypercorn
- **Parser:** agate

#### Deployment
```bash
pip install csvapi
csvapi serve -h 0.0.0.0 -p 8000

# Production with SSL
hypercorn csvapi.webservice:app -b 0.0.0.0:443 --keyfile key.pem --ca-certs cert.pem
```

#### API Endpoints
```
# Convert CSV to API
GET /apify?url=http://example.com/data.csv
→ {"ok": true, "endpoint": "/api/abc123"}

# Query data
GET /api/<hash>?_size=100&_offset=0&_sort=column&_shape=objects
```

#### Query Parameters
- `_size` - Limit results (default: 100)
- `_offset` - Pagination offset
- `_sort` / `_sort_desc` - Sorting
- `_shape` - `lists` or `objects`
- `_rowid` - Show/hide row IDs
- `_total` - Show/hide total count
- `{column}__exact` / `{column}__contains` - Filtering

#### Limitations
- No real-time file watching
- Two-step process (convert then query)
- Limited filter comparators (exact, contains only)
- No authentication

#### Maintenance Status
- **Activity:** Active (government-backed, used in production)
- **Stars:** ~29
- **License:** AGPL-3.0 (⚠️ copyleft!)

---

### 1.4 csv-to-api (PHP)
**Repository:** https://github.com/project-open-data/csv-to-api

#### Features
- Multi-format output: JSON, XML, HTML
- Remote CSV proxy (serve any CSV via URL)
- JSONP callback support
- Optional APC caching
- Field-based filtering
- Sorting

#### Tech Stack
- **Runtime:** PHP
- **Caching:** APC (optional)
- **Dependencies:** None (single class)

#### Deployment
```php
// Copy files to web server
// Access via: /csv-to-api/?source=https://example.com/data.csv
```

#### Query Parameters
- `source` - CSV URL (required)
- `format` - json/xml/html
- `callback` - JSONP callback name
- `sort` / `sort_dir` - Sorting
- `{field}={value}` - Exact match filtering
- `header_row` - y/n (auto-generate field names)

#### Limitations
- **No pagination** (returns all data)
- No advanced filtering (exact match only)
- No type detection
- No search functionality
- Legacy PHP patterns
- Security concerns (arbitrary URL fetching)

#### Maintenance Status
- **Activity:** Dormant (last commit ~2014)
- **Stars:** ~200+ (historical value)
- **License:** GPL-3.0

---

## 2. Feature Comparison Matrix

| Feature | csv2api (Node) | fastapi-csv (Python) | csvapi (Python) | csv-to-api (PHP) |
|---------|----------------|---------------------|-----------------|------------------|
| **Auto Endpoints** | ✅ Fixed routes | ✅ From filename | ✅ Hash-based | ✅ Single route |
| **Full-text Search** | ✅ All fields | ❌ | ❌ | ❌ |
| **Column Filtering** | ✅ | ✅ Auto-generated | ✅ exact/contains | ✅ Exact only |
| **Numeric Comparisons** | ❌ | ✅ gt/lt/gte/lte | ❌ | ❌ |
| **Pagination** | ✅ page/limit | ❌ | ✅ size/offset | ❌ |
| **Sorting** | ✅ | ❌ | ✅ | ✅ |
| **Real-time Updates** | ✅ File watching | ⚠️ Manual reload | ❌ | ❌ |
| **Statistics** | ✅ Numeric stats | ❌ | ❌ | ❌ |
| **Unique Values** | ✅ Per column | ❌ | ❌ | ❌ |
| **Excel Support** | ❌ | ❌ | ✅ | ❌ |
| **Remote CSV URLs** | ❌ | ✅ | ✅ | ✅ |
| **OpenAPI Docs** | ❌ | ✅ Auto-generated | ❌ | ❌ |
| **Database Backend** | ❌ In-memory | ✅ SQLite | ✅ SQLite | ❌ In-memory |
| **Large File Support** | ⚠️ Memory-bound | ✅ Good | ✅ Good | ⚠️ Memory-bound |
| **Output Formats** | JSON | JSON | JSON | JSON/XML/HTML |
| **Library Mode** | ✅ | ✅ | ❌ | ❌ |
| **CORS Support** | ✅ Built-in | ✅ Via FastAPI | Manual | ❌ |
| **Authentication** | ❌ | ❌ | ❌ | ❌ |
| **Payment Integration** | ❌ | ❌ | ❌ | ❌ |
| **License** | MIT | MIT | AGPL-3.0 ⚠️ | GPL-3.0 |
| **Maintenance** | 🟢 Active | 🟡 Moderate | 🟢 Active | 🔴 Dormant |

---

## 3. Build vs Integrate Strategy

### Option A: Build from Scratch
**Effort:** High (~2-3 weeks)

**Pros:**
- Complete control over architecture
- Native x402 integration from day one
- No license complications
- Optimized for 402claw's specific needs

**Cons:**
- Reinventing the wheel
- More initial development time
- Need to handle edge cases others have solved

### Option B: Fork and Extend
**Best Candidate:** `csv2api` (Node.js)

**Effort:** Medium (~1 week)

**Pros:**
- Solid foundation with best feature set
- MIT license (no copyleft concerns)
- Modern Node.js codebase
- Already has library mode
- Real-time file watching built-in
- Active maintenance

**Cons:**
- Need to understand existing codebase
- May carry technical debt
- Upstream changes need merging

### Option C: Use as Dependency
**Best Candidate:** `csv2api` as npm package

**Effort:** Low (~2-3 days)

**Pros:**
- Fastest to implement
- Benefit from upstream improvements
- Less code to maintain

**Cons:**
- Less control over internals
- May need to wait for upstream features
- Dependency management overhead

---

### 🏆 Recommendation: **Option B - Fork csv2api**

**Reasoning:**

1. **Best Feature Match:** csv2api has the most comprehensive feature set (search, pagination, stats, file watching)

2. **License:** MIT allows commercial use and modification without copyleft obligations

3. **Architecture:** Express-based, easy to extend with middleware (perfect for x402)

4. **Library Mode:** Can be imported and wrapped, not just CLI

5. **Modern Stack:** Node.js aligns with 402claw ecosystem

6. **Modification Path:**
   ```javascript
   // Easy to wrap with x402 middleware
   import { createServer } from 'csv2api';
   import { x402Middleware } from '402claw';
   
   const app = createServer('./data.csv');
   app.use('/data', x402Middleware({ price: '0.001 USDC' }));
   ```

**Why Not Others:**
- **fastapi-csv:** No pagination, Python (different ecosystem)
- **csvapi:** AGPL license requires open-sourcing modifications
- **csv-to-api:** Dormant, PHP, missing core features

---

## 4. 402claw CSV Feature Specification

### 4.1 Overview

The `402claw csv` command transforms any CSV file into a monetized REST API with automatic x402 payment integration.

### 4.2 Core Commands

```bash
# Start a paid CSV API
402claw csv serve data.csv --price 0.001

# Serve with custom options
402claw csv serve data.csv \
  --price 0.01 \
  --port 8080 \
  --host 0.0.0.0 \
  --free-tier 100 \
  --rate-limit 60/min

# Deploy to cloud (future)
402claw csv deploy data.csv --price 0.01
```

### 4.3 Generated Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /` | Free | API documentation & schema |
| `GET /health` | Free | Health check |
| `GET /preview` | Free | First 5 rows (teaser) |
| `GET /data` | **Paid** | Full data with search/filter/pagination |
| `GET /data/:id` | **Paid** | Single row by ID |
| `GET /columns` | Free | Column names and types |
| `GET /stats` | **Paid** | Statistics for numeric columns |
| `GET /unique/:column` | **Paid** | Unique values |
| `GET /export` | **Paid (2x)** | Full CSV download |

### 4.4 Query Parameters

**Standard (from csv2api):**
- `search` - Full-text search across all fields
- `columns` - Comma-separated column filter
- `page` / `limit` - Pagination (default: page=1, limit=100)
- `sort` / `order` - Sorting (asc/desc)

**402claw Extensions:**
- `format` - Response format: `json` (default), `csv`, `jsonl`
- `fields` - Alias for columns (GraphQL-style)

### 4.5 x402 Integration

#### Payment Flow

```
Client                          402claw CSV API
  |                                    |
  |  GET /data?search=foo              |
  |  (no payment header)               |
  |----------------------------------->|
  |                                    |
  |  402 Payment Required              |
  |  X-402-Price: 0.001 USDC           |
  |  X-402-Network: base               |
  |  X-402-PayTo: 0x1234...            |
  |<-----------------------------------|
  |                                    |
  |  [Client makes payment]            |
  |                                    |
  |  GET /data?search=foo              |
  |  X-402-Payment: <signed_receipt>   |
  |----------------------------------->|
  |                                    |
  |  200 OK                            |
  |  { rows: [...], total: 150 }       |
  |<-----------------------------------|
```

#### Pricing Model

```javascript
// Default: Per-request pricing
const pricing = {
  '/data': '0.001 USDC',
  '/data/:id': '0.0005 USDC',
  '/stats': '0.002 USDC',
  '/unique/:column': '0.001 USDC',
  '/export': '0.01 USDC'  // Higher for bulk
};

// Alternative: Per-row pricing
const rowPricing = {
  basePrice: '0.0001 USDC',  // Per row returned
  maxPrice: '0.01 USDC',      // Cap per request
};

// Alternative: Subscription/credits (future)
const subscription = {
  credits: 1000,
  price: '0.50 USDC',
  validity: '24h'
};
```

### 4.6 Configuration File

`402claw-csv.json`:
```json
{
  "source": "./data.csv",
  "name": "My Dataset API",
  "description": "Premium dataset with 10,000 records",
  "pricing": {
    "model": "per-request",
    "default": "0.001 USDC",
    "endpoints": {
      "/export": "0.01 USDC"
    }
  },
  "freeTier": {
    "enabled": true,
    "requestsPerDay": 100,
    "previewRows": 5
  },
  "rateLimit": {
    "requests": 60,
    "window": "1m"
  },
  "cors": {
    "enabled": true,
    "origins": ["*"]
  },
  "watch": true
}
```

### 4.7 Example Usage

#### Publisher (Data Owner)

```bash
# Simple: Monetize a CSV instantly
$ 402claw csv serve products.csv --price 0.001
🚀 CSV API started!
   Endpoint: http://localhost:3402
   Price: 0.001 USDC per request
   File: products.csv (1,547 rows, 12 columns)
   
   Paid endpoints:
   • GET /data - Query with search, filter, pagination
   • GET /data/:id - Get single row
   • GET /stats - Column statistics
   • GET /export - Download full CSV
   
   Free endpoints:
   • GET / - API docs
   • GET /preview - First 5 rows
   • GET /columns - Schema info
```

#### Consumer (API User)

```bash
# Using 402claw client
$ 402claw fetch http://api.example.com/data?search=electronics
Payment: 0.001 USDC to 0x1234...
Response: 200 OK

{
  "rows": [...],
  "total": 47,
  "page": 1,
  "limit": 100
}

# Using curl with manual payment
$ curl -H "X-402-Payment: $PAYMENT_RECEIPT" \
    "http://api.example.com/data?search=electronics&limit=10"
```

#### Code Integration

```javascript
// Node.js client
import { Claw402Client } from '402claw';

const client = new Claw402Client({
  wallet: process.env.WALLET_KEY
});

const data = await client.get('http://api.example.com/data', {
  params: { search: 'laptop', limit: 50 }
});
// Payment handled automatically

console.log(data.rows);
```

```python
# Python client
from claw402 import Client

client = Client(wallet_key=os.environ['WALLET_KEY'])

data = client.get('http://api.example.com/data', params={
    'search': 'laptop',
    'limit': 50
})

print(data['rows'])
```

### 4.8 Implementation Roadmap

#### Phase 1: MVP (Week 1-2)
- [ ] Fork csv2api
- [ ] Add x402 middleware integration
- [ ] Basic CLI: `402claw csv serve`
- [ ] Per-request pricing
- [ ] Free preview endpoint

#### Phase 2: Enhanced Features (Week 3-4)
- [ ] Configuration file support
- [ ] Rate limiting
- [ ] Free tier quotas
- [ ] Multiple pricing models
- [ ] Export endpoint

#### Phase 3: Production Ready (Week 5-6)
- [ ] Cloud deployment: `402claw csv deploy`
- [ ] Analytics dashboard
- [ ] Webhook notifications (new payments)
- [ ] Multi-file support

---

## 5. Appendix: Code Examples

### A. Minimal x402 Middleware Integration

```javascript
// lib/csv-x402.js
import express from 'express';
import { CsvLoader } from 'csv2api';
import { verifyX402Payment, createPaymentRequired } from '402claw-core';

export function createPaidCsvApi(csvPath, options = {}) {
  const { price = '0.001', currency = 'USDC', wallet } = options;
  
  const app = express();
  const loader = new CsvLoader();
  
  // Load CSV
  await loader.loadCsv(csvPath);
  
  // Free endpoints
  app.get('/', (req, res) => {
    res.json({
      name: options.name || 'CSV API',
      columns: loader.getColumns(),
      totalRows: loader.getData().length,
      pricing: { price, currency },
      endpoints: {
        '/preview': 'Free - First 5 rows',
        '/data': `Paid - ${price} ${currency}`,
        '/stats': `Paid - ${price} ${currency}`
      }
    });
  });
  
  app.get('/preview', (req, res) => {
    const data = loader.getData().slice(0, 5);
    res.json({ rows: data, preview: true });
  });
  
  // Paid endpoints with x402 middleware
  const x402 = async (req, res, next) => {
    const payment = req.headers['x-402-payment'];
    
    if (!payment) {
      return res.status(402).json(createPaymentRequired({
        price,
        currency,
        wallet,
        network: 'base'
      }));
    }
    
    const valid = await verifyX402Payment(payment, { price, wallet });
    if (!valid) {
      return res.status(402).json({ error: 'Invalid payment' });
    }
    
    next();
  };
  
  app.get('/data', x402, (req, res) => {
    const { search, page = 1, limit = 100, sort, order } = req.query;
    let data = loader.getData();
    
    if (search) {
      data = data.filter(row => 
        Object.values(row).some(v => 
          String(v).toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    
    if (sort) {
      data.sort((a, b) => {
        const cmp = a[sort] > b[sort] ? 1 : -1;
        return order === 'desc' ? -cmp : cmp;
      });
    }
    
    const total = data.length;
    const offset = (page - 1) * limit;
    const rows = data.slice(offset, offset + limit);
    
    res.json({ rows, total, page: +page, limit: +limit });
  });
  
  return app;
}
```

### B. CLI Implementation Sketch

```javascript
#!/usr/bin/env node
// bin/402claw-csv.js

import { program } from 'commander';
import { createPaidCsvApi } from '../lib/csv-x402.js';

program
  .command('serve <csvFile>')
  .description('Start a paid CSV API')
  .option('-p, --price <amount>', 'Price per request', '0.001')
  .option('--port <port>', 'Server port', '3402')
  .option('--wallet <address>', 'Payment wallet address')
  .option('--free-tier <requests>', 'Free requests per day', '0')
  .action(async (csvFile, opts) => {
    const app = await createPaidCsvApi(csvFile, {
      price: opts.price,
      wallet: opts.wallet || process.env.X402_WALLET
    });
    
    app.listen(opts.port, () => {
      console.log(`🚀 CSV API started on port ${opts.port}`);
      console.log(`   Price: ${opts.price} USDC per request`);
    });
  });

program.parse();
```

---

## 6. Conclusion

**Summary:**
- `csv2api` (Node.js) is the best foundation for 402claw integration
- Fork and extend approach balances speed with control
- x402 middleware pattern enables clean separation of concerns
- MVP achievable in 1-2 weeks

**Next Steps:**
1. Fork csv2api repository
2. Create 402claw-csv package structure
3. Implement x402 middleware
4. Build CLI wrapper
5. Test with real CSV datasets
6. Document and release

---

*Generated by OpenClaw AI Agent | 2026-02-12*
