import { NextRequest, NextResponse } from "next/server";

type TrendWindow = "today" | "week" | "overall";

type HeroStats = {
  activeAgents: number;
  publishedApis: number;
  directories: number;
  calls: number;
  revenueUsd: number;
};

type TrendingApi = {
  id: string;
  endpoint: string;
  owner: string;
  directory: string;
  priceUsd: number;
  calls: number;
  revenueUsd: number;
  uniqueCallers: number;
  latencyMs: number;
  errorRatePct: number;
  uptimePct: number;
  rank?: number;
};

type DirectorySnapshot = {
  directory: string;
  calls: number;
  revenueUsd: number;
  apis: number;
  uniqueCallers: number;
};

type WindowSnapshot = {
  window: TrendWindow;
  generatedAt: string;
  heroStats: HeroStats;
  topApis: TrendingApi[];
  directories: DirectorySnapshot[];
};

const DEFAULT_ANALYTICS_BASE =
  process.env.CLAWR_ANALYTICS_BASE_URL ||
  "https://clawr-dispatcher.ferdiboxman.workers.dev";

const VALID_WINDOWS = new Set<TrendWindow>(["today", "week", "overall"]);

function nowIso(): string {
  return new Date().toISOString();
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampTop(rawTop: string | null): number {
  const n = Number(rawTop || "25");
  if (!Number.isFinite(n) || n < 1) return 25;
  return Math.min(100, Math.floor(n));
}

function emptySnapshot(window: TrendWindow): WindowSnapshot {
  return {
    window,
    generatedAt: nowIso(),
    heroStats: {
      activeAgents: 0,
      publishedApis: 0,
      directories: 0,
      calls: 0,
      revenueUsd: 0,
    },
    topApis: [],
    directories: [],
  };
}

function normalizeApi(raw: unknown): TrendingApi | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;

  const id = String(source.id || "").trim();
  const endpoint = String(source.endpoint || id || "").trim();
  if (!id || !endpoint) return null;

  return {
    id,
    endpoint,
    owner: String(source.owner || "@unknown").trim() || "@unknown",
    directory: String(source.directory || "APIs").trim() || "APIs",
    priceUsd: toFiniteNumber(source.priceUsd),
    calls: Math.max(0, Math.floor(toFiniteNumber(source.calls))),
    revenueUsd: toFiniteNumber(source.revenueUsd),
    uniqueCallers: Math.max(0, Math.floor(toFiniteNumber(source.uniqueCallers))),
    latencyMs: Math.max(0, Math.floor(toFiniteNumber(source.latencyMs))),
    errorRatePct: Math.max(0, toFiniteNumber(source.errorRatePct)),
    uptimePct: Math.max(0, toFiniteNumber(source.uptimePct)),
    rank: source.rank === undefined ? undefined : Math.max(1, Math.floor(toFiniteNumber(source.rank, 1))),
  };
}

function normalizeDirectory(raw: unknown): DirectorySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const directory = String(source.directory || "").trim();
  if (!directory) return null;

  return {
    directory,
    calls: Math.max(0, Math.floor(toFiniteNumber(source.calls))),
    revenueUsd: toFiniteNumber(source.revenueUsd),
    apis: Math.max(0, Math.floor(toFiniteNumber(source.apis))),
    uniqueCallers: Math.max(0, Math.floor(toFiniteNumber(source.uniqueCallers))),
  };
}

function normalizeSnapshot(raw: unknown, window: TrendWindow): WindowSnapshot {
  if (!raw || typeof raw !== "object") {
    return emptySnapshot(window);
  }

  const source = raw as Record<string, unknown>;
  const heroRaw = (source.heroStats && typeof source.heroStats === "object")
    ? (source.heroStats as Record<string, unknown>)
    : {};

  const topApisRaw = Array.isArray(source.topApis) ? source.topApis : [];
  const directoriesRaw = Array.isArray(source.directories) ? source.directories : [];

  return {
    window,
    generatedAt: String(source.generatedAt || nowIso()),
    heroStats: {
      activeAgents: Math.max(0, Math.floor(toFiniteNumber(heroRaw.activeAgents))),
      publishedApis: Math.max(0, Math.floor(toFiniteNumber(heroRaw.publishedApis))),
      directories: Math.max(0, Math.floor(toFiniteNumber(heroRaw.directories))),
      calls: Math.max(0, Math.floor(toFiniteNumber(heroRaw.calls))),
      revenueUsd: toFiniteNumber(heroRaw.revenueUsd),
    },
    topApis: topApisRaw
      .map((item) => normalizeApi(item))
      .filter((item): item is TrendingApi => item !== null),
    directories: directoriesRaw
      .map((item) => normalizeDirectory(item))
      .filter((item): item is DirectorySnapshot => item !== null),
  };
}

export async function GET(request: NextRequest) {
  const windowParam = (request.nextUrl.searchParams.get("window") || "today").toLowerCase() as TrendWindow;
  if (!VALID_WINDOWS.has(windowParam)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_window",
        expected: ["today", "week", "overall"],
      },
      { status: 400 },
    );
  }

  const top = clampTop(request.nextUrl.searchParams.get("top"));
  const upstream = new URL(`${DEFAULT_ANALYTICS_BASE.replace(/\/$/, "")}/__platform/analytics`);
  upstream.searchParams.set("window", windowParam);
  upstream.searchParams.set("top", String(top));

  try {
    const response = await fetch(upstream.toString(), {
      cache: "no-store",
      headers: {
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "upstream_http_error",
          status: response.status,
          window: windowParam,
          source: upstream.origin,
          snapshot: emptySnapshot(windowParam),
        },
        { status: 200 },
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const snapshot = normalizeSnapshot(payload.snapshot, windowParam);

    return NextResponse.json(
      {
        ok: true,
        window: windowParam,
        source: upstream.origin,
        snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_unreachable",
        reason: error instanceof Error ? error.message : "unknown_error",
        window: windowParam,
        source: upstream.origin,
        snapshot: emptySnapshot(windowParam),
      },
      { status: 200 },
    );
  }
}
