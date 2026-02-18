const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

interface LighthouseMetrics {
  score: number;
  firstContentfulPaint: { value: number; displayValue: string };
  largestContentfulPaint: { value: number; displayValue: string };
  cumulativeLayoutShift: { value: number; displayValue: string };
  totalBlockingTime: { value: number; displayValue: string };
  speedIndex: { value: number; displayValue: string };
  interactive: { value: number; displayValue: string };
}

interface Opportunity {
  title: string;
  description: string;
  savings: string | null;
}

interface Diagnostic {
  title: string;
  description: string;
  displayValue: string | null;
}

interface LighthouseResult {
  url: string;
  timestamp: string;
  mobile: LighthouseMetrics;
  desktop: LighthouseMetrics;
  opportunities: Opportunity[];
  diagnostics: Diagnostic[];
}

function extractMetrics(data: any): LighthouseMetrics {
  const audits = data.lighthouseResult?.audits || {};
  const score = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100);

  const metric = (key: string) => ({
    value: audits[key]?.numericValue || 0,
    displayValue: audits[key]?.displayValue || 'N/A',
  });

  return {
    score,
    firstContentfulPaint: metric('first-contentful-paint'),
    largestContentfulPaint: metric('largest-contentful-paint'),
    cumulativeLayoutShift: metric('cumulative-layout-shift'),
    totalBlockingTime: metric('total-blocking-time'),
    speedIndex: metric('speed-index'),
    interactive: metric('interactive'),
  };
}

function extractOpportunities(data: any): Opportunity[] {
  const audits = data.lighthouseResult?.audits || {};
  return Object.values(audits)
    .filter((a: any) => a.details?.type === 'opportunity' && a.details?.overallSavingsMs > 0)
    .map((a: any) => ({
      title: a.title,
      description: a.description,
      savings: a.displayValue || null,
    }))
    .slice(0, 10);
}

function extractDiagnostics(data: any): Diagnostic[] {
  const audits = data.lighthouseResult?.audits || {};
  const diagnosticIds = data.lighthouseResult?.categories?.performance?.auditRefs
    ?.filter((r: any) => r.group === 'diagnostics')
    ?.map((r: any) => r.id) || [];

  return diagnosticIds
    .map((id: string) => audits[id])
    .filter((a: any) => a && a.score !== null && a.score < 1)
    .map((a: any) => ({
      title: a.title,
      description: a.description,
      displayValue: a.displayValue || null,
    }))
    .slice(0, 10);
}

async function runPSI(url: string, strategy: 'mobile' | 'desktop'): Promise<any> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: 'performance',
  });

  const response = await fetch(`${PSI_API}?${params}`, {
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PageSpeed Insights API error (${response.status}): ${text}`);
  }

  return response.json();
}

export async function checkLighthouse(inputUrl: string): Promise<LighthouseResult> {
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;

  const [mobileData, desktopData] = await Promise.all([
    runPSI(url, 'mobile'),
    runPSI(url, 'desktop'),
  ]);

  return {
    url,
    timestamp: new Date().toISOString(),
    mobile: extractMetrics(mobileData),
    desktop: extractMetrics(desktopData),
    opportunities: extractOpportunities(mobileData),
    diagnostics: extractDiagnostics(mobileData),
  };
}
