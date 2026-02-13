"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpRight, Activity, DollarSign, FolderTree } from "lucide-react";

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

type AnalyticsResponse = {
  ok: boolean;
  window: TrendWindow;
  source: string;
  snapshot: WindowSnapshot;
};

const ALL_CATEGORIES = "All";
const WINDOW_TO_TAB: Record<TrendWindow, string> = {
  today: "today",
  week: "week",
  overall: "all",
};

const TAB_TO_WINDOW: Record<string, TrendWindow> = {
  today: "today",
  week: "week",
  all: "overall",
};

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1 ? 2 : 3,
    maximumFractionDigits: value >= 1 ? 2 : 3,
  }).format(value);
}

function safePercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function EmptySnapshot(window: TrendWindow): WindowSnapshot {
  return {
    window,
    generatedAt: new Date().toISOString(),
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

async function fetchWindow(window: TrendWindow): Promise<WindowSnapshot> {
  const response = await fetch(`/api/explore/analytics?window=${window}&top=50`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return EmptySnapshot(window);
  }

  const payload = (await response.json()) as AnalyticsResponse;
  return payload.snapshot;
}

export default function Explore() {
  const [tab, setTab] = useState("today");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<TrendWindow, WindowSnapshot>>({
    today: EmptySnapshot("today"),
    week: EmptySnapshot("week"),
    overall: EmptySnapshot("overall"),
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [today, week, overall] = await Promise.all([
          fetchWindow("today"),
          fetchWindow("week"),
          fetchWindow("overall"),
        ]);

        if (cancelled) return;
        setSnapshots({ today, week, overall });
      } catch (loadError) {
        if (cancelled) return;
        const message = loadError instanceof Error ? loadError.message : "unknown_error";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const windowKey = TAB_TO_WINDOW[tab] ?? "today";
  const activeSnapshot = snapshots[windowKey];

  const categories = useMemo(() => {
    const names = activeSnapshot.directories.map((item) => item.directory);
    return [ALL_CATEGORIES, ...names];
  }, [activeSnapshot.directories]);

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory(ALL_CATEGORIES);
    }
  }, [categories, category]);

  const filteredApis = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return activeSnapshot.topApis.filter((api) => {
      if (category !== ALL_CATEGORIES && api.directory !== category) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        api.endpoint.toLowerCase().includes(needle) ||
        api.owner.toLowerCase().includes(needle) ||
        api.directory.toLowerCase().includes(needle)
      );
    });
  }, [activeSnapshot.topApis, category, search]);

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">clawr</Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/explore" className="text-foreground">Explore</Link>
              <a href="#docs" className="hover:text-foreground transition-colors">Docs</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Explore APIs</h1>
            <p className="text-muted-foreground">Live marketplace analytics from the dispatcher</p>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="today">Trending Today</TabsTrigger>
              <TabsTrigger value="week">Trending This Week</TabsTrigger>
              <TabsTrigger value="all">Overall</TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search APIs, owners, or directories…"
                className="pl-10 bg-card"
              />
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
                </div>
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    icon={<Activity className="w-4 h-4" />}
                    value={formatCompact(activeSnapshot.heroStats.calls)}
                    label="Calls"
                  />
                  <StatCard
                    icon={<DollarSign className="w-4 h-4" />}
                    value={formatCurrency(activeSnapshot.heroStats.revenueUsd)}
                    label="Revenue"
                  />
                  <StatCard
                    icon={<FolderTree className="w-4 h-4" />}
                    value={formatCompact(activeSnapshot.heroStats.directories)}
                    label="Directories"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <Button
                      key={item}
                      size="sm"
                      variant={category === item ? "secondary" : "ghost"}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>

                {error ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    Live analytics load failed: {error}
                  </div>
                ) : null}

                <TabsContent value="today" className="space-y-2">
                  <ApiList apis={filteredApis} fallbackWindow={WINDOW_TO_TAB[windowKey]} />
                </TabsContent>
                <TabsContent value="week" className="space-y-2">
                  <ApiList apis={filteredApis} fallbackWindow={WINDOW_TO_TAB[windowKey]} />
                </TabsContent>
                <TabsContent value="all" className="space-y-2">
                  <ApiList apis={filteredApis} fallbackWindow={WINDOW_TO_TAB[windowKey]} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function ApiList({ apis, fallbackWindow }: { apis: TrendingApi[]; fallbackWindow: string }) {
  if (apis.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        No APIs found for this filter ({fallbackWindow}).
      </div>
    );
  }

  return (
    <>
      {apis.map((api, index) => (
        <div
          key={`${api.id}-${index}`}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium tabular-nums">
              {api.rank ?? index + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{api.endpoint}</span>
                <span className="text-xs text-muted-foreground">{api.directory}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{api.owner}</span>
                <span>uptime {safePercent(api.uptimePct)}</span>
                <span>errors {safePercent(api.errorRatePct)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Metric value={formatCompact(api.calls)} label="calls" />
            <Metric value={formatCurrency(api.priceUsd)} label="per call" />
            <Metric value={formatCurrency(api.revenueUsd)} label="revenue" />
            <Button size="sm" variant="outline" className="gap-1">
              View
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-right">
      <div className="text-sm font-medium tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 text-muted-foreground">{icon}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
