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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { SalesPageHeader, SalesFilterBar } from "@/modules/sales/components";

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

function ProjectLogo({ project, size = "md" }: { project: Project; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  return (
    <Avatar className={cn(sizeClass, "shrink-0 rounded-md border border-border/60")}>
      {project.logoUrl ? (
        <AvatarImage src={project.logoUrl} alt={project.name} className="object-cover" />
      ) : null}
      <AvatarFallback className="rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
        {project.name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
}

function BdeProjectCard({ project }: { project: Project }) {
  const company = project.companyName ?? project.clientName ?? "Company";
  const deadline = formatDeadline(project.deadline);

  return (
    <Card className="flex h-full flex-col border-border/60 overflow-hidden transition-colors hover:border-primary/30 hover:shadow-sm">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <ProjectLogo project={project} />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-semibold leading-snug">
                <Link
                  href={getProjectDetailHref(project.id, "bde", project.type)}
                  className="line-clamp-2 hover:text-primary transition-colors"
                >
                  {project.name}
                </Link>
              </CardTitle>
              <CardDescription className="mt-1 truncate text-[11px]">{company}</CardDescription>
            </div>
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
            <Link href={getProjectDetailHref(project.id, "bde", project.type)}>
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
  const { data, isLoading: isLoadingTab, isError, refetch } = useListProjects(listParams);

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

  const columns = useMemo<CmsColumn<Project>[]>(
    () => [
      {
        id: "name",
        header: "Project",
        className: "font-medium max-w-[260px]",
        cell: (project) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <ProjectLogo project={project} size="sm" />
            <div className="min-w-0">
              <Link
                href={getProjectDetailHref(project.id, "bde", project.type)}
                className="line-clamp-2 hover:text-primary transition-colors"
              >
                {project.name}
              </Link>
              {project.description?.trim() ? (
                <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                  {project.description.trim()}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "company",
        header: "Company",
        className: "max-w-[160px] truncate",
        cell: (project) => project.companyName ?? project.clientName ?? "—",
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (project) => (
          <Badge
            variant="outline"
            className={cn("text-[10px] capitalize", statusBadgeClass(project.status))}
          >
            {project.status.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        cell: (project) => (
          <div className="flex min-w-[100px] items-center gap-2">
            <Progress value={project.completionPct} className="h-1.5 flex-1" />
            <span className="text-[10px] font-semibold tabular-nums">{project.completionPct}%</span>
          </div>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        chip: true,
        cell: (project) => (
          <span className={cn("text-xs font-medium capitalize", priorityClass(project.priority))}>
            {project.priority}
          </span>
        ),
      },
      {
        id: "deadline",
        header: "Deadline",
        cell: (project) => {
          const deadline = formatDeadline(project.deadline);
          return (
            <span
              className={cn(
                "flex items-center gap-1 text-xs whitespace-nowrap",
                deadline.overdue && "text-red-500",
                deadline.soon && "text-amber-500",
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              {deadline.label}
            </span>
          );
        },
      },
      {
        id: "pm",
        header: "PM",
        hideInGrid: true,
        cell: (project) => (
          <span className="text-muted-foreground text-xs">{project.pmName ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        hideable: false,
        cell: (project) => (
          <CmsRowActions
            label="Project actions"
            items={[
              {
                label: "Open",
                icon: ArrowRight,
                href: getProjectDetailHref(project.id, "bde", project.type),
              },
              {
                label: "Staging",
                icon: ExternalLink,
                onSelect: () => {
                  if (project.stagingUrl) {
                    window.open(project.stagingUrl, "_blank", "noreferrer");
                  }
                },
                hidden: !project.stagingUrl,
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
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

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search project or company…"
      />

      <CmsChipTabs
        value={tab}
        onValueChange={(v) => setTab(v as ProjectTab)}
        items={[
          { value: "ongoing", label: "Ongoing" },
          { value: "maintenance", label: "Maintenance" },
          { value: "all", label: "All" },
        ]}
      />

      {truncated ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Showing {loadedCount} of {totalCount} projects in this view. Some projects and KPI counts may be missing — ask your admin if you expect more.
        </p>
      ) : null}

      <CmsDataTable
        columns={columns}
        rows={filteredProjects}
        rowKey={(project) => project.id}
        isLoading={isLoadingTab}
        error={isError}
        onRetry={() => refetch()}
        viewStorageKey="bde-projects-v2"
        defaultViewMode="grid"
        renderGridCard={(project) => <BdeProjectCard project={project} />}
        gridClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        empty={{
          icon: FolderKanban,
          title: search.trim() ? "No projects match your search" : "No projects yet",
          description: search.trim()
            ? "Try a different name or clear the search."
            : "Create a project from one of your customers, or ask your admin to add you to an existing project.",
        }}
      />
    </PortalPageShell>
  );
}
