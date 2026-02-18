import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const WALLET = process.env.WALLET || "0xYOUR_WALLET_ADDRESS";

const UPSTREAM = "https://api.open-meteo.com/v1/forecast";

app.get("/api/weather", async (req, res) => {
  const payment = req.headers["x-payment"];

  if (!payment) {
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: "base-mainnet",
        maxAmountRequired: "500", // $0.0005 USDC
        resource: `${req.protocol}://${req.get("host")}/api/weather`,
        payTo: WALLET,
        extra: {
          name: "Weather Proxy",
          description: "Unlimited weather data — no rate limits"
        }
      }]
    });
  }

  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Provide lat and lon query params" });
  }

  try {
    const upstream = await fetch(
      `${UPSTREAM}?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const data = await upstream.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "Upstream request failed", detail: err.message });
  }
});

app.listen(PORT, () => console.log(`🐾 Weather Proxy on :${PORT}`));
