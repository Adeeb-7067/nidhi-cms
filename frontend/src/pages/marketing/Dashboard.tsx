import { useMemo } from "react";
import { Link } from "wouter";
import { format, parseISO, isValid } from "date-fns";
import {
  CheckSquare,
  Clock,
  Megaphone,
  Calendar,
  Building2,
  TrendingUp,
  ArrowRight,
  Activity,
  BarChart3,
  AlertTriangle,
  FolderOpen,
  Palette,
  Film,
  FileText,
  Target,
  IndianRupee,
  Gauge,
  Layers,
  Share2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMarketingDashboard } from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingDonutPanel,
  MarketingDualLineChart,
  MarketingBarChart,
  MarketingStatusBadge,
} from "@/modules/marketing/components";
import {
  TASK_STATUS_LABELS,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  APPROVAL_STAGE_LABELS,
  PLATFORM_LABELS,
  PACKAGE_LABELS,
  POST_SCHEDULE_STATUS_LABELS,
  formatCompactCurrency,
} from "@/modules/marketing/constants";
import type {
  TaskStatus,
  TaskCategory,
  TaskPriority,
  MarketingPackage,
} from "@/modules/marketing/types";
import { cn } from "@/lib/utils";

function labelOf<T extends string>(map: Record<T, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? key.replace(/_/g, " ");
}

function NoDataPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="h-8 w-8 opacity-20" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Skeleton className="h-[280px] rounded-xl lg:col-span-8" />
        <Skeleton className="h-[280px] rounded-xl lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Skeleton className="h-[260px] rounded-xl lg:col-span-4" />
        <Skeleton className="h-[260px] rounded-xl lg:col-span-4" />
        <Skeleton className="h-[260px] rounded-xl lg:col-span-4" />
      </div>
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { ClockInButton } from "@/components/ClockInButton";

export default function MarketingDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useMarketingDashboard();
  const isAdmin = user?.role === "super_admin" || user?.role === "hr";

  const kpis = data?.kpis;
  const openTasks = kpis?.openTasks ?? kpis?.todaysTasks ?? 0;

  const labeled = useMemo(() => {
    const mapRows = (
      rows: { name: string; value: number }[] | undefined,
      labels: Record<string, string>,
    ) =>
      (rows ?? []).map((r) => ({
        name: labelOf(labels, r.name),
        value: r.value,
        count: r.value,
      }));

    return {
      tasksByStatus: mapRows(data?.tasksByStatus, TASK_STATUS_LABELS),
      tasksByCategory: mapRows(data?.tasksByCategory, TASK_CATEGORY_LABELS),
      tasksByPriority: mapRows(data?.tasksByPriority, TASK_PRIORITY_LABELS),
      approvalsByStage: mapRows(data?.approvalsByStage, APPROVAL_STAGE_LABELS),
      postsByPlatform: mapRows(data?.postsByPlatform, PLATFORM_LABELS),
      postsByStatus: mapRows(data?.postsByStatus, POST_SCHEDULE_STATUS_LABELS),
      accountsByPackage: mapRows(data?.accountsByPackage, PACKAGE_LABELS),
      campaignsByNetwork: (data?.campaignsByNetwork ?? []).map((r) => ({
        name: r.name === "meta" ? "Meta" : r.name === "google" ? "Google" : r.name,
        value: r.value,
      })),
    };
  }, [data]);

  const activityTrend = useMemo(
    () =>
      (data?.activityTrend ?? []).map((row) => {
        const d = parseISO(row.date);
        return {
          day: isValid(d) ? format(d, "MMM d") : row.date,
          activity: row.activity,
          completed: row.completed,
        };
      }),
    [data?.activityTrend],
  );

  const topAccounts = data?.topAccounts ?? [];
  const upcomingDeadlines = data?.upcomingDeadlines ?? [];
  const digitalTeam = data?.digitalTeam ?? [];
  const activity = data?.activity ?? [];
  const maxScore = Math.max(100, ...topAccounts.map((a) => a.performanceScore), 1);

  if (!isAdmin) {
    return (
      <PortalPageShell>
        <MarketingPageHeader
          title={`Welcome back, ${user?.name?.split(" ")[0] || "Digital Specialist"} 👋`}
          description="Your personal digital workspace — assigned tasks, daily work logs, and active deadlines"
          breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "My Workspace" }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ClockInButton />
              <Button size="sm" variant="outline" className="h-9 gap-1.5" asChild>
                <Link href="/dev/logs">
                  <Clock className="h-3.5 w-3.5 text-blue-500" /> Daily Work Logs
                </Link>
              </Button>
              <Button size="sm" className="h-9 gap-1.5 bg-primary font-medium shadow-sm" asChild>
                <Link href="/marketing/tasks">
                  <CheckSquare className="h-3.5 w-3.5" /> My Tasks
                </Link>
              </Button>
            </div>
          }
        />

        {isLoading && !data ? (
          <DashboardSkeleton />
        ) : isError && !data ? (
          <MarketingEmptyState
            title="Couldn't load your workspace"
            description="Check that the server is running and try refreshing."
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        ) : (
          <div className="space-y-6">
            {/* Employee Operational KPIs */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Work Overview
              </p>
              <PortalKpiGrid
                columns={4}
                count={8}
                items={[
                  {
                    title: "My Open Tasks",
                    value: openTasks,
                    hint: "Assigned active tasks",
                    icon: CheckSquare,
                    accent: "blue",
                    href: "/marketing/tasks",
                    delay: 0,
                  },
                  {
                    title: "Overdue Tasks",
                    value: kpis?.overdueTasks ?? 0,
                    hint: "Requires attention",
                    icon: AlertTriangle,
                    accent: "amber",
                    alert: (kpis?.overdueTasks ?? 0) > 0,
                    href: "/marketing/tasks",
                    delay: 1,
                  },
                  {
                    title: "Done This Week",
                    value: kpis?.completedThisWeek ?? 0,
                    hint: "My completed tasks",
                    icon: Target,
                    accent: "green",
                    href: "/marketing/tasks",
                    delay: 2,
                  },
                  {
                    title: "Pending Approvals",
                    value: kpis?.pendingApprovals ?? 0,
                    hint: "Deliverables in review",
                    icon: Clock,
                    accent: "amber",
                    href: "/marketing/approvals",
                    delay: 3,
                  },
                  {
                    title: "Graphics Queue",
                    value: kpis?.graphicsCount ?? 0,
                    hint: "Assigned design requests",
                    icon: Palette,
                    accent: "violet",
                    href: "/marketing/graphics",
                    delay: 4,
                  },
                  {
                    title: "Videos in Editing",
                    value: kpis?.videosInFlight ?? 0,
                    hint: "Reels / video renders",
                    icon: Film,
                    accent: "amber",
                    href: "/marketing/videos",
                    delay: 5,
                  },
                  {
                    title: "Scheduled Posts",
                    value: kpis?.postsScheduled ?? 0,
                    hint: "Content calendar",
                    icon: Calendar,
                    accent: "blue",
                    href: "/marketing/calendar",
                    delay: 6,
                  },
                  {
                    title: "Assigned Projects",
                    value: kpis?.clientCount ?? 0,
                    hint: "Active client workspaces",
                    icon: Building2,
                    accent: "violet",
                    href: "/marketing/projects",
                    delay: 7,
                  },
                ]}
              />
            </div>

            {/* Employee Work Center */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Upcoming Deadlines & Tasks */}
              <div className="lg:col-span-8">
                <ChartPanel
                  title="My Upcoming Deadlines & Priority Tasks"
                  description="Tasks assigned to you requiring attention"
                  icon={Calendar}
                  accent="amber"
                  viewAllHref="/marketing/tasks"
                  badge={upcomingDeadlines.filter((t) => t.overdue).length || undefined}
                  className="min-h-[340px]"
                >
                  {upcomingDeadlines.length === 0 ? (
                    <div className="flex h-[220px] flex-col items-center justify-center text-center p-4">
                      <CheckSquare className="h-10 w-10 text-emerald-500/30 mb-2" />
                      <p className="text-sm font-medium">All caught up!</p>
                      <p className="text-xs text-muted-foreground max-w-xs mt-1">
                        You have no upcoming task deadlines assigned at the moment.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-lg border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-[11px]">Task Title</TableHead>
                            <TableHead className="text-[11px]">Project / Client</TableHead>
                            <TableHead className="text-[11px]">Priority</TableHead>
                            <TableHead className="text-[11px] text-right">Deadline</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingDeadlines.map((t) => (
                            <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="py-2.5 text-xs">
                                <div className="font-semibold leading-snug text-foreground">{t.title}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {labelOf(TASK_CATEGORY_LABELS, t.category as TaskCategory)}
                                  {" · "}
                                  <span className="font-medium text-foreground/80">
                                    {labelOf(TASK_STATUS_LABELS, t.status as TaskStatus)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[140px] truncate py-2.5 text-xs text-muted-foreground">
                                {t.clientName}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <MarketingStatusBadge
                                  variant="priority"
                                  value={t.priority as TaskPriority}
                                />
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "whitespace-nowrap py-2.5 text-right text-xs tabular-nums font-medium",
                                  t.overdue
                                    ? "text-red-600 dark:text-red-400 font-semibold"
                                    : "text-muted-foreground",
                                )}
                              >
                                {t.deadline
                                  ? format(new Date(t.deadline), "MMM d, yyyy")
                                  : "No deadline"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </ChartPanel>
              </div>

              {/* Task Breakdown & Activity Stream */}
              <div className="space-y-4 lg:col-span-4">
                <ChartPanel
                  title="My Tasks by Category"
                  description="Capacity & workload distribution"
                  icon={Layers}
                  accent="amber"
                  viewAllHref="/marketing/tasks"
                  className="min-h-[220px]"
                >
                  {labeled.tasksByCategory.length ? (
                    <MarketingBarChart
                      data={labeled.tasksByCategory}
                      dataKey="value"
                      color="#f59e0b"
                    />
                  ) : (
                    <NoDataPlaceholder label="No task category breakdown yet" />
                  )}
                </ChartPanel>

                <ChartPanel
                  title="My Work Log & Activity"
                  description="Recent task updates and log entries"
                  icon={Activity}
                  accent="emerald"
                  className="min-h-[240px]"
                >
                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                    {activity.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2 text-center">
                        Your recent activity will appear here as you log tasks and update deliverables.
                      </p>
                    ) : (
                      activity.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 text-xs shadow-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug">{a.message}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {a.timestamp
                                ? format(new Date(a.timestamp), "MMM d, h:mm a")
                                : ""}
                              {a.type ? ` · ${a.type}` : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ChartPanel>
              </div>
            </div>
          </div>
        )}
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Marketing Dashboard"
        description="Live Digital ops — workload, pipeline, ads, and delivery health"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Dashboard" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href="/marketing/tasks">
                Tasks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href="/marketing/performance">
                Performance <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : isError && !data ? (
        <MarketingEmptyState
          title="Couldn't load dashboard"
          description="Check that the API is running and you have Digital permissions."
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Operations
            </p>
            <PortalKpiGrid
              columns={4}
              count={8}
              items={[
                {
                  title: "Open tasks",
                  value: openTasks,
                  hint: "Active pipeline",
                  icon: CheckSquare,
                  accent: "blue",
                  href: "/marketing/tasks",
                  delay: 0,
                },
                {
                  title: "Overdue",
                  value: kpis?.overdueTasks ?? 0,
                  hint: "Past deadline",
                  icon: AlertTriangle,
                  accent: "amber",
                  alert: (kpis?.overdueTasks ?? 0) > 0,
                  href: "/marketing/tasks",
                  delay: 1,
                },
                {
                  title: "Done this week",
                  value: kpis?.completedThisWeek ?? 0,
                  hint: "Completed tasks",
                  icon: Target,
                  accent: "green",
                  href: "/marketing/tasks",
                  delay: 2,
                },
                {
                  title: "Pending approvals",
                  value: kpis?.pendingApprovals ?? 0,
                  hint: "Awaiting review",
                  icon: Clock,
                  accent: "amber",
                  href: "/marketing/approvals",
                  delay: 3,
                },
                {
                  title: "Posts scheduled",
                  value: kpis?.postsScheduled ?? 0,
                  hint: "Content calendar",
                  icon: Calendar,
                  accent: "blue",
                  href: "/marketing/calendar",
                  delay: 4,
                },
                {
                  title: "Published (30d)",
                  value: kpis?.postsPublishedMonth ?? 0,
                  hint: "Last 30 days",
                  icon: Share2,
                  accent: "violet",
                  href: "/marketing/social",
                  delay: 5,
                },
                {
                  title: "Ads running",
                  value: kpis?.adsRunning ?? 0,
                  hint: "Active campaigns",
                  icon: Megaphone,
                  accent: "green",
                  href: "/marketing/meta-ads",
                  delay: 6,
                },
                {
                  title: "Avg score",
                  value: `${kpis?.performanceScore ?? 0}%`,
                  hint: "Account health",
                  icon: Gauge,
                  accent: "green",
                  href: "/marketing/performance",
                  delay: 7,
                },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio & production
            </p>
            <PortalKpiGrid
              columns={4}
              count={8}
              items={[
                {
                  title: "Digital projects",
                  value: kpis?.clientCount ?? 0,
                  hint: `${kpis?.activeAccounts ?? 0} active accounts`,
                  icon: Building2,
                  accent: "violet",
                  href: "/marketing/projects",
                  delay: 0,
                },
                {
                  title: "Active budget",
                  value: formatCompactCurrency(kpis?.activeBudget ?? 0),
                  hint: "Monthly retainers",
                  icon: IndianRupee,
                  accent: "green",
                  href: "/marketing/projects",
                  delay: 1,
                },
                {
                  title: "Campaign budget",
                  value: formatCompactCurrency(kpis?.campaignBudget ?? 0),
                  hint: "Meta + Google",
                  icon: Megaphone,
                  accent: "blue",
                  href: "/marketing/meta-ads",
                  delay: 2,
                },
                {
                  title: "Ad leads",
                  value: (kpis?.totalLeads ?? 0).toLocaleString("en-IN"),
                  hint: `${(kpis?.totalReach ?? 0).toLocaleString("en-IN")} reach`,
                  icon: TrendingUp,
                  accent: "sky",
                  href: "/marketing/meta-ads",
                  delay: 3,
                },
                {
                  title: "Media files",
                  value: kpis?.mediaFiles ?? 0,
                  hint: "Vault assets",
                  icon: FolderOpen,
                  accent: "blue",
                  href: "/marketing/media",
                  delay: 4,
                },
                {
                  title: "Graphics",
                  value: kpis?.graphicsCount ?? 0,
                  hint: "Design queue",
                  icon: Palette,
                  accent: "violet",
                  href: "/marketing/graphics",
                  delay: 5,
                },
                {
                  title: "Videos in flight",
                  value: kpis?.videosInFlight ?? 0,
                  hint: "Editing / render",
                  icon: Film,
                  accent: "amber",
                  href: "/marketing/videos",
                  delay: 6,
                },
                {
                  title: "Content in review",
                  value: kpis?.contentDrafts ?? 0,
                  hint: "Copy & blogs",
                  icon: FileText,
                  accent: "sky",
                  href: "/marketing/content",
                  delay: 7,
                },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trends & mix
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <ChartGridCell colSpan={8}>
                <ChartPanel
                  title="Activity & completions"
                  description="Last 14 days — ops activity vs tasks completed"
                  icon={TrendingUp}
                  accent="emerald"
                >
                  {activityTrend.some((r) => r.activity > 0 || r.completed > 0) ? (
                    <MarketingDualLineChart
                      data={activityTrend}
                      xKey="day"
                      line1Key="activity"
                      line2Key="completed"
                      line1Label="Activity"
                      line2Label="Tasks completed"
                      line1Color="#3b82f6"
                      line2Color="#22c55e"
                    />
                  ) : (
                    <NoDataPlaceholder label="No activity in the last 14 days yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Tasks by status"
                  description={`${openTasks} open in pipeline`}
                  icon={CheckSquare}
                  accent="violet"
                  viewAllHref="/marketing/tasks"
                >
                  {labeled.tasksByStatus.length ? (
                    <MarketingDonutPanel data={labeled.tasksByStatus} />
                  ) : (
                    <NoDataPlaceholder label="No tasks yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Work by category"
                  description="Where capacity is going"
                  icon={Layers}
                  accent="amber"
                  viewAllHref="/marketing/tasks"
                >
                  {labeled.tasksByCategory.length ? (
                    <MarketingBarChart
                      data={labeled.tasksByCategory}
                      dataKey="value"
                      color="#f59e0b"
                    />
                  ) : (
                    <NoDataPlaceholder label="No category data yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Approval pipeline"
                  description="Review stages across deliverables"
                  icon={Clock}
                  accent="blue"
                  viewAllHref="/marketing/approvals"
                >
                  {labeled.approvalsByStage.length ? (
                    <MarketingDonutPanel data={labeled.approvalsByStage} />
                  ) : (
                    <NoDataPlaceholder label="No approvals yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Posts by platform"
                  description="Calendar distribution"
                  icon={Share2}
                  accent="emerald"
                  viewAllHref="/marketing/calendar"
                >
                  {labeled.postsByPlatform.length ? (
                    <MarketingBarChart
                      data={labeled.postsByPlatform}
                      dataKey="value"
                      color="#10b981"
                    />
                  ) : (
                    <NoDataPlaceholder label="No posts yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Priority mix"
                  description="Task urgency breakdown"
                  icon={AlertTriangle}
                  accent="rose"
                >
                  {labeled.tasksByPriority.length ? (
                    <MarketingDonutPanel data={labeled.tasksByPriority} />
                  ) : (
                    <NoDataPlaceholder label="No priority data yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Package mix"
                  description="Accounts by retainer tier"
                  icon={Building2}
                  accent="violet"
                  viewAllHref="/marketing/projects"
                >
                  {labeled.accountsByPackage.length ? (
                    <MarketingBarChart
                      data={labeled.accountsByPackage}
                      dataKey="value"
                      color="#8b5cf6"
                    />
                  ) : (
                    <NoDataPlaceholder label="No accounts yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
              <ChartGridCell colSpan={4}>
                <ChartPanel
                  title="Ad network split"
                  description="Campaigns by channel"
                  icon={Megaphone}
                  accent="blue"
                  viewAllHref="/marketing/meta-ads"
                >
                  {labeled.campaignsByNetwork.length ? (
                    <MarketingDonutPanel
                      data={labeled.campaignsByNetwork.map((r) => ({
                        name: r.name,
                        value: r.value,
                        count: r.value,
                      }))}
                    />
                  ) : (
                    <NoDataPlaceholder label="No campaigns yet" />
                  )}
                </ChartPanel>
              </ChartGridCell>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Digital Team & Operations
            </p>
            <ChartPanel
              title="Digital Team Members"
              description={`Specialists assigned to Digital marketing operations (${digitalTeam.length})`}
              icon={Users}
              accent="blue"
              viewAllHref="/marketing/performance"
              className="min-h-[160px]"
            >
              {digitalTeam.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">
                  No users currently assigned the Digital Specialist role.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {digitalTeam.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 font-semibold text-sm dark:bg-teal-500/20 dark:text-teal-400">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-semibold text-foreground">{member.name}</p>
                          <span className="shrink-0 inline-flex items-center rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-400">
                            Digital
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{member.designation}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {member.openTasksCount} active tasks
                          </span>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {member.doneTasksCount} done
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartPanel>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Focus lists
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ChartPanel
                title="Top accounts"
                description="By performance score"
                icon={Gauge}
                accent="emerald"
                viewAllHref="/marketing/projects"
                className="min-h-[200px]"
              >
                {topAccounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Active accounts with scores will appear here.
                  </p>
                ) : (
                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {topAccounts.map((a) => (
                      <div key={a.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{a.companyName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {PACKAGE_LABELS[a.package as MarketingPackage] ?? a.package}
                              {" · "}
                              {formatCompactCurrency(a.monthlyBudgetInr)}
                            </p>
                          </div>
                          <span className="shrink-0 tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                            {a.performanceScore}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, Math.round((a.performanceScore / maxScore) * 100))}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ChartPanel>

              <ChartPanel
                title="Upcoming deadlines"
                description="Next due tasks"
                icon={Calendar}
                accent="amber"
                viewAllHref="/marketing/tasks"
                badge={upcomingDeadlines.filter((t) => t.overdue).length || undefined}
                className="min-h-[200px]"
              >
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Tasks with deadlines will show here.
                  </p>
                ) : (
                  <div className="max-h-[360px] overflow-auto rounded-lg border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-[10px]">Task</TableHead>
                          <TableHead className="text-[10px]">Client</TableHead>
                          <TableHead className="text-[10px]">Priority</TableHead>
                          <TableHead className="text-[10px] text-right">Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingDeadlines.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="py-2 text-xs">
                              <div className="font-medium leading-snug">{t.title}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {labelOf(TASK_CATEGORY_LABELS, t.category as TaskCategory)}
                                {" · "}
                                {labelOf(TASK_STATUS_LABELS, t.status as TaskStatus)}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate py-2 text-xs text-muted-foreground">
                              {t.clientName}
                            </TableCell>
                            <TableCell className="py-2">
                              <MarketingStatusBadge
                                variant="priority"
                                value={t.priority as TaskPriority}
                              />
                            </TableCell>
                            <TableCell
                              className={cn(
                                "whitespace-nowrap py-2 text-right text-xs tabular-nums",
                                t.overdue && "font-medium text-amber-700 dark:text-amber-400",
                              )}
                            >
                              {t.deadline
                                ? format(new Date(t.deadline), "MMM d")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </ChartPanel>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <ChartPanel
                title="Post schedule status"
                description="Publishing pipeline"
                icon={Calendar}
                accent="blue"
                viewAllHref="/marketing/calendar"
                className="min-h-[220px] lg:col-span-1"
              >
                {labeled.postsByStatus.length ? (
                  <MarketingDonutPanel data={labeled.postsByStatus} />
                ) : (
                  <NoDataPlaceholder label="No scheduled posts yet" />
                )}
              </ChartPanel>
              <ChartPanel
                title="Recent activity"
                description="Latest Digital ops updates"
                icon={Activity}
                accent="emerald"
                className="min-h-[220px] lg:col-span-2"
              >
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {activity.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Activity appears when you create accounts, tasks, posts, or uploads.
                    </p>
                  ) : (
                    activity.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-snug">{a.message}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {a.actor}
                            {a.timestamp
                              ? ` · ${format(new Date(a.timestamp), "MMM d, h:mm a")}`
                              : ""}
                            {a.type ? ` · ${a.type}` : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ChartPanel>
            </div>
          </div>
        </>
      )}
    </PortalPageShell>
  );
}
