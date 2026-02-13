import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { listDeployIntents } from "@/lib/deploy/intents";

export const runtime = "nodejs";

async function resolveSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

function parseLimit(raw: string | null): number {
  const parsed = Number(raw || "20");
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(100, Math.floor(parsed));
}

export async function GET(request: NextRequest) {
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: "auth_required",
      },
      { status: 401 },
    );
  }

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const intents = listDeployIntents(session.walletAddress, limit);

  return NextResponse.json(
    {
      ok: true,
      intents,
    },
    { status: 200 },
  );
}
