#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultRegistryPath,
  getTenant,
  listTenants,
  loadRegistry,
  toTenantDirectory,
  upsertDeployment,
} from "./registry.js";
import {
  defaultDeploymentStatePath,
  deployCloudflareDispatcher,
  deployCloudflareTenantWorker,
  rollbackCloudflareDispatcher,
} from "./cloudflare.js";
import {
  appendAuditEvent,
  authenticateApiKey,
  createApiKeyForUser,
  defaultControlPlanePath,
  ensureUser,
  getTenantBalance,
  isAuthConfigured,
  listApiKeys,
  listAuditEvents,
  listUsers,
  listWithdrawals,
  recordTenantRevenue,
  revokeApiKey,
  requestWithdrawal,
} from "./control-plane.js";
import {
  createStorage,
  defaultD1StoragePath,
  resolveStorageConfig,
} from "./storage/index.js";

const COMMAND_SCOPE = Object.freeze({
  deploy: "deploy",
  wrap: "deploy",
  "cloudflare-deploy-dispatcher": "deploy",
  "cloudflare-rollback-dispatcher": "deploy",
  "cloudflare-deploy-tenant": "deploy",
  "storage-migrate-json-to-d1": "admin",
  "storage-rollback-d1": "admin",
  "revenue-credit": "ledger:write",
  withdraw: "withdraw",
  "user-create": "admin",
  "auth-create-key": "admin",
  "auth-revoke-key": "admin",
});

const AUDIT_ACTION = Object.freeze({
  deploy: "tenant_registry_upsert",
  wrap: "tenant_proxy_upsert",
  "cloudflare-deploy-dispatcher": "cloudflare_dispatcher_deploy",
  "cloudflare-rollback-dispatcher": "cloudflare_dispatcher_rollback",
  "cloudflare-deploy-tenant": "cloudflare_tenant_deploy",
  "storage-migrate-json-to-d1": "storage_migrate_json_to_d1",
  "storage-rollback-d1": "storage_rollback_d1",
  "revenue-credit": "tenant_revenue_credit",
  withdraw: "tenant_withdrawal",
  "user-create": "user_create",
  "auth-create-key": "auth_key_create",
  "auth-revoke-key": "auth_key_revoke",
});

const BOOTSTRAP_COMMANDS = new Set(["user-create", "auth-create-key"]);

function parseArgs(argv) {
  const command = argv[2] || "help";
  const positionals = [];
  const flags = {};

  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    if (flags[key] === undefined) {
      flags[key] = next;
    } else if (Array.isArray(flags[key])) {
      flags[key].push(next);
    } else {
      flags[key] = [flags[key], next];
    }

    i += 1;
  }

  return { command, positionals, flags };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === false) return [];
  return [value];
}

function resolveRegistryPath(flags) {
  return flags.registry || defaultRegistryPath();
}

function resolveControlPlanePath(flags) {
  return flags["control-plane"] || defaultControlPlanePath();
}

function resolveStorageContext(flags) {
  const config = resolveStorageConfig(flags);
  const storage = createStorage({
    backend: config.backend,
    d1Path: config.d1Path,
    migrationSqlPath: config.migrationSqlPath,
  });

  return {
    storage,
    storageConfig: config,
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath, payload) {
  const absolute = path.resolve(filePath);
  ensureDir(absolute);
  fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return absolute;
}

function defaultMigrationBackupDir(cwd = process.cwd()) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve(cwd, ".402claw", "backups", `json-to-d1-${stamp}`);
}

function boolFlag(value, fallback = true) {
  if (value === undefined || value === null || value === true) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function defaultDispatcherScriptPath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "csv-api", "src", "cloudflare-worker.js");
}

function parsePositiveAmount(value, fieldName) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return amount;
}

function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return Math.floor(amount);
}

function resolveTenantLimitsFromFlags(flags) {
  const cpuMs = parseOptionalPositiveInt(flags["cpu-ms"], "cpu-ms");
  const subRequests = parseOptionalPositiveInt(
    flags.subrequests ?? flags["sub-requests"],
    "subrequests",
  );
  const out = {};
  if (cpuMs !== undefined) out.cpuMs = cpuMs;
  if (subRequests !== undefined) out.subRequests = subRequests;
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseRateLimitBucket(rawValue, fieldName) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return undefined;
  }

  const compact = String(rawValue).trim().replace(/\s+/g, "").toLowerCase();
  const parts = compact.split("/");
  if (parts.length !== 2) {
    throw new Error(`${fieldName} must use requests/window format (example: 100/60s)`);
  }

  const requests = parseOptionalPositiveInt(parts[0], `${fieldName}.requests`);
  if (!requests) {
    throw new Error(`${fieldName} requests must be a positive number`);
  }

  const windowMatch = parts[1].match(/^(\d+)(s|m|h)?$/);
  if (!windowMatch) {
    throw new Error(`${fieldName} window must be like 60s, 1m, or 1h`);
  }

  const amount = Number(windowMatch[1]);
  const unit = windowMatch[2] || "s";
  const multipliers = { s: 1, m: 60, h: 3600 };
  const windowSeconds = amount * multipliers[unit];
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    throw new Error(`${fieldName} window must be positive`);
  }

  return {
    requests,
    windowSeconds,
  };
}

function resolveRateLimitFromFlags(flags) {
  const out = {};

  const caller = parseRateLimitBucket(
    flags["rate-limit-caller"] ?? flags["caller-rate-limit"],
    "rate-limit-caller",
  );
  if (caller) out.perCaller = caller;

  const global = parseRateLimitBucket(flags["rate-limit-global"], "rate-limit-global");
  if (global) out.global = global;

  const burst = parseOptionalPositiveInt(flags["rate-limit-burst"], "rate-limit-burst");
  if (burst !== undefined) out.burst = burst;

  return Object.keys(out).length > 0 ? out : undefined;
}

function resolveUsageLimitFromFlags(flags) {
  const out = {};

  const dailyRequests = parseOptionalPositiveInt(
    flags["quota-day"] ?? flags["usage-day"],
    "quota-day",
  );
  if (dailyRequests !== undefined) out.dailyRequests = dailyRequests;

  const monthlyRequests = parseOptionalPositiveInt(
    flags["quota-month"] ?? flags["usage-month"],
    "quota-month",
  );
  if (monthlyRequests !== undefined) out.monthlyRequests = monthlyRequests;

  return Object.keys(out).length > 0 ? out : undefined;
}

function inferDeployResourceType(inputPath, explicitType) {
  const normalizedExplicit = String(explicitType || "").trim().toLowerCase();
  if (normalizedExplicit) {
    if (["dataset", "function"].includes(normalizedExplicit)) {
      return normalizedExplicit;
    }
    if (normalizedExplicit === "proxy") {
      throw new Error("use `wrap` command for proxy deployments");
    }
    throw new Error(`invalid --type: ${explicitType}`);
  }

  const ext = path.extname(String(inputPath || "")).toLowerCase();
  if (ext === ".csv" || ext === ".json") return "dataset";
  if (ext === ".js" || ext === ".mjs") return "function";

  throw new Error(
    "unable to infer deployment type from extension; pass --type dataset|function",
  );
}

function parseOptionalBooleanFlag(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`${fieldName} must be true or false`);
}

function parseInjectedHeaders(flags) {
  const entries = asArray(flags["inject-header"]);
  if (entries.length === 0) return {};

  const headers = {};
  for (const rawEntry of entries) {
    const value = String(rawEntry || "");
    const separator = value.indexOf(":");
    if (separator <= 0) {
      throw new Error(`invalid --inject-header value: ${value}`);
    }

    const headerName = value.slice(0, separator).trim();
    let headerValue = value.slice(separator + 1).trim();
    if (!headerName || !headerValue) {
      throw new Error(`invalid --inject-header value: ${value}`);
    }

    // Allow env interpolation for common secret workflows.
    headerValue = headerValue.replace(/\$([A-Z0-9_]+)/gi, (_match, envName) => {
      const resolved = process.env[envName];
      return resolved === undefined ? "" : String(resolved);
    });

    if (!headerValue) {
      throw new Error(`header value resolved to empty: ${headerName}`);
    }

    headers[headerName] = headerValue;
  }

  return headers;
}

function parseInjectedHeaderSecrets(flags) {
  const entries = asArray(flags["inject-header-secret"]);
  if (entries.length === 0) return {};

  const out = {};
  for (const rawEntry of entries) {
    const value = String(rawEntry || "");
    const separator = value.indexOf(":");
    if (separator <= 0) {
      throw new Error(`invalid --inject-header-secret value: ${value}`);
    }

    const headerName = value.slice(0, separator).trim();
    const secretEnvName = value.slice(separator + 1).trim();
    if (!headerName || !secretEnvName) {
      throw new Error(`invalid --inject-header-secret value: ${value}`);
    }

    if (!/^[A-Z_][A-Z0-9_]*$/.test(secretEnvName)) {
      throw new Error(`invalid secret env name for ${headerName}: ${secretEnvName}`);
    }

    out[headerName] = secretEnvName;
  }

  return out;
}

function parseExplicitSecretNames(flags) {
  return [...new Set(
    asArray(flags.secret)
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .map((name) => {
        if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
          throw new Error(`invalid --secret value: ${name}`);
        }
        return name;
      }),
  )];
}

function resolvePublishSecrets(secretNames, { execute } = {}) {
  const names = [...new Set((Array.isArray(secretNames) ? secretNames : []).filter(Boolean))];
  if (names.length === 0) {
    return {
      secretNames: [],
      secrets: {},
      missingSecretNames: [],
    };
  }

  const secrets = {};
  const missingSecretNames = [];
  for (const name of names) {
    const value = process.env[name];
    if (value === undefined || value === null || String(value) === "") {
      missingSecretNames.push(name);
      continue;
    }
    secrets[name] = String(value);
  }

  if (execute && missingSecretNames.length > 0) {
    throw new Error(`missing secret env vars: ${missingSecretNames.join(", ")}`);
  }

  return {
    secretNames: names,
    secrets,
    missingSecretNames,
  };
}

function extractTenantProxySecretNames(tenantRecord) {
  const source = tenantRecord?.proxy;
  if (!source || typeof source !== "object") return [];

  const values = Object.values(source.injectHeaderSecrets || {});
  return [...new Set(values
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
}

function printUsage() {
  console.log(`402claw CLI prototype

Core commands:
  deploy <source-path> --tenant <slug> --price <usd> [--type <dataset|function>] [--plan <plan>] [--host <hostname>] [--cpu-ms <n>] [--subrequests <n>] [--x402 <true|false>] [--rate-limit-caller <requests/window>] [--rate-limit-global <requests/window>] [--rate-limit-burst <n>] [--quota-day <requests>] [--quota-month <requests>] [--secret <ENV_NAME>] [--publish] [--dispatch-namespace <name>] [--registry <path>]
  wrap <upstream-url> --tenant <slug> --price <usd> [--method <http-method>] [--inject-header "Name: Value"] [--inject-header-secret "Name: ENV_NAME"] [--secret <ENV_NAME>] [--cache-ttl <seconds>] [--transform <js-expression>] [--caller-rate-limit <requests/window>] [--quota-day <requests>] [--quota-month <requests>] [--publish] [--dispatch-namespace <name>] [--registry <path>]
  list [--registry <path>]
  show <tenant-slug> [--registry <path>]
  export-tenant-directory [--registry <path>]

Cloudflare commands:
  cloudflare-deploy-dispatcher --script-name <name> --account-id <id> --api-token <token> [--dispatch-namespace <id>] [--usage-kv-id <id>] [--rate-kv-id <id>] [--script-path <path>] [--registry <path>] [--state-path <path>] [--compat-date <YYYY-MM-DD>] [--workers-dev <true|false>] [--execute]
  cloudflare-rollback-dispatcher [--deployment-id <id>] [--script-name <name>] --account-id <id> --api-token <token> [--state-path <path>] [--workers-dev <true|false>] [--execute]
  cloudflare-deploy-tenant --tenant <slug> [--script-name <name>] [--secret <ENV_NAME>] --account-id <id> --api-token <token> [--dispatch-namespace <name>] [--registry <path>] [--state-path <path>] [--compat-date <YYYY-MM-DD>] [--workers-dev <true|false>] [--execute]

Storage commands:
  storage-migrate-json-to-d1 [--registry <path>] [--control-plane <path>] [--storage-path <path>] [--backup-dir <path>] [--execute]
  storage-rollback-d1 --backup-dir <path> [--storage-path <path>] [--execute]

Auth + audit commands:
  user-create --user <id> [--name <display-name>] [--control-plane <path>]
  auth-create-key --user <id> [--name <display-name>] [--scope <scope>] [--control-plane <path>]
  auth-revoke-key --key-id <id> [--control-plane <path>]
  auth-list [--control-plane <path>]
  audit-list [--limit <n>] [--actor <user-id>] [--action <action>] [--control-plane <path>]

Payout commands:
  revenue-credit --tenant <slug> --amount <usd> [--source <source>] [--external-id <id>] [--registry <path>] [--control-plane <path>]
  balance --tenant <slug> [--control-plane <path>]
  withdrawals [--tenant <slug>] [--owner <user-id>] [--control-plane <path>]
  withdraw --tenant <slug> --amount <usd> --to <wallet-address> [--registry <path>] [--control-plane <path>]

Global options:
  --api-key <key>            API key for authenticated commands
  --control-plane <path>     Path to persistent multi-user control plane JSON
  --storage-backend <type>   Storage backend: json (default) or d1
  --storage-path <path>      D1 sqlite path for storage backend d1 (default: ${defaultD1StoragePath()})
  --storage-migration-sql    Path to D1 migration SQL file
`);
}

function buildAuditTarget(command, flags) {
  if (command === "deploy" || command === "wrap") {
    return { targetType: "tenant", targetId: String(flags.tenant || "unknown") };
  }
  if (command === "cloudflare-deploy-dispatcher" || command === "cloudflare-rollback-dispatcher") {
    return { targetType: "script", targetId: String(flags["script-name"] || "dispatcher") };
  }
  if (command === "cloudflare-deploy-tenant") {
    return { targetType: "tenant", targetId: String(flags.tenant || "unknown") };
  }
  if (command === "user-create" || command === "auth-create-key") {
    return { targetType: "user", targetId: String(flags.user || "unknown") };
  }
  if (command === "auth-revoke-key") {
    return { targetType: "api_key", targetId: String(flags["key-id"] || "unknown") };
  }
  if (command === "revenue-credit" || command === "withdraw") {
    return { targetType: "tenant", targetId: String(flags.tenant || "unknown") };
  }
  if (command === "storage-migrate-json-to-d1" || command === "storage-rollback-d1") {
    return { targetType: "storage", targetId: String(flags["storage-path"] || "d1") };
  }
  return { targetType: "unknown", targetId: "unknown" };
}

function buildAuditMetadata({ command, flags, result, errorMessage }) {
  return {
    command,
    execute: Boolean(flags.execute),
    registryPath: flags.registry || undefined,
    statePath: flags["state-path"] || undefined,
    error: errorMessage || undefined,
    result: result || undefined,
  };
}

function maybeAppendAudit({
  command,
  controlPlanePath,
  storage,
  actorUserId,
  flags,
  ok,
  result,
  errorMessage,
} = {}) {
  const action = AUDIT_ACTION[command];
  if (!action) return;

  try {
    const target = buildAuditTarget(command, flags || {});
    appendAuditEvent({
      controlPlanePath,
      storage,
      actorUserId: actorUserId || "anonymous",
      action,
      targetType: target.targetType,
      targetId: target.targetId,
      ok,
      metadata: buildAuditMetadata({
        command,
        flags,
        result,
        errorMessage,
      }),
    });
  } catch {
    // Do not fail primary command because of audit write errors.
  }
}

function authenticateForCommand({
  command,
  flags,
  controlPlanePath,
  storage,
} = {}) {
  const requiredScope = COMMAND_SCOPE[command];
  if (!requiredScope) {
    return { actorUser: null, authConfigured: isAuthConfigured(controlPlanePath, { storage }) };
  }

  const authConfigured = isAuthConfigured(controlPlanePath, { storage });
  if (!authConfigured && BOOTSTRAP_COMMANDS.has(command)) {
    return { actorUser: null, authConfigured: false };
  }

  if (!authConfigured) {
    return { actorUser: null, authConfigured: false };
  }

  const apiKey = flags["api-key"] || process.env.CLAW_API_KEY;
  if (!apiKey) {
    throw new Error(`--api-key is required for command: ${command}`);
  }

  const auth = authenticateApiKey({
    controlPlanePath,
    storage,
    apiKey,
    requiredScope,
  });

  return {
    actorUser: auth.user,
    authConfigured: true,
  };
}

async function run() {
  const { command, positionals, flags } = parseArgs(process.argv);
  const controlPlanePath = resolveControlPlanePath(flags);
  const registryPath = resolveRegistryPath(flags);
  const { storage, storageConfig } = resolveStorageContext(flags);

  if (command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  let actorUser = null;
  let commandResult = null;

  try {
    const authContext = authenticateForCommand({
      command,
      flags,
      controlPlanePath,
      storage,
    });
    actorUser = authContext.actorUser;

    if (command === "deploy") {
      const sourcePath = positionals[0];
      const tenant = flags.tenant;

      if (!sourcePath) {
        throw new Error("deploy requires source path");
      }

      if (!tenant) {
        throw new Error("deploy requires --tenant");
      }

      const existing = getTenant(registryPath, tenant, { storage });
      const ownerUserId = actorUser?.userId || flags.owner || existing?.ownerUserId || "anonymous";

      if (existing?.ownerUserId && actorUser && existing.ownerUserId !== actorUser.userId) {
        throw new Error(`tenant owned by another user: ${existing.ownerUserId}`);
      }

      const resourceType = inferDeployResourceType(sourcePath, flags.type);
      const hosts = flags.host === undefined ? undefined : asArray(flags.host);
      const rateLimit = resolveRateLimitFromFlags(flags);
      const usageLimit = resolveUsageLimitFromFlags(flags);
      const explicitSecretNames = parseExplicitSecretNames(flags);
      const x402Enabled = flags.x402 === undefined
        ? true
        : parseOptionalBooleanFlag(flags.x402, "x402");
      const deployInput = {
        registryPath,
        sourcePath,
        resourceType,
        tenant,
        ownerUserId,
        plan: flags.plan || "free",
        priceUsd: flags.price,
        hosts,
        workerName: flags.worker,
        limits: resolveTenantLimitsFromFlags(flags),
        x402Enabled,
        rateLimit,
        usageLimit,
      };

      if (resourceType === "dataset") {
        deployInput.datasetPath = sourcePath;
      }

      const result = upsertDeployment({ ...deployInput, storage });

      let published = null;
      const shouldPublish = flags.publish === undefined
        ? false
        : boolFlag(flags.publish, true);
      if (shouldPublish) {
        const publishExecute = flags.execute === undefined ? true : boolFlag(flags.execute, true);
        const secretPlan = resolvePublishSecrets(explicitSecretNames, { execute: publishExecute });
        const cloudflareDeploy = await deployCloudflareTenantWorker({
          registryPath,
          tenant: result.tenant.slug,
          scriptName: flags["script-name"] || result.tenant.workerName,
          accountId: flags["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
          apiToken: flags["api-token"] || process.env.CLOUDFLARE_API_TOKEN,
          dispatchNamespace: flags["dispatch-namespace"] || process.env.CLOUDFLARE_DISPATCH_NAMESPACE,
          compatibilityDate: flags["compat-date"],
          enableWorkersDev: boolFlag(flags["workers-dev"], true),
          execute: publishExecute,
          secrets: secretPlan.secrets,
          secretNames: secretPlan.secretNames,
          statePath: flags["state-path"] || defaultDeploymentStatePath(),
          storage,
        });

        published = {
          mode: cloudflareDeploy.mode,
          scriptName:
            cloudflareDeploy.deployed?.scriptName || cloudflareDeploy.tenantDeploy?.scriptName,
          dispatchNamespace:
            cloudflareDeploy.deployed?.dispatchNamespace
            || cloudflareDeploy.tenantDeploy?.dispatchNamespace
            || null,
          deploymentId: cloudflareDeploy.deployed?.deploymentId || null,
          secretNames: cloudflareDeploy.deployed?.secretNames
            || cloudflareDeploy.tenantDeploy?.secretNames
            || [],
          missingSecretNames: cloudflareDeploy.deployed?.missingSecretNames
            || cloudflareDeploy.tenantDeploy?.missingSecretNames
            || [],
          statePath: cloudflareDeploy.statePath || null,
        };
      }

      commandResult = {
        ok: true,
        registryPath,
        tenant: result.tenant,
        endpoint: result.tenant.resourceType === "dataset"
          ? `${result.tenant.routeBase}/v1/records`
          : `${result.tenant.routeBase}/`,
        published,
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || ownerUserId,
        flags,
        ok: true,
        result: {
          tenant: result.tenant.slug,
          ownerUserId,
        },
        storage,
      });
      return;
    }

    if (command === "wrap") {
      const upstream = positionals[0];
      const tenant = flags.tenant;
      if (!upstream) {
        throw new Error("wrap requires upstream URL");
      }
      if (!tenant) {
        throw new Error("wrap requires --tenant");
      }

      const existing = getTenant(registryPath, tenant, { storage });
      const ownerUserId = actorUser?.userId || flags.owner || existing?.ownerUserId || "anonymous";
      if (existing?.ownerUserId && actorUser && existing.ownerUserId !== actorUser.userId) {
        throw new Error(`tenant owned by another user: ${existing.ownerUserId}`);
      }

      const methods = asArray(flags.method).map((method) => String(method).toUpperCase());
      const rateLimit = resolveRateLimitFromFlags(flags);
      const usageLimit = resolveUsageLimitFromFlags(flags);
      const explicitSecretNames = parseExplicitSecretNames(flags);
      const x402Enabled = flags.x402 === undefined
        ? true
        : parseOptionalBooleanFlag(flags.x402, "x402");
      const injectHeaderSecrets = parseInjectedHeaderSecrets(flags);
      const proxy = {
        upstream,
        methods: methods.length > 0 ? methods : ["GET"],
        injectHeaders: parseInjectedHeaders(flags),
        injectHeaderSecrets,
        cacheTtlSeconds: parseOptionalPositiveInt(flags["cache-ttl"], "cache-ttl") || 0,
        transform: flags.transform ? String(flags.transform) : undefined,
      };

      const result = upsertDeployment({
        registryPath,
        tenant,
        ownerUserId,
        plan: flags.plan || "free",
        priceUsd: flags.price,
        hosts: flags.host === undefined ? undefined : asArray(flags.host),
        workerName: flags.worker,
        limits: resolveTenantLimitsFromFlags(flags),
        x402Enabled,
        resourceType: "proxy",
        proxy,
        rateLimit,
        usageLimit,
        storage,
      });

      let published = null;
      const shouldPublish = flags.publish === undefined
        ? false
        : boolFlag(flags.publish, true);
      if (shouldPublish) {
        const publishExecute = flags.execute === undefined ? true : boolFlag(flags.execute, true);
        const secretPlan = resolvePublishSecrets(
          [...explicitSecretNames, ...Object.values(injectHeaderSecrets)],
          { execute: publishExecute },
        );
        const cloudflareDeploy = await deployCloudflareTenantWorker({
          registryPath,
          tenant: result.tenant.slug,
          scriptName: flags["script-name"] || result.tenant.workerName,
          accountId: flags["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
          apiToken: flags["api-token"] || process.env.CLOUDFLARE_API_TOKEN,
          dispatchNamespace: flags["dispatch-namespace"] || process.env.CLOUDFLARE_DISPATCH_NAMESPACE,
          compatibilityDate: flags["compat-date"],
          enableWorkersDev: boolFlag(flags["workers-dev"], true),
          execute: publishExecute,
          secrets: secretPlan.secrets,
          secretNames: secretPlan.secretNames,
          statePath: flags["state-path"] || defaultDeploymentStatePath(),
          storage,
        });

        published = {
          mode: cloudflareDeploy.mode,
          scriptName:
            cloudflareDeploy.deployed?.scriptName || cloudflareDeploy.tenantDeploy?.scriptName,
          dispatchNamespace:
            cloudflareDeploy.deployed?.dispatchNamespace
            || cloudflareDeploy.tenantDeploy?.dispatchNamespace
            || null,
          deploymentId: cloudflareDeploy.deployed?.deploymentId || null,
          secretNames: cloudflareDeploy.deployed?.secretNames
            || cloudflareDeploy.tenantDeploy?.secretNames
            || [],
          missingSecretNames: cloudflareDeploy.deployed?.missingSecretNames
            || cloudflareDeploy.tenantDeploy?.missingSecretNames
            || [],
          statePath: cloudflareDeploy.statePath || null,
        };
      }

      commandResult = {
        ok: true,
        registryPath,
        tenant: result.tenant,
        endpoint: `${result.tenant.routeBase}/`,
        published,
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || ownerUserId,
        flags,
        ok: true,
        result: {
          tenant: result.tenant.slug,
          ownerUserId,
          upstream,
        },
        storage,
      });
      return;
    }

    if (command === "list") {
      const tenants = listTenants(registryPath, { storage });
      commandResult = { ok: true, registryPath, total: tenants.length, tenants };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "show") {
      const slug = positionals[0];
      if (!slug) {
        throw new Error("show requires tenant slug");
      }

      const tenant = getTenant(registryPath, slug, { storage });
      if (!tenant) {
        commandResult = { ok: false, error: "tenant_not_found", slug };
        console.log(JSON.stringify(commandResult, null, 2));
        process.exit(1);
      }

      commandResult = { ok: true, registryPath, tenant };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "export-tenant-directory") {
      const registry = loadRegistry(registryPath, { storage });
      const directory = toTenantDirectory(registry);
      commandResult = { ok: true, registryPath, directory };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "cloudflare-deploy-dispatcher") {
      const result = await deployCloudflareDispatcher({
        registryPath,
        scriptPath: flags["script-path"] || defaultDispatcherScriptPath(),
        scriptName: flags["script-name"],
        accountId: flags["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: flags["api-token"] || process.env.CLOUDFLARE_API_TOKEN,
        dispatchNamespace: flags["dispatch-namespace"] || process.env.CLOUDFLARE_DISPATCH_NAMESPACE,
        usageKvNamespaceId: flags["usage-kv-id"] || process.env.CLOUDFLARE_USAGE_KV_ID,
        rateKvNamespaceId: flags["rate-kv-id"] || process.env.CLOUDFLARE_RATE_KV_ID,
        compatibilityDate: flags["compat-date"],
        enableWorkersDev: boolFlag(flags["workers-dev"], true),
        execute: Boolean(flags.execute),
        statePath: flags["state-path"] || defaultDeploymentStatePath(),
        storage,
      });

      commandResult = result;
      console.log(JSON.stringify(result, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || "anonymous",
        flags,
        ok: true,
        result: {
          mode: result.mode,
          scriptName: result.plan?.scriptName || result.deployed?.scriptName,
        },
        storage,
      });
      return;
    }

    if (command === "cloudflare-rollback-dispatcher") {
      const result = await rollbackCloudflareDispatcher({
        statePath: flags["state-path"] || defaultDeploymentStatePath(),
        scriptName: flags["script-name"],
        deploymentId: flags["deployment-id"],
        accountId: flags["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: flags["api-token"] || process.env.CLOUDFLARE_API_TOKEN,
        enableWorkersDev: boolFlag(flags["workers-dev"], true),
        execute: Boolean(flags.execute),
      });

      commandResult = result;
      console.log(JSON.stringify(result, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || "anonymous",
        flags,
        ok: true,
        result: {
          mode: result.mode,
          deploymentId: result.rollback?.deploymentId || result.rollback?.targetDeploymentId,
        },
        storage,
      });
      return;
    }

    if (command === "cloudflare-deploy-tenant") {
      if (!flags.tenant) {
        throw new Error("cloudflare-deploy-tenant requires --tenant");
      }

      const tenantRecord = getTenant(registryPath, flags.tenant, { storage });
      if (!tenantRecord) {
        throw new Error(`tenant not found: ${flags.tenant}`);
      }
      if (actorUser && tenantRecord.ownerUserId !== actorUser.userId) {
        throw new Error(`tenant owned by another user: ${tenantRecord.ownerUserId}`);
      }

      const execute = Boolean(flags.execute);
      const secretPlan = resolvePublishSecrets(
        [...parseExplicitSecretNames(flags), ...extractTenantProxySecretNames(tenantRecord)],
        { execute },
      );

      const result = await deployCloudflareTenantWorker({
        registryPath,
        tenant: flags.tenant,
        scriptName: flags["script-name"],
        accountId: flags["account-id"] || process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: flags["api-token"] || process.env.CLOUDFLARE_API_TOKEN,
        dispatchNamespace: flags["dispatch-namespace"] || process.env.CLOUDFLARE_DISPATCH_NAMESPACE,
        compatibilityDate: flags["compat-date"],
        enableWorkersDev: boolFlag(flags["workers-dev"], true),
        execute,
        secrets: secretPlan.secrets,
        secretNames: secretPlan.secretNames,
        statePath: flags["state-path"] || defaultDeploymentStatePath(),
        storage,
      });

      commandResult = result;
      console.log(JSON.stringify(result, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || tenantRecord.ownerUserId || "anonymous",
        flags,
        ok: true,
        result: {
          mode: result.mode,
          tenant: flags.tenant,
          scriptName: result.tenantDeploy?.scriptName || result.deployed?.scriptName,
        },
        storage,
      });
      return;
    }

    if (command === "storage-migrate-json-to-d1") {
      const execute = Boolean(flags.execute);
      const sourceStorage = createStorage({ backend: "json" });

      const registryState = sourceStorage.loadRegistry({ registryPath });
      const controlPlaneState = sourceStorage.loadControlPlane({ controlPlanePath });
      const summary = {
        registryTenants: registryState.tenants.length,
        users: controlPlaneState.users.length,
        apiKeys: controlPlaneState.apiKeys.length,
        ledgerEntries: controlPlaneState.ledger.length,
        withdrawals: controlPlaneState.withdrawals.length,
        auditEvents: controlPlaneState.auditEvents.length,
      };

      if (!execute) {
        commandResult = {
          ok: true,
          mode: "dry-run",
          source: {
            backend: "json",
            registryPath,
            controlPlanePath,
          },
          target: {
            backend: "d1",
            storagePath: flags["storage-path"] || storageConfig.d1Path,
          },
          summary,
          next: "re-run with --execute to apply migration and create backup snapshot",
        };
        console.log(JSON.stringify(commandResult, null, 2));
        return;
      }

      const backupDir = path.resolve(flags["backup-dir"] || defaultMigrationBackupDir());
      const backupRegistryPath = writeJsonFile(path.join(backupDir, "registry.json"), registryState);
      const backupControlPlanePath = writeJsonFile(
        path.join(backupDir, "control-plane.json"),
        controlPlaneState,
      );
      const backupMetaPath = writeJsonFile(path.join(backupDir, "metadata.json"), {
        createdAt: new Date().toISOString(),
        command: "storage-migrate-json-to-d1",
        source: {
          registryPath: path.resolve(registryPath),
          controlPlanePath: path.resolve(controlPlanePath),
        },
        target: {
          storagePath: path.resolve(flags["storage-path"] || storageConfig.d1Path),
        },
        summary,
      });

      const targetStorage = createStorage({
        backend: "d1",
        d1Path: flags["storage-path"] || storageConfig.d1Path,
        migrationSqlPath: storageConfig.migrationSqlPath,
      });

      try {
        targetStorage.saveRegistry({ registryPath, registry: registryState });
        targetStorage.saveControlPlane({ controlPlanePath, state: controlPlaneState });
      } finally {
        if (typeof targetStorage.close === "function") {
          targetStorage.close();
        }
      }

      commandResult = {
        ok: true,
        mode: "execute",
        target: {
          backend: "d1",
          storagePath: path.resolve(flags["storage-path"] || storageConfig.d1Path),
        },
        summary,
        backup: {
          dir: backupDir,
          registryPath: backupRegistryPath,
          controlPlanePath: backupControlPlanePath,
          metadataPath: backupMetaPath,
        },
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        storage,
        actorUserId: actorUser?.userId || "system",
        flags,
        ok: true,
        result: {
          summary,
          backupDir,
        },
      });
      return;
    }

    if (command === "storage-rollback-d1") {
      const backupDir = flags["backup-dir"];
      if (!backupDir) {
        throw new Error("storage-rollback-d1 requires --backup-dir");
      }

      const resolvedBackupDir = path.resolve(backupDir);
      const backupRegistryPath = path.join(resolvedBackupDir, "registry.json");
      const backupControlPlanePath = path.join(resolvedBackupDir, "control-plane.json");
      if (!fs.existsSync(backupRegistryPath) || !fs.existsSync(backupControlPlanePath)) {
        throw new Error("backup-dir must contain registry.json and control-plane.json");
      }

      const rollbackRegistry = JSON.parse(fs.readFileSync(backupRegistryPath, "utf8"));
      const rollbackControlPlane = JSON.parse(fs.readFileSync(backupControlPlanePath, "utf8"));
      const summary = {
        registryTenants: Array.isArray(rollbackRegistry.tenants) ? rollbackRegistry.tenants.length : 0,
        users: Array.isArray(rollbackControlPlane.users) ? rollbackControlPlane.users.length : 0,
        apiKeys: Array.isArray(rollbackControlPlane.apiKeys) ? rollbackControlPlane.apiKeys.length : 0,
        ledgerEntries: Array.isArray(rollbackControlPlane.ledger) ? rollbackControlPlane.ledger.length : 0,
        withdrawals: Array.isArray(rollbackControlPlane.withdrawals) ? rollbackControlPlane.withdrawals.length : 0,
        auditEvents: Array.isArray(rollbackControlPlane.auditEvents) ? rollbackControlPlane.auditEvents.length : 0,
      };

      const execute = Boolean(flags.execute);
      if (!execute) {
        commandResult = {
          ok: true,
          mode: "dry-run",
          backupDir: resolvedBackupDir,
          target: {
            backend: "d1",
            storagePath: path.resolve(flags["storage-path"] || storageConfig.d1Path),
          },
          summary,
          next: "re-run with --execute to restore backup into D1 storage",
        };
        console.log(JSON.stringify(commandResult, null, 2));
        return;
      }

      const targetStorage = createStorage({
        backend: "d1",
        d1Path: flags["storage-path"] || storageConfig.d1Path,
        migrationSqlPath: storageConfig.migrationSqlPath,
      });

      const preRollbackDir = path.join(
        resolvedBackupDir,
        "rollback-before",
        new Date().toISOString().replace(/[:.]/g, "-"),
      );

      try {
        const currentRegistry = targetStorage.loadRegistry({ registryPath });
        const currentControlPlane = targetStorage.loadControlPlane({ controlPlanePath });
        writeJsonFile(path.join(preRollbackDir, "registry.json"), currentRegistry);
        writeJsonFile(path.join(preRollbackDir, "control-plane.json"), currentControlPlane);

        targetStorage.saveRegistry({ registryPath, registry: rollbackRegistry });
        targetStorage.saveControlPlane({ controlPlanePath, state: rollbackControlPlane });
      } finally {
        if (typeof targetStorage.close === "function") {
          targetStorage.close();
        }
      }

      commandResult = {
        ok: true,
        mode: "execute",
        backupDir: resolvedBackupDir,
        restored: summary,
        preRollbackSnapshot: preRollbackDir,
        target: {
          backend: "d1",
          storagePath: path.resolve(flags["storage-path"] || storageConfig.d1Path),
        },
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        storage,
        actorUserId: actorUser?.userId || "system",
        flags,
        ok: true,
        result: {
          backupDir: resolvedBackupDir,
          restored: summary,
        },
      });
      return;
    }

    if (command === "user-create") {
      if (!flags.user) {
        throw new Error("user-create requires --user");
      }
      const user = ensureUser({
        controlPlanePath,
        userId: flags.user,
        displayName: flags.name,
        storage,
      });
      commandResult = { ok: true, controlPlanePath, user };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || "bootstrap",
        flags,
        ok: true,
        result: { userId: user.userId },
        storage,
      });
      return;
    }

    if (command === "auth-create-key") {
      if (!flags.user) {
        throw new Error("auth-create-key requires --user");
      }
      const result = createApiKeyForUser({
        controlPlanePath,
        userId: flags.user,
        displayName: flags.name,
        scopes: asArray(flags.scope),
        storage,
      });
      commandResult = {
        ok: true,
        controlPlanePath,
        apiKey: result.apiKey,
        key: result.keyRecord,
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || "bootstrap",
        flags,
        ok: true,
        result: { userId: result.keyRecord.userId, keyId: result.keyRecord.keyId },
        storage,
      });
      return;
    }

    if (command === "auth-revoke-key") {
      if (!flags["key-id"]) {
        throw new Error("auth-revoke-key requires --key-id");
      }
      const revoked = revokeApiKey({
        controlPlanePath,
        keyId: flags["key-id"],
        storage,
      });
      commandResult = { ok: true, controlPlanePath, revoked };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || "system",
        flags,
        ok: true,
        result: { keyId: revoked.keyId },
        storage,
      });
      return;
    }

    if (command === "auth-list") {
      commandResult = {
        ok: true,
        controlPlanePath,
        users: listUsers(controlPlanePath, { storage }),
        apiKeys: listApiKeys(controlPlanePath, { storage }),
      };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "audit-list") {
      commandResult = {
        ok: true,
        controlPlanePath,
        auditEvents: listAuditEvents({
          controlPlanePath,
          limit: Number(flags.limit || 50),
          actorUserId: flags.actor,
          action: flags.action,
          storage,
        }),
      };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "revenue-credit") {
      if (!flags.tenant) {
        throw new Error("revenue-credit requires --tenant");
      }
      const tenant = getTenant(registryPath, flags.tenant, { storage });
      if (!tenant) {
        throw new Error(`tenant not found: ${flags.tenant}`);
      }
      if (actorUser && tenant.ownerUserId !== actorUser.userId) {
        throw new Error(`tenant owned by another user: ${tenant.ownerUserId}`);
      }

      const entry = recordTenantRevenue({
        controlPlanePath,
        tenantSlug: tenant.slug,
        ownerUserId: tenant.ownerUserId || actorUser?.userId || "anonymous",
        grossUsd: parsePositiveAmount(flags.amount, "amount"),
        source: flags.source || "manual",
        externalId: flags["external-id"],
        storage,
      });

      commandResult = {
        ok: true,
        controlPlanePath,
        credit: entry,
        balance: getTenantBalance({ controlPlanePath, tenantSlug: tenant.slug, storage }),
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || tenant.ownerUserId || "anonymous",
        flags,
        ok: true,
        result: { ledgerId: entry.ledgerId, tenant: tenant.slug, grossUsd: entry.grossUsd },
        storage,
      });
      return;
    }

    if (command === "balance") {
      if (!flags.tenant) {
        throw new Error("balance requires --tenant");
      }
      commandResult = {
        ok: true,
        controlPlanePath,
        balance: getTenantBalance({
          controlPlanePath,
          tenantSlug: flags.tenant,
          storage,
        }),
      };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "withdrawals") {
      commandResult = {
        ok: true,
        controlPlanePath,
        withdrawals: listWithdrawals({
          controlPlanePath,
          tenantSlug: flags.tenant,
          ownerUserId: flags.owner,
          storage,
        }),
      };
      console.log(JSON.stringify(commandResult, null, 2));
      return;
    }

    if (command === "withdraw") {
      if (!flags.tenant) {
        throw new Error("withdraw requires --tenant");
      }
      if (!flags.to) {
        throw new Error("withdraw requires --to");
      }

      const tenant = getTenant(registryPath, flags.tenant, { storage });
      if (!tenant) {
        throw new Error(`tenant not found: ${flags.tenant}`);
      }
      if (actorUser && tenant.ownerUserId !== actorUser.userId) {
        throw new Error(`tenant owned by another user: ${tenant.ownerUserId}`);
      }

      const withdrawal = requestWithdrawal({
        controlPlanePath,
        tenantSlug: tenant.slug,
        ownerUserId: tenant.ownerUserId || actorUser?.userId || "anonymous",
        amountUsd: parsePositiveAmount(flags.amount, "amount"),
        destination: flags.to,
        storage,
      });

      commandResult = {
        ok: true,
        controlPlanePath,
        withdrawal,
        balance: getTenantBalance({ controlPlanePath, tenantSlug: tenant.slug, storage }),
      };
      console.log(JSON.stringify(commandResult, null, 2));
      maybeAppendAudit({
        command,
        controlPlanePath,
        actorUserId: actorUser?.userId || tenant.ownerUserId || "anonymous",
        flags,
        ok: true,
        result: {
          withdrawalId: withdrawal.withdrawalId,
          tenant: tenant.slug,
          requestedUsd: withdrawal.requestedUsd,
          netPayoutUsd: withdrawal.netPayoutUsd,
        },
        storage,
      });
      return;
    }

    throw new Error(`unknown command: ${command}`);
  } catch (error) {
    const message = error?.message || String(error);
    maybeAppendAudit({
      command,
      controlPlanePath,
      storage,
      actorUserId: actorUser?.userId || "anonymous",
      flags,
      ok: false,
      errorMessage: message,
      result: commandResult,
    });
    throw error;
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
