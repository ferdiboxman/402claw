import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();
const PORT = process.env.PORT || 4023;
const PAY_TO = process.env.PAY_TO_ADDRESS || "0x5C78C7E37f3cCB01059167BaE3b4622b44f97D0F";
const FACILITATOR = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

// ── Cache (in-memory, 5 min TTL) ──────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
  // Prune expired entries periodically
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL) cache.delete(k);
    }
  }
}

// ── Rate limiter (100 req/min per IP) ─────────────────────────────────────────
const rateBuckets = new Map();
const RATE_WINDOW = 60_000;
const RATE_LIMIT = 100;

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW) {
    bucket = { windowStart: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_LIMIT) return false;
  return true;
}

// Clean up rate buckets every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets) {
    if (now - b.windowStart > RATE_WINDOW) rateBuckets.delete(ip);
  }
}, 120_000).unref();

// ── Rate limit middleware ─────────────────────────────────────────────────────
app.use("/api", (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded. Max 100 requests per minute." });
  }
  next();
});

// ── Enrichment helpers ────────────────────────────────────────────────────────

function feelsLike(tempC, windKmh, humidity) {
  // Wind chill for cold, heat index for warm
  if (tempC <= 10 && windKmh > 4.8) {
    const wMs = windKmh / 3.6;
    return +(13.12 + 0.6215 * tempC - 11.37 * Math.pow(wMs, 0.16) + 0.3965 * tempC * Math.pow(wMs, 0.16)).toFixed(1);
  }
  if (tempC >= 27 && humidity > 40) {
    const c1 = -8.784, c2 = 1.611, c3 = 2.339, c4 = -0.146, c5 = -0.013, c6 = -0.016, c7 = 0.002, c8 = 0.001, c9 = -0.000004;
    const hi = c1 + c2*tempC + c3*humidity + c4*tempC*humidity + c5*tempC*tempC + c6*humidity*humidity + c7*tempC*tempC*humidity + c8*tempC*humidity*humidity + c9*tempC*tempC*humidity*humidity;
    return +hi.toFixed(1);
  }
  return tempC;
}

function uvWarning(uvIndex) {
  if (uvIndex == null) return null;
  if (uvIndex <= 2) return { level: "low", message: "No protection needed." };
  if (uvIndex <= 5) return { level: "moderate", message: "Wear sunscreen. Seek shade around midday." };
  if (uvIndex <= 7) return { level: "high", message: "Sunscreen SPF30+, hat, and sunglasses recommended." };
  if (uvIndex <= 10) return { level: "very_high", message: "Avoid sun 10am-4pm. SPF50+, protective clothing." };
  return { level: "extreme", message: "Stay indoors if possible. Full UV protection essential." };
}

function clothingSuggestions(tempC, rain, windKmh) {
  const suggestions = [];
  if (tempC < 0) suggestions.push("Heavy winter coat", "Thermal layers", "Gloves & scarf", "Warm boots");
  else if (tempC < 10) suggestions.push("Warm jacket", "Long sleeves", "Closed shoes");
  else if (tempC < 18) suggestions.push("Light jacket or sweater", "Long pants");
  else if (tempC < 25) suggestions.push("T-shirt", "Light pants or shorts");
  else suggestions.push("Light breathable clothing", "Shorts", "Sandals");

  if (rain > 0.5) suggestions.push("Umbrella or rain jacket");
  if (windKmh > 30) suggestions.push("Windbreaker");
  return suggestions;
}

function enrichCurrentWeather(data) {
  const c = data.current || data.current_weather;
  if (!c) return data;

  const tempC = c.temperature_2m ?? c.temperature;
  const windKmh = c.wind_speed_10m ?? c.windspeed ?? 0;
  const humidity = c.relative_humidity_2m ?? 50;
  const rain = c.rain ?? c.precipitation ?? 0;
  const uvIndex = c.uv_index ?? null;

  return {
    ...data,
    enrichment: {
      feels_like_c: feelsLike(tempC, windKmh, humidity),
      uv_warning: uvWarning(uvIndex),
      clothing: clothingSuggestions(tempC, rain, windKmh),
      comfort: tempC >= 18 && tempC <= 26 && rain < 0.5 ? "comfortable" : tempC < 5 || tempC > 35 ? "uncomfortable" : "moderate",
    },
  };
}

function enrichForecast(data) {
  if (!data.daily) return enrichCurrentWeather(data);

  const dailyEnriched = data.daily.time?.map((date, i) => {
    const tMax = data.daily.temperature_2m_max?.[i] ?? 20;
    const tMin = data.daily.temperature_2m_min?.[i] ?? 10;
    const tAvg = +((tMax + tMin) / 2).toFixed(1);
    const rain = data.daily.precipitation_sum?.[i] ?? 0;
    const windMax = data.daily.wind_speed_10m_max?.[i] ?? 0;
    const uvMax = data.daily.uv_index_max?.[i] ?? null;

    return {
      date,
      feels_like_c: feelsLike(tAvg, windMax, 50),
      uv_warning: uvWarning(uvMax),
      clothing: clothingSuggestions(tAvg, rain, windMax),
    };
  });

  return { ...enrichCurrentWeather(data), daily_enrichment: dailyEnriched };
}

// ── Proxy fetch helper ────────────────────────────────────────────────────────

async function fetchMeteo(params) {
  const url = `${OPEN_METEO}?${new URLSearchParams(params)}`;
  const cacheKey = url;
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, _cached: true };

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo returned ${resp.status}`);
  const data = await resp.json();
  cacheSet(cacheKey, data);
  return data;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Current weather — $0.001
app.get(
  "/api/weather",
  paymentMiddleware(FACILITATOR, PAY_TO, {
    price: "$0.001",
    network: "base-sepolia",
    description: "Current weather data with enrichment",
  }),
  async (req, res) => {
    try {
      const { lat = "52.52", lon = "13.41" } = req.query;
      const data = await fetchMeteo({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,uv_index,weather_code",
        timezone: "auto",
      });
      res.json(enrichCurrentWeather(data));
    } catch (err) {
      res.status(502).json({ error: "Upstream API error", detail: err.message });
    }
  }
);

// Extended forecast — $0.005
app.get(
  "/api/forecast",
  paymentMiddleware(FACILITATOR, PAY_TO, {
    price: "$0.005",
    network: "base-sepolia",
    description: "Extended weather forecast with daily enrichment",
  }),
  async (req, res) => {
    try {
      const { lat = "52.52", lon = "13.41", days = "7" } = req.query;
      const d = Math.min(Math.max(parseInt(days) || 7, 1), 16);
      const data = await fetchMeteo({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,uv_index,weather_code",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max,weather_code",
        forecast_days: d,
        timezone: "auto",
      });
      res.json(enrichForecast(data));
    } catch (err) {
      res.status(502).json({ error: "Upstream API error", detail: err.message });
    }
  }
);

// Health check (free)
app.get("/health", (_req, res) => res.json({ status: "ok", endpoints: ["/api/weather", "/api/forecast"] }));

app.listen(PORT, () => {
  console.log(`⛅ x402 Weather Proxy running on http://localhost:${PORT}`);
  console.log(`   Pay-to address: ${PAY_TO}`);
  console.log(`   Facilitator:    ${FACILITATOR}`);
  console.log(`   Endpoints:`);
  console.log(`     GET /api/weather?lat=52.52&lon=13.41    ($0.001)`);
  console.log(`     GET /api/forecast?lat=52.52&lon=13.41   ($0.005)`);
  console.log(`     GET /health                             (free)`);
});
