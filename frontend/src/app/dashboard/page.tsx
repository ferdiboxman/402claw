"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Plus, 
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  DollarSign,
  Activity,
  Copy,
  MoreHorizontal,
  ExternalLink,
  Settings,
  BarChart3,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Check
} from "lucide-react";

// Mock data
const apis = [
  {
    id: "api_1",
    name: "Product Catalog",
    slug: "products",
    requests: 12847,
    requestsChange: 12,
    revenue: 12.85,
    revenueChange: 8,
    price: 0.001,
    status: "active",
    type: "dataset",
    createdAt: "2024-01-15",
    lastCall: "2m ago",
    callers: 234,
    avgLatency: 45,
    sparkline: [40, 55, 45, 60, 75, 65, 80, 90, 85, 95, 88, 100],
  },
  {
    id: "api_2", 
    name: "Weather Data",
    slug: "weather",
    requests: 8234,
    requestsChange: -3,
    revenue: 82.34,
    revenueChange: 15,
    price: 0.01,
    status: "active",
    type: "proxy",
    createdAt: "2024-01-20",
    lastCall: "5m ago",
    callers: 156,
    avgLatency: 120,
    sparkline: [60, 55, 70, 65, 80, 75, 85, 70, 75, 80, 85, 78],
  },
  {
    id: "api_3",
    name: "Stock Prices",
    slug: "stocks",
    requests: 3421,
    requestsChange: 25,
    revenue: 17.11,
    revenueChange: 22,
    price: 0.005,
    status: "active",
    type: "function",
    createdAt: "2024-02-01",
    lastCall: "8m ago",
    callers: 89,
    avgLatency: 85,
    sparkline: [20, 35, 30, 45, 55, 50, 65, 70, 75, 85, 90, 95],
  },
];

const recentActivity = [
  { time: "2m ago", event: "API call", api: "products", amount: 0.001, caller: "0x1a2b...3c4d" },
  { time: "5m ago", event: "API call", api: "weather", amount: 0.01, caller: "0x5e6f...7g8h" },
  { time: "8m ago", event: "API call", api: "products", amount: 0.001, caller: "0x9i0j...1k2l" },
  { time: "12m ago", event: "API call", api: "stocks", amount: 0.005, caller: "0x3m4n...5o6p" },
  { time: "15m ago", event: "API call", api: "weather", amount: 0.01, caller: "0x7q8r...9s0t" },
  { time: "18m ago", event: "Withdrawal", api: "-", amount: -50.00, caller: "You" },
  { time: "1h ago", event: "API call", api: "stocks", amount: 0.005, caller: "0x1u2v...3w4x" },
];

export default function Dashboard() {
  const [selectedApi, setSelectedApi] = useState<typeof apis[0] | null>(null);
  const [copied, setCopied] = useState(false);
  
  const totalRevenue = apis.reduce((sum, api) => sum + api.revenue, 0);
  const totalRequests = apis.reduce((sum, api) => sum + api.requests, 0);
  const avgRevenueChange = Math.round(apis.reduce((sum, api) => sum + api.revenueChange, 0) / apis.length);

  const copyEndpoint = (slug: string) => {
    navigator.clipboard.writeText(`https://api.clawr.ai/v1/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar border-r border-sidebar-border p-4">
        <div className="flex items-center gap-2 mb-8">
          <span className="font-semibold tracking-tight">clawr</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">beta</Badge>
        </div>
        
        <nav className="space-y-1">
          <NavItem icon={<Activity className="w-4 h-4" />} label="Overview" active />
          <NavItem icon={<Database className="w-4 h-4" />} label="APIs" />
          <NavItem icon={<DollarSign className="w-4 h-4" />} label="Earnings" />
          <NavItem icon={<BarChart3 className="w-4 h-4" />} label="Analytics" />
          <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" />
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="bg-gradient-to-br from-card to-accent/20 border-border/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Available Balance</div>
              <div className="text-2xl font-semibold tabular-nums mb-1">${totalRevenue.toFixed(2)}</div>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mb-3">
                <TrendingUp className="w-3 h-3" />
                <span>+{avgRevenueChange}% this week</span>
              </div>
              <Button size="sm" className="w-full" variant="default">
                Withdraw
              </Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor your APIs and earnings in real-time</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Deploy API
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            change={avgRevenueChange}
            icon={<DollarSign className="w-4 h-4" />}
            sparkline={[40, 55, 45, 60, 75, 65, 80, 90, 85, 95, 88, 100]}
          />
          <StatCard 
            title="Total Requests"
            value={totalRequests.toLocaleString()}
            change={12}
            icon={<Zap className="w-4 h-4" />}
            sparkline={[60, 55, 70, 65, 80, 75, 85, 70, 75, 80, 85, 90]}
          />
          <StatCard 
            title="Active APIs"
            value={apis.length.toString()}
            subtitle="All healthy"
            icon={<Database className="w-4 h-4" />}
          />
          <StatCard 
            title="Unique Callers"
            value={(apis.reduce((sum, a) => sum + a.callers, 0)).toLocaleString()}
            change={8}
            icon={<Users className="w-4 h-4" />}
            sparkline={[30, 40, 35, 50, 45, 55, 60, 65, 70, 68, 75, 80]}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="apis" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="apis">Your APIs</TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="apis">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[250px]">API</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apis.map((api) => (
                    <TableRow 
                      key={api.id} 
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedApi(api)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{api.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">/v1/{api.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal capitalize">
                          {api.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        ${api.price.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="tabular-nums">{api.requests.toLocaleString()}</span>
                          <span className={`text-xs flex items-center gap-0.5 ${api.requestsChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {api.requestsChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(api.requestsChange)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium tabular-nums">${api.revenue.toFixed(2)}</span>
                          <span className={`text-xs flex items-center gap-0.5 ${api.revenueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {api.revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(api.revenueChange)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <MiniSparkline data={api.sparkline} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <div className="divide-y divide-border">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.amount < 0 ? 'bg-orange-500/10' : 'bg-emerald-500/10'
                      }`}>
                        {activity.amount < 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Zap className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{activity.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {activity.api !== "-" && <span className="font-mono">/v1/{activity.api}</span>}
                          {activity.api !== "-" && <span className="mx-2">•</span>}
                          <span>{activity.caller}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium tabular-nums ${
                        activity.amount < 0 ? 'text-orange-500' : 'text-emerald-500'
                      }`}>
                        {activity.amount < 0 ? '' : '+'}${Math.abs(activity.amount).toFixed(3)}
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* API Detail Sheet */}
      <Sheet open={!!selectedApi} onOpenChange={() => setSelectedApi(null)}>
        <SheetContent className="w-[450px] sm:max-w-[450px] overflow-y-auto">
          {selectedApi && (
            <>
              <SheetHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl">{selectedApi.name}</SheetTitle>
                    <SheetDescription className="font-mono text-sm mt-1">
                      /v1/{selectedApi.slug}
                    </SheetDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">{selectedApi.type}</Badge>
                </div>
              </SheetHeader>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-accent/30 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                  <div className="text-2xl font-semibold tabular-nums">${selectedApi.revenue.toFixed(2)}</div>
                  <div className={`text-xs flex items-center gap-0.5 mt-1 ${selectedApi.revenueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedApi.revenueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(selectedApi.revenueChange)}% vs last week
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-accent/30 border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Requests</div>
                  <div className="text-2xl font-semibold tabular-nums">{selectedApi.requests.toLocaleString()}</div>
                  <div className={`text-xs flex items-center gap-0.5 mt-1 ${selectedApi.requestsChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedApi.requestsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(selectedApi.requestsChange)}% vs last week
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-medium">Details</h3>
                <div className="space-y-3">
                  <DetailRow label="Price per request" value={`$${selectedApi.price.toFixed(4)}`} />
                  <DetailRow label="Unique callers" value={selectedApi.callers.toString()} />
                  <DetailRow label="Avg latency" value={`${selectedApi.avgLatency}ms`} />
                  <DetailRow label="Last called" value={selectedApi.lastCall} />
                  <DetailRow label="Created" value={selectedApi.createdAt} />
                </div>
              </div>

              {/* Endpoint */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-medium">Endpoint</h3>
                <div 
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => copyEndpoint(selectedApi.slug)}
                >
                  <code className="text-sm font-mono">https://api.clawr.ai/v1/{selectedApi.slug}</code>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button className="flex-1 gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Analytics
                </Button>
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  active = false 
}: { 
  icon: React.ReactNode; 
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active 
          ? "bg-accent text-foreground font-medium" 
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ 
  title, 
  value, 
  change,
  subtitle,
  icon,
  sparkline
}: { 
  title: string; 
  value: string;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="text-sm text-muted-foreground">{title}</div>
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            {change !== undefined && (
              <div className={`text-xs flex items-center gap-0.5 mt-1 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change)}% vs last week
              </div>
            )}
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
            )}
          </div>
          {sparkline && (
            <MiniSparkline data={sparkline} height={32} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniSparkline({ data, height = 24 }: { data: number[]; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg width="60" height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
