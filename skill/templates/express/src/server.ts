import "dotenv/config";
import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();
const port = process.env.PORT || 3000;

// x402 configuration
const walletAddress = process.env.WALLET_ADDRESS!;
const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";

if (!walletAddress) {
  console.error("WALLET_ADDRESS environment variable is required");
  process.exit(1);
}

// Route pricing configuration
// Each route maps to a price in USDC (as a string with decimals)
const routePrices: Record<string, string> = {
  "/api/data": "0.01", // $0.01 per request
};

// Apply x402 payment middleware to paid routes
app.use(
  paymentMiddleware(walletAddress, facilitatorUrl, routePrices)
);

// Paid endpoint — only accessible after verified payment
app.get("/api/data", (_req, res) => {
  res.json({
    message: "Payment verified! Here is your premium data.",
    timestamp: new Date().toISOString(),
    data: {
      example: "This content is behind a paywall powered by x402.",
    },
  });
});

// Bazaar metadata endpoint — describes this API's x402 capabilities
app.get("/.well-known/x402", (_req, res) => {
  res.json({
    version: "1.0",
    facilitator: facilitatorUrl,
    wallet: walletAddress,
    network: "base",
    chainId: 8453,
    currency: "USDC",
    routes: Object.entries(routePrices).map(([path, price]) => ({
      path,
      price,
      currency: "USDC",
      description: `Access ${path}`,
    })),
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`x402 API server running on port ${port}`);
  console.log(`Wallet: ${walletAddress}`);
  console.log(`Facilitator: ${facilitatorUrl}`);
});
