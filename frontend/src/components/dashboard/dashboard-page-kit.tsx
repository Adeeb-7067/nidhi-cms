import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, ChevronRight, Download, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalPageHero } from "@/components/layout/portal-page-kit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DashboardBreadcrumb = { label: string; href?: string };

export function DashboardPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: DashboardBreadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <PortalPageHero title={title} subtitle={description} actions={actions} />
    </div>
  );
}

const DEFAULT_PERIODS = [
  { value: "month", label: "This month" },
  { value: "6m", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
] as const;

export function DashboardFilterBar({
  period,
  onPeriodChange,
  periodOptions = DEFAULT_PERIODS,
  onExport,
  children,
  className,
}: {
  period?: string;
  onPeriodChange?: (v: string) => void;
  periodOptions?: readonly { value: string; label: string }[];
  onExport?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/80 p-3 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
      {onPeriodChange && (
        <Select value={period ?? "6m"} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-9 w-full sm:w-[200px]">
            <Calendar className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2 sm:ml-auto">
        <Button variant="outline" size="sm" className="h-9 gap-1.5" type="button">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </Button>
        {onExport && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" type="button" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}

export function DashboardSectionLabel({
  title,
  trailing,
  className,
}: {
  title: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {trailing}
    </div>
  );
}

export type PipelineStageItem = {
  label: string;
  value: number;
  color: string;
};

export function DashboardPipelineFlow({
  title = "Pipeline status",
  stages,
  className,
}: {
  title?: string;
  stages: PipelineStageItem[];
  className?: string;
}) {
  const visible = stages.filter((s) => s.value > 0);
  if (visible.length === 0) return null;

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                stage.color,
              )}
            >
              {stage.label}
              <span className="rounded-full bg-background/60 px-1.5 py-0 text-[9px] tabular-nums">
                {stage.value}
              </span>
            </span>
            {i < visible.length - 1 && (
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardInsightBanner({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 text-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{title}</p>
            <div className="mt-0.5 text-muted-foreground">{children}</div>
          </div>
        </div>
        {action}
      </div>
    </motion.div>
  );
}
