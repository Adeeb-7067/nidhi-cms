import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListProjects, type Project } from "@/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageCardGridSkeleton } from "@/components/loading";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Bug,
  Clock,
  Smartphone,
  Calendar,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getProjectDetailHref } from "@/lib/project-routes";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
  DevToolbar,
  DevTabsList,
  DevTabsTrigger,
  DevSectionMeta,
  DevEmptyState,
} from "@/components/dev/dev-page-kit";
import { PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { isDeveloperRole, isQaStaffRole } from "@/lib/navigation";

const ONGOING_STATUSES = "in_progress,scoping,uat,on_hold";

function statusBadgeClass(status: string) {
  switch (status) {
    case "in_progress":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "completed":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "on_hold":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    case "scoping":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "uat":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "maintenance":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    default:
      return "";
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "critical":
      return "text-red-500";
    case "high":
      return "text-orange-500";
    case "medium":
      return "text-amber-500";
    case "low":
      return "text-green-500";
    default:
      return "text-muted-foreground";
  }
}

function formatDeadline(deadline?: string | null) {
  if (!deadline) {
    return { label: "No deadline", daysLeft: null as number | null, overdue: false, soon: false };
  }
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return { label: "—", daysLeft: null, overdue: false, soon: false };
  }
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    label: date.toLocaleDateString(),
    daysLeft,
    overdue: daysLeft < 0,
    soon: daysLeft >= 0 && daysLeft <= 7,
  };
}

function computeProjectStats(projects: Project[]) {
  const ongoingSet = new Set(ONGOING_STATUSES.split(","));
  let totalCompletion = 0;
  let overdue = 0;
  const now = Date.now();
  for (const p of projects) {
    totalCompletion += p.completionPct ?? 0;
    if (p.deadline && p.status !== "completed" && new Date(p.deadline).getTime() < now) {
      overdue++;
    }
  }
  return {
    total: projects.length,
    ongoing: projects.filter((p) => ongoingSet.has(p.status)).length,
    maintenance: projects.filter((p) => p.status === "maintenance").length,
    avgCompletion: projects.length ? Math.round(totalCompletion / projects.length) : 0,
    overdue,
  };
}

function ProjectCard({
  project,
  isDeveloper,
  role,
}: {
  project: Project;
  isDeveloper: boolean;
  role: string;
}) {
  const company = project.companyName ?? project.clientName ?? "Company";
  const deadline = formatDeadline(project.deadline);

  return (
    <Card className="flex h-full flex-col border-border/60 overflow-hidden transition-colors hover:border-primary/30 hover:shadow-sm">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-snug">
              <Link
                href={getProjectDetailHref(project.id, role, project.type)}
                className="line-clamp-2 hover:text-primary transition-colors"
              >
                {project.name}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1 truncate text-[11px]">{company}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px] capitalize", statusBadgeClass(project.status))}
          >
            {project.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-semibold text-foreground">{project.completionPct}%</span>
          </div>
          <Progress value={project.completionPct} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex flex-1 flex-col gap-3 pt-0">
        {project.description?.trim() ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {project.description.trim()}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Priority</p>
            <p className={cn("mt-0.5 font-semibold capitalize", priorityClass(project.priority))}>
              {project.priority}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Deadline</p>
            <p
              className={cn(
                "mt-0.5 flex items-center gap-1 font-semibold",
                deadline.overdue && "text-red-500",
                deadline.soon && "text-amber-500",
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">{deadline.label}</span>
            </p>
          </div>
        </div>

        {project.pmName ? (
          <p className="text-[10px] text-muted-foreground">
            PM: <span className="font-medium text-foreground">{project.pmName}</span>
          </p>
        ) : null}

        {project.techStack?.length ? (
          <div className="flex flex-wrap gap-1">
            {project.techStack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="secondary" className="text-[9px] font-normal">
                {tech}
              </Badge>
            ))}
            {project.techStack.length > 4 ? (
              <Badge variant="outline" className="text-[9px]">
                +{project.techStack.length - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-t border-border/40 pt-3">
          <Button size="sm" className="h-8 flex-1 text-xs" asChild>
            <Link href={getProjectDetailHref(project.id, role, project.type)}>
              Open
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild title="Bugs">
            <Link href={`/dev/bugs?projectId=${project.id}`}>
              <Bug className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {isDeveloper ? (
            <>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild title="Logs">
                <Link href={`/dev/logs?projectId=${project.id}`}>
                  <Clock className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild title="Releases">
                <Link href="/dev/apk">
                  <Smartphone className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          ) : null}
          {project.stagingUrl ? (
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild title="Staging">
              <a href={project.stagingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevProjects() {
  const { user } = useAuth();
  const role = user?.role ?? "developer";
  const isQa = isQaStaffRole(role);
  const isDeveloper = isDeveloperRole(role);

  const [tab, setTab] = useState<"ongoing" | "maintenance" | "all">("ongoing");
  const [searchQuery, setSearchQuery] = useState("");

  const listParams = useMemo(() => {
    if (tab === "maintenance") return { status: "maintenance", limit: 100 };
    if (tab === "ongoing") return { status: ONGOING_STATUSES, limit: 100 };
    return { limit: 100 };
  }, [tab]);

  const { data: allProjectsData, isLoading: isLoadingAll } = useListProjects({ limit: 100 });
  const { data, isLoading: isLoadingTab } = useListProjects(listParams);

  const isLoading = isLoadingTab || isLoadingAll;
  const portfolioStats = useMemo(
    () => computeProjectStats(allProjectsData?.projects ?? []),
    [allProjectsData?.projects],
  );

  const filteredProjects = useMemo(() => {
    const list = data?.projects ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const company = (p.companyName ?? p.clientName ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || company.includes(q);
    });
  }, [data?.projects, searchQuery]);

  const projectsByCompany = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of filteredProjects) {
      const label = p.companyName ?? p.clientName ?? "Other";
      const list = map.get(label) ?? [];
      list.push(p);
      map.set(label, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProjects]);

  const tabLabel =
    tab === "maintenance" ? "Maintenance" : tab === "all" ? "All assigned" : "Ongoing";

  return (
    <DevPageShell>
      <DevPageHero
        title={isQa ? "My QA projects" : "My projects"}
        subtitle={
          isQa
            ? "Projects you are assigned to test — track status, deadlines, and jump to bugs or builds."
            : "Your assigned delivery work — progress, deadlines, logs, and releases in one place."
        }
        badge={`${portfolioStats.total} assigned`}
      />

      {isLoadingAll ? (
        <PageKpiSkeleton count={4} columns={4} />
      ) : (
        <DevKpiGrid
          items={[
            { title: "Assigned", value: portfolioStats.total, hint: "All your projects", icon: Briefcase, accent: "blue" },
            { title: "Ongoing", value: portfolioStats.ongoing, hint: "Active delivery", icon: Clock, accent: "green" },
            { title: "Avg completion", value: `${portfolioStats.avgCompletion}%`, hint: "Across portfolio", icon: TrendingUp, accent: "violet" },
            { title: "Overdue", value: portfolioStats.overdue, hint: "Past deadline", icon: AlertTriangle, accent: "red", alert: portfolioStats.overdue > 0 },
          ]}
        />
      )}

      <DevToolbar>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <DevTabsList>
            <DevTabsTrigger value="ongoing">Ongoing</DevTabsTrigger>
            <DevTabsTrigger value="maintenance">Maintenance</DevTabsTrigger>
            <DevTabsTrigger value="all">All assigned</DevTabsTrigger>
          </DevTabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="h-9 bg-muted/30 pl-8 text-xs"
          />
        </div>
      </DevToolbar>

      <DevSectionMeta
        label={`Showing ${tabLabel.toLowerCase()} projects`}
        count={filteredProjects.length}
      />

      {isLoadingTab ? (
        <PageCardGridSkeleton count={6} itemClassName="h-72" className="sm:grid-cols-2 xl:grid-cols-3" />
      ) : filteredProjects.length === 0 ? (
        <DevEmptyState
          icon={Briefcase}
          title={searchQuery.trim() ? "No projects match your search" : "No projects in this view"}
          description={
            searchQuery.trim()
              ? "Try a different name or clear the search filter."
              : "Ask your admin to add you to a project team if you expect assignments here."
          }
        />
      ) : (
        <div className="space-y-8">
          {projectsByCompany.map(([companyName, companyProjects]) => (
            <section key={companyName}>
              <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {companyName}
                <span className="ml-2 font-normal normal-case text-foreground/70">
                  ({companyProjects.length})
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {companyProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} isDeveloper={isDeveloper} role={role} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </DevPageShell>
  );
}
