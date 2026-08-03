import { Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Clock,
  Bug,
  Smartphone,
  FileText,
  Ticket,
  MessageSquare,
  Bell,
  FlaskConical,
  Layers,
  TrendingUp,
  Activity,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isDeveloperRole } from "@/lib/navigation";
import { useGetWorkspaceDashboard } from "@/api";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  DashboardPageHeader,
  DashboardFilterBar,
  DashboardSectionLabel,
  DashboardPipelineFlow,
} from "@/components/dashboard/dashboard-page-kit";
import {
  DashboardSkeleton,
  QuickAction,
} from "@/components/dashboard/dashboard-kit";
import { toast } from "sonner";
import {
  ChartPanel,
  ChartGridCell,
  ChartEmptyState,
  DashboardTrendChart,
  DashboardPipelineChart,
  DashboardSeverityChart,
} from "@/components/dashboard/admin-dashboard-charts";
import { WorkspaceRecentProjectsList } from "@/components/dashboard/WorkspaceRecentProjectsList";
import { cn } from "@/lib/utils";
import { getProjectDetailHref } from "@/lib/project-routes";

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

function milestoneStatusClass(status: string) {
  switch (status) {
    case "completed":
      return "border-green-500/40 text-green-600 dark:text-green-400";
    case "ongoing":
      return "border-amber-500/40 text-amber-600 dark:text-amber-400";
    case "delayed":
      return "border-rose-500/40 text-rose-600 dark:text-rose-400";
    default:
      return "border-blue-500/40 text-blue-600 dark:text-blue-400";
  }
}

function formatMilestoneDue(plannedDate: string) {
  const date = new Date(plannedDate);
  if (Number.isNaN(date.getTime())) return "—";
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (daysLeft < 0) return `${label} · ${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return `${label} · due today`;
  if (daysLeft <= 7) return `${label} · ${daysLeft}d left`;
  return label;
}

export default function StaffDevWorkspace() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("6m");
  const { data, isLoading, isError } = useGetWorkspaceDashboard();

  if (!user) return null;
  if (user.role === "super_admin") {
    // Safety net — Super Admin must never see the personal developer hub.
    return null;
  }
  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Unable to load workspace dashboard. Please refresh or try again later.
      </div>
    );
  }

  const role = data.role ?? user.role ?? "developer";
  const projectDetailHref = (projectId: number | string) => getProjectDetailHref(projectId, role);
  const isTester = role === "tester" || role === "qa";
  const isDeveloper = isDeveloperRole(role);
  const isPortalStaff = isDeveloper || isTester;
  const canReportBugs = isTester;
  const kpis = data.kpis;

  const pipelineData = [
    { name: "Scoping", value: data.projectPipeline.scoping },
    { name: "In Progress", value: data.projectPipeline.inProgress },
    { name: "UAT", value: data.projectPipeline.uat },
    { name: "On Hold", value: data.projectPipeline.onHold },
    { name: "Done", value: data.projectPipeline.completed },
    { name: "Maintenance", value: data.projectPipeline.maintenance },
  ].filter((d) => d.value > 0);

  const bugData = [
    { name: "Critical", value: data.bugSeverityBreakdown.critical, color: "#ef4444" },
    { name: "High", value: data.bugSeverityBreakdown.high, color: "#f97316" },
    { name: "Medium", value: data.bugSeverityBreakdown.medium, color: "#f59e0b" },
    { name: "Low", value: data.bugSeverityBreakdown.low, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  const logHoursTrend = data.trends.logHours.map((h) => ({
    month: h.week,
    count: h.hours,
  }));

  const bugTrends = data.trends.bugs.map((b) => ({
    month: formatTrendMonth(b.month),
    count: b.count,
  }));

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const myMilestones = data.myMilestones ?? [];

  const quickActions = isTester
    ? [
        { title: "My projects", description: "Ongoing assignments and deadlines", icon: Briefcase, href: "/dev/projects", accent: "sky" as const },
        { title: "Report bug", description: "Log a new defect with steps and attachments", icon: Bug, href: "/dev/bugs", accent: "red" as const },
        { title: "Bug tracker", description: "Review open and in-progress issues", icon: FlaskConical, href: "/dev/bugs", accent: "amber" as const },
        { title: "Tickets", description: "Support and client requests", icon: Ticket, href: "/admin/tickets", accent: "violet" as const },
        { title: "Discussions", description: "Project threads and updates", icon: MessageSquare, href: "/discussions", accent: "sky" as const },
      ]
    : [
        { title: "My projects", description: "Ongoing assignments and deadlines", icon: Briefcase, href: "/dev/projects", accent: "sky" as const },
        { title: "Log today", description: "Record hours and tasks for your projects", icon: Clock, href: "/dev/logs", accent: "primary" as const },
        { title: "Upload release", description: "Ship a new APK build to clients", icon: Smartphone, href: "/dev/apk", accent: "green" as const },
        { title: canReportBugs ? "Report bug" : "Bug tracker", description: canReportBugs ? "File a new issue" : "Update status and assignees", icon: Bug, href: "/dev/bugs", accent: "red" as const },
        { title: "Resource request", description: "Request tools, access, or assets", icon: FileText, href: "/dev/requests", accent: "amber" as const },
        { title: "Support tickets", description: "Raise and track tickets you have submitted", icon: Ticket, href: "/admin/tickets", accent: "violet" as const },
      ];

  const pipelineFlowStages = pipelineData.map((d, i) => ({
    label: d.name,
    value: d.value,
    color: [
      "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300",
      "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
      "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
      "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
      "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
      "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
    ][i % 6],
  }));

  const primaryKpis = [
    { title: "My projects", value: kpis.projects, hint: `${kpis.activeDevProjects} active · ${kpis.maintenanceProjects} maintenance`, icon: Briefcase, href: "/dev/projects", accent: "blue" as const, delay: 0 },
    { title: "Open bugs", value: kpis.openBugs, hint: isDeveloper && kpis.bugsAssigned != null ? `${kpis.bugsAssigned} assigned to you` : "Needs attention", icon: Bug, href: "/dev/bugs", accent: "red" as const, alert: kpis.openBugs > 0, delay: 1 },
    { title: "Open tickets", value: kpis.openTickets, hint: isDeveloper ? "Tickets you raised" : "Support queue", icon: Ticket, href: "/admin/tickets", accent: "violet" as const, alert: kpis.openTickets > 0, delay: 2 },
    { title: "Notifications", value: kpis.unreadNotifications, hint: "Unread alerts", icon: Bell, href: "/notifications", accent: "sky" as const, alert: kpis.unreadNotifications > 0, delay: 3 },
  ];

  const secondaryKpis = [
    ...(isDeveloper && kpis.hoursThisWeek != null
      ? [{ title: "Hours this week", value: kpis.hoursThisWeek, hint: "Logged time", icon: Clock, href: "/dev/logs", accent: "green" as const, delay: 4 }]
      : []),
    ...(isPortalStaff && kpis.milestonesAssigned != null
      ? [{
          title: "My milestones",
          value: kpis.milestonesAssigned,
          hint: "Assigned to you",
          icon: MapPin,
          href: "/dev/projects",
          accent: "violet" as const,
          alert: kpis.milestonesAssigned > 0,
          delay: 5,
        }]
      : []),
    ...(isTester && kpis.bugsReported != null
      ? [{ title: "Bugs reported", value: kpis.bugsReported, hint: "Issues you filed", icon: FlaskConical, href: "/dev/bugs", accent: "amber" as const, alert: kpis.bugsReported > 0, delay: 4 }]
      : []),
  ];

  return (
    <PortalPageShell>
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <DashboardPageHeader
        title={`${getGreeting()}, ${user.name.split(" ")[0]}`}
        description={
          data.attentionCount > 0
            ? `${data.attentionCount} item${data.attentionCount === 1 ? "" : "s"} need attention · ${today}`
            : isTester
              ? `Quality overview · ${today}`
              : `Your delivery hub · ${today}`
        }
        breadcrumbs={[{ label: "Delivery", href: "/dev" }, { label: "Workspace" }]}
      />

      <DashboardFilterBar
        period={period}
        onPeriodChange={setPeriod}
        onExport={() => toast.success("Workspace summary export started")}
      />

      <DashboardPipelineFlow title="Your project pipeline" stages={pipelineFlowStages} />

      <div className="space-y-2">
        <DashboardSectionLabel title="Workspace KPIs" />
        <PortalKpiGrid columns={4} count={4} items={primaryKpis} />
      </div>

      {secondaryKpis.length > 0 && (
        <div className="space-y-2">
          <DashboardSectionLabel title="Activity" />
          <PortalKpiGrid columns={4} count={secondaryKpis.length} items={secondaryKpis} />
        </div>
      )}

      {isPortalStaff && (
        <section>
          <ChartPanel
            title="My milestones"
            description="Phases assigned to you across your projects"
            icon={MapPin}
            accent="violet"
            badge={myMilestones.length}
          >
            {myMilestones.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {myMilestones.map((milestone) => (
                  <Link key={milestone.id} href={projectDetailHref(milestone.projectId)}>
                    <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 hover:bg-muted/40 transition-colors h-full">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-2 leading-snug">{milestone.title}</p>
                        <Badge
                          variant="outline"
                          className={cn("text-[8px] shrink-0 capitalize h-4 px-1", milestoneStatusClass(milestone.status))}
                        >
                          {milestone.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{milestone.projectName}</p>
                      <p className={cn(
                        "text-[10px] mt-0.5 font-medium",
                        milestone.status === "delayed" || new Date(milestone.plannedDate).getTime() < Date.now()
                          ? "text-rose-500"
                          : "text-muted-foreground",
                      )}>
                        {formatMilestoneDue(milestone.plannedDate)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <ChartEmptyState message="No milestones assigned to you yet." icon={MapPin} />
            )}
          </ChartPanel>
        </section>
      )}

      <section>
        <DashboardSectionLabel title="Quick actions" className="mb-3" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, i) => (
            <QuickAction key={`${action.href}-${action.title}`} {...action} delay={i} />
          ))}
        </div>
      </section>

      <motion.section
        className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-start"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        aria-label="Workspace analytics"
      >
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch min-h-[340px] lg:min-h-[380px]">
          <ChartGridCell colSpan={8}>
            <ChartPanel
              title="Recent projects"
              description="Your latest assignments and progress"
              icon={Briefcase}
              accent="blue"
              viewAllHref="/dev/projects"
              badge={kpis.projects}
            >
              {data.recentProjects.length > 0 ? (
                <WorkspaceRecentProjectsList
                  projects={data.recentProjects}
                  totalCount={kpis.projects}
                  getProjectHref={projectDetailHref}
                  statusBadgeClass={projectStatusBadgeClass}
                />
              ) : (
                <ChartEmptyState message="No projects assigned yet." icon={Briefcase} />
              )}
            </ChartPanel>
          </ChartGridCell>

          <div className="lg:col-span-4 grid min-h-0 grid-rows-2 gap-3">
            <div className="flex min-h-0 flex-col">
            <ChartPanel
              title="Project pipeline"
              description="Status across your portfolio"
              icon={Layers}
              accent="blue"
            >
              {pipelineData.length > 0 ? (
                <DashboardPipelineChart data={pipelineData} />
              ) : (
                <ChartEmptyState message="No projects in your pipeline yet." icon={Layers} />
              )}
            </ChartPanel>
            </div>
            <div className="flex min-h-0 flex-col">
              <ChartPanel title="Bug severity" description="Open issues by priority" icon={Bug} accent="rose">
              {bugData.length > 0 ? (
                <DashboardSeverityChart data={bugData} />
              ) : (
                <ChartEmptyState message="No open bugs in your scope." icon={Bug} />
              )}
              </ChartPanel>
            </div>
          </div>
        </div>

        <ChartGridCell colSpan={4} className="min-h-[280px]">
          <ChartPanel
            title={isDeveloper ? "Log hours trend" : "Bugs reported"}
            description={isDeveloper ? "Weekly hours · last 8 weeks" : "Issues filed · last 6 months"}
            icon={TrendingUp}
            accent="blue"
          >
            {isDeveloper ? (
              logHoursTrend.length > 0 ? (
                <DashboardTrendChart
                  data={logHoursTrend}
                  stroke="#22c55e"
                  gradientId="devLogGrad"
                  summaryLabel="Total hours"
                />
              ) : (
                <ChartEmptyState message="Log daily hours to see your trend here." icon={Clock} />
              )
            ) : bugTrends.length > 0 ? (
              <DashboardTrendChart
                data={bugTrends}
                stroke="hsl(var(--primary))"
                gradientId="qaBugGrad"
                summaryLabel="Total reported"
              />
            ) : (
              <ChartEmptyState message="Report bugs to see your activity trend." icon={Bug} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <ChartGridCell colSpan={8} className="min-h-[280px]">
          <ChartPanel
            title="Open bugs"
            description="Latest issues in your projects"
            icon={Activity}
            accent="amber"
            viewAllHref="/dev/bugs"
            badge={data.recentBugs.length}
          >
            {data.recentBugs.length > 0 ? (
              <div className="space-y-2">
                {data.recentBugs.map((bug) => (
                  <Link key={bug.id} href="/dev/bugs">
                    <div className="rounded-lg border border-border/40 px-3 py-2.5 hover:bg-muted/40 transition-colors block">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-1">{bug.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] shrink-0 capitalize",
                            bug.severity === "critical" && "border-red-500/50 text-red-500",
                            bug.severity === "high" && "border-orange-500/50 text-orange-500",
                          )}
                        >
                          {bug.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {bug.bugNumber} · {bug.projectName}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <ChartEmptyState message="No recent bugs in your projects." icon={Bug} />
            )}
          </ChartPanel>
        </ChartGridCell>

        {isDeveloper && (
          <ChartGridCell colSpan={12} className="min-h-[200px]">
            <ChartPanel
              title="Recent logs"
              description="Latest daily entries"
              icon={Clock}
              accent="emerald"
              viewAllHref="/dev/logs"
            >
              {data.recentLogs.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border/40 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-1">{log.taskTitle}</p>
                        <span className="text-xs font-bold text-primary shrink-0">{log.hoursSpent}h</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {log.projectName} · {log.logDate}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <ChartEmptyState message="No logs yet. Start logging your daily work." icon={Clock} />
              )}
            </ChartPanel>
          </ChartGridCell>
        )}
      </motion.section>
    </motion.div>
    </PortalPageShell>
  );
}
