import React, { useMemo, useState } from "react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { Link } from "wouter";
import { useListProjects, type Project } from "@workspace/api-client-react";
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
  Bug,
  Clock,
  Smartphone,
  Calendar,
  ArrowRight,
  FlaskConical,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getProjectDetailHref } from "@/lib/project-routes";

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

function ProjectCard({
  project,
  isDeveloper,
}: {
  project: Project;
  isDeveloper: boolean;
}) {
  const company = project.companyName ?? project.clientName ?? "Company";
  const daysLeft = Math.ceil(
    (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Card className="border-border/60 overflow-hidden hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold leading-tight">
              <Link
                href={getProjectDetailHref(project.id)}
                className="hover:text-primary transition-colors"
              >
                {project.name}
              </Link>
            </CardTitle>
            <CardDescription className="text-xs mt-1">{company}</CardDescription>
          </div>
          <Badge variant="outline" className={cn("shrink-0 text-[10px] capitalize", statusBadgeClass(project.status))}>
            {project.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {project.description?.trim() ? (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {project.description.trim()}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Priority</p>
            <p className={cn("font-semibold mt-0.5 capitalize", priorityClass(project.priority))}>
              {project.priority}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Deadline</p>
            <p
              className={cn(
                "font-semibold mt-0.5 flex items-center gap-1",
                daysLeft < 0 && "text-red-500",
                daysLeft <= 7 && daysLeft >= 0 && "text-amber-500",
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              {new Date(project.deadline).toLocaleDateString()}
            </p>
          </div>
          {project.pmName ? (
            <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 col-span-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Project manager</p>
              <p className="font-medium mt-0.5">{project.pmName}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium text-foreground">{project.completionPct}%</span>
          </div>
          <Progress value={project.completionPct} className="h-2" />
        </div>

        {project.techStack?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 6).map((tech) => (
              <Badge key={tech} variant="secondary" className="text-[10px] font-normal">
                {tech}
              </Badge>
            ))}
            {project.techStack.length > 6 ? (
              <Badge variant="outline" className="text-[10px]">
                +{project.techStack.length - 6}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          <Button size="sm" variant="default" className="h-8 text-xs" asChild>
            <Link href={getProjectDetailHref(project.id)}>
              View project
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
            <Link href={`/dev/bugs?projectId=${project.id}`}>
              <Bug className="h-3.5 w-3.5 mr-1" />
              Bugs
            </Link>
          </Button>
          {isDeveloper ? (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link href="/dev/logs">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Logs
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link href="/dev/apk">
                  <Smartphone className="h-3.5 w-3.5 mr-1" />
                  Releases
                </Link>
              </Button>
            </>
          ) : null}
          {project.stagingUrl ? (
            <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
              <a href={project.stagingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Staging
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
  const isTester = role === "tester";
  const isDeveloper = role === "developer";

  const [tab, setTab] = useState<"ongoing" | "maintenance" | "all">("ongoing");

  const listParams = useMemo(() => {
    if (tab === "maintenance") return { status: "maintenance", limit: 100 };
    if (tab === "ongoing") return { status: ONGOING_STATUSES, limit: 100 };
    return { limit: 100 };
  }, [tab]);

  const { data, isLoading } = useListProjects(listParams);

  const projectsByCompany = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of data?.projects ?? []) {
      const label = p.companyName ?? p.clientName ?? "Company";
      const list = map.get(label) ?? [];
      list.push(p);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [data?.projects]);

  const total = data?.total ?? data?.projects?.length ?? 0;

  const projectStats = useMemo(() => {
    const projects = data?.projects ?? [];
    const ongoingSet = new Set(ONGOING_STATUSES.split(","));
    let totalCompletion = 0;
    let overdue = 0;
    const now = Date.now();
    for (const p of projects) {
      totalCompletion += p.completionPct ?? 0;
      if (p.deadline && p.status !== "completed" && new Date(p.deadline).getTime() < now) overdue++;
    }
    return {
      total: data?.total ?? projects.length,
      ongoing: projects.filter((p) => ongoingSet.has(p.status)).length,
      maintenance: projects.filter((p) => p.status === "maintenance").length,
      avgCompletion: projects.length ? Math.round(totalCompletion / projects.length) : 0,
      overdue,
    };
  }, [data]);

  return (
    <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              {isTester ? (
                <FlaskConical className="h-5 w-5 text-amber-500" />
              ) : (
                <Briefcase className="h-5 w-5 text-primary" />
              )}
              {isTester ? "My QA projects" : "My ongoing projects"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {isTester
                ? "Projects you are assigned to test — status, deadlines, and quick links to bugs and builds."
                : "Projects you are actively assigned to — track progress, deadlines, and jump to logs or releases."}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">
            {total} project{total === 1 ? "" : "s"}
          </Badge>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-9">
            <TabsTrigger value="ongoing" className="text-xs">
              Ongoing
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs">
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All assigned
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <PageKpiSkeleton />
        ) : (
          <PageKpiRow>
            <StatCard title="Assigned" value={projectStats.total} hint="In this tab" icon={Briefcase} accent="blue" delay={0} />
            <StatCard title="Ongoing" value={projectStats.ongoing} hint="Active delivery" icon={Clock} accent="green" delay={1} />
            <StatCard title="Avg completion" value={`${projectStats.avgCompletion}%`} hint="Across projects" icon={TrendingUp} accent="violet" delay={2} />
            <StatCard title="Overdue" value={projectStats.overdue} hint="Past deadline" icon={AlertTriangle} accent="red" alert={projectStats.overdue > 0} delay={3} />
          </PageKpiRow>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : !data?.projects?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No projects in this view</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Ask your admin to add you as a member on a project team if you expect to see assignments here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {projectsByCompany.map(([companyName, companyProjects]) => (
              <section key={companyName}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  {companyName}
                  <span className="ml-2 font-normal normal-case">({companyProjects.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {companyProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isDeveloper={isDeveloper}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
    </div>
  );
}
