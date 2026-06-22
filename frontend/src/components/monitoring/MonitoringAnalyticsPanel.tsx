import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Camera,
  Clock,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PortalContentCard, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { LogActivityHeatmap } from "@/components/analytics/log-activity-heatmap";
import { useMonitoringAnalytics, type MonitoringAnalyticsEmployee } from "@/api/monitoring-analytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  fontSize: "11px",
  borderRadius: "8px",
};

function formatMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function EmployeeRow({ row, rank }: { row: MonitoringAnalyticsEmployee; rank: number }) {
  return (
    <TableRow className="text-xs hover:bg-muted/30">
      <TableCell className="py-2.5 w-8 text-muted-foreground font-mono">{rank}</TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={row.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">{row.name?.charAt(0) ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{row.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {row.employeeId ?? row.role}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-right font-semibold tabular-nums">{row.clockHours}h</TableCell>
      <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">{row.loggedHours}h</TableCell>
      <TableCell className="py-2.5 text-right tabular-nums">
        {row.flagged ? (
          <Badge variant="destructive" className="text-[10px] h-5">
            {row.variancePct}%
          </Badge>
        ) : (
          <span className="text-muted-foreground">{row.variancePct}%</span>
        )}
      </TableCell>
      <TableCell className="py-2.5 min-w-[110px]">
        <div className="flex items-center gap-2">
          <Progress value={row.clockUtilisationPct} className="h-1.5 flex-1" />
          <span className="text-[10px] tabular-nums w-8 text-right">{row.clockUtilisationPct}%</span>
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-center tabular-nums">{row.sessionCount}</TableCell>
      <TableCell className="py-2.5 text-center tabular-nums">{row.daysClocked}</TableCell>
      <TableCell className="py-2.5 text-center">
        {row.hasConsent && row.consentCurrent ? (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="py-2.5 text-center tabular-nums">{row.screenshotCount}</TableCell>
    </TableRow>
  );
}

export function MonitoringAnalyticsPanel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isFetching } = useMonitoringAnalytics(month, year);
  const employees = data?.employees ?? [];
  const summary = data?.summary;
  const insights = data?.insights;

  const chartRows = useMemo(
    () =>
      employees.map((e) => ({
        ...e,
        shortName: e.name.split(" ")[0] ?? e.name,
      })),
    [employees],
  );

  const dualChartRows = useMemo(
    () =>
      chartRows.map((e) => ({
        shortName: e.shortName,
        clockHours: e.clockHours,
        loggedHours: e.loggedHours,
      })),
    [chartRows],
  );

  const heatmapData = useMemo(
    () =>
      (data?.clockHeatmap ?? []).map((p) => ({
        date: p.date,
        count: p.sessionCount,
      })),
    [data?.clockHeatmap],
  );

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-md" />
        <PortalKpiGrid loading count={4} items={[]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Work session analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clock time, daily logs, consent, and alignment for {formatMonthLabel(month, year)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">
                  {new Date(2000, i).toLocaleString("default", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[88px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFetching && !isLoading && (
            <Badge variant="outline" className="text-[10px] h-7">
              Updating…
            </Badge>
          )}
        </div>
      </div>

      <PortalKpiGrid
        items={[
          {
            title: "Clock hours",
            value: `${summary?.totalClockHours ?? 0}h`,
            hint: "Active work session time",
            icon: Clock,
            accent: "blue",
          },
          {
            title: "Clock utilisation",
            value: `${summary?.avgClockUtilisation ?? 0}%`,
            hint: `vs ${data?.monthlyCapacityHours ?? 176}h capacity`,
            icon: TrendingUp,
            accent: "violet",
          },
          {
            title: "Consent coverage",
            value: `${summary?.withConsent ?? 0}/${summary?.monitoredStaff ?? 0}`,
            hint: "Current monitoring consent",
            icon: ShieldCheck,
            accent: "green",
          },
          {
            title: "Variance flags",
            value: summary?.flaggedVarianceCount ?? 0,
            hint: "Clock vs logs > 20%",
            icon: AlertTriangle,
            accent: "amber",
            alert: (summary?.flaggedVarianceCount ?? 0) > 0,
          },
        ]}
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-primary/15">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Top clock time
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">{insights?.topContributor?.name ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {insights?.topContributor
                ? `${insights.topContributor.clockHours}h clocked · ${insights.topContributor.clockUtilisationPct}% utilisation`
                : "No sessions this period"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-sky-500" />
              Live now
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">{summary?.activeSessionsNow ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active work sessions</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Largest variance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">{insights?.lowestAlignment?.name ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {insights?.lowestAlignment
                ? `${insights.lowestAlignment.clockHours}h clock · ${insights.lowestAlignment.loggedHours}h logged (${insights.lowestAlignment.variancePct}%)`
                : "No significant variance"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-violet-500" />
              Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">{summary?.totalScreenshots ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {summary?.screenshotEnabled ? "Captured this month" : "Monitoring disabled"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Clock hours</CardTitle>
            <CardDescription className="text-xs">Work session time per employee</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartRows.length === 0 ? (
              <ChartEmpty message="No clock activity for this period" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="clockHours" name="Clock hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Clock vs logged hours</CardTitle>
            <CardDescription className="text-xs">Session time compared to daily log entries</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {dualChartRows.length === 0 ? (
              <ChartEmpty message="No comparison data" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dualChartRows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="clockHours" name="Clock" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="loggedHours" name="Logged" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Clock utilisation</CardTitle>
            <CardDescription className="text-xs">
              Session hours vs {data?.monthlyCapacityHours ?? 176}h monthly target
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartRows.length === 0 ? (
              <ChartEmpty message="No utilisation data" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="clockUtilisationPct" name="Utilisation %" radius={[4, 4, 0, 0]}>
                      {chartRows.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Auto-closed sessions</CardTitle>
            <CardDescription className="text-xs">Sessions ended without manual clock-out</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartRows.length === 0 ? (
              <ChartEmpty message="No session data" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="autoClosedSessions" name="Auto-closed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Clock activity heatmap
          </CardTitle>
          <CardDescription className="text-xs">Work sessions started each day (org-wide)</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <LogActivityHeatmap heatmapData={heatmapData} month={month} year={year} />
        </CardContent>
      </Card>

      <PortalContentCard>
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Employee work leaderboard
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sorted by clock hours — compare session time, logs, and monitoring compliance
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 text-[10px]">#</TableHead>
                <TableHead className="text-[10px] min-w-[140px]">Employee</TableHead>
                <TableHead className="text-[10px] text-right">Clock</TableHead>
                <TableHead className="text-[10px] text-right">Logged</TableHead>
                <TableHead className="text-[10px] text-right">Variance</TableHead>
                <TableHead className="text-[10px] min-w-[110px]">Utilisation</TableHead>
                <TableHead className="text-[10px] text-center">Sessions</TableHead>
                <TableHead className="text-[10px] text-center">Days</TableHead>
                <TableHead className="text-[10px] text-center">Consent</TableHead>
                <TableHead className="text-[10px] text-center">Shots</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                    No monitoring activity for {formatMonthLabel(month, year)}.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((row, i) => <EmployeeRow key={row.userId} row={row} rank={i + 1} />)
              )}
            </TableBody>
          </Table>
        </div>
      </PortalContentCard>
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
      {message}
    </div>
  );
}
