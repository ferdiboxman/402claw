import express from "express";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;
const WALLET = process.env.WALLET || "0xYOUR_WALLET_ADDRESS";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a concise technical expert. Answer in 2-3 sentences max.`;

app.get("/api/ask", async (req, res) => {
  const payment = req.headers["x-payment"];

  if (!payment) {
    return res.status(402).json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: "base-mainnet",
        maxAmountRequired: "10000", // $0.01 USDC
        resource: `${req.protocol}://${req.get("host")}/api/ask`,
        payTo: WALLET,
        extra: {
          name: "AI Expert",
          description: "GPT-4 powered Q&A — $0.01/query"
        }
      }]
    });
  }

  const question = (req.query.q as string) || "Hello";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question }
      ],
      max_tokens: 200
    });

    res.json({
      answer: completion.choices[0].message.content,
      model: "gpt-4o-mini",
      tokens: completion.usage?.total_tokens
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🐾 AI Skill API on :${PORT}`));
