import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { LogComplianceCalendar, LogComplianceDay } from "@/api";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, CalendarDays, Clock } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_META: Record<
  LogComplianceDay["status"],
  { label: string; dot: string; cell: string; text: string }
> = {
  complete: {
    label: "Complete",
    dot: "bg-emerald-500",
    cell: "border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  incomplete: {
    label: "Incomplete",
    dot: "bg-red-500",
    cell: "border-red-500/35 bg-red-500/10 hover:bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
  },
  weekend: {
    label: "Weekend",
    dot: "bg-muted-foreground/40",
    cell: "border-border/40 bg-muted/25",
    text: "text-muted-foreground",
  },
  future: {
    label: "Upcoming",
    dot: "bg-muted-foreground/25",
    cell: "border-border/30 bg-muted/10 opacity-50",
    text: "text-muted-foreground",
  },
  logged: {
    label: "Logged",
    dot: "bg-blue-500",
    cell: "border-blue-500/30 bg-blue-500/8 hover:bg-blue-500/12",
    text: "text-blue-700 dark:text-blue-400",
  },
  no_logs: {
    label: "No logs",
    dot: "bg-muted-foreground/30",
    cell: "border-border/50 bg-card hover:bg-muted/20",
    text: "text-muted-foreground",
  },
};

function buildCalendarGrid(days: LogComplianceDay[], year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  return [...Array.from({ length: offset }, () => null), ...days] as (
    | LogComplianceDay
    | null
  )[];
}

type LogComplianceCalendarProps = {
  data?: LogComplianceCalendar;
  isLoading?: boolean;
  title?: string;
  compact?: boolean;
  /** Flat layout for side sheets — no outer card, tighter calendar */
  variant?: "default" | "sheet";
};

function ComplianceSummary({
  data,
  compact,
}: {
  data: LogComplianceCalendar;
  compact?: boolean;
}) {
  const rate =
    data.trackedWeekdays > 0
      ? Math.round((data.completeDays / data.trackedWeekdays) * 100)
      : 0;

  const tiles = data.complianceEnabled
    ? [
        {
          label: "Complete",
          value: data.completeDays,
          icon: CheckCircle2,
          className: "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400",
        },
        {
          label: "Incomplete",
          value: data.incompleteDays,
          icon: AlertCircle,
          className: "border-red-500/25 bg-red-500/8 text-red-700 dark:text-red-400",
        },
        {
          label: "Compliance",
          value: `${rate}%`,
          icon: Clock,
          className: "border-primary/25 bg-primary/8 text-primary",
        },
      ]
    : [
        {
          label: "Days logged",
          value: data.days.filter((d) => d.loggedHours > 0).length,
          icon: CalendarDays,
          className: "border-border/50 bg-muted/30 text-foreground",
        },
      ];

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className={cn("grid gap-2", data.complianceEnabled ? "grid-cols-3" : "grid-cols-1")}>
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              "rounded-lg border px-2.5 py-2 flex flex-col gap-0.5 min-w-0",
              tile.className,
            )}
          >
            <div className="flex items-center gap-1.5">
              <tile.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80 truncate">
                {tile.label}
              </span>
            </div>
            <span className={cn("text-lg font-bold tabular-nums leading-none", compact && "text-base")}>
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      {data.complianceEnabled && data.trackedWeekdays > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Month progress</span>
            <span className="font-medium tabular-nums">
              {data.completeDays}/{data.trackedWeekdays} weekdays
            </span>
          </div>
          <Progress value={rate} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

function CalendarGrid({
  days,
  year,
  month,
  compact,
}: {
  days: LogComplianceDay[];
  year: number;
  month: number;
  compact?: boolean;
}) {
  const grid = buildCalendarGrid(days, year, month);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground py-0.5"
          >
            {wd}
          </div>
        ))}
        {grid.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} className="aspect-square min-h-[52px]" />;
          }

          const meta = STATUS_META[day.status];
          const dayNum = new Date(`${day.date}T12:00:00`).getDate();
          const isToday = day.date === new Date().toISOString().split("T")[0];

          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.loggedHours.toFixed(1)}h logged${day.requiredHours != null ? ` / ${day.requiredHours}h required` : ""} · ${meta.label}`}
              className={cn(
                "aspect-square min-h-[52px] rounded-md border flex flex-col items-center justify-center gap-0.5 p-0.5 transition-colors",
                meta.cell,
                compact && "min-h-[48px]",
                isToday && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
              )}
            >
              <span className={cn("text-[11px] font-bold tabular-nums leading-none", meta.text)}>
                {dayNum}
              </span>
              <span className="text-[8px] tabular-nums text-muted-foreground leading-none">
                {day.loggedHours > 0 ? `${day.loggedHours.toFixed(1)}h` : "—"}
              </span>
              <span className={cn("h-1 w-1 rounded-full shrink-0", meta.dot)} />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1 border-t border-border/40">
        {(Object.keys(STATUS_META) as LogComplianceDay["status"][])
          .filter((s) => s !== "future")
          .map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[status].dot)} />
              {STATUS_META[status].label}
            </span>
          ))}
      </div>
    </div>
  );
}

function PanelBody({
  data,
  compact,
}: {
  data: LogComplianceCalendar;
  compact?: boolean;
}) {
  const monthLabel = new Date(data.year, data.month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
            {monthLabel}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {data.complianceEnabled && data.requiredHours != null
              ? `${data.requiredHours}h required on weekdays`
              : "Compliance policy disabled — hours shown for reference"}
          </p>
        </div>
        {data.complianceEnabled && (
          <Badge variant="outline" className="text-[9px] shrink-0">
            {data.trackedWeekdays} weekdays
          </Badge>
        )}
      </div>

      <ComplianceSummary data={data} compact={compact} />

      <div className="rounded-lg border border-border/50 bg-muted/10 p-2.5">
        <CalendarGrid days={data.days} year={data.year} month={data.month} compact={compact} />
      </div>
    </div>
  );
}

export function LogComplianceCalendarPanel({
  data,
  isLoading,
  title = "Daily hours compliance",
  compact = false,
  variant = "default",
}: LogComplianceCalendarProps) {
  if (isLoading) {
    const skeleton = (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    );

    if (variant === "sheet") return skeleton;

    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>{skeleton}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  if (variant === "sheet") {
    return <PanelBody data={data} compact />;
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className={cn("pb-2", compact && "p-3")}>
        <CardTitle className={cn("text-sm", compact && "text-xs")}>{title}</CardTitle>
        <CardDescription className="text-xs">
          {data.developerName}
          {data.complianceEnabled && data.requiredHours != null
            ? ` · Required ${data.requiredHours}h / weekday`
            : " · Compliance tracking off"}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(compact && "p-3 pt-0")}>
        <PanelBody data={data} compact={compact} />
      </CardContent>
    </Card>
  );
}
