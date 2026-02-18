import { Router, Request, Response } from "express";
import { fetchPage, extract, summarize, compare } from "../extractor.js";

const router = Router();

// POST /extract — $0.01/call
router.post("/extract", async (req: Request, res: Response) => {
  try {
    const { url, fields } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }
    const html = await fetchPage(url);
    const data = extract(html, url, fields);
    res.json({ url, ...data });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Extraction failed" });
  }
});

// POST /summarize — $0.02/call
router.post("/summarize", async (req: Request, res: Response) => {
  try {
    const { url, maxLength } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }
    const html = await fetchPage(url);
    const extracted = extract(html, url);
    const data = summarize(extracted, maxLength);
    res.json({ url, ...data });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Summarization failed" });
  }
});

// POST /compare — $0.03/call
router.post("/compare", async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length !== 2) {
      res.status(400).json({ error: "urls must be an array of exactly 2 URLs" });
      return;
    }
    const [htmlA, htmlB] = await Promise.all([fetchPage(urls[0]), fetchPage(urls[1])]);
    const a = extract(htmlA, urls[0]);
    const b = extract(htmlB, urls[1]);
    const data = compare(a, b);
    res.json({ urls, ...data });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Comparison failed" });
  }
});

export default router;
