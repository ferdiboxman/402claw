import express from "express";
import cors from "cors";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
import intelRoutes from "./routes/intel.js";

const PORT = parseInt(process.env.PORT || "3002", 10);
const PAY_TO = (process.env.PAY_TO ||
  "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F") as `0x${string}`;
const NETWORK = (process.env.NETWORK || "eip155:84532") as `${string}:${string}`;

const cdpKeyId = process.env.CDP_API_KEY_ID;
const cdpKeySecret = process.env.CDP_API_KEY_SECRET;
const facilitatorConfig = cdpKeyId && cdpKeySecret
  ? createFacilitatorConfig(cdpKeyId, cdpKeySecret)
  : { url: process.env.FACILITATOR_URL || "https://www.x402.org/facilitator" };
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme()
);
resourceServer.registerExtension(bazaarResourceServerExtension);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health (free)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "web-intel-api",
    version: "1.0.0",
    endpoints: [
      { path: "/extract", method: "POST", price: "$0.01" },
      { path: "/summarize", method: "POST", price: "$0.02" },
      { path: "/compare", method: "POST", price: "$0.03" },
    ],
    payment: { network: NETWORK, payTo: PAY_TO, protocol: "x402" },
  });
});

// x402 payment middleware
app.use(
  paymentMiddleware(
    {
      "POST /extract": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Extract structured content from a URL",
        mimeType: "application/json",
        extensions: {
          bazaar: {
            discoverable: true,
            category: "data",
            tags: ["web-scraping", "summarization", "extraction"],
          },
          ...declareDiscoveryExtension({
            input: { url: "https://example.com" },
            inputSchema: {
              properties: {
                url: { type: "string", description: "URL to extract content from" },
              },
              required: ["url"],
            },
            bodyType: "json",
            output: {
              example: { url: "https://example.com", title: "Example", content: "...", metadata: {} },
            },
          }),
        },
      },
      "POST /summarize": {
        accepts: {
          scheme: "exact",
          price: "$0.02",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Summarize a web page using AI",
        mimeType: "application/json",
        extensions: {
          bazaar: {
            discoverable: true,
            category: "data",
            tags: ["web-scraping", "summarization", "extraction"],
          },
          ...declareDiscoveryExtension({
            input: { url: "https://example.com" },
            inputSchema: {
              properties: {
                url: { type: "string", description: "URL to summarize" },
                maxLength: { type: "number", description: "Max summary length" },
              },
              required: ["url"],
            },
            bodyType: "json",
            output: {
              example: { url: "https://example.com", summary: "...", keyPoints: [] },
            },
          }),
        },
      },
      "POST /compare": {
        accepts: {
          scheme: "exact",
          price: "$0.03",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Compare content of two web pages",
        mimeType: "application/json",
        extensions: {
          bazaar: {
            discoverable: true,
            category: "data",
            tags: ["web-scraping", "summarization", "extraction"],
          },
          ...declareDiscoveryExtension({
            input: { urls: ["https://example.com", "https://example.org"] },
            inputSchema: {
              properties: {
                urls: { type: "array", items: { type: "string" }, description: "Two URLs to compare" },
              },
              required: ["urls"],
            },
            bodyType: "json",
            output: {
              example: { similarities: [], differences: [], summary: "..." },
            },
          }),
        },
      },
    },
    resourceServer
  )
);

// Routes
app.use("/", intelRoutes);

app.listen(PORT, () => {
  console.log(`🧠 Web Intel API running on :${PORT}`);
  console.log(`   payTo: ${PAY_TO}`);
  console.log(`   network: ${NETWORK}`);
});

export default app;
