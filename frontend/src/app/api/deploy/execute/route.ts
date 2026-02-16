import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { recordDeployIntent } from "@/lib/deploy/intents";
import { runCliDeploy } from "@/lib/deploy/execute";
import { createDeployPreview } from "@/lib/deploy/wizard";

export const runtime = "nodejs";

type ExecuteRunMode = "dry-run" | "execute";

function isExecuteEnabled(): boolean {
  const explicit = String(process.env.CLAWR_ENABLE_DASHBOARD_DEPLOY_EXECUTE || "").trim().toLowerCase();
  if (explicit === "1" || explicit === "true" || explicit === "yes") return true;
  if (explicit === "0" || explicit === "false" || explicit === "no") return false;
  return process.env.NODE_ENV !== "production";
}

function parseRunMode(raw: unknown): ExecuteRunMode {
  return String(raw || "").toLowerCase() === "execute" ? "execute" : "dry-run";
}

function shortOutput(raw: string, maxLength = 5000): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...<truncated>`;
}

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
  const runMode = parseRunMode(bodyObject.runMode);

  const preview = createDeployPreview(bodyObject);
  if (!preview.ok) {
    const intent = recordDeployIntent({
      walletAddress: session.walletAddress,
      mode: preview.normalized.mode,
      tenant: preview.normalized.tenant,
      publish: preview.normalized.publish,
      priceUsd: preview.normalized.priceUsd,
      command: preview.command,
      valid: false,
      errors: preview.errors,
      action: "execute",
      status: "failed",
      runMode,
      note: "validation_failed",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "validation_failed",
        preview,
        intent,
      },
      { status: 400 },
    );
  }

  if (runMode === "execute" && !isExecuteEnabled()) {
    const intent = recordDeployIntent({
      walletAddress: session.walletAddress,
      mode: preview.normalized.mode,
      tenant: preview.normalized.tenant,
      publish: preview.normalized.publish,
      priceUsd: preview.normalized.priceUsd,
      command: preview.command,
      valid: false,
      errors: [],
      action: "execute",
      status: "failed",
      runMode,
      note: "execute_disabled",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "execute_disabled",
        message: "Set CLAWR_ENABLE_DASHBOARD_DEPLOY_EXECUTE=true to allow execute mode.",
        preview,
        intent,
      },
      { status: 403 },
    );
  }

  try {
    const result = await runCliDeploy({
      form: preview.normalized,
      runMode,
    });

    const intent = recordDeployIntent({
      walletAddress: session.walletAddress,
      mode: preview.normalized.mode,
      tenant: preview.normalized.tenant,
      publish: preview.normalized.publish,
      priceUsd: preview.normalized.priceUsd,
      command: preview.command,
      valid: result.ok,
      errors: [],
      action: "execute",
      status: result.ok ? "succeeded" : "failed",
      runMode,
      note: result.ok ? "cli_run_ok" : "cli_run_failed",
    });

    const responseBody = {
      ok: result.ok,
      runMode,
      preview,
      intent,
      result: {
        exitCode: result.exitCode,
        signal: result.signal,
        commandPreview: result.commandPreview,
        cwd: result.cwd,
        parsed: result.parsed,
        stdout: shortOutput(result.stdout),
        stderr: shortOutput(result.stderr),
      },
    };

    return NextResponse.json(
      responseBody,
      {
        status: result.ok ? 200 : 500,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "deploy_execute_failed";

    const intent = recordDeployIntent({
      walletAddress: session.walletAddress,
      mode: preview.normalized.mode,
      tenant: preview.normalized.tenant,
      publish: preview.normalized.publish,
      priceUsd: preview.normalized.priceUsd,
      command: preview.command,
      valid: false,
      errors: [],
      action: "execute",
      status: "failed",
      runMode,
      note: message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "deploy_execute_failed",
        reason: message,
        preview,
        intent,
      },
      { status: 500 },
    );
  }
}
