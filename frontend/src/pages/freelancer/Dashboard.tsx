import { useMemo } from "react";
import { Link } from "wouter";
import { useQueries } from "@tanstack/react-query";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  ListTodo,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGetProjectMembersQueryKey,
  getProjectMembers,
  useGetWorkspaceDashboard,
  useListTasks,
  type ProjectMember,
  type WorkTask,
} from "@/api";
import { useListFreelancerEngagements, type FreelancerEngagement } from "@/api/finance";
import { useMarketingTasks, type MarketingTaskDto } from "@/api/marketing";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  DashboardPageHeader,
  DashboardSectionLabel,
} from "@/components/dashboard/dashboard-page-kit";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-kit";
import { ChartPanel, ChartEmptyState } from "@/components/dashboard/admin-dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/modules/finance/constants";
import { TASK_STATUS_LABELS, taskStatusClass } from "@/lib/task-ui";
import { getProjectDetailHref } from "@/lib/project-routes";
import { cn } from "@/lib/utils";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDue(iso: string | null | undefined) {
  if (!iso) return "No date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (daysLeft < 0) return `${label} · ${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return `${label} · due today`;
  if (daysLeft <= 7) return `${label} · ${daysLeft}d left`;
  return label;
}

function isOverdue(iso: string | null | undefined) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t < Date.now();
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

type UnifiedTask = {
  key: string;
  title: string;
  status: string;
  dueDate: string | null;
  projectLabel: string;
  href: string;
  source: "delivery" | "digital";
};

function openDevTask(t: WorkTask): boolean {
  return t.status !== "done";
}

function openMarketingTask(t: MarketingTaskDto): boolean {
  return t.status !== "done" && t.status !== "cancelled";
}

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const { data: workspace, isLoading: wsLoading } = useGetWorkspaceDashboard();
  const { data: payData, isLoading: payLoading } = useListFreelancerEngagements();
  const { data: tasksData, isLoading: tasksLoading } = useListTasks({
    scope: "mine",
    limit: 50,
    page: 1,
  });
  const { data: marketingTasksData, isLoading: mktLoading } = useMarketingTasks(undefined, {
    enabled: !!user,
  });

  const projects = workspace?.recentProjects ?? [];
  const projectIdsForTeam = useMemo(
    () => projects.slice(0, 6).map((p) => p.id),
    [projects],
  );

  const memberQueries = useQueries({
    queries: projectIdsForTeam.map((projectId) => ({
      queryKey: getGetProjectMembersQueryKey(projectId),
      queryFn: ({ signal }: { signal?: AbortSignal }) => getProjectMembers(projectId, { signal }),
      staleTime: 60_000,
      enabled: projectIdsForTeam.length > 0,
    })),
  });

  const engagements = payData?.engagements ?? [];
  const payKpis = useMemo(() => {
    const agreed = engagements.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = engagements.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = engagements.reduce((s, e) => s + e.remainingAmount, 0);
    return { agreed, paid, remaining };
  }, [engagements]);

  const upcomingPay = useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      amount: number;
      dueDate: string | null;
      projectName: string;
      projectId: number;
      projectType: string | null;
      engagement: FreelancerEngagement;
    }> = [];
    for (const e of engagements) {
      for (const inst of e.installments) {
        if (inst.status !== "pending") continue;
        rows.push({
          key: `${e.id}-${inst.id}`,
          label: inst.label,
          amount: inst.amount,
          dueDate: inst.dueDate,
          projectName: e.projectName ?? `Project #${e.projectId}`,
          projectId: e.projectId,
          projectType: e.projectType,
          engagement: e,
        });
      }
    }
    return rows
      .sort((a, b) => {
        const ta = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      })
      .slice(0, 8);
  }, [engagements]);

  const myTasks = useMemo((): UnifiedTask[] => {
    const delivery = (tasksData?.tasks ?? [])
      .filter(openDevTask)
      .map((t) => ({
        key: `dev-${t.id}`,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate ?? null,
        projectLabel: t.projectName ?? `Project #${t.projectId}`,
        href: `/dev/tasks/${t.id}`,
        source: "delivery" as const,
      }));

    const digital = (marketingTasksData?.tasks ?? [])
      .filter((t) => t.assigneeId === user?.id && openMarketingTask(t))
      .map((t) => ({
        key: `mkt-${t.id}`,
        title: t.title,
        status: t.status,
        dueDate: t.deadline ?? null,
        projectLabel: t.clientName ?? "Digital",
        href: "/marketing/tasks",
        source: "digital" as const,
      }));

    return [...delivery, ...digital]
      .sort((a, b) => {
        const ta = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      })
      .slice(0, 10);
  }, [tasksData?.tasks, marketingTasksData?.tasks, user?.id]);

  const milestones = workspace?.myMilestones ?? [];

  const teamByProject = useMemo(() => {
    return projectIdsForTeam.map((projectId, idx) => {
      const project = projects.find((p) => p.id === projectId);
      const members = (memberQueries[idx]?.data ?? []) as ProjectMember[];
      return {
        projectId,
        projectName: project?.name ?? `Project #${projectId}`,
        projectType: project?.type ?? null,
        members: members.filter((m) => m.userId !== user?.id).slice(0, 8),
        total: members.length,
      };
    });
  }, [projectIdsForTeam, projects, memberQueries, user?.id]);

  const loading = wsLoading || payLoading || tasksLoading || mktLoading;
  if (!user) return null;
  if (loading && !workspace && !payData) return <DashboardSkeleton />;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const openTaskCount = myTasks.length;
  const milestoneCount = milestones.length;
  const projectCount = workspace?.kpis.projects ?? projects.length;

  return (
    <PortalPageShell>
      <DashboardPageHeader
        title={`${getGreeting()}, ${user.name.split(" ")[0]}`}
        description={`Your freelancer hub · deadlines, tasks, team & pay · ${today}`}
        breadcrumbs={[{ label: "Freelancer", href: "/freelancer" }, { label: "Dashboard" }]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/dev/payments">
              <Wallet className="mr-2 h-4 w-4" />
              Full payment schedule
            </Link>
          </Button>
        }
      />

      <PortalKpiGrid
        columns={4}
        items={[
          {
            title: "Projects",
            value: String(projectCount),
            hint: "Assigned to you",
            icon: Briefcase,
            href: "/dev/projects",
            accent: "blue",
          },
          {
            title: "Open tasks",
            value: String(openTaskCount),
            hint: "Delivery + digital",
            icon: ListTodo,
            href: "/dev/tasks",
            accent: "violet",
            alert: openTaskCount > 0,
          },
          {
            title: "Milestones",
            value: String(milestoneCount),
            hint: "Deadlines ahead",
            icon: MapPin,
            href: "/dev/projects",
            accent: "amber",
            alert: milestones.some((m) => m.status === "delayed" || isOverdue(m.plannedDate)),
          },
          {
            title: "Pay remaining",
            value: formatCurrency(payKpis.remaining),
            hint: `${formatCurrency(payKpis.paid)} received`,
            icon: IndianRupee,
            href: "/dev/payments",
            accent: "green",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Upcoming deadlines"
          description="Milestones assigned to you"
          icon={CalendarClock}
          accent="amber"
          badge={milestones.length}
        >
          {milestones.length > 0 ? (
            <div className="space-y-2">
              {milestones.map((m) => (
                <Link
                  key={m.id}
                  href={getProjectDetailHref(m.projectId, "freelancer")}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.projectName}</p>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5 font-medium",
                        m.status === "delayed" || isOverdue(m.plannedDate)
                          ? "text-rose-500"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatDue(m.plannedDate)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] capitalize shrink-0", milestoneStatusClass(m.status))}
                  >
                    {m.status}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <ChartEmptyState message="No milestone deadlines assigned yet." icon={MapPin} />
          )}
        </ChartPanel>

        <ChartPanel
          title="Payment schedule"
          description="What you are owed on these projects"
          icon={Wallet}
          accent="emerald"
          badge={upcomingPay.length}
          viewAllHref="/dev/payments"
        >
          <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground">Agreed</p>
              <p className="font-medium">{formatCurrency(payKpis.agreed)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Received</p>
              <p className="font-medium">{formatCurrency(payKpis.paid)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Remaining</p>
              <p className="font-medium">{formatCurrency(payKpis.remaining)}</p>
            </div>
          </div>
          {upcomingPay.length > 0 ? (
            <div className="space-y-2">
              {upcomingPay.map((row) => (
                <Link
                  key={row.key}
                  href={getProjectDetailHref(row.projectId, "freelancer", row.projectType)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{row.projectName}</p>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5",
                        isOverdue(row.dueDate) ? "text-rose-500 font-medium" : "text-muted-foreground",
                      )}
                    >
                      {formatDue(row.dueDate)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{formatCurrency(row.amount)}</p>
                </Link>
              ))}
            </div>
          ) : engagements.length > 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              All scheduled payments are settled.
            </div>
          ) : (
            <ChartEmptyState
              message="No project fee set yet. Admin will add it when you join a project."
              icon={Wallet}
            />
          )}
        </ChartPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="My tasks"
          description="Open work assigned to you"
          icon={ListTodo}
          accent="violet"
          badge={myTasks.length}
          viewAllHref="/dev/tasks"
        >
          {myTasks.length > 0 ? (
            <div className="space-y-2">
              {myTasks.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {t.projectLabel}
                      <span className="ml-1.5 capitalize">· {t.source}</span>
                    </p>
                    <p
                      className={cn(
                        "text-[11px] mt-0.5",
                        isOverdue(t.dueDate) ? "text-rose-500 font-medium" : "text-muted-foreground",
                      )}
                    >
                      {formatDue(t.dueDate)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      t.source === "delivery"
                        ? taskStatusClass(t.status as WorkTask["status"])
                        : "capitalize",
                    )}
                  >
                    {t.source === "delivery"
                      ? TASK_STATUS_LABELS[t.status as WorkTask["status"]] ?? t.status
                      : t.status.replace("_", " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <ChartEmptyState message="No open tasks assigned to you." icon={ListTodo} />
          )}
        </ChartPanel>

        <ChartPanel
          title="Project team"
          description="People you work with on assigned projects"
          icon={Users}
          accent="blue"
          badge={teamByProject.reduce((s, p) => s + p.total, 0)}
        >
          {teamByProject.some((p) => p.members.length > 0 || p.total > 0) ? (
            <div className="space-y-3">
              {teamByProject.map((block) => (
                <div key={block.projectId} className="rounded-lg border border-border/50 px-3 py-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link
                      href={getProjectDetailHref(block.projectId, "freelancer", block.projectType)}
                      className="text-sm font-medium hover:text-primary truncate"
                    >
                      {block.projectName}
                    </Link>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {block.total} member{block.total === 1 ? "" : "s"}
                    </span>
                  </div>
                  {block.members.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Just you on this project so far.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {block.members.map((m) => (
                        <Badge key={m.userId} variant="secondary" className="text-[10px] font-normal">
                          {m.name}
                          {m.subType ? ` · ${m.subType}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ChartEmptyState message="Join a project team to see collaborators here." icon={Users} />
          )}
        </ChartPanel>
      </div>

      <section>
        <DashboardSectionLabel title="My projects" className="mb-3" />
        {projects.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={getProjectDetailHref(p.id, "freelancer", p.type)}
                className="rounded-xl border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                    {p.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {p.companyName ?? "Project"}
                  {p.type ? ` · ${p.type}` : ""}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{p.completionPct}% complete</span>
                  <span
                    className={cn(
                      "font-medium",
                      isOverdue(p.deadline) ? "text-rose-500" : "text-muted-foreground",
                    )}
                  >
                    {p.deadline ? formatDue(p.deadline) : "No deadline"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <ChartEmptyState message="No projects assigned yet." icon={Briefcase} />
        )}
      </section>
    </PortalPageShell>
  );
}
