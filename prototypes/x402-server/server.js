/**
 * x402 Prototype Server
 * 
 * A minimal Express server demonstrating the x402 payment protocol.
 * 
 * Features:
 * - Free endpoint: /health
 * - Paid endpoints: /data, /csv
 * - Uses Base Sepolia testnet for testing
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

// Import x402 modules
const { paymentMiddleware, x402ResourceServer } = require('@x402/express');
const { ExactEvmScheme } = require('@x402/evm/exact/server');
const { HTTPFacilitatorClient } = require('@x402/core/server');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 4021;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://www.x402.org/facilitator';

// Your receiving wallet address - CHANGE THIS to your own wallet!
// Using the wallet from TOOLS.md
const PAY_TO = process.env.PAY_TO || '0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F';

// Network configuration
// Base Sepolia (testnet) = eip155:84532
// Base Mainnet = eip155:8453
const NETWORK = process.env.NETWORK || 'eip155:84532';

console.log('=== x402 Prototype Server ===');
console.log(`Facilitator: ${FACILITATOR_URL}`);
console.log(`Pay to: ${PAY_TO}`);
console.log(`Network: ${NETWORK}`);
console.log('');

// Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL
});

// Create resource server and register EVM scheme
const server = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

// Define protected routes
const protectedRoutes = {
  'GET /data': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.001', // 0.1 cent in USDC
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: 'Get mock JSON data',
    mimeType: 'application/json',
  },
  'GET /data/premium': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.01', // 1 cent in USDC
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: 'Get premium JSON data with extended information',
    mimeType: 'application/json',
  },
  'GET /csv': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.005', // 0.5 cent in USDC
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: 'Get CSV data file',
    mimeType: 'text/csv',
  },
  'GET /csv/filtered': {
    accepts: [
      {
        scheme: 'exact',
        price: '$0.002', // 0.2 cent per filtered request
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: 'Get filtered/paginated CSV data',
    mimeType: 'application/json',
  },
};

// Apply x402 payment middleware
app.use(paymentMiddleware(protectedRoutes, server));

// ============ FREE ENDPOINTS ============

// Health check - free endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      free: ['/health', '/pricing'],
      paid: Object.keys(protectedRoutes),
    },
  });
});

// Pricing info - free endpoint
app.get('/pricing', (req, res) => {
  const pricing = Object.entries(protectedRoutes).map(([route, config]) => ({
    route,
    price: config.accepts[0].price,
    network: config.accepts[0].network,
    description: config.description,
    mimeType: config.mimeType,
  }));
  
  res.json({
    facilitator: FACILITATOR_URL,
    payTo: PAY_TO,
    network: NETWORK,
    pricing,
  });
});

// ============ PAID ENDPOINTS ============

// Basic data endpoint - paid
app.get('/data', (req, res) => {
  // This only executes if payment was successful!
  res.json({
    message: 'You have successfully paid for this data!',
    timestamp: new Date().toISOString(),
    data: {
      items: [
        { id: 1, name: 'Alpha', value: 100 },
        { id: 2, name: 'Beta', value: 200 },
        { id: 3, name: 'Gamma', value: 300 },
      ],
      meta: {
        total: 3,
        currency: 'USDC',
        pricePaid: '$0.001',
      },
    },
  });
});

// Premium data endpoint - paid (higher price)
app.get('/data/premium', (req, res) => {
  res.json({
    message: 'Premium data access granted!',
    timestamp: new Date().toISOString(),
    data: {
      items: [
        { id: 1, name: 'Alpha', value: 100, secret: 'classified-a' },
        { id: 2, name: 'Beta', value: 200, secret: 'classified-b' },
        { id: 3, name: 'Gamma', value: 300, secret: 'classified-c' },
      ],
      analytics: {
        trend: 'increasing',
        forecast: [350, 400, 450],
        confidence: 0.87,
      },
      meta: {
        total: 3,
        currency: 'USDC',
        pricePaid: '$0.01',
        tier: 'premium',
      },
    },
  });
});

// CSV data endpoint - paid
app.get('/csv', (req, res) => {
  // Read or generate CSV data
  const csvPath = path.join(__dirname, 'data', 'sample.csv');
  
  if (fs.existsSync(csvPath)) {
    const csvData = fs.readFileSync(csvPath, 'utf8');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
    res.send(csvData);
  } else {
    // Generate sample CSV if file doesn't exist
    const csvData = `id,name,value,category,timestamp
1,Alpha,100,A,2024-01-01
2,Beta,200,B,2024-01-02
3,Gamma,300,A,2024-01-03
4,Delta,400,C,2024-01-04
5,Epsilon,500,B,2024-01-05
6,Zeta,600,A,2024-01-06
7,Eta,700,C,2024-01-07
8,Theta,800,B,2024-01-08
9,Iota,900,A,2024-01-09
10,Kappa,1000,C,2024-01-10`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
    res.send(csvData);
  }
});

// Filtered CSV endpoint - paid with filtering and pagination
app.get('/csv/filtered', (req, res) => {
  const { category, minValue, maxValue, page = 1, limit = 5 } = req.query;
  
  // Sample data
  let data = [
    { id: 1, name: 'Alpha', value: 100, category: 'A' },
    { id: 2, name: 'Beta', value: 200, category: 'B' },
    { id: 3, name: 'Gamma', value: 300, category: 'A' },
    { id: 4, name: 'Delta', value: 400, category: 'C' },
    { id: 5, name: 'Epsilon', value: 500, category: 'B' },
    { id: 6, name: 'Zeta', value: 600, category: 'A' },
    { id: 7, name: 'Eta', value: 700, category: 'C' },
    { id: 8, name: 'Theta', value: 800, category: 'B' },
    { id: 9, name: 'Iota', value: 900, category: 'A' },
    { id: 10, name: 'Kappa', value: 1000, category: 'C' },
  ];
  
  // Apply filters
  if (category) {
    data = data.filter(item => item.category === category);
  }
  if (minValue) {
    data = data.filter(item => item.value >= parseInt(minValue));
  }
  if (maxValue) {
    data = data.filter(item => item.value <= parseInt(maxValue));
  }
  
  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedData = data.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: data.length,
      totalPages: Math.ceil(data.length / limitNum),
      hasNext: endIndex < data.length,
      hasPrev: pageNum > 1,
    },
    filters: {
      category: category || null,
      minValue: minValue || null,
      maxValue: maxValue || null,
    },
    meta: {
      pricePaid: '$0.002',
    },
  });
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: {
      free: ['/health', '/pricing'],
      paid: Object.keys(protectedRoutes),
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`x402 Prototype Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Free endpoints:');
  console.log(`  GET http://localhost:${PORT}/health`);
  console.log(`  GET http://localhost:${PORT}/pricing`);
  console.log('');
  console.log('Paid endpoints (require x402 payment):');
  Object.entries(protectedRoutes).forEach(([route, config]) => {
    const [method, path] = route.split(' ');
    console.log(`  ${method} http://localhost:${PORT}${path} - ${config.accepts[0].price}`);
  });
  console.log('');
  console.log('Try: curl http://localhost:4021/health');
  console.log('Try: curl http://localhost:4021/data (will return 402)');
});
