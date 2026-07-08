import { useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Clock,
  Calendar,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectDetailHref } from "@/lib/project-routes";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { SalesPageHeader, SalesEmptyState, SalesFilterBar } from "@/modules/sales/components";

const ONGOING_STATUSES = "in_progress,scoping,uat,on_hold";

type ProjectTab = "ongoing" | "maintenance" | "all";

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
    avgCompletion: projects.length ? Math.round(totalCompletion / projects.length) : 0,
    overdue,
  };
}

function BdeProjectCard({ project }: { project: Project }) {
  const company = project.companyName ?? project.clientName ?? "Company";
  const deadline = formatDeadline(project.deadline);

  return (
    <Card className="flex h-full flex-col border-border/60 overflow-hidden transition-colors hover:border-primary/30 hover:shadow-sm">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-snug">
              <Link
                href={getProjectDetailHref(project.id, "bde")}
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
            <Link href={getProjectDetailHref(project.id, "bde")}>
              Open
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          {project.stagingUrl ? (
            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" asChild title="Staging">
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

export default function BdeProjects() {
  const [tab, setTab] = useState<ProjectTab>("ongoing");
  const [search, setSearch] = useState("");

  const listParams = useMemo(() => {
    if (tab === "maintenance") return { status: "maintenance", limit: 100 };
    if (tab === "ongoing") return { status: ONGOING_STATUSES, limit: 100 };
    return { limit: 100 };
  }, [tab]);

  const { data: allProjectsData, isLoading: isLoadingAll } = useListProjects({ limit: 100 });
  const { data, isLoading: isLoadingTab } = useListProjects(listParams);

  const stats = useMemo(
    () => computeProjectStats(allProjectsData?.projects ?? []),
    [allProjectsData?.projects],
  );

  const filteredProjects = useMemo(() => {
    const list = data?.projects ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const company = (p.companyName ?? p.clientName ?? "").toLowerCase();
      return p.name.toLowerCase().includes(q) || company.includes(q);
    });
  }, [data?.projects, search]);

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

  const loadedCount = data?.projects.length ?? 0;
  const totalCount = data?.total ?? loadedCount;
  const truncated = totalCount > loadedCount;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="My Projects"
        description="Projects you created or were added to — track progress, deadlines, and open the project hub."
        breadcrumbs={[{ label: "Sales", href: "/sales/bde" }, { label: "My Projects" }]}
      />

      {isLoadingAll ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <PortalKpiGrid
          columns={4}
          count={4}
          items={[
            { title: "Total projects", value: stats.total, hint: "Created or assigned", icon: Briefcase, accent: "blue", delay: 0 },
            { title: "Ongoing", value: stats.ongoing, hint: "Active delivery", icon: Clock, accent: "green", delay: 1 },
            { title: "Avg completion", value: `${stats.avgCompletion}%`, hint: "Across your projects", icon: TrendingUp, accent: "violet", delay: 2 },
            { title: "Overdue", value: stats.overdue, hint: "Past deadline", icon: AlertTriangle, accent: "red", alert: stats.overdue > 0, delay: 3 },
          ]}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ProjectTab)}>
          <TabsList className="h-9">
            <TabsTrigger value="ongoing" className="text-xs">Ongoing</TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs">Maintenance</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search project or company…" className="sm:w-auto sm:flex-1 sm:max-w-sm" />
      </div>

      {truncated ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Showing {loadedCount} of {totalCount} projects in this view. Some projects and KPI counts may be missing — ask your admin if you expect more.
        </p>
      ) : null}

      {isLoadingTab ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <SalesEmptyState
          icon={FolderKanban}
          title={search.trim() ? "No projects match your search" : "No projects yet"}
          description={
            search.trim()
              ? "Try a different name or clear the search."
              : "Create a project from one of your customers, or ask your admin to add you to an existing project."
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
                  <BdeProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
