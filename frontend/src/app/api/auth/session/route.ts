import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      {
        ok: true,
        authenticated: false,
        session: null,
      },
      { status: 200 },
    );
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      {
        ok: true,
        authenticated: false,
        session: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      session: {
        walletAddress: session.walletAddress,
        subject: session.sub,
        issuedAt: session.iat,
        expiresAt: session.exp,
      },
    },
    { status: 200 },
  );
}
