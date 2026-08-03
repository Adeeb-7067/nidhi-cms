import { Link } from "wouter";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  Database,
  HardDrive,
  Inbox,
  LayoutDashboard,
  Radio,
  Server,
  Smartphone,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  useGetDashboardStats,
  useGetCompanyAnalytics,
  useHealthCheck,
  useGetWorkspaceDashboard,
  type DashboardStats,
  getGetCompanyAnalyticsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  DashboardPageHeader,
  DashboardFilterBar,
  DashboardSectionLabel,
  DashboardPipelineFlow,
  filterMonthlyTrendRows,
  dashboardTrendPeriodLabel,
} from "@/components/dashboard/dashboard-page-kit";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-kit";
import {
  ChartPanel,
  ChartGridCell,
  ChartEmptyState,
  DashboardTrendChart,
  DashboardPipelineChart,
  DashboardSeverityChart,
  DashboardPortfolioTable,
  Building2 as BuildingIcon,
  Layers,
  Bug,
  Activity as ActivityIcon,
} from "@/components/dashboard/admin-dashboard-charts";
import { WorkspaceRecentProjectsList } from "@/components/dashboard/WorkspaceRecentProjectsList";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { analyticsQueryOptions } from "@/lib/list-query-options";

type DashboardPayload = DashboardStats & {
  openTickets?: number;
  trends?: {
    projects?: { month: string; count: number }[];
    bugs?: { month: string; count: number }[];
  };
};

function formatTrendMonth(monthKey: string) {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function projectStatusBadgeClass(status: string) {
  switch (status) {
    case "in_progress":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
    case "completed":
      return "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400";
    case "on_hold":
      return "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400";
    case "scoping":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400";
    case "uat":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
    case "maintenance":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

const DELIVERY_LINKS = [
  { label: "Logs", href: "/dev/logs" },
  { label: "Tasks", href: "/dev/tasks" },
  { label: "Bugs", href: "/dev/bugs" },
  { label: "Releases", href: "/dev/apk" },
  { label: "Reports", href: "/dev/reports" },
  { label: "Projects", href: "/admin/projects" },
  { label: "Team", href: "/admin/employees" },
  { label: "Clients", href: "/admin/clients" },
  { label: "Tickets", href: "/admin/tickets" },
  { label: "Requests", href: "/admin/requests" },
  { label: "Screenshots", href: "/admin/screenshots" },
  { label: "Attendance", href: "/admin/attendance" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Activity", href: "/admin/activity" },
] as const;

/**
 * Super Admin Delivery Dashboard — agency ops for the Delivery section only.
 * Separate from Manage `/admin` dashboard. Staff personal hub is Workspace.tsx.
 */
export default function AdminDeliveryOverview() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [period, setPeriod] = useState("6m");

  const { data: stats, isLoading, isError } = useGetDashboardStats({
    query: analyticsQueryOptions({ queryKey: getGetDashboardStatsQueryKey() }),
  });
  const { data: companyAnalytics } = useGetCompanyAnalytics({
    query: analyticsQueryOptions({ queryKey: getGetCompanyAnalyticsQueryKey() }),
  });
  const { data: health } = useHealthCheck();
  const { data: workspace } = useGetWorkspaceDashboard();

  if (isLoading && !stats) return <DashboardSkeleton />;
  if ((isError && !stats) || !stats) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Unable to load delivery overview. Please refresh or try again later.
      </div>
    );
  }

  const dashboardData = stats as DashboardPayload;
  const openTickets = dashboardData.openTickets ?? workspace?.kpis.openTickets ?? 0;
  const attentionCount =
    stats.overdueProjects + stats.openBugs + stats.openRequests + openTickets;

  const pipelineData = [
    { name: "Scoping", value: stats.projectPipeline.scoping },
    { name: "In Progress", value: stats.projectPipeline.inProgress },
    { name: "UAT", value: stats.projectPipeline.uat },
    { name: "On Hold", value: stats.projectPipeline.onHold },
    { name: "Done", value: stats.projectPipeline.completed },
    { name: "Maintenance", value: stats.projectPipeline.maintenance },
  ].filter((d) => d.value > 0);

  const bugData = [
    { name: "Critical", value: stats.bugSeverityBreakdown.critical, color: "#ef4444" },
    { name: "High", value: stats.bugSeverityBreakdown.high, color: "#f97316" },
    { name: "Medium", value: stats.bugSeverityBreakdown.medium, color: "#f59e0b" },
    { name: "Low", value: stats.bugSeverityBreakdown.low, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  const trendPeriodLabel = dashboardTrendPeriodLabel(period);
  const projectTrends = filterMonthlyTrendRows(dashboardData.trends?.projects ?? [], period).map((p) => ({
    ...p,
    month: formatTrendMonth(p.month),
  }));
  const bugTrends = filterMonthlyTrendRows(
    dashboardData.trends?.bugs?.length
      ? dashboardData.trends.bugs
      : (workspace?.trends.bugs ?? []).map((b) => ({ month: b.month, count: b.count })),
    period,
  ).map((b) => ({
    ...b,
    month: formatTrendMonth(b.month),
  }));

  const companies = companyAnalytics?.companies?.slice(0, 8) ?? [];
  const recentBugs = workspace?.recentBugs ?? [];
  const recentProjects = workspace?.recentProjects ?? [];
  const unread = workspace?.kpis.unreadNotifications ?? 0;

  const apiHealthy = health?.status === "ok";
  const dataHealthy = !isError && Boolean(stats);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const pipelineStages = [
    { label: "Scoping", value: stats.projectPipeline.scoping, color: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300" },
    { label: "In Progress", value: stats.projectPipeline.inProgress, color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300" },
    { label: "UAT", value: stats.projectPipeline.uat, color: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300" },
    { label: "On Hold", value: stats.projectPipeline.onHold, color: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300" },
    { label: "Done", value: stats.projectPipeline.completed, color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" },
    { label: "Maintenance", value: stats.projectPipeline.maintenance, color: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300" },
  ];

  return (
    <PortalPageShell>
      <motion.div
        className="space-y-4"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <DashboardPageHeader
          title="Delivery dashboard"
          description={
            attentionCount > 0
              ? `${attentionCount} items need attention · ${today}`
              : `Agency delivery command center · ${today}`
          }
          breadcrumbs={[{ label: "Delivery", href: "/dev" }, { label: "Dashboard" }]}
          actions={
            <>
              <Button variant="outline" size="sm" className="h-8" asChild>
                <Link href="/admin">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Manage dashboard
                </Link>
              </Button>
              <Button size="sm" className="h-8" asChild>
                <Link href="/admin/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </Button>
            </>
          }
        />

        <DashboardFilterBar
          period={period}
          onPeriodChange={setPeriod}
          onExport={() => toast.success("Delivery overview export started")}
        />

        <DashboardPipelineFlow title="Agency project pipeline" stages={pipelineStages} />

        <div className="space-y-2">
          <DashboardSectionLabel title="Operations" />
          <PortalKpiGrid
            columns={4}
            count={4}
            items={[
              {
                title: "Active projects",
                value: stats.activeProjects,
                hint: stats.overdueProjects > 0 ? `${stats.overdueProjects} overdue` : "On track · in delivery",
                icon: Briefcase,
                href: "/admin/projects",
                accent: "blue",
                alert: stats.overdueProjects > 0,
              },
              {
                title: "Companies",
                value: stats.totalClients,
                hint: "Active partners",
                icon: Building2,
                href: "/admin/clients",
                accent: "violet",
              },
              {
                title: "Open bugs",
                value: stats.openBugs,
                hint: "Unresolved across projects",
                icon: Bug,
                href: "/dev/bugs",
                accent: "amber",
                alert: stats.openBugs > 0,
              },
              {
                title: "Pending requests",
                value: stats.openRequests,
                hint: "Resource queue",
                icon: Inbox,
                href: "/admin/requests",
                accent: "sky",
                alert: stats.openRequests > 0,
              },
            ]}
          />
        </div>

        <div className="space-y-2">
          <DashboardSectionLabel title="Team & delivery" />
          <PortalKpiGrid
            columns={4}
            count={4}
            items={[
              {
                title: "Active team",
                value: stats.teamMembersActive ?? stats.teamMembersOnline ?? 0,
                hint:
                  stats.teamMembersOnlineNow != null && stats.teamMembersOnlineNow > 0
                    ? `${stats.teamMembersOnlineNow} online now`
                    : "Developers & QA",
                icon: Users,
                href: "/admin/employees",
                accent: "green",
              },
              {
                title: "Open tickets",
                value: openTickets,
                hint: "Support queue",
                icon: Ticket,
                href: "/admin/tickets",
                accent: "pink",
                alert: openTickets > 0,
              },
              {
                title: "APKs due",
                value: stats.apksDueToday,
                hint: "Today",
                icon: Smartphone,
                href: "/dev/apk",
                accent: "amber",
              },
              {
                title: "Overdue projects",
                value: stats.overdueProjects,
                hint: "Needs review",
                icon: AlertCircle,
                href: "/admin/projects",
                accent: "red",
                alert: stats.overdueProjects > 0,
              },
            ]}
          />
        </div>

        <div className="space-y-2">
          <DashboardSectionLabel title="Attention snapshot" />
          <PortalKpiGrid
            columns={4}
            count={4}
            items={[
              {
                title: "Unread alerts",
                value: unread,
                hint: "Your notifications",
                icon: ActivityIcon,
                href: "/notifications",
                accent: "sky",
                alert: unread > 0,
              },
              {
                title: "Critical bugs",
                value: stats.bugSeverityBreakdown.critical,
                hint: "Highest severity",
                icon: Bug,
                href: "/dev/bugs",
                accent: "red",
                alert: stats.bugSeverityBreakdown.critical > 0,
              },
              {
                title: "High bugs",
                value: stats.bugSeverityBreakdown.high,
                hint: "Priority queue",
                icon: Bug,
                href: "/dev/bugs",
                accent: "amber",
                alert: stats.bugSeverityBreakdown.high > 0,
              },
              {
                title: "In progress",
                value: stats.projectPipeline.inProgress,
                hint: "Active delivery",
                icon: Layers,
                href: "/admin/projects",
                accent: "blue",
              },
            ]}
          />
        </div>

        <motion.section
          className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-stretch"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          aria-label="Delivery analytics"
        >
          <ChartGridCell colSpan={8} className="min-h-[340px] lg:min-h-[380px]">
            <ChartPanel
              title="Portfolio performance"
              description="Company delivery health at a glance"
              icon={BuildingIcon}
              accent="violet"
              viewAllHref="/admin/clients"
              badge={companies.length}
            >
              {companies.length > 0 ? (
                <DashboardPortfolioTable companies={companies} />
              ) : (
                <ChartEmptyState
                  message="No company data yet. Add clients to see portfolio metrics."
                  icon={BuildingIcon}
                />
              )}
            </ChartPanel>
          </ChartGridCell>

          <div className="lg:col-span-4 grid grid-rows-2 gap-3 min-h-[340px] lg:min-h-[380px]">
            <div className="flex min-h-0 flex-col">
              <ChartPanel title="Project pipeline" description="Status distribution" icon={Layers} accent="blue">
                {pipelineData.length > 0 ? (
                  <DashboardPipelineChart data={pipelineData} />
                ) : (
                  <ChartEmptyState message="No projects in the pipeline yet." icon={Layers} />
                )}
              </ChartPanel>
            </div>
            <div className="flex min-h-0 flex-col">
              <ChartPanel title="Bug severity" description="Open issues by priority" icon={Bug} accent="rose">
                {bugData.length > 0 ? (
                  <DashboardSeverityChart data={bugData} />
                ) : (
                  <ChartEmptyState message="No open bugs — great work!" icon={Bug} />
                )}
              </ChartPanel>
            </div>
          </div>

          <ChartGridCell colSpan={5} className="min-h-[280px]">
            <ChartPanel
              title="Project growth"
              description={`New projects · ${trendPeriodLabel}`}
              icon={TrendingUp}
              accent="blue"
            >
              {projectTrends.length > 0 ? (
                <DashboardTrendChart
                  data={projectTrends}
                  stroke="hsl(var(--primary))"
                  gradientId="deliveryProjectGrad"
                  summaryLabel={`New projects (${trendPeriodLabel})`}
                />
              ) : (
                <ChartEmptyState message="Project trend data will appear as you add projects." />
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={4} className="min-h-[280px]">
            <ChartPanel
              title="Bug reports"
              description={`New bugs · ${trendPeriodLabel}`}
              icon={Bug}
              accent="amber"
            >
              {bugTrends.length > 0 ? (
                <DashboardTrendChart
                  data={bugTrends}
                  stroke="#f59e0b"
                  gradientId="deliveryBugGrad"
                  summaryLabel={`New bugs (${trendPeriodLabel})`}
                />
              ) : (
                <ChartEmptyState message="Bug trend data will appear as issues are reported." icon={Bug} />
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={3} className="min-h-[280px]">
            <ChartPanel
              title="Recent activity"
              description="Latest platform events"
              icon={ActivityIcon}
              accent="emerald"
              badge={stats.recentActivity.length}
              viewAllHref="/admin/activity"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto dialog-scroll -mx-0.5 px-0.5">
                {stats.recentActivity.length === 0 ? (
                  <ChartEmptyState message="No recent activity yet." icon={ActivityIcon} />
                ) : (
                  stats.recentActivity.slice(0, 8).map((activity, i) => {
                    const initials = activity.actorName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <div
                        key={activity.id ?? i}
                        className="flex gap-2.5 rounded-lg border border-border/40 bg-card/80 p-2.5 hover:border-primary/25 hover:bg-muted/30 transition-colors shrink-0"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] leading-snug">
                            <span className="font-semibold text-foreground">{activity.actorName}</span>
                            <span className="text-muted-foreground"> {activity.action}</span>
                            {activity.entityName ? (
                              <>
                                {" "}
                                <span className="font-medium text-foreground">{activity.entityName}</span>
                              </>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={6} className="min-h-[300px]">
            <ChartPanel
              title="Needs triage"
              description="Latest bugs across all projects"
              icon={Bug}
              accent="rose"
              viewAllHref="/dev/bugs"
              badge={recentBugs.length}
            >
              {recentBugs.length === 0 ? (
                <ChartEmptyState message="No recent bugs — triage queue is clear." icon={Bug} />
              ) : (
                <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-0.5">
                  {recentBugs.map((bug) => (
                    <Link
                      key={bug.id}
                      href="/dev/bugs"
                      className="block rounded-lg border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug line-clamp-2">{bug.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[9px] capitalize",
                            bug.severity === "critical" && "border-red-500/50 text-red-500",
                            bug.severity === "high" && "border-orange-500/50 text-orange-500",
                          )}
                        >
                          {bug.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {bug.bugNumber ? `${bug.bugNumber} · ` : ""}
                        {bug.projectName}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={6} className="min-h-[300px]">
            <ChartPanel
              title="Recent projects"
              description="Latest portfolio updates"
              icon={Briefcase}
              accent="blue"
              viewAllHref="/admin/projects"
              badge={workspace?.kpis.projects ?? stats.activeProjects}
            >
              {recentProjects.length === 0 ? (
                <ChartEmptyState
                  message="No projects yet. Create one from Manage → Projects."
                  icon={Briefcase}
                />
              ) : (
                <div className="max-h-[240px]">
                  <WorkspaceRecentProjectsList
                    projects={recentProjects}
                    totalCount={workspace?.kpis.projects ?? stats.activeProjects}
                    getProjectHref={(id) => `/admin/projects/${id}`}
                    statusBadgeClass={projectStatusBadgeClass}
                  />
                </div>
              )}
            </ChartPanel>
          </ChartGridCell>

          <ChartGridCell colSpan={12}>
            <ChartPanel
              title="System health"
              description="Core infrastructure status"
              icon={Server}
              accent="emerald"
              headerExtra={
                apiHealthy && dataHealthy ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    All operational
                  </span>
                ) : null
              }
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "API Server",
                    icon: Server,
                    ok: apiHealthy,
                    detail: apiHealthy ? "Connected" : health?.status ?? "Unreachable",
                  },
                  {
                    label: "Database",
                    icon: Database,
                    ok: dataHealthy,
                    detail: dataHealthy ? "MongoDB" : "Pending",
                  },
                  {
                    label: "Realtime",
                    icon: Radio,
                    ok: dataHealthy,
                    detail: "Socket.IO",
                  },
                  {
                    label: "File storage",
                    icon: HardDrive,
                    ok: dataHealthy,
                    detail: "Uploads ready",
                  },
                ].map((svc) => (
                  <div
                    key={svc.label}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      svc.ok
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : "border-amber-500/25 bg-amber-500/5",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          svc.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
                        )}
                      >
                        <svc.icon className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          svc.ok ? "text-emerald-600" : "text-amber-600",
                        )}
                      >
                        {svc.ok ? "OK" : "Check"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{svc.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{svc.detail}</p>
                  </div>
                ))}
              </div>
              {apiHealthy && dataHealthy ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    All systems operational
                  </p>
                </div>
              ) : null}
            </ChartPanel>
          </ChartGridCell>
        </motion.section>

        <section>
          <DashboardSectionLabel title="Quick overview" className="mb-3" />
          <PortalKpiGrid
            columns={6}
            count={6}
            items={[
              { title: "All projects", value: stats.activeProjects, hint: "Active", icon: Briefcase, href: "/admin/projects", accent: "blue" },
              { title: "Companies", value: stats.totalClients, hint: "Partners", icon: Building2, href: "/admin/clients", accent: "violet" },
              { title: "Team", value: stats.teamMembersActive ?? stats.teamMembersOnline ?? 0, hint: "Active", icon: Users, href: "/admin/employees", accent: "green" },
              { title: "Bugs", value: stats.openBugs, hint: "Open", icon: Bug, href: "/dev/bugs", accent: "amber", alert: stats.openBugs > 0 },
              { title: "Requests", value: stats.openRequests, hint: "Pending", icon: Inbox, href: "/admin/requests", accent: "sky", alert: stats.openRequests > 0 },
              { title: "Tickets", value: openTickets, hint: "Open", icon: Ticket, href: "/admin/tickets", accent: "red", alert: openTickets > 0 },
            ]}
          />
        </section>

        <nav
          aria-label="Delivery shortcuts"
          className="flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-border/50 pt-4 text-sm"
        >
          <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Jump to
          </span>
          {DELIVERY_LINKS.map((item, i) => (
            <span key={item.href} className="inline-flex items-center">
              {i > 0 ? <span className="mx-1.5 text-border">·</span> : null}
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
              >
                {item.label}
              </Link>
            </span>
          ))}
          <span className="mx-1.5 text-border">·</span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-4"
          >
            Full manage dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </motion.div>
    </PortalPageShell>
  );
}
