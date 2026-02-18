import express from "express";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

const app = express();
const PORT = process.env.PORT || 3000;
const WALLET = process.env.WALLET || "0xYOUR_WALLET_ADDRESS";

// Load CSV data
const csv = readFileSync(new URL("./data.csv", import.meta.url), "utf-8");
const rows = parse(csv, { columns: true, skip_empty_lines: true });

app.get("/api/data", (req, res) => {
  const payment = req.headers["x-payment"];

  if (!payment) {
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: "base-mainnet",
        maxAmountRequired: "1000", // $0.001 USDC
        resource: `${req.protocol}://${req.get("host")}/api/data`,
        payTo: WALLET,
        extra: {
          name: "City Data API",
          description: "World city population data"
        }
      }]
    });
  }

  // Payment provided — serve data
  const limit = Math.min(parseInt(req.query.limit as string) || 10, rows.length);
  res.json({ data: rows.slice(0, limit), total: rows.length });
});

app.listen(PORT, () => console.log(`🐾 Data API on :${PORT}`));
