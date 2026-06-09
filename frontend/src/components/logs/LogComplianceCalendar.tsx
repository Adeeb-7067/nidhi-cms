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
  variant?: "default" | "sheet" | "sidebar";
};

const TILE_LABELS: Record<string, { full: string; short: string }> = {
  Complete: { full: "Complete", short: "Done" },
  Incomplete: { full: "Incomplete", short: "Missed" },
  Compliance: { full: "Compliance", short: "Rate" },
  "Days logged": { full: "Days logged", short: "Logged" },
};

function ComplianceSummary({
  data,
  compact,
  narrow,
}: {
  data: LogComplianceCalendar;
  compact?: boolean;
  narrow?: boolean;
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

  const labelFor = (label: string) =>
    narrow ? (TILE_LABELS[label]?.short ?? label) : (TILE_LABELS[label]?.full ?? label);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div
        className={cn(
          "grid gap-2 min-w-0",
          data.complianceEnabled
            ? narrow
              ? "grid-cols-3 gap-1.5"
              : "grid-cols-3"
            : "grid-cols-1",
        )}
      >
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              "rounded-lg border flex flex-col min-w-0 overflow-hidden",
              narrow ? "px-2 py-1.5 gap-0.5" : "px-2.5 py-2 gap-0.5",
              tile.className,
            )}
          >
            <div className="flex items-center gap-1 min-w-0">
              <tile.icon className={cn("shrink-0 opacity-80", narrow ? "h-3 w-3" : "h-3.5 w-3.5")} />
              <span
                className={cn(
                  "font-semibold uppercase tracking-wide opacity-80 leading-tight",
                  narrow ? "text-[8px]" : "text-[9px] tracking-wider",
                )}
              >
                {labelFor(tile.label)}
              </span>
            </div>
            <span
              className={cn(
                "font-bold tabular-nums leading-none",
                narrow ? "text-sm" : compact ? "text-base" : "text-lg",
              )}
            >
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
  narrow,
}: {
  days: LogComplianceDay[];
  year: number;
  month: number;
  compact?: boolean;
  narrow?: boolean;
}) {
  const grid = buildCalendarGrid(days, year, month);
  const cellSize = narrow ? "h-9" : compact ? "h-10" : "h-11";

  return (
    <div className="space-y-2 min-w-0">
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 min-w-0">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className={cn(
              "text-center font-semibold uppercase tracking-wider text-muted-foreground py-0.5 truncate",
              narrow ? "text-[8px]" : "text-[9px]",
            )}
          >
            {narrow ? wd.slice(0, 1) : wd}
          </div>
        ))}
        {grid.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} className={cn(cellSize, "min-w-0")} />;
          }

          const meta = STATUS_META[day.status];
          const dayNum = new Date(`${day.date}T12:00:00`).getDate();
          const isToday = day.date === new Date().toISOString().split("T")[0];

          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.loggedHours.toFixed(1)}h logged${day.requiredHours != null ? ` / ${day.requiredHours}h required` : ""} · ${meta.label}`}
              className={cn(
                "min-w-0 w-full rounded-md border flex flex-col items-center justify-center transition-colors overflow-hidden",
                cellSize,
                narrow ? "gap-0 p-0" : "gap-0.5 p-0.5",
                meta.cell,
                isToday && "ring-1 ring-primary/50",
              )}
            >
              <span
                className={cn(
                  "font-bold tabular-nums leading-none",
                  narrow ? "text-[10px]" : "text-[11px]",
                  meta.text,
                )}
              >
                {dayNum}
              </span>
              {!narrow && (
                <span className="text-[8px] tabular-nums text-muted-foreground leading-none">
                  {day.loggedHours > 0 ? `${day.loggedHours.toFixed(1)}h` : "—"}
                </span>
              )}
              <span className={cn("rounded-full shrink-0", narrow ? "h-1 w-1" : "h-1 w-1", meta.dot)} />
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
  narrow,
}: {
  data: LogComplianceCalendar;
  compact?: boolean;
  narrow?: boolean;
}) {
  const monthLabel = new Date(data.year, data.month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={cn("space-y-4 min-w-0", compact && "space-y-3")}>
      <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
            {monthLabel}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
            {data.complianceEnabled && data.requiredHours != null
              ? `${data.requiredHours}h required on weekdays`
              : "Compliance policy disabled — hours shown for reference"}
          </p>
        </div>
        {data.complianceEnabled && (
          <Badge variant="outline" className="text-[9px] shrink-0 whitespace-nowrap">
            {data.trackedWeekdays} wd
          </Badge>
        )}
      </div>

      <ComplianceSummary data={data} compact={compact} narrow={narrow} />

      <div className={cn("rounded-lg border border-border/50 bg-muted/10 min-w-0", narrow ? "p-2" : "p-2.5")}>
        <CalendarGrid
          days={data.days}
          year={data.year}
          month={data.month}
          compact={compact}
          narrow={narrow}
        />
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

  const narrow = variant === "sheet" || variant === "sidebar";

  if (variant === "sheet") {
    return <PanelBody data={data} compact narrow />;
  }

  return (
    <Card className={cn("border-border/50 shadow-sm min-w-0", variant === "sidebar" && "overflow-hidden")}>
      <CardHeader className={cn("pb-2 min-w-0", (compact || narrow) && "p-3")}>
        <CardTitle className={cn("text-sm truncate", compact && "text-xs")}>{title}</CardTitle>
        <CardDescription className="text-xs leading-snug break-words">
          {data.developerName}
          {data.complianceEnabled && data.requiredHours != null
            ? ` · Required ${data.requiredHours}h / weekday`
            : " · Compliance tracking off"}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("min-w-0", (compact || narrow) && "p-3 pt-0")}>
        <PanelBody data={data} compact={compact || narrow} narrow={narrow} />
      </CardContent>
    </Card>
  );
}
