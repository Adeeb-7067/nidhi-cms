import { useMemo, useState } from "react";
import {
  useGetTeamAnalytics,
  getGetTeamAnalyticsQueryKey,
  type DeveloperStats,
} from "@/api";
import { analyticsQueryOptions } from "@/lib/list-query-options";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { PortalKpiGrid, PortalContentCard } from "@/components/layout/portal-page-kit";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Award,
  BarChart3,
  Bug,
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { LogActivityHeatmap } from "@/components/analytics/log-activity-heatmap";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

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

function formatLogDateShort(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type DeveloperLeaderboardRow = DeveloperStats & { rank: number };

export function TeamAnalyticsPanel({ variant = "team" }: { variant?: "team" | "monitoring" }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isFetching } = useGetTeamAnalytics(
    { month, year },
    {
      query: analyticsQueryOptions({
        queryKey: getGetTeamAnalyticsQueryKey({ month, year }),
      }),
    },
  );

  const developers = data?.developers ?? [];
  const heatmapData = data?.heatmapData ?? [];

  const summary = useMemo(() => {
    if (!developers.length) {
      return {
        totalHours: 0,
        avgUtilisation: 0,
        totalLogs: 0,
        bugsClosed: 0,
        activeStaff: 0,
        topPerformer: null as DeveloperStats | null,
      };
    }
    const totalHours = developers.reduce((s, d) => s + d.totalHoursThisMonth, 0);
    const avgUtilisation = Math.round(
      developers.reduce((s, d) => s + d.utilisationPct, 0) / developers.length,
    );
    const totalLogs = developers.reduce((s, d) => s + d.logEntriesCount, 0);
    const bugsClosed = developers.reduce((s, d) => s + d.bugsResolvedCount, 0);
    const topPerformer = [...developers].sort(
      (a, b) => b.totalHoursThisMonth - a.totalHoursThisMonth,
    )[0];
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      avgUtilisation,
      totalLogs,
      bugsClosed,
      activeStaff: developers.length,
      topPerformer,
    };
  }, [developers]);

  const chartDevelopers = useMemo(
    () =>
      developers.map((d) => ({
        ...d,
        shortName: d.name.split(" ")[0] ?? d.name,
      })),
    [developers],
  );

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, [now]);

  const copy =
    variant === "monitoring"
      ? {
          sectionTitle: "Work performance",
          sectionHint: "Daily logs, utilisation, and throughput for monitored staff",
          leaderboardTitle: "Employee leaderboard",
          leaderboardHint: "Sorted by hours logged — compare workload across the team",
          activeStaffHint: "Staff with log activity this period",
        }
      : {
          sectionTitle: "Team performance",
          sectionHint: "Utilisation, daily logs, and bug throughput",
          leaderboardTitle: "Team leaderboard",
          leaderboardHint: "Sorted by hours logged — click row metrics to compare workload",
          activeStaffHint: "Developers, QA & testers with accounts",
        };

  const leaderboardRows = useMemo(
    (): DeveloperLeaderboardRow[] => developers.map((dev, i) => ({ ...dev, rank: i + 1 })),
    [developers],
  );

  const leaderboardColumns = useMemo((): CmsColumn<DeveloperLeaderboardRow>[] => [
    {
      id: "rank",
      header: "#",
      className: "w-8 font-mono text-muted-foreground",
      cell: (dev) => dev.rank,
    },
    {
      id: "member",
      header: "Member",
      className: "min-w-[140px]",
      cell: (dev) => (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={dev.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">{dev.name?.charAt(0) ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{dev.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {dev.employeeId ?? dev.subType ?? "Staff"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "hours",
      header: "Hours",
      align: "right",
      cell: (dev) => <span className="font-semibold tabular-nums">{dev.totalHoursThisMonth}h</span>,
    },
    {
      id: "utilisation",
      header: "Utilisation",
      className: "min-w-[120px]",
      cell: (dev) => (
        <div className="flex items-center gap-2">
          <Progress value={dev.utilisationPct} className="h-1.5 flex-1" />
          <span className="text-[10px] tabular-nums w-8 text-right">{dev.utilisationPct}%</span>
        </div>
      ),
    },
    {
      id: "logs",
      header: "Logs",
      align: "center",
      cell: (dev) => <span className="tabular-nums">{dev.logEntriesCount}</span>,
    },
    {
      id: "projects",
      header: "Projects",
      align: "center",
      cell: (dev) => <span className="tabular-nums">{dev.activeProjects}</span>,
    },
    {
      id: "bugs",
      header: "Bugs closed",
      align: "center",
      cell: (dev) => <span className="tabular-nums">{dev.bugsResolvedCount}</span>,
    },
    {
      id: "completion",
      header: "Avg done %",
      align: "center",
      cell: (dev) => <span className="tabular-nums">{dev.avgCompletionPct}%</span>,
    },
    {
      id: "lastLog",
      header: "Last log",
      align: "right",
      cell: (dev) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatLogDateShort(dev.lastLogDate)}
        </span>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-md" />
        <PortalKpiGrid loading count={4} items={[]} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">{copy.sectionTitle}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {copy.sectionHint} for {formatMonthLabel(month, year)}.
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
            title: "Hours logged",
            value: `${summary.totalHours}h`,
            hint: formatMonthLabel(month, year),
            icon: Clock,
            accent: "blue",
          },
          {
            title: "Avg utilisation",
            value: `${summary.avgUtilisation}%`,
            hint: "vs 22 × 8h target",
            icon: TrendingUp,
            accent: "violet",
          },
          {
            title: "Log entries",
            value: summary.totalLogs,
            hint: "Daily log submissions",
            icon: FileText,
            accent: "green",
          },
          {
            title: "Bugs closed",
            value: summary.bugsClosed,
            hint: "Assigned & closed this month",
            icon: Bug,
            accent: "amber",
          },
        ]}
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-primary/15">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Top contributor
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">{summary.topPerformer?.name ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {summary.topPerformer
                ? `${summary.topPerformer.totalHoursThisMonth}h logged · ${summary.topPerformer.utilisationPct}% utilisation`
                : "No activity this period"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-violet-500" />
              Active staff
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">{summary.activeStaff}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {copy.activeStaffHint}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
              Project load
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-lg font-bold">
              {developers.reduce((s, d) => s + d.activeProjects, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Combined active project assignments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Hours logged</CardTitle>
            <CardDescription className="text-xs">Per team member this month</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartDevelopers.length === 0 ? (
              <ChartEmpty message="No hours logged for this period" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDevelopers} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="totalHoursThisMonth" name="Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Utilisation %</CardTitle>
            <CardDescription className="text-xs">Logged hours vs 176h monthly capacity</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartDevelopers.length === 0 ? (
              <ChartEmpty message="No utilisation data" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDevelopers} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="utilisationPct" name="Utilisation %" radius={[4, 4, 0, 0]}>
                      {chartDevelopers.map((_, index) => (
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
            <CardTitle className="text-sm">Bugs closed</CardTitle>
            <CardDescription className="text-xs">Assigned bugs closed in this month</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartDevelopers.length === 0 ? (
              <ChartEmpty message="No bug data" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDevelopers} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="bugsResolvedCount" name="Bugs closed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Avg task completion</CardTitle>
            <CardDescription className="text-xs">Mean completion % on daily log entries</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {chartDevelopers.length === 0 ? (
              <ChartEmpty message="No completion data" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartDevelopers}
                    margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="shortName" width={56} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="avgCompletionPct" name="Avg completion %" fill="#f59e0b" radius={[0, 4, 4, 0]} />
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
            <Calendar className="h-4 w-4 text-primary" />
            Daily log activity
          </CardTitle>
          <CardDescription className="text-xs">
            How many log entries were submitted each day
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <LogActivityHeatmap heatmapData={heatmapData} month={month} year={year} />
        </CardContent>
      </Card>

      <PortalContentCard>
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">{copy.leaderboardTitle}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{copy.leaderboardHint}</p>
        </div>
        <div className="p-4 pt-0">
          <CmsDataTable
            columns={leaderboardColumns}
            rows={leaderboardRows}
            rowKey={(dev) => dev.userId}
            embedded
            empty={{ title: `No team activity for ${formatMonthLabel(month, year)}.` }}
          />
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
