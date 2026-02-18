import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { createFacilitatorConfig } from '@coinbase/x402';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { checkPerformance } from './checks/performance.js';
import { checkLighthouse } from './checks/lighthouse.js';
import { checkSEO } from './checks/seo.js';
import { checkLinks } from './checks/links.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3100');

const payTo = process.env.PAY_TO || '0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F';
const network = (process.env.NETWORK || 'eip155:84532') as `${string}:${string}`;

// Auto-detect: if CDP keys present, use mainnet facilitator. Otherwise testnet.
const cdpKeyId = process.env.CDP_API_KEY_ID;
const cdpKeySecret = process.env.CDP_API_KEY_SECRET;
const facilitatorConfig = cdpKeyId && cdpKeySecret
  ? createFacilitatorConfig(cdpKeyId, cdpKeySecret)
  : { url: process.env.FACILITATOR_URL || 'https://www.x402.org/facilitator' };
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

const server = new x402ResourceServer(facilitatorClient)
  .register(network, new ExactEvmScheme());
server.registerExtension(bazaarResourceServerExtension);

const routes = {
  'GET /check': {
    accepts: [{ scheme: 'exact' as const, payTo, price: '$0.01', network }],
    description: 'Website performance check: response time, SSL, DNS, security headers',
    mimeType: 'application/json',
    extensions: {
      bazaar: {
        discoverable: true,
        category: "analytics",
        tags: ["performance", "ssl", "dns", "seo", "security"],
      },
      ...declareDiscoveryExtension({
        input: { url: 'https://example.com' },
        inputSchema: {
          properties: {
            url: { type: 'string', description: 'URL to check' },
          },
          required: ['url'],
        },
        output: {
          example: { url: 'https://example.com', responseTime: 245, ssl: { valid: true }, dns: { resolves: true }, headers: { score: 8 } },
        },
      }),
    },
  },
  'GET /lighthouse': {
    accepts: [{ scheme: 'exact' as const, payTo, price: '$0.03', network }],
    description: 'Google PageSpeed Insights: Core Web Vitals, mobile + desktop',
    mimeType: 'application/json',
    extensions: {
      bazaar: {
        discoverable: true,
        category: "analytics",
        tags: ["performance", "ssl", "dns", "seo", "security"],
      },
      ...declareDiscoveryExtension({
        input: { url: 'https://example.com' },
        inputSchema: {
          properties: {
            url: { type: 'string', description: 'URL to audit' },
          },
          required: ['url'],
        },
        output: {
          example: { url: 'https://example.com', performance: 92, accessibility: 98, bestPractices: 95, seo: 100 },
        },
      }),
    },
  },
  'GET /seo': {
    accepts: [{ scheme: 'exact' as const, payTo, price: '$0.02', network }],
    description: 'SEO audit with scored report',
    mimeType: 'application/json',
    extensions: {
      bazaar: {
        discoverable: true,
        category: "analytics",
        tags: ["performance", "ssl", "dns", "seo", "security"],
      },
      ...declareDiscoveryExtension({
        input: { url: 'https://example.com' },
        inputSchema: {
          properties: {
            url: { type: 'string', description: 'URL to audit for SEO' },
          },
          required: ['url'],
        },
        output: {
          example: { url: 'https://example.com', score: 85, issues: [], recommendations: [] },
        },
      }),
    },
  },
  'GET /links': {
    accepts: [{ scheme: 'exact' as const, payTo, price: '$0.02', network }],
    description: 'Broken link detection and analysis',
    mimeType: 'application/json',
    extensions: {
      bazaar: {
        discoverable: true,
        category: "analytics",
        tags: ["performance", "ssl", "dns", "seo", "security"],
      },
      ...declareDiscoveryExtension({
        input: { url: 'https://example.com' },
        inputSchema: {
          properties: {
            url: { type: 'string', description: 'URL to scan for broken links' },
          },
          required: ['url'],
        },
        output: {
          example: { url: 'https://example.com', totalLinks: 42, brokenLinks: 2, links: [] },
        },
      }),
    },
  },
};

app.use(paymentMiddleware(routes, server));

// Health (free)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'perf-check-api',
    version: '1.0.0',
    network,
    endpoints: ['/check', '/lighthouse', '/seo', '/links'],
    timestamp: new Date().toISOString(),
  });
});

function validateUrl(url: string | undefined): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (!cleaned) return null;
  if (cleaned.includes(' ') || (!cleaned.includes('.') && !cleaned.includes('localhost'))) return null;
  return cleaned;
}

app.get('/check', async (req, res) => {
  const url = validateUrl(req.query.url as string);
  if (!url) return res.status(400).json({ error: 'Missing or invalid ?url= parameter' });
  try {
    const result = await checkPerformance(url);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to check URL', message: err.message });
  }
});

app.get('/lighthouse', async (req, res) => {
  const url = validateUrl(req.query.url as string);
  if (!url) return res.status(400).json({ error: 'Missing or invalid ?url= parameter' });
  try {
    const result = await checkLighthouse(url);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: 'Lighthouse check failed', message: err.message });
  }
});

app.get('/seo', async (req, res) => {
  const url = validateUrl(req.query.url as string);
  if (!url) return res.status(400).json({ error: 'Missing or invalid ?url= parameter' });
  try {
    const result = await checkSEO(url);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: 'SEO check failed', message: err.message });
  }
});

app.get('/links', async (req, res) => {
  const url = validateUrl(req.query.url as string);
  if (!url) return res.status(400).json({ error: 'Missing or invalid ?url= parameter' });
  try {
    const result = await checkLinks(url);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: 'Link check failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 perf-check-api running on port ${PORT}`);
  console.log(`💰 Payments to: ${payTo}`);
  console.log(`🔗 Network: ${network}`);
  console.log(`🏦 Facilitator: ${cdpKeyId ? 'CDP (mainnet)' : 'x402.org (testnet)'}`);
});
