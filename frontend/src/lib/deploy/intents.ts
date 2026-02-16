import type { DeployMode, DeployValidationIssue } from "@/lib/deploy/wizard";

const MAX_INTENTS_PER_WALLET = 100;

export type DeployIntentAction = "preview" | "execute";
export type DeployIntentStatus = "recorded" | "succeeded" | "failed";

export type DeployIntentEntry = {
  intentId: string;
  createdAt: string;
  walletAddress: string;
  mode: DeployMode;
  tenant: string;
  publish: boolean;
  priceUsd: string;
  command: string;
  valid: boolean;
  errors: DeployValidationIssue[];
  action: DeployIntentAction;
  status: DeployIntentStatus;
  runMode: "dry-run" | "execute";
  note?: string;
};

type DeployIntentStore = Map<string, DeployIntentEntry[]>;

type GlobalWithStore = typeof globalThis & {
  __clawrDeployIntentStore__?: DeployIntentStore;
};

function store(): DeployIntentStore {
  const scope = globalThis as GlobalWithStore;
  if (!scope.__clawrDeployIntentStore__) {
    scope.__clawrDeployIntentStore__ = new Map<string, DeployIntentEntry[]>();
  }
  return scope.__clawrDeployIntentStore__;
}

function nextIntentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `intent_${crypto.randomUUID()}`;
  }

  const randomPart = Math.random().toString(16).slice(2, 10);
  return `intent_${Date.now()}_${randomPart}`;
}

type RecordIntentInput =
  Omit<DeployIntentEntry, "intentId" | "createdAt" | "action" | "status" | "runMode"> &
  Partial<Pick<DeployIntentEntry, "action" | "status" | "runMode">>;

export function recordDeployIntent(input: RecordIntentInput): DeployIntentEntry {
  const entry: DeployIntentEntry = {
    ...input,
    intentId: nextIntentId(),
    createdAt: new Date().toISOString(),
    action: input.action || "preview",
    status: input.status || "recorded",
    runMode: input.runMode || "dry-run",
  };

  const key = entry.walletAddress.toLowerCase();
  const list = store().get(key) || [];
  list.unshift(entry);
  if (list.length > MAX_INTENTS_PER_WALLET) {
    list.splice(MAX_INTENTS_PER_WALLET);
  }

  store().set(key, list);
  return entry;
}

export function listDeployIntents(walletAddress: string, limit = 20): DeployIntentEntry[] {
  const key = String(walletAddress || "").trim().toLowerCase();
  if (!key) return [];

  const list = store().get(key) || [];
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
  return list.slice(0, safeLimit);
}
