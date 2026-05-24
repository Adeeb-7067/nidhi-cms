import { Link } from "wouter";
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
  LayoutDashboard,
  Layers,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetWorkspaceDashboard } from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DashboardHero,
  ExecutiveStatCard,
  DashboardSkeleton,
  QuickAction,
} from "@/components/dashboard/dashboard-kit";
import {
  ChartPanel,
  ChartGridCell,
  ChartEmptyState,
  DashboardTrendChart,
  DashboardPipelineChart,
  DashboardSeverityChart,
} from "@/components/dashboard/admin-dashboard-charts";
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

const ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  tester: "QA / Tester",
  qa: "QA / Tester",
  super_admin: "Super Admin",
};

export default function DevWorkspace() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useGetWorkspaceDashboard();

  if (!user) return null;
  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Unable to load workspace dashboard. Please refresh or try again later.
      </div>
    );
  }

  const role = data.role ?? user.role ?? "developer";
  const isTester = role === "tester" || role === "qa";
  const isDeveloper = role === "developer";
  const canReportBugs = isTester || role === "super_admin";
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

  const quickActions = isTester
    ? [
        { title: "My projects", description: "Ongoing assignments and deadlines", icon: Briefcase, href: "/dev/projects", accent: "sky" as const },
        { title: "Report bug", description: "Log a new defect with steps and attachments", icon: Bug, href: "/dev/bugs", accent: "red" as const },
        { title: "Bug tracker", description: "Review open and in-progress issues", icon: FlaskConical, href: "/dev/bugs", accent: "amber" as const },
        { title: "Tickets", description: "Support and client requests", icon: Ticket, href: "/admin/tickets", accent: "violet" as const },
        { title: "Discussions", description: "Project threads and updates", icon: MessageSquare, href: "/admin/discussions", accent: "sky" as const },
      ]
    : [
        { title: "My projects", description: "Ongoing assignments and deadlines", icon: Briefcase, href: "/dev/projects", accent: "sky" as const },
        { title: "Log today", description: "Record hours and tasks for your projects", icon: Clock, href: "/dev/logs", accent: "primary" as const },
        { title: "Upload release", description: "Ship a new APK build to clients", icon: Smartphone, href: "/dev/apk", accent: "green" as const },
        { title: canReportBugs ? "Report bug" : "Bug tracker", description: canReportBugs ? "File a new issue" : "Update status and assignees", icon: Bug, href: "/dev/bugs", accent: "red" as const },
        { title: "Resource request", description: "Request tools, access, or assets", icon: FileText, href: "/dev/requests", accent: "amber" as const },
        { title: "Support tickets", description: "Raise and track tickets you have submitted", icon: Ticket, href: "/admin/tickets", accent: "violet" as const },
      ];

  return (
    <motion.div
      className="space-y-4 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <DashboardHero
        title={`${getGreeting()}, ${user.name.split(" ")[0]}`}
        subtitle={
          data.attentionCount > 0
            ? `${data.attentionCount} item${data.attentionCount === 1 ? "" : "s"} need attention · ${today}`
            : isTester
              ? `Quality overview · ${today}`
              : `Your delivery hub · ${today}`
        }
        badge={ROLE_LABELS[role] ?? role}
        actions={
          role === "super_admin" ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Admin dashboard
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveStatCard
          title="My Projects"
          value={kpis.projects}
          hint={`${kpis.activeDevProjects} active · ${kpis.maintenanceProjects} maintenance`}
          icon={Briefcase}
          href="/dev/projects"
          accent="blue"
          delay={0}
        />
        <ExecutiveStatCard
          title="Open Bugs"
          value={kpis.openBugs}
          hint={isDeveloper && kpis.bugsAssigned != null ? `${kpis.bugsAssigned} assigned to you` : "Needs attention"}
          icon={Bug}
          href="/dev/bugs"
          accent="red"
          alert={kpis.openBugs > 0}
          delay={1}
        />
        <ExecutiveStatCard
          title="Open Tickets"
          value={kpis.openTickets}
          hint={isDeveloper ? "Tickets you raised" : "Support queue"}
          icon={Ticket}
          href="/admin/tickets"
          accent="violet"
          alert={kpis.openTickets > 0}
          delay={2}
        />
        <ExecutiveStatCard
          title="Notifications"
          value={kpis.unreadNotifications}
          hint="Unread"
          icon={Bell}
          href="/notifications"
          accent="sky"
          alert={kpis.unreadNotifications > 0}
          delay={3}
        />
      </div>

      {(isDeveloper || isTester) && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {isDeveloper && kpis.hoursThisWeek != null && (
            <ExecutiveStatCard
              title="Hours This Week"
              value={kpis.hoursThisWeek}
              hint="Logged time"
              icon={Clock}
              href="/dev/logs"
              accent="green"
              delay={4}
            />
          )}
          {isTester && kpis.bugsReported != null && (
            <ExecutiveStatCard
              title="Bugs Reported"
              value={kpis.bugsReported}
              hint="Open issues you filed"
              icon={FlaskConical}
              href="/dev/bugs"
              accent="amber"
              alert={kpis.bugsReported > 0}
              delay={4}
            />
          )}
        </div>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Quick actions
        </p>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, i) => (
            <QuickAction key={`${action.href}-${action.title}`} {...action} delay={i} />
          ))}
        </div>
      </section>

      <motion.section
        className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-stretch"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        aria-label="Workspace analytics"
      >
        <ChartGridCell colSpan={8} className="min-h-[340px] lg:min-h-[380px]">
          <ChartPanel
            title="Recent projects"
            description="Your latest assignments and progress"
            icon={Briefcase}
            accent="blue"
            viewAllHref="/dev/projects"
            badge={data.recentProjects.length}
          >
            {data.recentProjects.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {data.recentProjects.map((project) => (
                  <Link key={project.id} href={getProjectDetailHref(project.id)}>
                    <div className="group rounded-xl border border-border/60 p-3 transition-all hover:border-primary/30 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-primary">{project.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {project.companyName ?? "Project"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                          {project.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Progress</span>
                          <span className="font-medium text-foreground">{project.completionPct}%</span>
                        </div>
                        <Progress value={project.completionPct} className="h-1.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <ChartEmptyState message="No projects assigned yet." icon={Briefcase} />
            )}
          </ChartPanel>
        </ChartGridCell>

        <div className="lg:col-span-4 grid grid-rows-2 gap-3 min-h-[340px] lg:min-h-[380px]">
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
  );
}
