import * as tls from 'tls';
import * as dns from 'dns/promises';

interface SSLInfo {
  valid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysUntilExpiry: number | null;
  protocol: string | null;
}

interface DNSInfo {
  a: string[];
  aaaa: string[];
  cname: string[];
  mx: { exchange: string; priority: number }[];
  ns: string[];
  txt: string[][];
}

interface SecurityHeaders {
  [key: string]: { present: boolean; value: string | null; recommendation?: string };
}

interface PerformanceResult {
  url: string;
  timestamp: string;
  responseTime: {
    total: number;
    ttfb: number;
  };
  statusCode: number;
  ssl: SSLInfo;
  dns: DNSInfo;
  headers: {
    server: string | null;
    poweredBy: string | null;
    contentType: string | null;
    security: SecurityHeaders;
    caching: {
      cacheControl: string | null;
      etag: boolean;
      lastModified: string | null;
      expires: string | null;
    };
  };
  redirects: string[];
  ipAddress: string | null;
}

async function checkSSL(hostname: string): Promise<SSLInfo> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(443, hostname, { servername: hostname }, () => {
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol();
        socket.end();

        if (!cert || !cert.valid_to) {
          resolve({ valid: false, issuer: null, subject: null, validFrom: null, validTo: null, daysUntilExpiry: null, protocol: null });
          return;
        }

        const expiry = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        resolve({
          valid: socket.authorized ?? false,
          issuer: cert.issuer ? `${cert.issuer.O || ''} ${cert.issuer.CN || ''}`.trim() : null,
          subject: cert.subject?.CN || null,
          validFrom: cert.valid_from || null,
          validTo: cert.valid_to || null,
          daysUntilExpiry,
          protocol: protocol || null,
        });
      });

      socket.on('error', () => {
        resolve({ valid: false, issuer: null, subject: null, validFrom: null, validTo: null, daysUntilExpiry: null, protocol: null });
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({ valid: false, issuer: null, subject: null, validFrom: null, validTo: null, daysUntilExpiry: null, protocol: null });
      });
    } catch {
      resolve({ valid: false, issuer: null, subject: null, validFrom: null, validTo: null, daysUntilExpiry: null, protocol: null });
    }
  });
}

async function checkDNS(hostname: string): Promise<DNSInfo> {
  const result: DNSInfo = { a: [], aaaa: [], cname: [], mx: [], ns: [], txt: [] };

  const queries = [
    dns.resolve4(hostname).then(r => { result.a = r; }).catch(() => {}),
    dns.resolve6(hostname).then(r => { result.aaaa = r; }).catch(() => {}),
    dns.resolveCname(hostname).then(r => { result.cname = r; }).catch(() => {}),
    dns.resolveMx(hostname).then(r => { result.mx = r; }).catch(() => {}),
    dns.resolveNs(hostname).then(r => { result.ns = r; }).catch(() => {}),
    dns.resolveTxt(hostname).then(r => { result.txt = r; }).catch(() => {}),
  ];

  await Promise.allSettled(queries);
  return result;
}

function analyzeSecurityHeaders(headers: Headers): SecurityHeaders {
  const checks: { key: string; header: string; recommendation: string }[] = [
    { key: 'strictTransportSecurity', header: 'strict-transport-security', recommendation: 'Add HSTS header: max-age=31536000; includeSubDomains' },
    { key: 'contentSecurityPolicy', header: 'content-security-policy', recommendation: 'Add CSP header to prevent XSS attacks' },
    { key: 'xContentTypeOptions', header: 'x-content-type-options', recommendation: 'Add: X-Content-Type-Options: nosniff' },
    { key: 'xFrameOptions', header: 'x-frame-options', recommendation: 'Add: X-Frame-Options: DENY or SAMEORIGIN' },
    { key: 'referrerPolicy', header: 'referrer-policy', recommendation: 'Add Referrer-Policy header' },
    { key: 'permissionsPolicy', header: 'permissions-policy', recommendation: 'Add Permissions-Policy header' },
    { key: 'xXssProtection', header: 'x-xss-protection', recommendation: 'Consider adding X-XSS-Protection (legacy but still useful)' },
  ];

  const result: SecurityHeaders = {};
  for (const check of checks) {
    const value = headers.get(check.header);
    result[check.key] = {
      present: value !== null,
      value,
      ...(value === null ? { recommendation: check.recommendation } : {}),
    };
  }
  return result;
}

export async function checkPerformance(inputUrl: string): Promise<PerformanceResult> {
  const hostname = inputUrl.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

  const redirects: string[] = [];
  const startTime = Date.now();
  let ttfb = 0;

  // Fetch with redirect tracking
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'PerfCheck/1.0 (x402 Performance Checker)' },
  });

  ttfb = Date.now() - startTime;
  // Consume body to get full response time
  await response.text();
  const totalTime = Date.now() - startTime;

  // Parallel: SSL + DNS
  const [ssl, dnsInfo] = await Promise.all([
    checkSSL(hostname),
    checkDNS(hostname),
  ]);

  const securityHeaders = analyzeSecurityHeaders(response.headers);

  return {
    url,
    timestamp: new Date().toISOString(),
    responseTime: { total: totalTime, ttfb },
    statusCode: response.status,
    ssl,
    dns: dnsInfo,
    headers: {
      server: response.headers.get('server'),
      poweredBy: response.headers.get('x-powered-by'),
      contentType: response.headers.get('content-type'),
      security: securityHeaders,
      caching: {
        cacheControl: response.headers.get('cache-control'),
        etag: response.headers.has('etag'),
        lastModified: response.headers.get('last-modified'),
        expires: response.headers.get('expires'),
      },
    },
    redirects,
    ipAddress: dnsInfo.a[0] || null,
  };
}
