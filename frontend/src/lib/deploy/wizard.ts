export type DeployMode = "dataset" | "function" | "proxy";

export type DeployFormInput = {
  mode?: string;
  tenant?: string;
  sourcePath?: string;
  upstreamUrl?: string;
  owner?: string;
  plan?: string;
  priceUsd?: string;
  host?: string;
  rateLimitCaller?: string;
  quotaDay?: string;
  quotaMonth?: string;
  spendDay?: string;
  spendMonth?: string;
  x402Enabled?: boolean;
  publish?: boolean;
  dispatchNamespace?: string;
};

export type NormalizedDeployForm = {
  mode: DeployMode;
  tenant: string;
  sourcePath: string;
  upstreamUrl: string;
  owner: string;
  plan: string;
  priceUsd: string;
  host: string;
  rateLimitCaller: string;
  quotaDay: string;
  quotaMonth: string;
  spendDay: string;
  spendMonth: string;
  x402Enabled: boolean;
  publish: boolean;
  dispatchNamespace: string;
};

export type DeployValidationIssue = {
  field: string;
  message: string;
};

export type DeployPreview = {
  ok: boolean;
  command: string;
  errors: DeployValidationIssue[];
  normalized: NormalizedDeployForm;
};

const CLI_WORKDIR = "/Users/Shared/Projects/402claw/prototypes/cli";
const TENANT_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SIMPLE_HOST_PATTERN = /^[a-z0-9.-]+$/i;
const RATE_LIMIT_PATTERN = /^(\d+)\/(\d+)(s|m|h)?$/i;
const PLAN_VALUES = new Set(["free", "pro", "scale"]);

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string {
  return String(value || "").trim();
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function shellQuote(value: string): string {
  return JSON.stringify(value);
}

function addFlag(parts: string[], flag: string, value: string): void {
  const v = value.trim();
  if (!v) return;
  parts.push(`--${flag}`);
  parts.push(shellQuote(v));
}

function parsePositiveNumber(rawValue: string): number | null {
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function isOptionalPositiveInteger(rawValue: string): boolean {
  if (!rawValue) return true;
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0;
}

function isOptionalPositiveNumber(rawValue: string): boolean {
  if (!rawValue) return true;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0;
}

function validateRateLimit(rawValue: string): boolean {
  if (!rawValue) return true;
  const match = rawValue.match(RATE_LIMIT_PATTERN);
  if (!match) return false;

  const requests = Number(match[1]);
  const seconds = Number(match[2]);
  return Number.isInteger(requests) && requests > 0 && Number.isInteger(seconds) && seconds > 0;
}

function validateSourcePath(mode: DeployMode, sourcePath: string): boolean {
  if (mode === "proxy") return true;
  if (!sourcePath) return false;

  const lower = sourcePath.toLowerCase();
  if (mode === "dataset") {
    return lower.endsWith(".csv") || lower.endsWith(".json");
  }
  if (mode === "function") {
    return lower.endsWith(".js") || lower.endsWith(".mjs");
  }

  return false;
}

function validateUpstreamUrl(mode: DeployMode, upstreamUrl: string): boolean {
  if (mode !== "proxy") return true;
  if (!upstreamUrl) return false;

  try {
    const parsed = new URL(upstreamUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeInput(rawInput: unknown): NormalizedDeployForm {
  const source = asObject(rawInput);
  const rawMode = asTrimmedString(source.mode).toLowerCase();
  const mode: DeployMode = rawMode === "function" || rawMode === "proxy" ? rawMode : "dataset";

  const rawPlan = asTrimmedString(source.plan).toLowerCase();
  const plan = PLAN_VALUES.has(rawPlan) ? rawPlan : "free";

  return {
    mode,
    tenant: asTrimmedString(source.tenant).toLowerCase(),
    sourcePath: asTrimmedString(source.sourcePath),
    upstreamUrl: asTrimmedString(source.upstreamUrl),
    owner: asTrimmedString(source.owner),
    plan,
    priceUsd: asTrimmedString(source.priceUsd),
    host: asTrimmedString(source.host).toLowerCase(),
    rateLimitCaller: asTrimmedString(source.rateLimitCaller),
    quotaDay: asTrimmedString(source.quotaDay),
    quotaMonth: asTrimmedString(source.quotaMonth),
    spendDay: asTrimmedString(source.spendDay),
    spendMonth: asTrimmedString(source.spendMonth),
    x402Enabled: asBoolean(source.x402Enabled, true),
    publish: asBoolean(source.publish, false),
    dispatchNamespace: asTrimmedString(source.dispatchNamespace),
  };
}

function validateNormalized(form: NormalizedDeployForm): DeployValidationIssue[] {
  const errors: DeployValidationIssue[] = [];

  if (!form.tenant) {
    errors.push({ field: "tenant", message: "tenant is required" });
  } else if (!TENANT_PATTERN.test(form.tenant)) {
    errors.push({
      field: "tenant",
      message: "tenant must be lowercase slug (letters, numbers, dashes, 1-63 chars)",
    });
  }

  if (!validateSourcePath(form.mode, form.sourcePath)) {
    errors.push({
      field: "sourcePath",
      message: form.mode === "dataset"
        ? "dataset path must end with .csv or .json"
        : "function path must end with .js or .mjs",
    });
  }

  if (!validateUpstreamUrl(form.mode, form.upstreamUrl)) {
    errors.push({
      field: "upstreamUrl",
      message: "upstream URL must be a valid http(s) URL",
    });
  }

  const price = parsePositiveNumber(form.priceUsd);
  if (price === null) {
    errors.push({ field: "priceUsd", message: "priceUsd must be a positive number" });
  }

  if (form.host && !SIMPLE_HOST_PATTERN.test(form.host)) {
    errors.push({ field: "host", message: "host contains invalid characters" });
  }

  if (!validateRateLimit(form.rateLimitCaller)) {
    errors.push({ field: "rateLimitCaller", message: "rate limit must look like 100/60s" });
  }

  if (!isOptionalPositiveInteger(form.quotaDay)) {
    errors.push({ field: "quotaDay", message: "quotaDay must be a positive integer" });
  }

  if (!isOptionalPositiveInteger(form.quotaMonth)) {
    errors.push({ field: "quotaMonth", message: "quotaMonth must be a positive integer" });
  }

  if (!isOptionalPositiveNumber(form.spendDay)) {
    errors.push({ field: "spendDay", message: "spendDay must be a positive number" });
  }

  if (!isOptionalPositiveNumber(form.spendMonth)) {
    errors.push({ field: "spendMonth", message: "spendMonth must be a positive number" });
  }

  if (form.publish && !form.dispatchNamespace) {
    errors.push({
      field: "dispatchNamespace",
      message: "dispatch namespace is required when publish is enabled",
    });
  }

  return errors;
}

export function buildDeployCommand(form: NormalizedDeployForm): string {
  const parts = [
    "cd",
    shellQuote(CLI_WORKDIR),
    "&&",
    "node",
    "src/index.js",
  ];

  if (form.mode === "proxy") {
    parts.push("wrap", shellQuote(form.upstreamUrl || "https://api.example.com/v1"));
  } else {
    const sourcePath = form.sourcePath || "../x402-server/data/sample.csv";
    parts.push("deploy", shellQuote(sourcePath));
    parts.push("--type", form.mode);
  }

  addFlag(parts, "tenant", form.tenant);
  addFlag(parts, "price", form.priceUsd);
  addFlag(parts, "plan", form.plan);
  addFlag(parts, "owner", form.owner);
  addFlag(parts, "host", form.host);
  addFlag(parts, "rate-limit-caller", form.rateLimitCaller);
  addFlag(parts, "quota-day", form.quotaDay);
  addFlag(parts, "quota-month", form.quotaMonth);
  addFlag(parts, "spend-day", form.spendDay);
  addFlag(parts, "spend-month", form.spendMonth);
  parts.push("--x402", form.x402Enabled ? "true" : "false");

  if (form.publish) {
    parts.push("--publish");
    addFlag(parts, "dispatch-namespace", form.dispatchNamespace);
  }

  return parts.join(" ");
}

export function createDeployPreview(rawInput: unknown): DeployPreview {
  const normalized = normalizeInput(rawInput);
  const errors = validateNormalized(normalized);

  return {
    ok: errors.length === 0,
    command: buildDeployCommand(normalized),
    errors,
    normalized,
  };
}
