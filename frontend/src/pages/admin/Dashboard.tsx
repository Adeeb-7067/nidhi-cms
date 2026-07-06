import { Link } from "wouter";
import { useState } from "react";
import {
  useGetDashboardStats,
  useGetCompanyAnalytics,
  useHealthCheck,
  type DashboardStats,
} from "@/api";
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
  Radio,
  Database,
  Server,
  HardDrive,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  DashboardPageHeader,
  DashboardFilterBar,
  DashboardSectionLabel,
  DashboardPipelineFlow,
} from "@/components/dashboard/dashboard-page-kit";
import {
  OverviewTile,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-kit";
import { toast } from "sonner";
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
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { analyticsQueryOptions } from "@/lib/list-query-options";
import {
  getGetCompanyAnalyticsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@/api";

type DashboardPayload = DashboardStats & {
  openTickets?: number;
  trends?: {
    projects?: { month: string; count: number }[];
    bugs?: { month: string; count: number }[];
  };
  milestonesStatus?: { status: string; count: number }[];
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTrendMonth(monthKey: string) {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("6m");
  const { data: stats, isLoading, isError } = useGetDashboardStats({
    query: analyticsQueryOptions({ queryKey: getGetDashboardStatsQueryKey() }),
  });
  const { data: companyAnalytics } = useGetCompanyAnalytics({
    query: analyticsQueryOptions({ queryKey: getGetCompanyAnalyticsQueryKey() }),
  });
  const { data: health } = useHealthCheck();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !stats) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Unable to load dashboard data. Please refresh or try again later.
      </div>
    );
  }

  const dashboardData = stats as DashboardPayload;

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

  const projectTrends = (dashboardData.trends?.projects ?? []).map((p) => ({
    ...p,
    month: formatTrendMonth(p.month),
  }));

  const bugTrends = (dashboardData.trends?.bugs ?? []).map((b) => ({
    ...b,
    month: formatTrendMonth(b.month),
  }));

  const openTickets = dashboardData.openTickets ?? 0;
  const attentionCount =
    stats.overdueProjects + stats.openBugs + stats.openRequests + openTickets;

  const apiHealthy = health?.status === "ok";
  const dataHealthy = !isError && Boolean(stats);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const companies = companyAnalytics?.companies?.slice(0, 8) ?? [];

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
      <DashboardPageHeader
        title={`${getGreeting()}, ${user?.name?.split(" ")[0] ?? "Admin"}`}
        description={
          attentionCount > 0
            ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention · ${today}`
            : `Agency command center · ${today}`
        }
        breadcrumbs={[{ label: "Manage", href: "/admin" }, { label: "Dashboard" }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/admin/projects">
                <Briefcase className="h-4 w-4 mr-2" />
                All projects
              </Link>
            </Button>
            <Button size="sm" className="h-8" asChild>
              <Link href="/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
          </>
        }
      />

      <DashboardFilterBar
        period={period}
        onPeriodChange={setPeriod}
        onExport={() => toast.success("Dashboard summary export started")}
      />

      <DashboardPipelineFlow title="Project pipeline" stages={pipelineStages} />

      <div className="space-y-2">
        <DashboardSectionLabel title="Operations KPIs" />
        <PortalKpiGrid
          columns={4}
          count={4}
          items={[
            { title: "Active projects", value: stats.activeProjects, hint: stats.overdueProjects > 0 ? `${stats.overdueProjects} overdue` : "On track · in delivery", icon: Briefcase, href: "/admin/projects", accent: "blue", delay: 0, alert: stats.overdueProjects > 0 },
            { title: "All companies", value: stats.totalClients, hint: "Active partners", icon: Building2, href: "/admin/clients", accent: "violet", delay: 1 },
            { title: "Open bugs", value: stats.openBugs, hint: "Unresolved", icon: Activity, href: "/dev/bugs", accent: "amber", alert: stats.openBugs > 0, delay: 2 },
            { title: "Pending requests", value: stats.openRequests, hint: "Resource queue", icon: Inbox, href: "/admin/requests", accent: "sky", alert: stats.openRequests > 0, delay: 3 },
          ]}
        />
      </div>

      <div className="space-y-2">
        <DashboardSectionLabel title="Team & delivery" />
        <PortalKpiGrid
          columns={4}
          count={4}
          items={[
            { title: "Active team", value: stats.teamMembersActive ?? stats.teamMembersOnline ?? 0, hint: stats.teamMembersOnlineNow != null && stats.teamMembersOnlineNow > 0 ? `${stats.teamMembersOnlineNow} online now` : "Developers & QA", icon: Users, href: "/admin/employees", accent: "green", delay: 0 },
            { title: "Open tickets", value: openTickets, hint: "Support queue", icon: Ticket, href: "/admin/tickets", accent: "pink", alert: openTickets > 0, delay: 1 },
            { title: "APKs due", value: stats.apksDueToday, hint: "Today", icon: Smartphone, href: "/dev/apk", accent: "amber", delay: 2 },
            { title: "Overdue projects", value: stats.overdueProjects, hint: "Needs review", icon: AlertCircle, href: "/admin/projects", accent: "red", alert: stats.overdueProjects > 0, delay: 3 },
          ]}
        />
      </div>

      {/* Charts — single tight bento grid; panels stretch to fill cells (gap-3 only) */}
      <motion.section
        className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-stretch"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        aria-label="Analytics"
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
              <ChartEmptyState message="No company data yet. Add clients to see portfolio metrics." icon={BuildingIcon} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <div className="lg:col-span-4 grid grid-rows-2 gap-3 min-h-[340px] lg:min-h-[380px]">
          <div className="flex min-h-0 flex-col">
            <ChartPanel
              title="Project pipeline"
              description="Current status distribution"
              icon={Layers}
              accent="blue"
            >
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
            description="New projects · last 6 months"
            icon={TrendingUp}
            accent="blue"
          >
            {projectTrends.length > 0 ? (
              <DashboardTrendChart
                data={projectTrends}
                stroke="hsl(var(--primary))"
                gradientId="adminProjectGrad"
                summaryLabel="New projects (6 mo)"
              />
            ) : (
              <ChartEmptyState message="Project trend data will appear as you add projects." />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={4} className="min-h-[280px]">
          <ChartPanel
            title="Bug reports"
            description="New bugs · last 6 months"
            icon={Bug}
            accent="amber"
          >
            {bugTrends.length > 0 ? (
              <DashboardTrendChart
                data={bugTrends}
                stroke="#f59e0b"
                gradientId="adminBugGrad"
                summaryLabel="New bugs (6 mo)"
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
            viewAllHref="/discussions"
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
                        <p className="text-[10px] text-muted-foreground mt-0.5">
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

        <ChartGridCell colSpan={12}>
          <ChartPanel
            title="System health"
            description="Core infrastructure status"
            icon={Server}
            accent="emerald"
            headerExtra={
              apiHealthy && dataHealthy ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                  <div className="flex items-center justify-between mb-2">
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">{svc.detail}</p>
                </div>
              ))}
            </div>
            {apiHealthy && dataHealthy && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  All systems operational
                </p>
              </div>
            )}
          </ChartPanel>
        </ChartGridCell>
      </motion.section>

      <section>
        <DashboardSectionLabel title="Quick overview" className="mb-3" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <OverviewTile
            label="All projects"
            value={stats.activeProjects}
            sublabel="Active"
            icon={Briefcase}
            href="/admin/projects"
          />
          <OverviewTile
            label="All companies"
            value={stats.totalClients}
            sublabel="Partners"
            icon={Building2}
            href="/admin/clients"
          />
          <OverviewTile
            label="All team"
            value={stats.teamMembersActive ?? stats.teamMembersOnline ?? 0}
            sublabel="Active"
            icon={Users}
            href="/admin/employees"
          />
          <OverviewTile
            label="Bugs"
            value={stats.openBugs}
            sublabel="Open"
            icon={Activity}
            href="/dev/bugs"
          />
          <OverviewTile
            label="Requests"
            value={stats.openRequests}
            sublabel="Pending"
            icon={Inbox}
            href="/admin/requests"
          />
          <OverviewTile
            label="Tickets"
            value={openTickets}
            sublabel="Open"
            icon={Ticket}
            href="/admin/tickets"
          />
        </div>
      </section>
      </motion.div>
    </PortalPageShell>
  );
}
