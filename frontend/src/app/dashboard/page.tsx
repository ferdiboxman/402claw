"use client";

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
  ArrowUpRight, 
  Plus, 
  TrendingUp,
  Zap,
  Database,
  DollarSign,
  Activity,
  ExternalLink,
  MoreHorizontal,
  Copy
} from "lucide-react";

// Mock data
const apis = [
  {
    id: "api_1",
    name: "Product Catalog",
    slug: "products",
    requests: 12847,
    revenue: 12.85,
    price: 0.001,
    status: "active",
  },
  {
    id: "api_2", 
    name: "Weather Data",
    slug: "weather",
    requests: 8234,
    revenue: 82.34,
    price: 0.01,
    status: "active",
  },
  {
    id: "api_3",
    name: "Stock Prices",
    slug: "stocks",
    requests: 3421,
    revenue: 17.11,
    price: 0.005,
    status: "active",
  },
];

const recentActivity = [
  { time: "2m ago", event: "API call", api: "products", amount: 0.001 },
  { time: "5m ago", event: "API call", api: "weather", amount: 0.01 },
  { time: "8m ago", event: "API call", api: "products", amount: 0.001 },
  { time: "12m ago", event: "API call", api: "stocks", amount: 0.005 },
  { time: "15m ago", event: "API call", api: "weather", amount: 0.01 },
];

export default function Dashboard() {
  const totalRevenue = apis.reduce((sum, api) => sum + api.revenue, 0);
  const totalRequests = apis.reduce((sum, api) => sum + api.requests, 0);

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold">4</span>
          </div>
          <span className="font-semibold">402claw</span>
        </div>
        
        <nav className="space-y-1">
          <NavItem icon={<Activity className="w-4 h-4" />} label="Dashboard" active />
          <NavItem icon={<Database className="w-4 h-4" />} label="APIs" />
          <NavItem icon={<DollarSign className="w-4 h-4" />} label="Earnings" />
          <NavItem icon={<Zap className="w-4 h-4" />} label="Usage" />
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Balance</div>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <Button size="sm" className="w-full mt-3" variant="secondary">
                Withdraw
              </Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your APIs and earnings</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Deploy API
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Revenue"
            value={`$${totalRevenue.toFixed(2)}`}
            change="+12.5%"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <StatCard 
            title="Total Requests"
            value={totalRequests.toLocaleString()}
            change="+8.2%"
            icon={<Zap className="w-4 h-4" />}
          />
          <StatCard 
            title="Active APIs"
            value={apis.length.toString()}
            icon={<Database className="w-4 h-4" />}
          />
          <StatCard 
            title="Avg. Price"
            value={`$${(apis.reduce((sum, a) => sum + a.price, 0) / apis.length).toFixed(3)}`}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="apis" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="apis">Your APIs</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="apis">
            <Card className="glass">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apis.map((api) => (
                    <TableRow key={api.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{api.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            /v1/{api.slug}
                          </code>
                          <button className="text-muted-foreground hover:text-foreground transition-all duration-150 ease-out">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${api.price.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        {api.requests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-400">
                        ${api.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                          {api.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
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
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{activity.event}</div>
                          <div className="text-xs text-muted-foreground">
                            /v1/{activity.api}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-400">
                          +${activity.amount.toFixed(3)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
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
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ease-out ${
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
  icon 
}: { 
  title: string; 
  value: string;
  change?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="glass">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {change && (
            <span className="text-xs text-green-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              {change}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
