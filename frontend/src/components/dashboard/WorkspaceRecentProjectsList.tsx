import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type WorkspaceRecentProject = {
  id: number;
  name: string;
  companyName?: string | null;
  status: string;
  completionPct: number;
};

type WorkspaceRecentProjectsListProps = {
  projects: WorkspaceRecentProject[];
  totalCount?: number;
  getProjectHref: (projectId: number) => string;
  statusBadgeClass: (status: string) => string;
};

export function WorkspaceRecentProjectsList({
  projects,
  totalCount,
  getProjectHref,
  statusBadgeClass,
}: WorkspaceRecentProjectsListProps) {
  const shown = projects.length;
  const total = totalCount ?? shown;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto dialog-scroll"
        role="region"
        aria-label="Recent projects list"
      >
        <div className="flex flex-col gap-2 pr-0.5">
          {projects.map((project) => (
            <Link key={project.id} href={getProjectHref(project.id)} className="block shrink-0">
              <article className="group rounded-xl border border-border/60 p-3 transition-all hover:border-primary/30 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary">
                      {project.name}
                    </h4>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {project.companyName ?? "Project"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-[10px] capitalize", statusBadgeClass(project.status))}
                  >
                    {project.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {project.completionPct}%
                    </span>
                  </div>
                  <Progress value={project.completionPct} className="h-1.5" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
      <p className="shrink-0 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
        Showing {shown} recent {total > shown ? `of ${total} ` : ""}
        {total === 1 ? "project" : "projects"}
      </p>
    </div>
  );
}
