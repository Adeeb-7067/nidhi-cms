import React from "react";
import type { DailyLog } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDailyLogCategory } from "@/lib/daily-log-work-categories";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  User,
  AlertTriangle,
  ArrowRight,
  Trash2,
} from "lucide-react";

function formatLogDateLong(logDate: string) {
  const iso = String(logDate).slice(0, 10);
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function MetaItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Calendar;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/20 p-3", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function TextSection({
  title,
  content,
  variant = "default",
}: {
  title: string;
  content: string;
  variant?: "default" | "warning" | "primary";
}) {
  const styles = {
    default: "border-border/60 bg-muted/15",
    warning: "border-destructive/25 bg-destructive/5",
    primary: "border-primary/25 bg-primary/5",
  };
  const titleStyles = {
    default: "text-muted-foreground",
    warning: "text-destructive",
    primary: "text-primary",
  };

  return (
    <div className={cn("rounded-lg border p-4", styles[variant])}>
      <h4 className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", titleStyles[variant])}>
        {title}
      </h4>
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{content}</p>
    </div>
  );
}

export function DailyLogDetailDialog({
  log,
  open,
  onOpenChange,
  onDelete,
}: {
  log: DailyLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (log: DailyLog) => void;
}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  if (!log) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,800px)] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4 space-y-2 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold leading-snug">{log.taskTitle}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Entry #{log.id}
                </span>
                <span>·</span>
                <span>{formatLogDateLong(log.logDate)}</span>
              </DialogDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <div className="rounded-lg bg-primary/10 px-3 py-2 text-center min-w-[72px]">
                <p className="text-lg font-bold tabular-nums text-primary">{log.hoursSpent}h</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Logged</p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center min-w-[72px]">
                <p className="text-lg font-bold tabular-nums text-emerald-600">{log.completionPct}%</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Done</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(log.workCategories ?? []).map((cat) => (
              <Badge key={cat} variant="secondary" className="text-[10px] capitalize">
                {formatDailyLogCategory(cat)}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetaItem
              icon={User}
              label="Developer"
              value={
                <span>
                  {log.developerName}
                  {log.developerEmployeeId && (
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                      {log.developerEmployeeId}
                    </span>
                  )}
                </span>
              }
            />
            <MetaItem
              icon={Briefcase}
              label="Project / activity"
              value={<span className="text-primary">{log.projectName}</span>}
            />
            <MetaItem icon={Calendar} label="Log date" value={formatLogDateLong(log.logDate)} />
            <MetaItem
              icon={CheckCircle2}
              label="Completion"
              value={
                <div className="space-y-2 pt-0.5">
                  <span>{log.completionPct}%</span>
                  <Progress value={log.completionPct} className="h-2" />
                </div>
              }
              className="sm:col-span-2"
            />
          </div>

          {log.taskDescription?.trim() ? (
            <TextSection title="Description" content={log.taskDescription.trim()} />
          ) : (
            <p className="text-xs text-muted-foreground italic">No description provided.</p>
          )}

          {log.blockers?.trim() && (
            <TextSection title="Blockers" content={log.blockers.trim()} variant="warning" />
          )}

          {log.nextDayPlan?.trim() && (
            <TextSection title="Next day plan" content={log.nextDayPlan.trim()} variant="primary" />
          )}

          {!log.blockers?.trim() && !log.nextDayPlan?.trim() && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2">
              <ArrowRight className="h-3.5 w-3.5 opacity-50" />
              No blockers or next-day plan recorded for this entry.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
            </span>
            {log.updatedAt !== log.createdAt && (
              <span>Updated {formatDistanceToNow(new Date(log.updatedAt), { addSuffix: true })}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  onDelete(log);
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete Entry
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
