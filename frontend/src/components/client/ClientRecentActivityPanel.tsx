import type { DailyLog } from "@/api";
import { Activity, FileText, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ClientRecentActivityPanelProps = {
  logs: DailyLog[];
  loading: boolean;
  totalCount?: number;
  className?: string;
};

function formatLogDate(logDate: string) {
  const d = new Date(logDate);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function formatCategories(workCategories: string[]) {
  return workCategories.map((c) => c.replace(/_/g, " ")).join(", ");
}

export function ClientRecentActivityPanel({
  logs,
  loading,
  totalCount,
  className,
}: ClientRecentActivityPanelProps) {
  const shown = logs.length;
  const total = totalCount ?? shown;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600">
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">Recent development activity</h3>
            <p className="text-[10px] text-muted-foreground">Daily logs from your project team</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[9px] border-cyan-500/25 text-cyan-600">
          Portal sync
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : shown === 0 ? (
        <div className="flex flex-1 items-center justify-center p-10 text-center text-xs text-muted-foreground">
          No recent daily logs for this project yet.
        </div>
      ) : (
        <>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto dialog-scroll"
            role="region"
            aria-label="Recent development activity list"
          >
            <ul className="divide-y divide-border/60">
              {logs.map((log) => (
                <li key={log.id}>
                  <article className="px-4 py-3 transition-colors hover:bg-muted/20">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
                            {log.taskTitle}
                          </h4>
                          <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                            {formatLogDate(log.logDate)}
                          </time>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          {log.workCategories?.length ? (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium capitalize text-primary">
                              {formatCategories(log.workCategories)}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-0.5">
                            <User className="h-3 w-3 opacity-70" />
                            {log.developerName || "Developer"}
                          </span>
                          <span className="ml-auto font-mono font-medium text-foreground">
                            {log.hoursSpent}h
                          </span>
                        </div>
                        {log.taskDescription ? (
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                            {log.taskDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 border-t border-border/50 bg-muted/5 px-4 py-2 text-[10px] text-muted-foreground">
            Showing {shown} recent {total > shown ? `of ${total} ` : ""}
            {shown === 1 ? "entry" : "entries"}
          </div>
        </>
      )}
    </div>
  );
}
