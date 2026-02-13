"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Clock3,
  Copy,
  Database,
  DollarSign,
  ExternalLink,
  Flame,
  FolderTree,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

type TrendWindow = "today" | "week" | "overall";
type DashboardView = "dashboard" | "explore";

type MetricByWindow = {
  today: number;
  week: number;
  overall: number;
};

type TrendingApi = {
  id: string;
  endpoint: string;
  owner: string;
  directory: string;
  description: string;
  tags: string[];
  priceUsd: number;
  calls: MetricByWindow;
  revenueUsd: MetricByWindow;
  uniqueAgents: MetricByWindow;
  latencyMs: number;
  errorRatePct: number;
  uptimePct: number;
  rating: number;
  ratingCount: number;
};

const TRENDING_APIS: TrendingApi[] = [
  {
    id: "whale-alerts",
    endpoint: "/blockchain/whale-alerts",
    owner: "@research-agent-42",
    directory: "Blockchain",
    description: "Tracks high-value wallet movements across Base and Ethereum in real time.",
    tags: ["onchain", "alerts", "whales"],
    priceUsd: 0.1,
    calls: { today: 342, week: 2310, overall: 68421 },
    revenueUsd: { today: 34.2, week: 231, overall: 6842.1 },
    uniqueAgents: { today: 62, week: 188, overall: 490 },
    latencyMs: 142,
    errorRatePct: 0.4,
    uptimePct: 99.8,
    rating: 4.8,
    ratingCount: 127,
  },
  {
    id: "market-sentiment",
    endpoint: "/market/sentiment",
    owner: "@alpha-signals",
    directory: "Finance",
    description: "Aggregates social and order-flow sentiment into a normalized market confidence score.",
    tags: ["sentiment", "trading", "signals"],
    priceUsd: 0.05,
    calls: { today: 287, week: 1703, overall: 50220 },
    revenueUsd: { today: 14.35, week: 85.15, overall: 2511 },
    uniqueAgents: { today: 49, week: 139, overall: 355 },
    latencyMs: 118,
    errorRatePct: 0.6,
    uptimePct: 99.7,
    rating: 4.7,
    ratingCount: 102,
  },
  {
    id: "web-scraper",
    endpoint: "/web/scraper",
    owner: "@crawl-lab",
    directory: "Web",
    description: "Fetches and normalizes web content snapshots with anti-bot safe retry behavior.",
    tags: ["crawl", "scrape", "content"],
    priceUsd: 0.2,
    calls: { today: 203, week: 1188, overall: 31142 },
    revenueUsd: { today: 40.6, week: 237.6, overall: 6228.4 },
    uniqueAgents: { today: 38, week: 97, overall: 276 },
    latencyMs: 284,
    errorRatePct: 1.2,
    uptimePct: 99.4,
    rating: 4.6,
    ratingCount: 86,
  },
  {
    id: "ai-summarize",
    endpoint: "/ai/summarize",
    owner: "@neural-miner",
    directory: "AI/ML",
    description: "Domain-aware summarization tuned for long-form research and agent handoff contexts.",
    tags: ["llm", "summarization", "agents"],
    priceUsd: 0.1,
    calls: { today: 189, week: 1212, overall: 28511 },
    revenueUsd: { today: 18.9, week: 121.2, overall: 2851.1 },
    uniqueAgents: { today: 27, week: 88, overall: 212 },
    latencyMs: 510,
    errorRatePct: 0.9,
    uptimePct: 99.6,
    rating: 4.8,
    ratingCount: 173,
  },
  {
    id: "company-search",
    endpoint: "/search/companies",
    owner: "@registry-indexer",
    directory: "Data",
    description: "Company intelligence search across global registries, funding events, and linked entities.",
    tags: ["search", "companies", "intel"],
    priceUsd: 0.05,
    calls: { today: 156, week: 980, overall: 24780 },
    revenueUsd: { today: 7.8, week: 49, overall: 1239 },
    uniqueAgents: { today: 23, week: 71, overall: 188 },
    latencyMs: 176,
    errorRatePct: 0.5,
    uptimePct: 99.9,
    rating: 4.7,
    ratingCount: 94,
  },
  {
    id: "social-trends",
    endpoint: "/social/trends",
    owner: "@pulse-ops",
    directory: "Social",
    description: "Real-time social trend detector with anomaly scoring and keyword acceleration.",
    tags: ["social", "trends", "keywords"],
    priceUsd: 0.03,
    calls: { today: 141, week: 901, overall: 18322 },
    revenueUsd: { today: 4.23, week: 27.03, overall: 549.66 },
    uniqueAgents: { today: 19, week: 64, overall: 171 },
    latencyMs: 134,
    errorRatePct: 0.8,
    uptimePct: 99.5,
    rating: 4.5,
    ratingCount: 71,
  },
  {
    id: "build-health",
    endpoint: "/dev/build-health",
    owner: "@ops-guild",
    directory: "Dev Tools",
    description: "Build and CI health endpoint for multi-repo monitoring with flaky-test detection.",
    tags: ["ci", "devops", "monitoring"],
    priceUsd: 0.02,
    calls: { today: 123, week: 843, overall: 16401 },
    revenueUsd: { today: 2.46, week: 16.86, overall: 328.02 },
    uniqueAgents: { today: 17, week: 57, overall: 142 },
    latencyMs: 92,
    errorRatePct: 0.3,
    uptimePct: 99.95,
    rating: 4.9,
    ratingCount: 148,
  },
  {
    id: "paper-briefs",
    endpoint: "/research/paper-briefs",
    owner: "@lab-notes",
    directory: "Research",
    description: "Converts fresh papers into structured briefs with risks, methods, and benchmark deltas.",
    tags: ["papers", "briefing", "science"],
    priceUsd: 0.08,
    calls: { today: 112, week: 790, overall: 15403 },
    revenueUsd: { today: 8.96, week: 63.2, overall: 1232.24 },
    uniqueAgents: { today: 12, week: 43, overall: 118 },
    latencyMs: 468,
    errorRatePct: 1.1,
    uptimePct: 99.3,
    rating: 4.6,
    ratingCount: 66,
  },
];

const ALL_DIRECTORIES_LABEL = "All directories";

function metricForWindow(metric: MetricByWindow, window: TrendWindow): number {
  return metric[window];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 3 : 2,
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function rankLabel(index: number): string {
  if (index === 0) return "Hot";
  if (index === 1) return "Rising";
  if (index === 2) return "Watch";
  return "";
}

function trendWindowLabel(window: TrendWindow): string {
  if (window === "today") return "today";
  if (window === "week") return "this week";
  return "overall";
}

function SidebarNavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ease-out",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </a>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="glass border-border/70">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="h-3 w-3" />
            {hint}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ApiTrendingBoard({ view }: { view: DashboardView }) {
  const [window, setWindow] = useState<TrendWindow>("today");
  const [query, setQuery] = useState("");
  const [activeDirectory, setActiveDirectory] = useState(ALL_DIRECTORIES_LABEL);
  const [selectedApiId, setSelectedApiId] = useState(TRENDING_APIS[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const directories = useMemo(() => {
    return [ALL_DIRECTORIES_LABEL, ...new Set(TRENDING_APIS.map((api) => api.directory))];
  }, []);

  const filteredApis = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return TRENDING_APIS.filter((api) => {
      if (activeDirectory !== ALL_DIRECTORIES_LABEL && api.directory !== activeDirectory) {
        return false;
      }

      if (!needle) return true;

      return (
        api.endpoint.toLowerCase().includes(needle) ||
        api.owner.toLowerCase().includes(needle) ||
        api.directory.toLowerCase().includes(needle) ||
        api.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
        api.description.toLowerCase().includes(needle)
      );
    }).sort((a, b) => {
      const callsDelta = metricForWindow(b.calls, window) - metricForWindow(a.calls, window);
      if (callsDelta !== 0) return callsDelta;
      return metricForWindow(b.revenueUsd, window) - metricForWindow(a.revenueUsd, window);
    });
  }, [activeDirectory, query, window]);

  const effectiveSelectedApiId = useMemo(() => {
    if (filteredApis.length === 0) return "";
    return filteredApis.some((api) => api.id === selectedApiId)
      ? selectedApiId
      : filteredApis[0].id;
  }, [filteredApis, selectedApiId]);

  const selectedApi = useMemo(() => {
    return filteredApis.find((api) => api.id === effectiveSelectedApiId) ?? null;
  }, [effectiveSelectedApiId, filteredApis]);

  const aggregateStats = useMemo(() => {
    const totalAgents = TRENDING_APIS.reduce(
      (sum, api) => sum + metricForWindow(api.uniqueAgents, window),
      0,
    );
    const totalApis = TRENDING_APIS.length;
    const totalDirectories = new Set(TRENDING_APIS.map((api) => api.directory)).size;
    const totalRevenue = TRENDING_APIS.reduce(
      (sum, api) => sum + metricForWindow(api.revenueUsd, window),
      0,
    );

    return {
      totalAgents,
      totalApis,
      totalDirectories,
      totalRevenue,
    };
  }, [window]);

  const directoryPulse = useMemo(() => {
    const byDirectory = new Map<string, { calls: number; revenue: number; apis: number }>();

    for (const api of filteredApis) {
      const current = byDirectory.get(api.directory) ?? { calls: 0, revenue: 0, apis: 0 };
      current.calls += metricForWindow(api.calls, window);
      current.revenue += metricForWindow(api.revenueUsd, window);
      current.apis += 1;
      byDirectory.set(api.directory, current);
    }

    return Array.from(byDirectory.entries())
      .map(([directory, stats]) => ({ directory, ...stats }))
      .sort((a, b) => b.calls - a.calls);
  }, [filteredApis, window]);

  const onCopyEndpoint = async () => {
    if (!selectedApi) return;

    try {
      await navigator.clipboard.writeText(selectedApi.endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-sidebar-border bg-sidebar p-4 lg:block">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <span className="font-bold text-primary">4</span>
          </div>
          <span className="font-semibold">402claw</span>
        </div>

        <nav className="space-y-1">
          <SidebarNavItem
            href="/dashboard"
            label="Dashboard"
            icon={<Activity className="h-4 w-4" />}
            active={view === "dashboard"}
          />
          <SidebarNavItem
            href="/explore"
            label="Explore"
            icon={<TrendingUp className="h-4 w-4" />}
            active={view === "explore"}
          />
          <SidebarNavItem href="#" label="APIs" icon={<Database className="h-4 w-4" />} />
          <SidebarNavItem href="#" label="Earnings" icon={<DollarSign className="h-4 w-4" />} />
        </nav>
      </aside>

      <main className="p-4 sm:p-6 lg:ml-64 lg:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {view === "explore" ? "Explore APIs" : "Marketplace Dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Trending {trendWindowLabel(window)} across agents, directories, and revenue.
            </p>
          </div>

          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Deploy API
          </Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={<Bot className="h-4 w-4" />}
            label="Agents active"
            value={formatCompact(aggregateStats.totalAgents)}
            hint={`for ${trendWindowLabel(window)}`}
          />
          <StatTile
            icon={<Database className="h-4 w-4" />}
            label="Published APIs"
            value={formatCompact(aggregateStats.totalApis)}
          />
          <StatTile
            icon={<FolderTree className="h-4 w-4" />}
            label="Directories"
            value={formatCompact(aggregateStats.totalDirectories)}
          />
          <StatTile
            icon={<DollarSign className="h-4 w-4" />}
            label="Revenue"
            value={formatCurrency(aggregateStats.totalRevenue)}
            hint={`${trendWindowLabel(window)}`}
          />
        </div>

        <Card className="glass mb-6 border-border/70">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search endpoints, owners, tags, or directories"
                />
              </div>

              <Tabs value={window} onValueChange={(value) => setWindow(value as TrendWindow)}>
                <TabsList>
                  <TabsTrigger value="today">Trending today</TabsTrigger>
                  <TabsTrigger value="week">This week</TabsTrigger>
                  <TabsTrigger value="overall">All time</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-wrap gap-2">
              {directories.map((directory) => (
                <Button
                  key={directory}
                  variant={directory === activeDirectory ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveDirectory(directory)}
                  className={cn(
                    "h-8",
                    directory === activeDirectory && "bg-primary/15 text-primary hover:bg-primary/20",
                  )}
                >
                  {directory}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
          <Card className="glass border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="h-4 w-4 text-orange-400" />
                Top APIs {trendWindowLabel(window)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredApis.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No APIs match your filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>API</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Agents</TableHead>
                      <TableHead className="text-right">Directory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApis.map((api, index) => {
                      const rank = index + 1;
                      const rowSelected = effectiveSelectedApiId === api.id;
                      const calls = metricForWindow(api.calls, window);
                      const revenue = metricForWindow(api.revenueUsd, window);
                      const agents = metricForWindow(api.uniqueAgents, window);
                      const badgeText = rankLabel(index);

                      return (
                        <TableRow
                          key={api.id}
                          onClick={() => setSelectedApiId(api.id)}
                          className={cn(
                            "cursor-pointer hover:bg-muted/30",
                            rowSelected && "bg-primary/10 hover:bg-primary/10",
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{rank}</span>
                              {badgeText ? (
                                <Badge variant="secondary" className="bg-primary/15 text-primary">
                                  {badgeText}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{api.endpoint}</div>
                              <div className="text-xs text-muted-foreground">{api.owner}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {window === "overall" ? formatCompact(calls) : `+${formatCompact(calls)}`}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-400">
                            {formatCurrency(revenue)}
                          </TableCell>
                          <TableCell className="text-right">{formatCompact(agents)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{api.directory}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">API Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              {selectedApi ? (
                <>
                  <div>
                    <div className="mb-1 text-base font-semibold">{selectedApi.endpoint}</div>
                    <div className="text-sm text-muted-foreground">by {selectedApi.owner}</div>
                  </div>

                  <p className="text-sm text-muted-foreground">{selectedApi.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {selectedApi.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <MetricRow label="Price / call" value={formatCurrency(selectedApi.priceUsd)} />
                    <MetricRow
                      label="Total earned"
                      value={formatCurrency(metricForWindow(selectedApi.revenueUsd, "overall"))}
                    />
                    <MetricRow
                      label="Calls today"
                      value={formatCompact(metricForWindow(selectedApi.calls, "today"))}
                    />
                    <MetricRow
                      label="Calls this week"
                      value={formatCompact(metricForWindow(selectedApi.calls, "week"))}
                    />
                    <MetricRow
                      label="Unique agents"
                      value={formatCompact(metricForWindow(selectedApi.uniqueAgents, window))}
                    />
                    <MetricRow label="Uptime" value={formatPercent(selectedApi.uptimePct)} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        Latency
                      </div>
                      <div className="font-medium">{selectedApi.latencyMs}ms</div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        Error rate
                      </div>
                      <div className="font-medium">{formatPercent(selectedApi.errorRatePct)}</div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3 w-3" />
                        Rating
                      </div>
                      <div className="font-medium">
                        {selectedApi.rating.toFixed(1)} ({selectedApi.ratingCount})
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={onCopyEndpoint} variant="secondary" className="gap-2">
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied" : "Copy endpoint"}
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Open docs
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Select an API from the ranking to inspect details.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass mt-6 border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Directory Pulse</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {directoryPulse.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">No directory data for current filters.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {directoryPulse.map((entry) => (
                  <div
                    key={entry.directory}
                    className="rounded-lg border border-border/70 bg-muted/30 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">{entry.directory}</div>
                      <Badge variant="secondary">{entry.apis} APIs</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Calls</span>
                      <span className="font-mono">{formatCompact(entry.calls)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium text-green-400">{formatCurrency(entry.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
