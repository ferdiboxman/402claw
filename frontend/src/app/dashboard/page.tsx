"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Activity,
  BarChart3,
  Bot,
  Check,
  Copy,
  Database,
  DollarSign,
  ExternalLink,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Wallet,
  Zap,
} from "lucide-react";
import type { DeployIntentEntry } from "@/lib/deploy/intents";
import type { DeployValidationIssue } from "@/lib/deploy/wizard";

type TrendWindow = "today" | "week" | "overall";
type TabKey = "today" | "week" | "all";
type DeployMode = "dataset" | "function" | "proxy";

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
  snapshot: WindowSnapshot;
};

type SessionResponse = {
  ok: boolean;
  authenticated: boolean;
  session: {
    walletAddress: string;
  } | null;
};

type DeployForm = {
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

type DeployPreviewPayload = {
  ok: boolean;
  error?: string;
  preview?: {
    ok: boolean;
    command: string;
    errors: DeployValidationIssue[];
  };
  intent?: DeployIntentEntry;
};

type DeployIntentsPayload = {
  ok: boolean;
  error?: string;
  intents?: DeployIntentEntry[];
};

const ALL_CATEGORIES = "All";
const POLL_MS = 30_000;
const TAB_TO_WINDOW: Record<TabKey, TrendWindow> = {
  today: "today",
  week: "week",
  all: "overall",
};

const DEFAULT_DEPLOY_FORM: DeployForm = {
  mode: "dataset",
  tenant: "my-api",
  sourcePath: "../x402-server/data/sample.csv",
  upstreamUrl: "https://api.example.com/v1",
  owner: "",
  plan: "free",
  priceUsd: "0.01",
  host: "",
  rateLimitCaller: "100/60s",
  quotaDay: "",
  quotaMonth: "",
  spendDay: "",
  spendMonth: "",
  x402Enabled: true,
  publish: false,
  dispatchNamespace: "clawr-staging",
};

function emptySnapshot(window: TrendWindow): WindowSnapshot {
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

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function generateSparkline(currentValue: number, points: number): number[] {
  if (currentValue === 0) return [];
  const result: number[] = [];
  const baseValue = currentValue * 0.7;
  const variance = currentValue * 0.3;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trendValue = baseValue + (variance * progress);
    const noise = (Math.sin(i * 1.5) * 0.1 + Math.cos(i * 0.7) * 0.05) * currentValue;
    result.push(Math.max(0, trendValue + noise));
  }
  result[result.length - 1] = currentValue;
  return result;
}

function shortEndpointLabel(endpoint: string): string {
  const trimmed = endpoint.replace(/^\/+/, "");
  if (!trimmed) return "API";
  const token = trimmed.split("/").filter(Boolean).pop();
  if (!token) return "API";
  return token
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
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

function buildDeployCommand(form: DeployForm): string {
  const baseParts = [
    "cd",
    shellQuote("/Users/Shared/Projects/402claw/prototypes/cli"),
    "&&",
    "node",
    "src/index.js",
  ];

  if (form.mode === "proxy") {
    baseParts.push("wrap", shellQuote(form.upstreamUrl.trim() || "https://api.example.com/v1"));
  } else {
    baseParts.push("deploy", shellQuote(form.sourcePath.trim() || "../x402-server/data/sample.csv"));
    baseParts.push("--type", form.mode);
  }

  addFlag(baseParts, "tenant", form.tenant);
  addFlag(baseParts, "price", form.priceUsd);
  addFlag(baseParts, "plan", form.plan);
  addFlag(baseParts, "owner", form.owner);
  addFlag(baseParts, "host", form.host);
  addFlag(baseParts, "rate-limit-caller", form.rateLimitCaller);
  addFlag(baseParts, "quota-day", form.quotaDay);
  addFlag(baseParts, "quota-month", form.quotaMonth);
  addFlag(baseParts, "spend-day", form.spendDay);
  addFlag(baseParts, "spend-month", form.spendMonth);
  baseParts.push("--x402", form.x402Enabled ? "true" : "false");

  if (form.publish) {
    baseParts.push("--publish");
    addFlag(baseParts, "dispatch-namespace", form.dispatchNamespace);
  }

  return baseParts.join(" ");
}

async function fetchSnapshot(window: TrendWindow): Promise<WindowSnapshot> {
  const response = await fetch(`/api/explore/analytics?window=${window}&top=50`, {
    cache: "no-store",
  });
  if (!response.ok) return emptySnapshot(window);

  const payload = (await response.json()) as AnalyticsResponse;
  if (!payload.ok || !payload.snapshot) return emptySnapshot(window);
  return payload.snapshot;
}

export default function Dashboard() {
  const [windowTab, setWindowTab] = useState<TabKey>("today");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [selectedApi, setSelectedApi] = useState<TrendingApi | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardCopied, setWizardCopied] = useState(false);
  const [previewCommand, setPreviewCommand] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewErrors, setPreviewErrors] = useState<DeployValidationIssue[]>([]);
  const [recentIntents, setRecentIntents] = useState<DeployIntentEntry[]>([]);
  const [recentIntentsLoading, setRecentIntentsLoading] = useState(false);
  const [endpointCopied, setEndpointCopied] = useState(false);
  const [form, setForm] = useState<DeployForm>(DEFAULT_DEPLOY_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<TrendWindow, WindowSnapshot>>({
    today: emptySnapshot("today"),
    week: emptySnapshot("week"),
    overall: emptySnapshot("overall"),
  });

  const activeWindow = TAB_TO_WINDOW[windowTab];
  const activeSnapshot = snapshots[activeWindow];

  const categories = useMemo(() => {
    return [ALL_CATEGORIES, ...activeSnapshot.directories.map((item) => item.directory)];
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

      if (!needle) return true;
      return (
        api.endpoint.toLowerCase().includes(needle) ||
        api.owner.toLowerCase().includes(needle) ||
        api.directory.toLowerCase().includes(needle)
      );
    });
  }, [activeSnapshot.topApis, category, search]);

  const localDeployCommand = useMemo(() => buildDeployCommand(form), [form]);
  const deployCommand = previewCommand || localDeployCommand;

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionResponse;
        if (cancelled) return;
        if (payload.ok && payload.authenticated && payload.session) {
          setWalletAddress(payload.session.walletAddress);
        }
      } catch {
        if (cancelled) return;
        setWalletAddress(null);
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [today, week, overall] = await Promise.all([
          fetchSnapshot("today"),
          fetchSnapshot("week"),
          fetchSnapshot("overall"),
        ]);

        if (cancelled) return;
        setSnapshots({ today, week, overall });
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "analytics_load_failed");
      } finally {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    load(false);
    const interval = setInterval(() => {
      load(true).catch(() => {});
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const loadRecentIntents = useCallback(async () => {
    setRecentIntentsLoading(true);
    try {
      const response = await fetch("/api/deploy/intents?limit=10", {
        cache: "no-store",
      });
      const payload = (await response.json()) as DeployIntentsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "deploy_intents_load_failed");
      }
      setRecentIntents(Array.isArray(payload.intents) ? payload.intents : []);
    } catch (loadError) {
      setPreviewMessage(loadError instanceof Error ? loadError.message : "deploy_intents_load_failed");
    } finally {
      setRecentIntentsLoading(false);
    }
  }, []);

  const refreshDeployPreview = useCallback(async (nextForm: DeployForm) => {
    setPreviewLoading(true);
    setPreviewMessage(null);

    try {
      const response = await fetch("/api/deploy/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(nextForm),
      });
      const payload = (await response.json()) as DeployPreviewPayload;
      if (!response.ok || !payload.ok || !payload.preview) {
        throw new Error(payload.error || "deploy_preview_failed");
      }

      setPreviewCommand(payload.preview.command || "");
      setPreviewErrors(Array.isArray(payload.preview.errors) ? payload.preview.errors : []);
      setPreviewMessage(
        payload.preview.ok
          ? "Server validation passed and deploy intent was logged."
          : "Server validation found issues. Fix fields before running the command.",
      );

      if (payload.intent) {
        const intent = payload.intent;
        setRecentIntents((current) => {
          const deduped = current.filter((item) => item.intentId !== intent.intentId);
          return [intent, ...deduped].slice(0, 10);
        });
      }
    } catch (previewError) {
      setPreviewCommand("");
      setPreviewErrors([]);
      setPreviewMessage(previewError instanceof Error ? previewError.message : "deploy_preview_failed");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!wizardOpen) return;
    loadRecentIntents().catch(() => {});
  }, [wizardOpen, loadRecentIntents]);

  useEffect(() => {
    if (!wizardOpen) return;
    const timer = window.setTimeout(() => {
      refreshDeployPreview(form).catch(() => {});
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [wizardOpen, form, refreshDeployPreview]);

  const activityRows = useMemo(() => {
    return activeSnapshot.topApis.slice(0, 8).map((api, index) => {
      const minutesAgo = 2 + (index * 3);
      return {
        id: `${api.id}-${index}`,
        time: `${minutesAgo}m ago`,
        event: "Settled request window",
        api: api.endpoint,
        amount: api.revenueUsd,
        caller: api.owner,
      };
    });
  }, [activeSnapshot.topApis]);

  const copyEndpoint = async (endpoint: string) => {
    await navigator.clipboard.writeText(endpoint);
    setEndpointCopied(true);
    window.setTimeout(() => setEndpointCopied(false), 1500);
  };

  const copyWizardCommand = async () => {
    if (!deployCommand) return;
    await navigator.clipboard.writeText(deployCommand);
    setWizardCopied(true);
    window.setTimeout(() => setWizardCopied(false), 1500);
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar border-r border-sidebar-border p-4">
        <div className="mb-8 flex items-center gap-2">
          <span className="font-semibold tracking-tight">clawr</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">beta</Badge>
        </div>

        <nav className="space-y-1">
          <NavItem icon={<Activity className="h-4 w-4" />} label="Overview" active />
          <NavItem icon={<Database className="h-4 w-4" />} label="APIs" />
          <NavItem icon={<DollarSign className="h-4 w-4" />} label="Earnings" />
          <NavItem icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
          <NavItem icon={<Settings className="h-4 w-4" />} label="Settings" />
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-3">
          <Card className="border-border/70 bg-gradient-to-br from-card to-accent/20">
            <CardContent className="p-4">
              <div className="mb-1 text-xs text-muted-foreground">Balance (window)</div>
              <div className="mb-2 text-2xl font-semibold tabular-nums">
                {formatCurrency(activeSnapshot.heroStats.revenueUsd)}
              </div>
              <div className="mb-3 text-xs text-muted-foreground">
                {activeWindow === "today" ? "Today" : activeWindow === "week" ? "This week" : "Overall"}
              </div>
              <Button size="sm" className="w-full" variant="default">
                Withdraw
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="p-3 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5" />
                <span className="truncate">{walletAddress || "Session loading"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Auth protected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="ml-56 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live marketplace analytics + creator controls</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                Promise.all([
                  fetchSnapshot("today"),
                  fetchSnapshot("week"),
                  fetchSnapshot("overall"),
                ])
                  .then(([today, week, overall]) => setSnapshots({ today, week, overall }))
                  .finally(() => setRefreshing(false));
              }}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              {refreshing ? "Refreshing" : "Refresh"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button className="gap-2" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4" />
              Deploy API
            </Button>
          </div>
        </div>

        <Tabs value={windowTab} onValueChange={(value) => setWindowTab(value as TabKey)} className="space-y-4">
          <TabsList className="border border-border bg-card">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="all">Overall</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <Card className="mb-6 border-border/70">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading live analytics…</CardContent>
          </Card>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Dashboard analytics failed to load: {error}
          </div>
        ) : null}

        <div className="mb-8 grid grid-cols-4 gap-4">
          <StatCard
            title="Revenue"
            value={formatCurrency(activeSnapshot.heroStats.revenueUsd)}
            subtitle="selected window"
            icon={<DollarSign className="h-4 w-4" />}
            trend={activeSnapshot.heroStats.revenueUsd > 0 ? 12 : undefined}
            sparkline={generateSparkline(activeSnapshot.heroStats.revenueUsd, 12)}
          />
          <StatCard
            title="Calls"
            value={formatCompact(activeSnapshot.heroStats.calls)}
            subtitle="settled + challenged"
            icon={<Zap className="h-4 w-4" />}
            trend={activeSnapshot.heroStats.calls > 0 ? 8 : undefined}
            sparkline={generateSparkline(activeSnapshot.heroStats.calls, 12)}
          />
          <StatCard
            title="Published APIs"
            value={formatCompact(activeSnapshot.heroStats.publishedApis)}
            subtitle="active in directory"
            icon={<Database className="h-4 w-4" />}
            trend={activeSnapshot.heroStats.publishedApis > 0 ? 5 : undefined}
            sparkline={generateSparkline(activeSnapshot.heroStats.publishedApis, 12)}
          />
          <StatCard
            title="Active Agents"
            value={formatCompact(activeSnapshot.heroStats.activeAgents)}
            subtitle="unique callers"
            icon={<Bot className="h-4 w-4" />}
            trend={activeSnapshot.heroStats.activeAgents > 0 ? 15 : undefined}
            sparkline={generateSparkline(activeSnapshot.heroStats.activeAgents, 12)}
          />
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search APIs by endpoint, owner, or category"
              className="pl-10"
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
        </div>

        <div className="grid grid-cols-[1.8fr,1fr] gap-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Top APIs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredApis.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No APIs found for this filter.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>API</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                      <TableHead className="text-right">Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApis.map((api, index) => (
                      <TableRow
                        key={`${api.id}-${index}`}
                        className="cursor-pointer transition-colors hover:bg-accent/40"
                        onClick={() => setSelectedApi(api)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{shortEndpointLabel(api.endpoint)}</span>
                            <span className="font-mono text-xs text-muted-foreground">{api.endpoint}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{api.owner}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(api.priceUsd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCompact(api.calls)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(api.revenueUsd)}</TableCell>
                        <TableCell className="text-right tabular-nums">{api.latencyMs}ms</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Badge variant="outline">{formatPercent(api.uptimePct)} uptime</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No activity for this window.</div>
                ) : (
                  activityRows.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <div className="text-sm font-medium">{activity.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {activity.api} • {activity.caller}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium tabular-nums text-emerald-500">
                          +{formatCurrency(activity.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Directory Leaders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSnapshot.directories.slice(0, 5).map((directory, index) => (
                  <div key={`${directory.directory}-${index}`} className="rounded-lg border border-border p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-sm font-medium">{directory.directory}</div>
                      <Badge variant="outline">{formatCompact(directory.apis)} APIs</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatCompact(directory.calls)} calls</span>
                      <span>{formatCurrency(directory.revenueUsd)}</span>
                    </div>
                  </div>
                ))}
                {activeSnapshot.directories.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No directory data.</div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Sheet open={!!selectedApi} onOpenChange={() => setSelectedApi(null)}>
        <SheetContent className="w-[460px] sm:max-w-[460px]">
          {selectedApi ? (
            <>
              <SheetHeader className="pb-6">
                <SheetTitle>{shortEndpointLabel(selectedApi.endpoint)}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{selectedApi.endpoint}</SheetDescription>
              </SheetHeader>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <Panel title="Revenue" value={formatCurrency(selectedApi.revenueUsd)} />
                <Panel title="Calls" value={formatCompact(selectedApi.calls)} />
                <Panel title="Price" value={formatCurrency(selectedApi.priceUsd)} />
                <Panel title="Callers" value={formatCompact(selectedApi.uniqueCallers)} />
              </div>

              <div className="mb-6 space-y-2">
                <ValueRow label="Owner" value={selectedApi.owner} />
                <ValueRow label="Directory" value={selectedApi.directory} />
                <ValueRow label="Uptime" value={formatPercent(selectedApi.uptimePct)} />
                <ValueRow label="Error rate" value={formatPercent(selectedApi.errorRatePct)} />
                <ValueRow label="Average latency" value={`${selectedApi.latencyMs}ms`} />
              </div>

              <div className="mb-6 space-y-2">
                <div className="text-sm font-medium">Endpoint</div>
                <button
                  type="button"
                  onClick={() => copyEndpoint(selectedApi.endpoint)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="font-mono text-xs">{selectedApi.endpoint}</span>
                  {endpointCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View API
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent className="w-[620px] max-w-[96vw] overflow-y-auto sm:max-w-[620px]">
          <SheetHeader className="pb-6">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Deploy API Wizard
            </SheetTitle>
            <SheetDescription>
              Configure your API deployment and copy a ready-to-run CLI command.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deploy mode">
                <select
                  value={form.mode}
                  onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as DeployMode }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="dataset">dataset</option>
                  <option value="function">function</option>
                  <option value="proxy">proxy</option>
                </select>
              </Field>

              <Field label="Tenant slug">
                <Input
                  value={form.tenant}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenant: event.target.value }))}
                  placeholder="my-api"
                />
              </Field>
            </div>

            {form.mode === "proxy" ? (
              <Field label="Upstream URL">
                <Input
                  value={form.upstreamUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, upstreamUrl: event.target.value }))}
                  placeholder="https://api.example.com/v1"
                />
              </Field>
            ) : (
              <Field label={form.mode === "dataset" ? "Dataset path" : "Function path"}>
                <Input
                  value={form.sourcePath}
                  onChange={(event) => setForm((prev) => ({ ...prev, sourcePath: event.target.value }))}
                  placeholder="../x402-server/data/sample.csv"
                />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Owner user">
                <Input
                  value={form.owner}
                  onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}
                  placeholder="alice"
                />
              </Field>

              <Field label="Plan">
                <select
                  value={form.plan}
                  onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="scale">scale</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price USD per call">
                <Input
                  value={form.priceUsd}
                  onChange={(event) => setForm((prev) => ({ ...prev, priceUsd: event.target.value }))}
                  placeholder="0.01"
                />
              </Field>

              <Field label="Host (optional)">
                <Input
                  value={form.host}
                  onChange={(event) => setForm((prev) => ({ ...prev, host: event.target.value }))}
                  placeholder="acme.api.clawr.dev"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Rate limit caller">
                <Input
                  value={form.rateLimitCaller}
                  onChange={(event) => setForm((prev) => ({ ...prev, rateLimitCaller: event.target.value }))}
                  placeholder="100/60s"
                />
              </Field>

              <Field label="Daily quota (optional)">
                <Input
                  value={form.quotaDay}
                  onChange={(event) => setForm((prev) => ({ ...prev, quotaDay: event.target.value }))}
                  placeholder="10000"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly quota (optional)">
                <Input
                  value={form.quotaMonth}
                  onChange={(event) => setForm((prev) => ({ ...prev, quotaMonth: event.target.value }))}
                  placeholder="200000"
                />
              </Field>

              <Field label="Daily spend cap (optional)">
                <Input
                  value={form.spendDay}
                  onChange={(event) => setForm((prev) => ({ ...prev, spendDay: event.target.value }))}
                  placeholder="25"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly spend cap (optional)">
                <Input
                  value={form.spendMonth}
                  onChange={(event) => setForm((prev) => ({ ...prev, spendMonth: event.target.value }))}
                  placeholder="500"
                />
              </Field>

              <Field label="Dispatch namespace">
                <Input
                  value={form.dispatchNamespace}
                  onChange={(event) => setForm((prev) => ({ ...prev, dispatchNamespace: event.target.value }))}
                  placeholder="clawr-staging"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.x402Enabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, x402Enabled: event.target.checked }))}
                />
                Enable x402 payments
              </label>

              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.publish}
                  onChange={(event) => setForm((prev) => ({ ...prev, publish: event.target.checked }))}
                />
                Publish to Cloudflare
              </label>
            </div>

            <Field label="Generated command">
              <div className="space-y-2">
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5">
                  {deployCommand || "No command preview available yet."}
                </pre>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshDeployPreview(form)}
                    disabled={previewLoading}
                  >
                    {previewLoading ? "Validating..." : "Server Validate"}
                  </Button>
                  <Button size="sm" onClick={copyWizardCommand} className="gap-2">
                    {wizardCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {wizardCopied ? "Copied" : "Copy command"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm(DEFAULT_DEPLOY_FORM);
                      setWizardCopied(false);
                      setPreviewErrors([]);
                      setPreviewMessage(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </Field>

            {previewErrors.length > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="mb-2 font-medium">Validation issues</div>
                <div className="space-y-1">
                  {previewErrors.map((issue, index) => (
                    <div key={`${issue.field}-${index}`}>
                      <code>{issue.field}</code>: {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {previewMessage ? (
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                {previewMessage}
              </div>
            ) : null}

            <Field label="Recent deploy intents">
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Server-side audit trail (session scoped)</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadRecentIntents()}
                    disabled={recentIntentsLoading}
                  >
                    {recentIntentsLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
                {recentIntents.length === 0 ? (
                  <div className="text-muted-foreground">No intents logged yet for this wallet session.</div>
                ) : (
                  <div className="space-y-2">
                    {recentIntents.map((intent) => (
                      <div key={intent.intentId} className="rounded border border-border bg-background/60 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono">
                            {intent.mode} {intent.tenant || "(tenant missing)"}
                          </div>
                          <Badge variant={intent.valid ? "secondary" : "outline"}>
                            {intent.valid ? "valid" : "invalid"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {new Date(intent.createdAt).toLocaleTimeString()} • {intent.publish ? "publish" : "no publish"} • ${intent.priceUsd || "0"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <div className="rounded-lg border border-border bg-accent/20 p-3 text-xs text-muted-foreground">
              Command targets the local CLI at <code>/Users/Shared/Projects/402claw/prototypes/cli</code>.
              Add <code>--api-key</code> if auth is enabled and you are not bootstrapping.
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
    </button>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  sparkline,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: number;
  sparkline?: number[];
}) {
  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="rounded-lg bg-accent/50 p-2 text-muted-foreground">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="mt-1 flex items-center gap-2">
              {trend !== undefined && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {trend >= 0 ? (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2L10 6H7V10H5V6H2L6 2Z" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M6 10L2 6H5V2H7V6H10L6 10Z" fill="currentColor"/>
                    </svg>
                  )}
                  {Math.abs(trend)}%
                </span>
              )}
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          {sparkline && sparkline.length > 1 && (
            <MiniSparkline data={sparkline} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniSparkline({ data, height = 28, width = 64 }: { data: number[]; height?: number; width?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className="overflow-visible opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        fill={isPositive ? "#10b981" : "#ef4444"}
      />
    </svg>
  );
}

function Panel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-accent/20 p-3">
      <div className="mb-1 text-xs text-muted-foreground">{title}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
