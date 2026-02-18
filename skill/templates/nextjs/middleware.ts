import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { x402Config } from "./x402.config";

/**
 * Next.js middleware for x402 payment gating on /api/* routes.
 *
 * If the route has a configured price and no valid X-PAYMENT header,
 * returns 402 with payment requirements. Otherwise passes through.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this route requires payment
  const routeConfig = x402Config.routes[pathname];
  if (!routeConfig) {
    return NextResponse.next();
  }

  // Check for payment proof
  const paymentHeader = request.headers.get("x-payment");
  if (!paymentHeader) {
    // Return 402 with payment requirements
    return NextResponse.json(
      {
        error: "Payment Required",
        paymentRequirements: {
          wallet: x402Config.walletAddress,
          network: x402Config.network,
          chainId: x402Config.chainId,
          currency: x402Config.currency,
          amount: routeConfig.price,
          facilitator: x402Config.facilitatorUrl,
          description: routeConfig.description,
        },
      },
      { status: 402 }
    );
  }

  // Payment header present — let the route handler verify it
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
