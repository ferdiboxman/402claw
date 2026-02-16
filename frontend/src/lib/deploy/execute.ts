import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { NormalizedDeployForm } from "@/lib/deploy/wizard";

const DEFAULT_TIMEOUT_MS = 120_000;

type RunMode = "dry-run" | "execute";

type ExecuteOptions = {
  form: NormalizedDeployForm;
  runMode: RunMode;
  timeoutMs?: number;
  apiKey?: string;
};

export type CliDeployResult = {
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  parsed: unknown;
  commandPreview: string;
  cwd: string;
};

function shellQuote(value: string): string {
  return JSON.stringify(value);
}

function renderCommand(args: string[]): string {
  return args.map((part) => shellQuote(part)).join(" ");
}

function parseDotEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const result: Record<string, string> = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const eqIndex = normalized.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = normalized.slice(0, eqIndex).trim();
    let value = normalized.slice(eqIndex + 1).trim();
    if (!key) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function resolveWorkspaceRoot(): string {
  const fromEnv = String(process.env.CLAWR_WORKSPACE_ROOT || "").trim();
  if (fromEnv) return path.resolve(fromEnv);

  const cwd = process.cwd();
  if (path.basename(cwd) === "frontend") {
    return path.resolve(cwd, "..");
  }

  const candidate = path.resolve(cwd, "..");
  if (fs.existsSync(path.join(candidate, "prototypes", "cli", "src", "index.js"))) {
    return candidate;
  }

  return cwd;
}

function addFlag(args: string[], flag: string, value: string): void {
  const v = String(value || "").trim();
  if (!v) return;
  args.push(`--${flag}`, v);
}

function buildCliArgs(form: NormalizedDeployForm, runMode: RunMode): string[] {
  const args = ["src/index.js"];

  if (form.mode === "proxy") {
    args.push("wrap", form.upstreamUrl || "https://api.example.com/v1");
  } else {
    args.push("deploy", form.sourcePath || "../x402-server/data/sample.csv", "--type", form.mode);
  }

  addFlag(args, "tenant", form.tenant);
  addFlag(args, "price", form.priceUsd);
  addFlag(args, "plan", form.plan);
  addFlag(args, "owner", form.owner);
  addFlag(args, "host", form.host);
  addFlag(args, "rate-limit-caller", form.rateLimitCaller);
  addFlag(args, "quota-day", form.quotaDay);
  addFlag(args, "quota-month", form.quotaMonth);
  addFlag(args, "spend-day", form.spendDay);
  addFlag(args, "spend-month", form.spendMonth);
  args.push("--x402", form.x402Enabled ? "true" : "false");

  if (form.publish) {
    args.push("--publish", "--execute", runMode === "execute" ? "true" : "false");
    addFlag(args, "dispatch-namespace", form.dispatchNamespace);
  }

  return args;
}

function parseStdout(stdout: string): unknown {
  const raw = String(stdout || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function runCliDeploy(options: ExecuteOptions): Promise<CliDeployResult> {
  const { form, runMode } = options;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;

  const workspaceRoot = resolveWorkspaceRoot();
  const cliCwd = path.resolve(workspaceRoot, "prototypes", "cli");
  const nodeArgs = buildCliArgs(form, runMode);
  const commandPreview = `node ${renderCommand(nodeArgs)}`;

  const cliEntryPath = path.resolve(cliCwd, "src", "index.js");
  if (!fs.existsSync(cliEntryPath)) {
    throw new Error(`cli_entry_missing:${cliEntryPath}`);
  }

  const rootEnv = parseDotEnvFile(path.resolve(workspaceRoot, ".env"));
  const env = {
    ...rootEnv,
    ...process.env,
  } as NodeJS.ProcessEnv;

  if (options.apiKey) {
    env.CLAW_API_KEY = options.apiKey;
  }

  const child = spawn(process.execPath, nodeArgs, {
    cwd: cliCwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutChunks.push(chunk);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });

  const finished = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, Math.max(1_000, timeoutMs));

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("exit", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exitCode, signal });
    });
  });

  const stdout = Buffer.concat(stdoutChunks).toString("utf8");
  const stderr = Buffer.concat(stderrChunks).toString("utf8");
  const parsed = parseStdout(stdout);
  const parsedOk = Boolean(
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && "ok" in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).ok
      : true,
  );

  return {
    ok: finished.exitCode === 0 && parsedOk,
    exitCode: finished.exitCode,
    signal: finished.signal,
    stdout,
    stderr,
    parsed,
    commandPreview,
    cwd: cliCwd,
  };
}
