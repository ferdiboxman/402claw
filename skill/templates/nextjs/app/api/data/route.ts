import { NextRequest, NextResponse } from "next/server";
import { x402Config } from "../../../x402.config";

/**
 * Paid API endpoint using x402 protocol.
 *
 * The middleware handles 402 responses for requests without payment.
 * This handler verifies the payment proof and returns premium data.
 */
export async function GET(request: NextRequest) {
  const paymentHeader = request.headers.get("x-payment");

  if (!paymentHeader) {
    // Middleware should have caught this, but guard anyway
    return NextResponse.json({ error: "Payment Required" }, { status: 402 });
  }

  // Verify payment with the facilitator
  try {
    const verifyRes = await fetch(`${x402Config.facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment: paymentHeader,
        wallet: x402Config.walletAddress,
        network: x402Config.network,
      }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 402 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not reach facilitator" },
      { status: 502 }
    );
  }

  // Payment verified — return premium data
  return NextResponse.json({
    message: "Payment verified! Here is your premium data.",
    timestamp: new Date().toISOString(),
    data: {
      example: "This content is behind a paywall powered by x402.",
    },
  });
}
