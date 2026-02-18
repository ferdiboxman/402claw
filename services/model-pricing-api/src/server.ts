import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import modelsRouter from "./routes/models.js";

config();

const PORT = parseInt(process.env.PORT || "4021", 10);
const PAY_TO = (process.env.PAY_TO || "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F") as `0x${string}`;
const NETWORK = (process.env.NETWORK || "eip155:84532") as `${string}:${string}`;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(NETWORK, new ExactEvmScheme());

const app = express();
app.use(express.json());

// Health check (free)
app.get("/", (_req, res) => {
  res.json({
    name: "AI Model Pricing API",
    version: "1.0.0",
    description: "Real-time LLM model pricing data via x402 micropayments",
    endpoints: {
      "GET /models": { price: "$0.001", description: "List all models with pricing" },
      "GET /models/:name": { price: "$0.001", description: "Detailed model info" },
      "GET /compare?models=a,b": { price: "$0.005", description: "Compare models side-by-side" },
      "GET /recommend?task=coding": { price: "$0.01", description: "Get model recommendations" },
    },
    payment: { network: NETWORK, payTo: PAY_TO, protocol: "x402" },
  });
});

// x402 payment middleware
app.use(
  paymentMiddleware(
    {
      "GET /models": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "List all AI models with pricing",
        mimeType: "application/json",
        extensions: {
          ...declareDiscoveryExtension({
            input: { provider: "OpenAI", tag: "coding" },
            inputSchema: {
              properties: {
                provider: { type: "string", description: "Filter by provider name" },
                tag: { type: "string", description: "Filter by tag (coding, vision, cheap, etc.)" },
                sort: { type: "string", description: "Sort field" },
                order: { type: "string", description: "asc or desc" },
              },
            },
            output: {
              example: {
                count: 26,
                models: [{ id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", input_price_per_1m: 2.5, output_price_per_1m: 10.0, context_window: 128000 }],
              },
            },
          }),
        },
      },
      "GET /models/:name": {
        accepts: {
          scheme: "exact",
          price: "$0.001",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Get detailed info for a specific AI model",
        mimeType: "application/json",
        extensions: {
          ...declareDiscoveryExtension({
            input: { name: "gpt-4o" },
            inputSchema: {
              properties: {
                name: { type: "string", description: "Model ID or name" },
              },
              required: ["name"],
            },
            output: {
              example: {
                id: "gpt-4o",
                name: "GPT-4o",
                provider: "OpenAI",
                input_price_per_1m: 2.5,
                output_price_per_1m: 10.0,
                context_window: 128000,
                max_output_tokens: 16384,
                supports_vision: true,
                supports_tools: true,
              },
            },
          }),
        },
      },
      "GET /compare": {
        accepts: {
          scheme: "exact",
          price: "$0.005",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Compare multiple AI models side-by-side",
        mimeType: "application/json",
        extensions: {
          ...declareDiscoveryExtension({
            input: { models: "gpt-4o,claude-sonnet-4" },
            inputSchema: {
              properties: {
                models: { type: "string", description: "Comma-separated model IDs to compare" },
              },
              required: ["models"],
            },
            output: {
              example: {
                models: [],
                summary: {
                  cheapest_input: { model: "gpt-4o-mini", price: 0.15 },
                  cheapest_output: { model: "gpt-4o-mini", price: 0.6 },
                },
              },
            },
          }),
        },
      },
      "GET /recommend": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Get AI model recommendations for a task and budget",
        mimeType: "application/json",
        extensions: {
          ...declareDiscoveryExtension({
            input: { task: "coding", budget: "0.01" },
            inputSchema: {
              properties: {
                task: { type: "string", description: "Task type: coding, reasoning, general, cheap, vision, fast, rag, math, agentic" },
                budget: { type: "string", description: "Max budget per 1K output tokens in USD" },
                vision: { type: "string", description: "Require vision support (true/false)" },
                tools: { type: "string", description: "Require tool use support (true/false)" },
              },
              required: ["task"],
            },
            output: {
              example: {
                task: "coding",
                recommendations: [{ rank: 1, id: "deepseek-v3", name: "DeepSeek-V3" }],
              },
            },
          }),
        },
      },
    },
    resourceServer,
  ),
);

// Mount routes
app.use(modelsRouter);

app.listen(PORT, () => {
  console.log(`🚀 AI Model Pricing API running at http://localhost:${PORT}`);
  console.log(`💰 Payments: ${NETWORK} → ${PAY_TO}`);
  console.log(`📡 Facilitator: ${FACILITATOR_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /          — API info (free)`);
  console.log(`  GET /models    — List models ($0.001)`);
  console.log(`  GET /models/:n — Model detail ($0.001)`);
  console.log(`  GET /compare   — Compare models ($0.005)`);
  console.log(`  GET /recommend — Recommendations ($0.01)`);
});
