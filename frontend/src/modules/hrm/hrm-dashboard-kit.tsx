import { motion } from "framer-motion";
import { ArrowRight, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsChipTabs } from "@/components/cms";
import { cn } from "@/lib/utils";

const ATTENDANCE_STAGE_COLORS: Record<string, string> = {
  Present: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  Late: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  WFH: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  "On leave": "border-violet-500/30 bg-violet-500/10 text-violet-700",
  Absent: "border-red-500/30 bg-red-500/10 text-red-700",
};

export function HrmDashboardSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  );
}

export function HrmAttendancePipelineFlow({
  stages,
  title = "Today's attendance status flow",
  className,
}: {
  stages: Array<{ label: string; value: number }>;
  title?: string;
  className?: string;
}) {
  if (!stages.length) return null;

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border",
                ATTENDANCE_STAGE_COLORS[stage.label] ?? "border-border bg-muted/30",
              )}
            >
              {stage.label}
              <span className="tabular-nums opacity-80">{stage.value}</span>
            </span>
            {i < stages.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HrmDashboardFilterBar({
  onRefresh,
  onExport,
  extraFilters,
  className,
}: {
  onRefresh?: () => void;
  onExport?: () => void;
  extraFilters?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/80 p-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {extraFilters ? (
        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center">{extraFilters}</div>
      ) : null}
      <motion.div className="flex gap-2 sm:ml-auto">
        {onRefresh ? (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" type="button" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        ) : null}
        {onExport ? (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" type="button" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        ) : null}
      </motion.div>
    </div>
  );
}

export function HrmDashboardPeriodTabs({
  value,
  onChange,
}: {
  value: "today" | "week" | "month";
  onChange: (v: "today" | "week" | "month") => void;
}) {
  return (
    <CmsChipTabs
      value={value}
      onValueChange={(v) => onChange(v as typeof value)}
      items={[
        { value: "today", label: "Today" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ]}
    />
  );
}
