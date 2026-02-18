import * as cheerio from 'cheerio';

interface HeadingStructure {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

interface SEOScore {
  overall: number;
  details: { check: string; passed: boolean; message: string; weight: number }[];
}

interface SEOResult {
  url: string;
  timestamp: string;
  title: { text: string | null; length: number; optimal: boolean };
  metaDescription: { text: string | null; length: number; optimal: boolean };
  headings: HeadingStructure;
  images: { total: number; withAlt: number; withoutAlt: number; missingAlt: string[] };
  canonical: string | null;
  robots: { meta: string | null; xRobotsTag: string | null };
  openGraph: Record<string, string>;
  twitterCards: Record<string, string>;
  schemaOrg: any[];
  links: { internal: number; external: number; nofollow: number };
  language: string | null;
  viewport: string | null;
  score: SEOScore;
}

export async function checkSEO(inputUrl: string): Promise<SEOResult> {
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'PerfCheck/1.0 (x402 SEO Checker)' },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Title
  const titleText = $('title').first().text().trim() || null;
  const titleLength = titleText?.length || 0;

  // Meta description
  const descText = $('meta[name="description"]').attr('content')?.trim() || null;
  const descLength = descText?.length || 0;

  // Headings
  const headings: HeadingStructure = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
  for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
    $(level).each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings[level].push(text);
    });
  }

  // Images
  const missingAlt: string[] = [];
  let withAlt = 0, withoutAlt = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    const src = $(el).attr('src') || 'unknown';
    if (alt && alt.trim()) {
      withAlt++;
    } else {
      withoutAlt++;
      missingAlt.push(src);
    }
  });

  // Canonical
  const canonical = $('link[rel="canonical"]').attr('href') || null;

  // Robots
  const robotsMeta = $('meta[name="robots"]').attr('content') || null;
  const xRobotsTag = response.headers.get('x-robots-tag');

  // Open Graph
  const openGraph: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property')!;
    openGraph[prop] = $(el).attr('content') || '';
  });

  // Twitter Cards
  const twitterCards: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name')!;
    twitterCards[name] = $(el).attr('content') || '';
  });

  // Schema.org (JSON-LD)
  const schemaOrg: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      schemaOrg.push(JSON.parse($(el).html() || ''));
    } catch {}
  });

  // Links
  let internal = 0, external = 0, nofollow = 0;
  const hostname = new URL(url).hostname;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const rel = $(el).attr('rel') || '';
    if (rel.includes('nofollow')) nofollow++;
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === hostname) internal++;
      else external++;
    } catch {
      internal++; // relative links
    }
  });

  // Language & viewport
  const language = $('html').attr('lang') || null;
  const viewport = $('meta[name="viewport"]').attr('content') || null;

  // Score
  const checks: SEOScore['details'] = [
    { check: 'Title exists', passed: !!titleText, message: titleText ? 'Title tag present' : 'Missing title tag', weight: 15 },
    { check: 'Title length', passed: titleLength >= 30 && titleLength <= 60, message: `Title is ${titleLength} chars (optimal: 30-60)`, weight: 10 },
    { check: 'Meta description exists', passed: !!descText, message: descText ? 'Meta description present' : 'Missing meta description', weight: 15 },
    { check: 'Meta description length', passed: descLength >= 120 && descLength <= 160, message: `Description is ${descLength} chars (optimal: 120-160)`, weight: 10 },
    { check: 'H1 exists', passed: headings.h1.length > 0, message: `${headings.h1.length} H1 tag(s) found`, weight: 10 },
    { check: 'Single H1', passed: headings.h1.length === 1, message: headings.h1.length === 1 ? 'Single H1 tag (good)' : `${headings.h1.length} H1 tags (should be 1)`, weight: 5 },
    { check: 'Image alt texts', passed: withoutAlt === 0, message: `${withAlt}/${withAlt + withoutAlt} images have alt text`, weight: 10 },
    { check: 'Canonical tag', passed: !!canonical, message: canonical ? 'Canonical URL set' : 'No canonical tag', weight: 5 },
    { check: 'Open Graph tags', passed: Object.keys(openGraph).length >= 3, message: `${Object.keys(openGraph).length} OG tags found`, weight: 5 },
    { check: 'Schema.org markup', passed: schemaOrg.length > 0, message: `${schemaOrg.length} JSON-LD schema(s) found`, weight: 5 },
    { check: 'Language attribute', passed: !!language, message: language ? `Language: ${language}` : 'Missing lang attribute', weight: 5 },
    { check: 'Viewport meta', passed: !!viewport, message: viewport ? 'Viewport configured' : 'Missing viewport meta', weight: 5 },
  ];

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const score = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);

  return {
    url,
    timestamp: new Date().toISOString(),
    title: { text: titleText, length: titleLength, optimal: titleLength >= 30 && titleLength <= 60 },
    metaDescription: { text: descText, length: descLength, optimal: descLength >= 120 && descLength <= 160 },
    headings,
    images: { total: withAlt + withoutAlt, withAlt, withoutAlt, missingAlt: missingAlt.slice(0, 20) },
    canonical,
    robots: { meta: robotsMeta, xRobotsTag },
    openGraph,
    twitterCards,
    schemaOrg,
    links: { internal, external, nofollow },
    language,
    viewport,
    score: { overall: Math.round((score / maxScore) * 100), details: checks },
  };
}
