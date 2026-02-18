import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { paymentMiddleware } from "@x402/express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4022;
const PAY_TO_ADDRESS =
  process.env.PAY_TO_ADDRESS ||
  "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F";
const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// --- HTML parsing helpers (no extra deps) ---

function extractMeta(html) {
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ) ||
    html.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
    );
  const description = descMatch?.[1] || "";
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const imgTotal = (html.match(/<img[\s>]/gi) || []).length;
  const imgWithAlt = (
    html.match(/<img\s[^>]*alt=["'][^"']+["']/gi) || []
  ).length;
  const imgWithoutAlt = imgTotal - imgWithAlt;
  const links = (html.match(/<a\s[^>]*href=["']([^"']*)["']/gi) || []).length;
  const metaTags = (html.match(/<meta[\s][^>]*>/gi) || []).length;

  return { title, description, h1Count, imgWithoutAlt, imgTotal, links, metaTags };
}

// --- Claude SEO analysis ---

async function analyzeWithClaude(url, meta, html) {
  const snippet = html.slice(0, 12000);

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are an SEO expert. Analyze this webpage and return ONLY valid JSON (no markdown).

URL: ${url}
Title: ${meta.title}
Description: ${meta.description}
H1 count: ${meta.h1Count}
Images without alt: ${meta.imgWithoutAlt} / ${meta.imgTotal}
Links: ${meta.links}
Meta tags: ${meta.metaTags}

HTML snippet:
${snippet}

Return JSON:
{
  "score": <0-100>,
  "issues": ["issue 1", ...],
  "recommendations": ["rec 1", ...],
  "loadEstimate": "fast|medium|slow"
}`,
      },
    ],
  });

  const text = message.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse Claude response");
  return JSON.parse(jsonMatch[0]);
}

function mockAnalysis(url, meta) {
  return {
    score: 62,
    issues: [
      "No ANTHROPIC_API_KEY set — returning mock analysis",
      meta.h1Count === 0 ? "Missing H1 tag" : null,
      meta.imgWithoutAlt > 0
        ? `${meta.imgWithoutAlt} image(s) missing alt text`
        : null,
      !meta.description ? "Missing meta description" : null,
    ].filter(Boolean),
    recommendations: [
      "Set ANTHROPIC_API_KEY for real AI-powered analysis",
      "Ensure every page has exactly one H1",
      "Add descriptive alt text to all images",
      "Keep title under 60 characters",
    ],
    loadEstimate: "unknown",
    _mock: true,
  };
}

// --- Routes ---

app.get("/", (_req, res) => {
  res.json({
    name: "SEO Analyzer",
    description: "AI-powered SEO analysis paid via x402",
    endpoints: ["POST /api/analyze"],
    price: "$0.05 per analysis",
  });
});

app.post(
  "/api/analyze",
  paymentMiddleware(PAY_TO_ADDRESS, { "POST /api/analyze": { price: "$0.05", network: "base" } }, { url: FACILITATOR_URL }),
  async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Missing 'url' in request body" });

      // Fetch the page
      const response = await fetch(url, {
        headers: { "User-Agent": "x402-SEO-Analyzer/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        return res.status(502).json({ error: `Failed to fetch URL: ${response.status}` });

      const html = await response.text();
      const meta = extractMeta(html);

      let result;
      if (process.env.ANTHROPIC_API_KEY) {
        const analysis = await analyzeWithClaude(url, meta, html);
        result = {
          score: analysis.score,
          issues: analysis.issues,
          recommendations: analysis.recommendations,
          meta: {
            title: meta.title,
            description: meta.description,
            h1Count: meta.h1Count,
            imgWithoutAlt: meta.imgWithoutAlt,
            loadEstimate: analysis.loadEstimate || "unknown",
          },
        };
      } else {
        const mock = mockAnalysis(url, meta);
        result = {
          ...mock,
          meta: {
            title: meta.title,
            description: meta.description,
            h1Count: meta.h1Count,
            imgWithoutAlt: meta.imgWithoutAlt,
            loadEstimate: mock.loadEstimate,
          },
        };
      }

      res.json(result);
    } catch (err) {
      console.error("Analysis error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.listen(PORT, () => {
  console.log(`🔍 SEO Analyzer running on http://localhost:${PORT}`);
  console.log(`💰 Payments to ${PAY_TO_ADDRESS}`);
  console.log(
    `🤖 Claude API: ${process.env.ANTHROPIC_API_KEY ? "configured" : "NOT SET (mock mode)"}`
  );
});
