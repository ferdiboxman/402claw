import { Router, Request, Response } from "express";
// @ts-ignore
import modelsData from "../data/models.json" assert { type: "json" };

const router = Router();

interface Model {
  id: string;
  name: string;
  provider: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  context_window: number;
  max_output_tokens: number;
  supports_vision: boolean;
  supports_tools: boolean;
  release_date: string;
  tags: string[];
}

const models: Model[] = modelsData as Model[];

// GET /models — list all models
router.get("/models", (_req: Request, res: Response) => {
  const { provider, tag, sort, order } = _req.query;

  let result = [...models];

  if (provider) {
    result = result.filter(
      (m) => m.provider.toLowerCase() === (provider as string).toLowerCase()
    );
  }

  if (tag) {
    result = result.filter((m) => m.tags.includes(tag as string));
  }

  if (sort) {
    const key = sort as keyof Model;
    const dir = order === "desc" ? -1 : 1;
    result.sort((a, b) => {
      if (a[key] < b[key]) return -1 * dir;
      if (a[key] > b[key]) return 1 * dir;
      return 0;
    });
  }

  res.json({
    count: result.length,
    models: result.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      input_price_per_1m: m.input_price_per_1m,
      output_price_per_1m: m.output_price_per_1m,
      context_window: m.context_window,
    })),
  });
});

// GET /models/:name — detailed model info
router.get("/models/:name", (req: Request, res: Response) => {
  const model = models.find(
    (m) => {
      const name = req.params.name as string;
      return m.id === name || m.name.toLowerCase() === name.toLowerCase();
    }
  );

  if (!model) {
    res.status(404).json({ error: "Model not found", available: models.map((m) => m.id) });
    return;
  }

  res.json(model);
});

// GET /compare — compare multiple models
router.get("/compare", (req: Request, res: Response) => {
  const modelIds = ((req.query.models as string) || "").split(",").filter(Boolean);

  if (modelIds.length < 2) {
    res.status(400).json({ error: "Provide at least 2 model IDs: ?models=gpt-4o,claude-sonnet-4" });
    return;
  }

  const found = modelIds
    .map((id) => models.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase()))
    .filter(Boolean) as Model[];

  if (found.length === 0) {
    res.status(404).json({ error: "No matching models found" });
    return;
  }

  const cheapestInput = found.reduce((a, b) => (a.input_price_per_1m < b.input_price_per_1m ? a : b));
  const cheapestOutput = found.reduce((a, b) => (a.output_price_per_1m < b.output_price_per_1m ? a : b));
  const largestContext = found.reduce((a, b) => (a.context_window > b.context_window ? a : b));

  res.json({
    models: found,
    summary: {
      cheapest_input: { model: cheapestInput.id, price: cheapestInput.input_price_per_1m },
      cheapest_output: { model: cheapestOutput.id, price: cheapestOutput.output_price_per_1m },
      largest_context: { model: largestContext.id, context_window: largestContext.context_window },
    },
  });
});

// GET /recommend — recommend best model for task + budget
router.get("/recommend", (req: Request, res: Response) => {
  const { task, budget, vision, tools } = req.query;

  if (!task) {
    res.status(400).json({
      error: "Provide a task: ?task=coding&budget=0.01",
      available_tasks: ["coding", "reasoning", "general", "cheap", "vision", "fast", "rag", "math", "agentic"],
    });
    return;
  }

  let candidates = models.filter((m) => m.tags.includes(task as string));

  if (candidates.length === 0) {
    // Fallback to general models
    candidates = models.filter((m) => m.tags.includes("general"));
  }

  if (vision === "true") {
    candidates = candidates.filter((m) => m.supports_vision);
  }

  if (tools === "true") {
    candidates = candidates.filter((m) => m.supports_tools);
  }

  if (budget) {
    const maxPrice = parseFloat(budget as string) * 1_000_000; // budget is per-token cost estimate
    // Filter by output price being reasonable relative to budget
    // Budget is interpreted as max $ per 1K output tokens
    const maxPer1M = parseFloat(budget as string) * 1000;
    candidates = candidates.filter((m) => m.output_price_per_1m <= maxPer1M);
  }

  // Sort by value: lower output price first, then by context window
  candidates.sort((a, b) => {
    const costA = a.input_price_per_1m + a.output_price_per_1m;
    const costB = b.input_price_per_1m + b.output_price_per_1m;
    return costA - costB;
  });

  const top = candidates.slice(0, 3);

  res.json({
    task,
    budget: budget || "unlimited",
    recommendations: top.map((m, i) => ({
      rank: i + 1,
      ...m,
      estimated_cost_per_1k_tokens: ((m.input_price_per_1m + m.output_price_per_1m) / 2000).toFixed(6),
    })),
    total_candidates: candidates.length,
  });
});

export default router;
