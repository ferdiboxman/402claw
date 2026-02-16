import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { recordDeployIntent } from "@/lib/deploy/intents";
import { createDeployPreview } from "@/lib/deploy/wizard";

export const runtime = "nodejs";

async function resolveSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function POST(request: NextRequest) {
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
      },
      { status: 400 },
    );
  }

  const bodyObject = (body && typeof body === "object" && !Array.isArray(body))
    ? (body as Record<string, unknown>)
    : {};
  const recordIntent = bodyObject.recordIntent !== false;

  const preview = createDeployPreview(bodyObject);
  const intent = recordIntent
    ? recordDeployIntent({
      walletAddress: session.walletAddress,
      mode: preview.normalized.mode,
      tenant: preview.normalized.tenant,
      publish: preview.normalized.publish,
      priceUsd: preview.normalized.priceUsd,
      command: preview.command,
      valid: preview.ok,
      errors: preview.errors,
      action: "preview",
      status: preview.ok ? "succeeded" : "failed",
      runMode: "dry-run",
      note: "preview_validation",
    })
    : null;

  return NextResponse.json(
    {
      ok: true,
      preview,
      intent,
    },
    { status: 200 },
  );
}
