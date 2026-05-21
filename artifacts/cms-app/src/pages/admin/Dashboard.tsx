import React, { useMemo } from "react";
import { Link } from "wouter";
import {
  useGetDashboardStats,
  useGetCompanyAnalytics,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  Users,
  Building2,
  AlertCircle,
  Smartphone,
  Inbox,
  Activity,
  Ticket,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Database,
  Cloud,
  Lock,
  HardDrive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DashboardHero,
  DashboardSkeleton,
  chartTooltipStyle,
} from "@/components/dashboard/dashboard-kit";
import { motion, type Variants } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "scoping",    label: "Scoping",     color: "#185FA5" },
  { key: "inProgress", label: "In Progress", color: "#534AB7" },
  { key: "uat",        label: "UAT",         color: "#854F0B" },
  { key: "onHold",     label: "On Hold",     color: "#5F5E5A" },
  { key: "completed",  label: "Done",        color: "#27500A" },
] as const;

const BUG_SEVERITIES = [
  { key: "critical", label: "Critical", color: "#A32D2D" },
  { key: "high",     label: "High",     color: "#854F0B" },
  { key: "medium",   label: "Medium",   color: "#BA7517" },
  { key: "low",      label: "Low",      color: "#3B6D11" },
] as const;

const SERVICES = [
  { name: "API Gateway", icon: Cloud,    detail: "Connected" },
  { name: "Database",    icon: Database, detail: "MongoDB"   },
  { name: "Realtime",    icon: Zap,      detail: "Socket.IO" },
  { name: "Storage",     icon: HardDrive,detail: "Uploads"   },
  { name: "Auth",        icon: Lock,     detail: "JWT Active"},
] as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" as const },
  },
} satisfies Variants;

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thin data table used throughout the dashboard. */
function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left">
            {headers.map((h) => (
              <th
                key={h}
                className="pb-2.5 pr-4 last:pr-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/20 last:border-0 transition-colors hover:bg-muted/30"
            >
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 pr-4 last:pr-0 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Compact panel wrapper with optional header actions. */
function Panel({
  title,
  description,
  badge,
  viewAllHref,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  viewAllHref?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card px-5 py-4 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">{title}</p>
            {badge !== undefined && (
              <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              View all →
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Single KPI metric card. */
function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  href,
  alert,
  trend,
  delay = 0,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ElementType;
  href: string;
  alert?: boolean;
  trend?: "up" | "down" | "flat";
  delay?: number;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div variants={fadeUp} custom={delay}>
      <Link href={href}>
        <div
          className={cn(
            "group relative rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-all duration-200",
            "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
            alert
              ? "border-destructive/40 bg-destructive/[0.03]"
              : "border-border/60"
          )}
        >
          {alert && (
            <span className="absolute right-3 top-3 h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
          )}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {title}
            </span>
            <Icon
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                alert
                  ? "text-destructive/60"
                  : "text-muted-foreground/50 group-hover:text-muted-foreground"
              )}
            />
          </div>
          <p
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums leading-none",
              alert ? "text-destructive" : "text-foreground"
            )}
          >
            {value}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{hint}</span>
            {trend && (
              <TrendIcon
                className={cn(
                  "h-3 w-3",
                  trend === "up"
                    ? "text-emerald-500"
                    : trend === "down"
                    ? "text-destructive"
                    : "text-muted-foreground/40"
                )}
              />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Coloured health badge for company rows. */
function HealthBadge({ delayed }: { delayed: number }) {
  if (delayed === 0)
    return (
      <span className="inline-flex items-center rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
        Healthy
      </span>
    );
  if (delayed <= 2)
    return (
      <span className="inline-flex items-center rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
        Monitor
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
      At Risk
    </span>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: companyAnalytics } = useGetCompanyAnalytics();

  // ── Derived data (memoised so it only recomputes when stats changes) ─────
  const derived = useMemo(() => {
    if (!stats) return null;

    const openTickets =
      (stats as typeof stats & { openTickets?: number }).openTickets ?? 0;

    const attentionCount =
      stats.overdueProjects + stats.openBugs + stats.openRequests + openTickets;

    const pipelineData = PIPELINE_STAGES.map((s) => ({
      ...s,
      value:
        stats.projectPipeline[
          s.key as keyof typeof stats.projectPipeline
        ] ?? 0,
    })).filter((d) => d.value > 0);

    const pipelineTotal = pipelineData.reduce((a, d) => a + d.value, 0);

    const bugData = BUG_SEVERITIES.map((s) => ({
      ...s,
      value:
        stats.bugSeverityBreakdown[
          s.key as keyof typeof stats.bugSeverityBreakdown
        ] ?? 0,
    })).filter((d) => d.value > 0);

    const extStats = stats as typeof stats & {
      trends?: { projects?: { month: string; count: number }[] };
    };
    const projectTrends =
      extStats.trends?.projects?.length
        ? extStats.trends.projects
        : [{ month: "Now", count: stats.activeProjects }];

    const today = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return {
      openTickets,
      attentionCount,
      pipelineData,
      pipelineTotal,
      bugData,
      projectTrends,
      today,
    };
  }, [stats]);

  // ── Loading / empty states ───────────────────────────────────────────────
  if (isLoading) return <DashboardSkeleton />;
  if (!stats || !derived) return null;

  const {
    openTickets,
    attentionCount,
    pipelineData,
    pipelineTotal,
    bugData,
    projectTrends,
    today,
  } = derived;

  // ── KPI card definitions ─────────────────────────────────────────────────
  const kpiCards = [
    {
      title: "Active Projects",
      value: stats.activeProjects,
      hint: "In delivery",
      icon: Briefcase,
      href: "/admin/projects",
      alert: false,
      trend: "up" as const,
    },
    {
      title: "Companies",
      value: stats.totalClients,
      hint: "Partners",
      icon: Building2,
      href: "/admin/clients",
      alert: false,
      trend: "flat" as const,
    },
    {
      title: "Open Bugs",
      value: stats.openBugs,
      hint: "Unresolved",
      icon: Activity,
      href: "/dev/bugs",
      alert: stats.openBugs > 0,
      trend: stats.openBugs > 5 ? ("down" as const) : ("flat" as const),
    },
    {
      title: "Requests",
      value: stats.openRequests,
      hint: "Pending",
      icon: Inbox,
      href: "/admin/requests",
      alert: stats.openRequests > 0,
      trend: stats.openRequests > 3 ? ("down" as const) : ("up" as const),
    },
    {
      title: "Team Online",
      value: stats.teamMembersOnline,
      hint: "Active today",
      icon: Users,
      href: "/admin/employees",
      alert: false,
      trend: "up" as const,
    },
    {
      title: "Open Tickets",
      value: openTickets,
      hint: "Support queue",
      icon: Ticket,
      href: "/admin/tickets",
      alert: openTickets > 5,
      trend: openTickets > 5 ? ("down" as const) : ("flat" as const),
    },
    {
      title: "APKs Due",
      value: stats.apksDueToday,
      hint: "Today",
      icon: Smartphone,
      href: "/dev/apk",
      alert: stats.apksDueToday > 0,
      trend: stats.apksDueToday > 0 ? ("down" as const) : ("up" as const),
    },
    {
      title: "Overdue",
      value: stats.overdueProjects,
      hint: "Projects",
      icon: AlertCircle,
      href: "/admin/projects",
      alert: stats.overdueProjects > 0,
      trend: stats.overdueProjects > 0 ? ("down" as const) : ("up" as const),
    },
  ];

  return (
    <div className="dashboard-page space-y-5">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <DashboardHero
        title={`${getGreeting()}, ${user?.name?.split(" ")[0] ?? "Admin"}`}
        subtitle={
          attentionCount > 0
            ? `${attentionCount} items need attention · ${today}`
            : `Agency command center · ${today}`
        }
        badge="Super Admin"
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/projects">
                <Briefcase className="mr-2 h-3.5 w-3.5" />
                Projects
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/analytics">
                <BarChart3 className="mr-2 h-3.5 w-3.5" />
                Analytics
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPI cards ──────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {kpiCards.map((kpi, i) => (
          <KpiCard key={kpi.title} {...kpi} delay={i} />
        ))}
      </motion.div>

      {/* ── Row 1: Portfolio table + Recent activity ────────────────────── */}
      <motion.div
        className="grid gap-3 lg:grid-cols-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        {/* Portfolio table */}
        <div className="lg:col-span-8">
          <Panel
            title="Portfolio performance"
            description="Company delivery metrics"
            viewAllHref="/admin/clients"
            className="h-full"
          >
            {(companyAnalytics?.companies?.length ?? 0) > 0 ? (
              <DataTable
                headers={["Company", "Active", "Total", "Tickets", "Delayed", "Health"]}
                rows={companyAnalytics!.companies!.slice(0, 8).map((c) => [
                  <Link
                    href={`/admin/clients/${c.companyId ?? ""}`}
                    className="font-medium hover:text-primary"
                  >
                    {c.companyName}
                  </Link>,
                  <span className="font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {c.activeProjects}
                  </span>,
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {c.totalProjects}
                  </span>,
                  <span className="font-mono tabular-nums">{c.openTickets}</span>,
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      (c.delayedProjects ?? 0) > 0 &&
                        "font-bold text-destructive"
                    )}
                  >
                    {c.delayedProjects ?? 0}
                  </span>,
                  <HealthBadge delayed={c.delayedProjects ?? 0} />,
                ])}
              />
            ) : (
              <EmptyState message="No company data yet" />
            )}
          </Panel>
        </div>

        {/* Recent activity feed */}
        <div className="lg:col-span-4">
          <Panel
            title="Recent activity"
            description="Platform events"
            badge={stats.recentActivity.length}
            viewAllHref="/admin/discussions"
            className="h-full"
          >
            {stats.recentActivity.length === 0 ? (
              <EmptyState message="No recent activity" />
            ) : (
              <div className="max-h-[260px] space-y-0 overflow-y-auto">
                {stats.recentActivity.slice(0, 10).map((a, i) => (
                  <ActivityRow key={i} item={a} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </motion.div>

      {/* ── Row 2: Pipeline · Bugs · Trend chart ───────────────────────── */}
      <motion.div
        className="grid gap-3 lg:grid-cols-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.3 }}
      >
        {/* Pipeline donut + bar */}
        <div className="lg:col-span-4">
          <Panel title="Project pipeline" description="Stage distribution" className="h-full">
            {pipelineTotal > 0 ? (
              <>
                {/* Donut */}
                <div className="relative mx-auto mb-2 h-[130px] w-[130px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipelineData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={58}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pipelineData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-xl font-semibold tabular-nums leading-none">
                      {pipelineTotal}
                    </span>
                    <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      Projects
                    </span>
                  </div>
                </div>

                {/* Mini bar chart */}
                <div className="mb-3 h-[72px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} margin={{ top: 0, left: -20, right: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        fontSize={8}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={8}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {pipelineData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend table */}
                <DataTable
                  headers={["Stage", "Count", "%"]}
                  rows={pipelineData.map((d) => [
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.label}
                    </span>,
                    <span className="font-mono font-semibold tabular-nums">
                      {d.value}
                    </span>,
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {pct(d.value, pipelineTotal)}%
                    </span>,
                  ])}
                />
              </>
            ) : (
              <EmptyState message="No pipeline data" />
            )}
          </Panel>
        </div>

        {/* Bug severity */}
        <div className="lg:col-span-4">
          <Panel
            title="Bug severity"
            description="Open issues by priority"
            className="h-full"
          >
            {bugData.length > 0 ? (
              <>
                <div className="mb-3 h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bugData}
                      layout="vertical"
                      margin={{ left: 0, right: 8, top: 2, bottom: 2 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={52}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {bugData.map((b, i) => (
                          <Cell key={i} fill={b.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <DataTable
                  headers={["Severity", "Open"]}
                  rows={bugData.map((b) => [
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: b.color }}
                      />
                      {b.label}
                    </span>,
                    <span
                      className="font-mono font-bold tabular-nums"
                      style={{ color: b.color }}
                    >
                      {b.value}
                    </span>,
                  ])}
                />
              </>
            ) : (
              <EmptyState message="No open bugs" icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />} />
            )}
          </Panel>
        </div>

        {/* Project growth trend */}
        <div className="lg:col-span-4">
          <Panel
            title="Project growth"
            description="Last 6 months"
            className="h-full"
          >
            <div className="mb-3 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectTrends}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#185FA5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#185FA5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#185FA5"
                    strokeWidth={2}
                    fill="url(#trendGrad)"
                    dot={{ r: 3, fill: "#185FA5", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              headers={["Month", "Projects"]}
              rows={projectTrends.map((t) => [
                <span className="font-medium">{t.month}</span>,
                <span className="font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {t.count}
                </span>,
              ])}
            />
          </Panel>
        </div>
      </motion.div>

      {/* ── Row 3: System health + KPI summary ─────────────────────────── */}
      <motion.div
        className="grid gap-3 lg:grid-cols-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.3 }}
      >
        {/* System health */}
        <div className="lg:col-span-4">
          <Panel title="System health" description="Service status" className="h-full">
            <div className="mb-4 space-y-2.5">
              {SERVICES.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.name}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {s.detail}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                All systems operational
              </p>
            </div>
          </Panel>
        </div>

        {/* KPI summary table */}
        <div className="lg:col-span-8">
          <Panel title="KPI snapshot" description="All key metrics at a glance">
            <DataTable
              headers={["Metric", "Value", "Status", "Notes"]}
              rows={kpiCards.map((k) => [
                <span className="flex items-center gap-1.5 font-medium">
                  <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {k.title}
                </span>,
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {k.value}
                </span>,
                k.alert ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Needs attention
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    OK
                  </span>
                ),
                <span className="text-[11px] text-muted-foreground">{k.hint}</span>,
              ])}
            />
          </Panel>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function ActivityRow({
  item,
}: {
  item: {
    actorName: string;
    action: string;
    entityName: string;
    timestamp: string;
  };
}) {
  const initials = item.actorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-2.5 border-b border-border/20 py-2.5 last:border-0">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-1 ring-border/40">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-snug">
          <span className="font-medium">{item.actorName}</span>{" "}
          <span className="text-muted-foreground">{item.action}</span>{" "}
          <span className="font-medium">{item.entityName}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      {icon}
      <p className="text-[12px] text-muted-foreground">{message}</p>
    </div>
  );
}