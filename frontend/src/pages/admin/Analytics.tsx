import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useGetBugAnalytics,
  useGetCompanyAnalytics,
  useGetTeamAnalytics,
  getGetTeamAnalyticsQueryKey,
  getGetBugAnalyticsQueryKey,
  getGetCompanyAnalyticsQueryKey,
  type DeveloperStats,
  type CompanyAnalyticsCard,
} from "@/api";
import { analyticsQueryOptions } from "@/lib/list-query-options";
import { LogActivityHeatmap } from "@/components/analytics/log-activity-heatmap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageChartGridSkeleton, PageTableSkeleton } from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  PortalPageShell,
  PortalKpiGrid,
  PortalContentCard,
} from "@/components/layout/portal-page-kit";
import {
  DashboardPageHeader,
  DashboardFilterBar,
  DashboardSectionLabel,
  DashboardInsightBanner,
} from "@/components/dashboard/dashboard-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  Building2,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Scale,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const MONTHLY_CAPACITY_HOURS = 176; // 22 days × 8h

const chartTooltip = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  fontSize: 11,
  borderRadius: 8,
};

function formatMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function clientRiskScore(c: CompanyAnalyticsCard): number {
  const delayedPct =
    c.totalProjects > 0 ? ((c.delayedProjects ?? 0) / c.totalProjects) * 100 : 0;
  const ticketLoad =
    c.activeProjects > 0 ? (c.openTickets ?? 0) / c.activeProjects : (c.openTickets ?? 0) * 2;
  const requestNoise = (c.pendingRequests ?? 0) * 8;
  return Math.round(delayedPct * 0.5 + ticketLoad * 12 + requestNoise);
}

function riskLabel(score: number): { label: string; className: string } {
  if (score >= 60) return { label: "High", className: "bg-red-500/15 text-red-700 border-red-500/30" };
  if (score >= 30) return { label: "Medium", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" };
  return { label: "Low", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" };
}

function InsightStrip({ items }: { items: { text: string; tone?: "warn" | "ok" | "neutral" }[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs max-w-full",
            item.tone === "warn" && "border-amber-500/30 bg-amber-500/8 text-amber-900 dark:text-amber-200",
            item.tone === "ok" && "border-emerald-500/30 bg-emerald-500/8 text-emerald-900 dark:text-emerald-200",
            (!item.tone || item.tone === "neutral") && "border-border bg-muted/30 text-muted-foreground",
          )}
        >
          <Lightbulb className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function PeriodPicker({
  month,
  year,
  onMonth,
  onYear,
}: {
  month: number;
  year: number;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
}) {
  const yearOptions = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => onMonth(Number(v))}>
        <SelectTrigger className="h-9 w-[140px] text-sm bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {new Date(2000, i).toLocaleString("default", { month: "long" })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onYear(Number(v))}>
        <SelectTrigger className="h-9 w-[92px] text-sm bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AdminAnalytics() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState("workforce");

  const { data: teamData, isLoading: teamLoading } = useGetTeamAnalytics(
    { month, year },
    {
      query: analyticsQueryOptions({
        queryKey: getGetTeamAnalyticsQueryKey({ month, year }),
      }),
    },
  );
  const { data: bugData, isLoading: bugsLoading } = useGetBugAnalytics(undefined, {
    query: {
      ...analyticsQueryOptions({ queryKey: getGetBugAnalyticsQueryKey() }),
      enabled: tab === "defects",
    },
  });
  const { data: companyData, isLoading: companiesLoading } = useGetCompanyAnalytics({
    query: {
      ...analyticsQueryOptions({ queryKey: getGetCompanyAnalyticsQueryKey() }),
      enabled: tab === "clients",
    },
  });

  const developers = teamData?.developers ?? [];
  const heatmap = teamData?.heatmapData ?? [];

  const workforceInsights = useMemo(() => {
    const under = developers.filter((d) => d.utilisationPct < 50 && d.totalHoursThisMonth > 0);
    const idle = developers.filter((d) => d.totalHoursThisMonth === 0);
    const heavy = developers.filter((d) => d.activeProjects >= 4);
    const totalHours = developers.reduce((s, d) => s + d.totalHoursThisMonth, 0);
    const capacity = developers.length * MONTHLY_CAPACITY_HOURS;
    const capacityUsed = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;
    return { under, idle, heavy, totalHours, capacityUsed };
  }, [developers]);

  const utilizationCompare = useMemo(
    () =>
      developers.map((d) => ({
        name: (d.name.split(" ")[0] ?? d.name).slice(0, 10),
        logged: d.totalHoursThisMonth,
        target: MONTHLY_CAPACITY_HOURS,
        gap: Math.round((MONTHLY_CAPACITY_HOURS - d.totalHoursThisMonth) * 10) / 10,
      })),
    [developers],
  );

  const scatterData = useMemo(
    () =>
      developers
        .filter((d) => d.totalHoursThisMonth > 0 || d.bugsResolvedCount > 0)
        .map((d) => ({
          name: d.name,
          hours: d.totalHoursThisMonth,
          bugs: d.bugsResolvedCount,
          z: d.activeProjects,
        })),
    [developers],
  );

  const bugInsights = useMemo(() => {
    if (!bugData) return null;
    const total = bugData.totalOpen + bugData.totalFixed;
    const fixRate = total > 0 ? Math.round((bugData.totalFixed / total) * 100) : 0;
    const topPlatform = [...(bugData.platformDistribution ?? [])].sort((a, b) => b.count - a.count)[0];
    return { fixRate, topPlatform };
  }, [bugData]);

  const rankedClients = useMemo(() => {
    return [...(companyData?.companies ?? [])]
      .map((c) => ({ ...c, risk: clientRiskScore(c) }))
      .sort((a, b) => b.risk - a.risk);
  }, [companyData?.companies]);

  const clientInsights = useMemo(() => {
    const high = rankedClients.filter((c) => c.risk >= 60);
    const delayed = rankedClients.filter((c) => (c.delayedProjects ?? 0) > 0);
    return { high, delayed };
  }, [rankedClients]);

  const isLoading = teamLoading && !teamData;

  return (
    <PortalPageShell>
      <DashboardPageHeader
        title="Insights & analytics"
        description="Workforce capacity, defect patterns, and client risk — compared over your selected period."
        breadcrumbs={[{ label: "Manage", href: "/admin" }, { label: "Analytics" }]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/admin">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        }
      />

      <DashboardFilterBar onExport={() => undefined}>
        <PeriodPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />
      </DashboardFilterBar>

      <DashboardInsightBanner
        icon={BarChart3}
        title="Analytics vs dashboard"
        action={
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <Link href="/admin/employees">
              Team drill-down
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        <p>
          Dashboard shows what needs attention today. This page compares performance over{" "}
          <span className="font-medium text-foreground">{formatMonthLabel(month, year)}</span> and
          highlights imbalances.
        </p>
      </DashboardInsightBanner>

      {!isLoading && teamData && (
        <div className="space-y-2">
          <DashboardSectionLabel title={`Summary · ${formatMonthLabel(month, year)}`} />
          <PortalKpiGrid
            columns={4}
            count={4}
            items={[
              { title: "Team members", value: developers.length, hint: "In scope", icon: Users, accent: "blue", delay: 0 },
              { title: "Capacity used", value: `${workforceInsights.capacityUsed}%`, hint: `${workforceInsights.totalHours}h logged`, icon: Gauge, accent: workforceInsights.capacityUsed >= 70 ? "green" : "amber", delay: 1 },
              { title: "Idle this month", value: workforceInsights.idle.length, hint: "Zero hours logged", icon: AlertTriangle, accent: "amber", alert: workforceInsights.idle.length > 0, delay: 2 },
              { title: "Heavy load", value: workforceInsights.heavy.length, hint: "4+ projects", icon: Scale, accent: "red", alert: workforceInsights.heavy.length > 0, delay: 3 },
            ]}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <DashboardSectionLabel
          title="Analysis views"
          trailing={
            <TabsList className="h-8 bg-muted/50 p-0.5">
              <TabsTrigger value="workforce" className="text-[10px] gap-1 px-2.5 h-7">
                <Users className="h-3 w-3" />
                Workforce
              </TabsTrigger>
              <TabsTrigger value="defects" className="text-[10px] gap-1 px-2.5 h-7">
                <Bug className="h-3 w-3" />
                Defects
              </TabsTrigger>
              <TabsTrigger value="clients" className="text-[10px] gap-1 px-2.5 h-7">
                <Building2 className="h-3 w-3" />
                Client risk
              </TabsTrigger>
            </TabsList>
          }
        />

        {/* —— Workforce —— */}
        <TabsContent value="workforce" className="space-y-4 m-0">
          {isLoading ? (
            <div className="space-y-4">
              <PageChartGridSkeleton count={2} />
              <PageTableSkeleton rows={6} columns={5} />
            </div>
          ) : (
            <>
              <InsightStrip
                items={[
                  {
                    text: `Org capacity used: ${workforceInsights.capacityUsed}% of ${developers.length * MONTHLY_CAPACITY_HOURS}h available`,
                    tone: workforceInsights.capacityUsed < 60 ? "warn" : "ok",
                  },
                  workforceInsights.idle.length > 0
                    ? {
                        text: `${workforceInsights.idle.length} member(s) with zero hours logged this month`,
                        tone: "warn",
                      }
                    : {
                        text: "All active staff have logged time this month",
                        tone: "ok",
                      },
                  workforceInsights.heavy.length > 0
                    ? {
                        text: `${workforceInsights.heavy.length} on 4+ projects — check workload balance`,
                        tone: "warn",
                      }
                    : {
                        text: "No one is assigned to 4+ projects",
                        tone: "neutral",
                      },
                ]}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-violet-500" />
                      Logged vs capacity
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Each bar: hours logged · dashed line = {MONTHLY_CAPACITY_HOURS}h monthly target
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {utilizationCompare.length === 0 ? (
                      <EmptyChart message="No workforce data for this period" />
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={utilizationCompare} margin={{ left: -8, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={chartTooltip} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="logged" name="Hours logged" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            <Line
                              type="monotone"
                              dataKey="target"
                              name="Target (176h)"
                              stroke="#94a3b8"
                              strokeDasharray="4 4"
                              dot={false}
                              strokeWidth={2}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Output efficiency
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Hours logged vs bugs closed (bubble size = active projects)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scatterData.length === 0 ? (
                      <EmptyChart message="Need hours or bug closures to plot" />
                    ) : (
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ left: -8, right: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" dataKey="hours" name="Hours" tick={{ fontSize: 10 }} />
                            <YAxis type="number" dataKey="bugs" name="Bugs closed" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <ZAxis type="number" dataKey="z" range={[60, 400]} />
                            <Tooltip
                              contentStyle={chartTooltip}
                              formatter={(value, name) => [value, name]}
                              labelFormatter={(_, payload) =>
                                payload?.[0]?.payload?.name ?? ""
                              }
                            />
                            <Scatter name="Team" data={scatterData} fill="#6366f1" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Daily log density</CardTitle>
                  <CardDescription className="text-xs">
                    When the team submits work logs — darker days = more entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogActivityHeatmap heatmapData={heatmap} month={month} year={year} />
                </CardContent>
              </Card>

              <WorkforceTable developers={developers} />
            </>
          )}
        </TabsContent>

        {/* —— Defects —— */}
        <TabsContent value="defects" className="space-y-4 m-0">
          {bugsLoading && !bugData ? (
            <div className="space-y-4">
              <PageChartGridSkeleton count={2} />
              <PageTableSkeleton rows={5} columns={4} />
            </div>
          ) : (
            <>
              <InsightStrip
                items={[
                  bugInsights
                    ? {
                        text: `Resolution rate: ${bugInsights.fixRate}% of tracked bugs are closed (${bugData?.totalFixed} fixed, ${bugData?.totalOpen} still open)`,
                        tone: bugInsights.fixRate >= 50 ? "ok" : "warn",
                      }
                    : { text: "Loading defect metrics…", tone: "neutral" },
                  bugInsights?.topPlatform
                    ? {
                        text: `Most issues on ${bugInsights.topPlatform.name} platform (${bugInsights.topPlatform.count} bugs)`,
                        tone: "neutral",
                      }
                    : { text: "No platform breakdown yet", tone: "neutral" },
                ]}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Open vs fixed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                        <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                          {bugData?.totalOpen ?? 0}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Open</p>
                      </div>
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                        <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {bugData?.totalFixed ?? 0}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Fixed</p>
                      </div>
                    </div>
                    {bugInsights && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Closure rate</span>
                          <span className="font-semibold">{bugInsights.fixRate}%</span>
                        </div>
                        <Progress value={bugInsights.fixRate} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Status workflow</CardTitle>
                    <CardDescription className="text-xs">Where bugs sit in the pipeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DistributionList items={bugData?.statusDistribution ?? []} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(bugData?.platformDistribution?.length ?? 0) === 0 ? (
                      <EmptyChart message="No platform data" />
                    ) : (
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={bugData?.platformDistribution ?? []}
                            margin={{ left: 8, right: 12 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={72}
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) => String(v).replace(/_/g, " ")}
                            />
                            <Tooltip contentStyle={chartTooltip} />
                            <Bar dataKey="count" name="Bugs" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DistributionList
                      items={bugData?.severityDistribution ?? []}
                      colors={["#ef4444", "#f97316", "#f59e0b", "#22c55e"]}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Defects closed per person</CardTitle>
                  <CardDescription className="text-xs">
                    {formatMonthLabel(month, year)} — assignee closures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {developers.length === 0 ? (
                    <EmptyChart message="No team bug data for this month" />
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={developers.map((d) => ({
                            name: d.name.split(" ")[0],
                            closed: d.bugsResolvedCount,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={chartTooltip} />
                          <Bar dataKey="closed" name="Closed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* —— Client risk —— */}
        <TabsContent value="clients" className="space-y-4 m-0">
          {companiesLoading && !companyData ? (
            <div className="space-y-4">
              <PageChartGridSkeleton count={2} />
              <PageTableSkeleton rows={6} columns={5} />
            </div>
          ) : (
            <>
              <InsightStrip
                items={[
                  clientInsights.high.length > 0
                    ? {
                        text: `${clientInsights.high.length} client(s) flagged high risk — review delayed work and tickets`,
                        tone: "warn",
                      }
                    : {
                        text: "No clients in the high-risk band right now",
                        tone: "ok",
                      },
                  clientInsights.delayed.length > 0
                    ? {
                        text: `${clientInsights.delayed.length} with overdue projects`,
                        tone: "warn",
                      }
                    : { text: "No delayed projects across portfolio", tone: "ok" },
                ]}
              />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4 text-rose-500" />
                    Risk ranking
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Composite score from delayed projects, open tickets per active project, and
                    pending requests — not shown on the dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px]">Rank</TableHead>
                          <TableHead className="text-[10px]">Company</TableHead>
                          <TableHead className="text-[10px] text-center">Risk</TableHead>
                          <TableHead className="text-[10px] text-center">Delayed</TableHead>
                          <TableHead className="text-[10px] text-center">Tickets</TableHead>
                          <TableHead className="text-[10px] text-center">Active proj.</TableHead>
                          <TableHead className="text-[10px] text-center">Requests</TableHead>
                          <TableHead className="text-[10px] text-center">Devs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankedClients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-20 text-center text-xs text-muted-foreground">
                              No client data
                            </TableCell>
                          </TableRow>
                        ) : (
                          rankedClients.map((c, i) => {
                            const risk = riskLabel(c.risk);
                            return (
                              <TableRow key={c.companyId} className="text-xs">
                                <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                                <TableCell>
                                  <Link
                                    href="/admin/clients"
                                    className="font-medium hover:text-primary"
                                  >
                                    {c.companyName}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={cn("text-[10px]", risk.className)}>
                                    {risk.label} · {c.risk}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  {c.delayedProjects ?? 0}
                                  <span className="text-muted-foreground">
                                    /{c.totalProjects}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center tabular-nums">{c.openTickets ?? 0}</TableCell>
                                <TableCell className="text-center tabular-nums">{c.activeProjects}</TableCell>
                                <TableCell className="text-center tabular-nums">{c.pendingRequests ?? 0}</TableCell>
                                <TableCell className="text-center tabular-nums">{c.developerCount ?? 0}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rankedClients.slice(0, 3).map((c) => (
                  <Card
                    key={c.companyId}
                    className={cn(
                      "border-l-4",
                      c.risk >= 60
                        ? "border-l-red-500"
                        : c.risk >= 30
                          ? "border-l-amber-500"
                          : "border-l-emerald-500",
                    )}
                  >
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm truncate">{c.companyName}</CardTitle>
                      <CardDescription className="text-xs">
                        Risk score {c.risk} · {riskLabel(c.risk).label}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2 pb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery</span>
                        <span>
                          {c.completedProjects ?? 0} done / {c.totalProjects} total
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Support load</span>
                        <span>{c.openTickets ?? 0} open tickets</span>
                      </div>
                      {(c.delayedProjects ?? 0) > 0 && (
                        <p className="flex items-center gap-1 text-amber-700 dark:text-amber-400 pt-1">
                          <AlertTriangle className="h-3 w-3" />
                          {c.delayedProjects} delayed project(s)
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function DistributionList({
  items,
  colors,
}: {
  items: { name: string; count: number }[];
  colors?: string[];
}) {
  if (!items.length) {
    return <EmptyChart message="No distribution data" />;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  const palette = colors ?? ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

  return (
    <div className="space-y-3 py-1">
      {items.map((item, i) => (
        <div key={item.name}>
          <div className="flex justify-between text-xs mb-1">
            <span className="capitalize font-medium">{item.name.replace(/_/g, " ")}</span>
            <span className="tabular-nums font-semibold">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(8, (item.count / max) * 100)}%`,
                background: palette[i % palette.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkforceTable({ developers }: { developers: DeveloperStats[] }) {
  return (
    <PortalContentCard>
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Capacity & workload detail</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gap = hours still needed to hit {MONTHLY_CAPACITY_HOURS}h target
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px]">Member</TableHead>
              <TableHead className="text-[10px] text-right">Hours</TableHead>
              <TableHead className="text-[10px] text-right">Gap</TableHead>
              <TableHead className="text-[10px] min-w-[100px]">Utilisation</TableHead>
              <TableHead className="text-[10px] text-center">Projects</TableHead>
              <TableHead className="text-[10px] text-center">Avg done %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground h-16">
                  No data
                </TableCell>
              </TableRow>
            ) : (
              developers.map((d) => {
                const gap = Math.max(0, MONTHLY_CAPACITY_HOURS - d.totalHoursThisMonth);
                return (
                  <TableRow key={d.userId} className="text-xs">
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.totalHoursThisMonth}h</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        gap > 40 ? "text-amber-600 font-medium" : "text-muted-foreground",
                      )}
                    >
                      {gap > 0 ? `−${gap}h` : "✓"}
                    </TableCell>
                    <TableCell>
                      <Progress value={d.utilisationPct} className="h-1.5" />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{d.activeProjects}</TableCell>
                    <TableCell className="text-center tabular-nums">{d.avgCompletionPct}%</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </PortalContentCard>
  );
}
