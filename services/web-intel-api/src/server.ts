import express from "express";
import cors from "cors";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import intelRoutes from "./routes/intel.js";

const PORT = parseInt(process.env.PORT || "3002", 10);
const PAY_TO = (process.env.PAY_TO ||
  "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F") as `0x${string}`;
const NETWORK = (process.env.NETWORK || "eip155:84532") as `${string}:${string}`;
const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme()
);

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
        description: "Extract structured data from a URL",
        mimeType: "application/json",
      },
      "POST /summarize": {
        accepts: {
          scheme: "exact",
          price: "$0.02",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Summarize a web page",
        mimeType: "application/json",
      },
      "POST /compare": {
        accepts: {
          scheme: "exact",
          price: "$0.03",
          network: NETWORK,
          payTo: PAY_TO,
        },
        description: "Compare two web pages",
        mimeType: "application/json",
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
