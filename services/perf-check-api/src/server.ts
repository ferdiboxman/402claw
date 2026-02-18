import express from 'express';
import { paymentMiddlewareFromConfig } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/http';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { checkPerformance } from './checks/performance.js';
import { checkLighthouse } from './checks/lighthouse.js';
import { checkSEO } from './checks/seo.js';
import { checkLinks } from './checks/links.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3100');

const payTo = process.env.PAY_TO || '0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F';
const network = (process.env.NETWORK || 'eip155:84532') as `${string}:${string}`;
const facilitatorUrl = process.env.FACILITATOR_URL || 'https://x402.org/facilitator';

const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });

const routes = {
  'GET /check': {
    accepts: { scheme: 'exact', payTo, price: '$0.01', network },
    description: 'Website performance check: response time, SSL, DNS, security headers',
  },
  'GET /lighthouse': {
    accepts: { scheme: 'exact', payTo, price: '$0.03', network },
    description: 'Google PageSpeed Insights: Core Web Vitals, mobile + desktop',
  },
  'GET /seo': {
    accepts: { scheme: 'exact', payTo, price: '$0.02', network },
    description: 'SEO audit with scored report',
  },
  'GET /links': {
    accepts: { scheme: 'exact', payTo, price: '$0.02', network },
    description: 'Broken link detection and analysis',
  },
};

app.use(paymentMiddlewareFromConfig(
  routes,
  facilitator,
  [{ network, server: new ExactEvmScheme() }],
));

// Health (free - not in routes config so no payment required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'perf-check-api',
    version: '1.0.0',
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
});
