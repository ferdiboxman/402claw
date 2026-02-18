/**
 * x402 Payment-Gated Cloudflare Worker
 *
 * This worker implements the x402 HTTP payment protocol:
 *   - Free endpoints (health, metadata) are served without payment.
 *   - Paid endpoints return 402 with payment requirements if no X-PAYMENT header.
 *   - When X-PAYMENT is present, the payment is verified with the facilitator
 *     before serving the response.
 *
 * Configuration is via wrangler.toml [vars] or Cloudflare dashboard secrets.
 */

import {
  type RouteConfig,
  createPaymentRequired,
  verifyPayment,
} from "./x402";

// ---------------------------------------------------------------------------
// Environment bindings (set in wrangler.toml or dashboard)
// ---------------------------------------------------------------------------

export interface Env {
  FACILITATOR_URL: string;
  RECIPIENT_ADDRESS: string;
}

// ---------------------------------------------------------------------------
// Route definitions – add your paid endpoints here
// ---------------------------------------------------------------------------

const PAID_ROUTES: Record<string, RouteConfig> = {
  "/api/data": {
    description: "Premium data endpoint",
    price: "0.01", // USDC
  },
  "/api/premium": {
    description: "Premium analytics",
    price: "0.05",
  },
};

// ---------------------------------------------------------------------------
// Bazaar discovery metadata (/.well-known/x402)
// ---------------------------------------------------------------------------

function bazaarMetadata(env: Env, baseUrl: string) {
  return {
    name: "My x402 API",
    description: "A payment-gated API powered by x402 and USDC on Base",
    url: baseUrl,
    endpoints: Object.entries(PAID_ROUTES).map(([path, cfg]) => ({
      path,
      method: "GET",
      price: cfg.price,
      currency: "USDC",
      network: "base",
      description: cfg.description,
    })),
    facilitator: env.FACILITATOR_URL,
    recipient: env.RECIPIENT_ADDRESS,
  };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- Free endpoints ------------------------------------------------

    if (path === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    if (path === "/.well-known/x402") {
      return Response.json(bazaarMetadata(env, url.origin), {
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }

    // --- Paid endpoints ------------------------------------------------

    const route = PAID_ROUTES[path];
    if (!route) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Check for payment header
    const paymentHeader = request.headers.get("X-PAYMENT");

    if (!paymentHeader) {
      return createPaymentRequired(
        env.RECIPIENT_ADDRESS,
        env.FACILITATOR_URL,
        route,
        request.url,
      );
    }

    // Verify payment with facilitator
    const verification = await verifyPayment(
      env.FACILITATOR_URL,
      paymentHeader,
      env.RECIPIENT_ADDRESS,
      route.price,
      request.url,
    );

    if (!verification.valid) {
      return Response.json(
        { error: "Payment verification failed", reason: verification.reason },
        { status: 402 },
      );
    }

    // --- Serve paid content --------------------------------------------

    if (path === "/api/data") {
      return Response.json({
        data: "Here is your premium data",
        timestamp: new Date().toISOString(),
        paid: true,
      });
    }

    if (path === "/api/premium") {
      return Response.json({
        analytics: { visitors: 1234, conversions: 56 },
        timestamp: new Date().toISOString(),
        paid: true,
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
