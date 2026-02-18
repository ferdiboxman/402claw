import * as cheerio from "cheerio";

export interface ExtractedData {
  title: string | null;
  description: string | null;
  author: string | null;
  date: string | null;
  mainContent: string;
  links: { text: string; href: string }[];
  images: { src: string; alt: string }[];
  metadata: Record<string, string>;
  openGraph: Record<string, string>;
  structuredData: unknown[];
}

export interface SummaryData {
  summary: string;
  keyPoints: string[];
  entities: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
}

export interface CompareData {
  similarities: string[];
  differences: string[];
  recommendation: string;
}

const UA =
  "Mozilla/5.0 (compatible; 402claw-webintel/1.0; +https://github.com/402claw)";

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

export function extract(
  html: string,
  url: string,
  fields?: string[]
): ExtractedData {
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, noscript, iframe, svg").remove();

  const meta = (name: string) =>
    $(`meta[name="${name}"], meta[property="${name}"]`).attr("content") ?? null;

  const allMeta: Record<string, string> = {};
  $("meta[name], meta[property]").each((_, el) => {
    const key = $(el).attr("name") || $(el).attr("property") || "";
    const val = $(el).attr("content") || "";
    if (key) allMeta[key] = val;
  });

  const og: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const key = ($(el).attr("property") || "").replace("og:", "");
    og[key] = $(el).attr("content") || "";
  });

  const structuredData: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      structuredData.push(JSON.parse($(el).html() || ""));
    } catch {}
  });

  // Main content: prefer article, main, then body
  const contentEl = $("article").length
    ? $("article")
    : $("main").length
      ? $("main")
      : $("body");

  const mainContent = contentEl
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);

  const links: { text: string; href: string }[] = [];
  contentEl.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (href && text && !href.startsWith("#") && !href.startsWith("javascript:")) {
      try {
        links.push({ text, href: new URL(href, url).href });
      } catch {
        links.push({ text, href });
      }
    }
  });

  const images: { src: string; alt: string }[] = [];
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    if (src) {
      try {
        images.push({ src: new URL(src, url).href, alt });
      } catch {
        images.push({ src, alt });
      }
    }
  });

  const full: ExtractedData = {
    title: $("title").text().trim() || og.title || null,
    description: meta("description") || og.description || null,
    author: meta("author") || null,
    date:
      meta("article:published_time") ||
      meta("date") ||
      $("time[datetime]").first().attr("datetime") ||
      null,
    mainContent,
    links: links.slice(0, 200),
    images: images.slice(0, 100),
    metadata: allMeta,
    openGraph: og,
    structuredData,
  };

  if (!fields || fields.length === 0) return full;

  // Filter to requested fields
  const filtered: Partial<ExtractedData> = {};
  for (const f of fields) {
    if (f in full) (filtered as any)[f] = (full as any)[f];
  }
  return filtered as ExtractedData;
}

export function summarize(extracted: ExtractedData, maxLength = 500): SummaryData {
  const text = extracted.mainContent;

  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  // Build summary from top sentences (simple extractive)
  let summary = "";
  const used: string[] = [];
  for (const s of sentences) {
    if (summary.length + s.length > maxLength) break;
    summary += (summary ? " " : "") + s;
    used.push(s);
  }
  if (!summary) summary = text.slice(0, maxLength);

  // Key points: first N sentences after summary
  const keyPoints = sentences.slice(used.length, used.length + 5);

  // Entity extraction: capitalized multi-word phrases
  const entitySet = new Set<string>();
  const entityRe = /(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  let m: RegExpExecArray | null;
  while ((m = entityRe.exec(text)) !== null) {
    entitySet.add(m[0]);
    if (entitySet.size >= 20) break;
  }

  // Simple sentiment heuristic
  const positive = /good|great|excellent|amazing|love|happy|success|benefit|improve/gi;
  const negative = /bad|terrible|awful|hate|fail|problem|issue|worse|damage/gi;
  const pCount = (text.match(positive) || []).length;
  const nCount = (text.match(negative) || []).length;
  let sentiment: SummaryData["sentiment"] = "neutral";
  if (pCount > nCount * 2) sentiment = "positive";
  else if (nCount > pCount * 2) sentiment = "negative";
  else if (pCount > 3 && nCount > 3) sentiment = "mixed";

  return {
    summary,
    keyPoints,
    entities: [...entitySet],
    sentiment,
  };
}

export function compare(a: ExtractedData, b: ExtractedData): CompareData {
  const similarities: string[] = [];
  const differences: string[] = [];

  // Title comparison
  if (a.title && b.title) {
    if (a.title === b.title) similarities.push(`Same title: "${a.title}"`);
    else differences.push(`Different titles: "${a.title}" vs "${b.title}"`);
  }

  // Shared links
  const aHrefs = new Set(a.links.map((l) => l.href));
  const bHrefs = new Set(b.links.map((l) => l.href));
  const shared = [...aHrefs].filter((h) => bHrefs.has(h));
  if (shared.length > 0)
    similarities.push(`${shared.length} shared links`);
  else differences.push("No shared links");

  // Content length
  const aLen = a.mainContent.length;
  const bLen = b.mainContent.length;
  const ratio = Math.min(aLen, bLen) / Math.max(aLen, bLen);
  if (ratio > 0.8) similarities.push("Similar content length");
  else
    differences.push(
      `Content length differs significantly (${aLen} vs ${bLen} chars)`
    );

  // Word overlap (jaccard on word sets)
  const words = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );
  const aWords = words(a.mainContent.slice(0, 10000));
  const bWords = words(b.mainContent.slice(0, 10000));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  if (jaccard > 0.5)
    similarities.push(`High word overlap (${(jaccard * 100).toFixed(0)}%)`);
  else if (jaccard > 0.2)
    similarities.push(`Moderate word overlap (${(jaccard * 100).toFixed(0)}%)`);
  else
    differences.push(`Low word overlap (${(jaccard * 100).toFixed(0)}%)`);

  // Image counts
  if (Math.abs(a.images.length - b.images.length) < 3)
    similarities.push("Similar image count");
  else
    differences.push(
      `Different image counts (${a.images.length} vs ${b.images.length})`
    );

  // Recommendation
  let recommendation: string;
  if (jaccard > 0.6) recommendation = "Pages are very similar in content.";
  else if (jaccard > 0.3)
    recommendation = "Pages share some common ground but have distinct content.";
  else recommendation = "Pages cover different topics or perspectives.";

  return { similarities, differences, recommendation };
}
