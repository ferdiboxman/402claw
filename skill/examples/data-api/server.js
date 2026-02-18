import express from "express";
import { paymentMiddleware } from "@x402/express";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load CSV data
const csvData = readFileSync(join(__dirname, "sample-data.csv"), "utf-8");
const models = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
  cast: (value, context) => {
    if (["input_price_per_1m", "output_price_per_1m"].includes(context.column)) {
      return parseFloat(value);
    }
    if (context.column === "context_window") {
      return parseInt(value, 10);
    }
    return value;
  },
});

const app = express();
const PORT = process.env.PORT || 4021;
const PAY_TO = process.env.PAY_TO_ADDRESS || "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F";
const FACILITATOR = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";
const NETWORK = process.env.NETWORK || "base-sepolia";

// Health check (free)
app.get("/", (req, res) => {
  res.json({
    name: "AI Model Pricing API",
    description: "Real-time AI model pricing data — compare costs across providers",
    endpoints: [
      { path: "/api/models", price: "$0.001", description: "List all models" },
      { path: "/api/models/:name", price: "$0.0005", description: "Get single model" },
      { path: "/api/models/compare?models=a,b", price: "$0.002", description: "Compare models" },
    ],
    totalModels: models.length,
  });
});

// List all models
app.get(
  "/api/models",
  paymentMiddleware(PAY_TO, { maxAmountRequired: 0.001, network: NETWORK, resource: "List all AI models" }, { url: FACILITATOR }),
  (req, res) => {
    res.json({ count: models.length, models });
  }
);

// Compare models
app.get(
  "/api/models/compare",
  paymentMiddleware(PAY_TO, { maxAmountRequired: 0.002, network: NETWORK, resource: "Compare AI models" }, { url: FACILITATOR }),
  (req, res) => {
    const names = (req.query.models || "").split(",").map((n) => n.trim().toLowerCase());
    if (!names.length || (names.length === 1 && !names[0])) {
      return res.status(400).json({ error: "Provide ?models=name1,name2,..." });
    }
    const matched = models.filter((m) => names.includes(m.name.toLowerCase()));
    if (!matched.length) {
      return res.status(404).json({ error: "No matching models found", requested: names });
    }
    // Sort by input price
    const sorted = [...matched].sort((a, b) => a.input_price_per_1m - b.input_price_per_1m);
    res.json({
      count: matched.length,
      models: matched,
      cheapestInput: sorted[0].name,
      cheapestOutput: [...matched].sort((a, b) => a.output_price_per_1m - b.output_price_per_1m)[0].name,
    });
  }
);

// Get single model
app.get(
  "/api/models/:name",
  paymentMiddleware(PAY_TO, { maxAmountRequired: 0.0005, network: NETWORK, resource: "Get single AI model" }, { url: FACILITATOR }),
  (req, res) => {
    const name = req.params.name.toLowerCase();
    const model = models.find((m) => m.name.toLowerCase() === name || m.name.toLowerCase().replace(/[\s.]/g, "-") === name);
    if (!model) {
      return res.status(404).json({ error: "Model not found", available: models.map((m) => m.name) });
    }
    res.json(model);
  }
);

app.listen(PORT, () => {
  console.log(`⚡ x402 Data API running on http://localhost:${PORT}`);
  console.log(`💰 Payments to: ${PAY_TO}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`📊 ${models.length} models loaded`);
});
