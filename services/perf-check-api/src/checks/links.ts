import * as cheerio from 'cheerio';

interface LinkResult {
  url: string;
  status: number | null;
  ok: boolean;
  redirected: boolean;
  redirectUrl: string | null;
  error: string | null;
}

interface LinksCheckResult {
  url: string;
  timestamp: string;
  summary: {
    total: number;
    internal: number;
    external: number;
    broken: number;
    redirected: number;
    ok: number;
  };
  internal: LinkResult[];
  external: LinkResult[];
  broken: LinkResult[];
}

async function checkLink(linkUrl: string): Promise<LinkResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(linkUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'PerfCheck/1.0 (x402 Link Checker)' },
    });

    clearTimeout(timeout);

    // Some servers don't support HEAD, retry with GET
    if (response.status === 405) {
      const getResponse = await fetch(linkUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'PerfCheck/1.0 (x402 Link Checker)' },
      });
      await getResponse.text().catch(() => {});
      return {
        url: linkUrl,
        status: getResponse.status,
        ok: getResponse.ok,
        redirected: getResponse.redirected,
        redirectUrl: getResponse.redirected ? getResponse.url : null,
        error: null,
      };
    }

    return {
      url: linkUrl,
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      redirectUrl: response.redirected ? response.url : null,
      error: null,
    };
  } catch (err: any) {
    return {
      url: linkUrl,
      status: null,
      ok: false,
      redirected: false,
      redirectUrl: null,
      error: err.message || 'Unknown error',
    };
  }
}

export async function checkLinks(inputUrl: string): Promise<LinksCheckResult> {
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;
  const hostname = new URL(url).hostname;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'PerfCheck/1.0 (x402 Link Checker)' },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract unique links
  const internalUrls = new Set<string>();
  const externalUrls = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    try {
      const resolved = new URL(href, url);
      const normalized = `${resolved.protocol}//${resolved.host}${resolved.pathname}`;
      if (resolved.hostname === hostname) {
        internalUrls.add(normalized);
      } else {
        externalUrls.add(normalized);
      }
    } catch {}
  });

  // Cap to avoid abuse
  const maxInternal = 50;
  const maxExternal = 50;

  const internalList = [...internalUrls].slice(0, maxInternal);
  const externalList = [...externalUrls].slice(0, maxExternal);

  // Check all links in parallel with concurrency limit
  const allLinks = [...internalList, ...externalList];
  const batchSize = 10;
  const results: LinkResult[] = [];

  for (let i = 0; i < allLinks.length; i += batchSize) {
    const batch = allLinks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkLink));
    results.push(...batchResults);
  }

  const internalResults = results.filter(r => internalList.includes(r.url));
  const externalResults = results.filter(r => externalList.includes(r.url));
  const brokenResults = results.filter(r => !r.ok);

  return {
    url,
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      internal: internalResults.length,
      external: externalResults.length,
      broken: brokenResults.length,
      redirected: results.filter(r => r.redirected).length,
      ok: results.filter(r => r.ok).length,
    },
    internal: internalResults,
    external: externalResults,
    broken: brokenResults,
  };
}
