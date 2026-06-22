import type { ReactNode } from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PortalPageShell,
  PortalContentCard,
  PortalTabsList,
  PortalTabsTrigger,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import {
  HrmRefPageHeader,
  HrmRefStatStrip,
  hrmKpiToRefStats,
} from "@/modules/hrm/hrm-reference-kit";

export { portalActionButtonClass };
export function hrmActionButtonClass(extra?: string) {
  return portalActionButtonClass(cn("bg-primary text-primary-foreground hover:bg-primary/90", extra));
}

/** Same shell as Companies / Manage pages. */
export function HrmPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <PortalPageShell className={className}>{children}</PortalPageShell>;
}

export function HrmBreadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  if (!items.length) return null;
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {items.map((b, i) => (
        <span key={`${b.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
          {b.href ? (
            <Link href={b.href} className="transition-colors hover:text-foreground">
              {b.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{b.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Satyakabir-style page header (plain title row — see hrm-reference-kit). */
export function HrmPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <HrmRefPageHeader title={title} subtitle={description} actions={actions} className={className} />
  );
}

export const HrmPageHero = HrmPageHeader;

export type HrmKpiItem = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  loading?: boolean;
  accent?: "green" | "blue" | "violet" | "amber" | "rose" | "emerald";
  hint?: string;
  alert?: boolean;
};

/** Satyakabir StatStrip KPI row for HRM pages. */
export function HrmKpiGrid({
  items,
  columns = 4,
  loading,
}: {
  items: HrmKpiItem[];
  columns?: 2 | 3 | 4;
  loading?: boolean;
  count?: number;
}) {
  const col = columns === 2 ? 2 : columns === 3 ? 3 : 4;
  return (
    <HrmRefStatStrip
      stats={hrmKpiToRefStats(items)}
      loading={loading}
      columns={col as 2 | 3 | 4}
    />
  );
}

/** @deprecated Use HrmKpiGrid — single stat chip. */
export function HrmKpiCard(props: HrmKpiItem) {
  return <HrmKpiGrid items={[props]} columns={1} count={1} />;
}

export function HrmChartCard({
  title,
  description,
  children,
  className,
  badge,
  icon: Icon,
  viewAllHref,
  headerExtra,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  badge?: string | number;
  icon?: LucideIcon;
  viewAllHref?: string;
  headerExtra?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-border/60 bg-card flex h-full flex-col overflow-hidden shadow-sm", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[10px] font-semibold tabular-nums">
              {badge}
            </Badge>
          )}
          {headerExtra}
          {viewAllHref && (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
              <Link href={viewAllHref}>View all</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("flex flex-1 flex-col pb-4 pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function HrmChartGridCell({
  children,
  colSpan = 12,
  className,
}: {
  children: ReactNode;
  colSpan?: 3 | 4 | 5 | 6 | 8 | 12;
  className?: string;
}) {
  const colClass = {
    3: "lg:col-span-3",
    4: "lg:col-span-4",
    5: "lg:col-span-5",
    6: "lg:col-span-6",
    8: "lg:col-span-8",
    12: "lg:col-span-12",
  }[colSpan];
  return <div className={cn("flex min-h-0 flex-col", colClass, className)}>{children}</div>;
}

export function HrmChartEmptyState({ message, icon: Icon }: { message: string; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-[140px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
      {Icon && <Icon className="mb-2 h-8 w-8 text-muted-foreground/40" />}
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

export function HrmSectionLabel({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pt-1">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Inline toolbar row — use inside list cards or standalone wrapped in PortalContentCard. */
export function HrmFilterRow({
  period,
  onPeriodChange,
  periodOptions,
  onExport,
  search,
  onSearchChange,
  searchPlaceholder = "Filter…",
  children,
  className,
}: {
  period?: string;
  onPeriodChange?: (v: string) => void;
  periodOptions?: Array<{ value: string; label: string }>;
  onExport?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {onSearchChange !== undefined && (
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="h-9 border-border/60 bg-background pl-9"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      {period && onPeriodChange && periodOptions && (
        <select
          className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
        >
          {periodOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {children}
      {onExport && (
        <Button type="button" variant="outline" size="sm" className="h-9 border-border/60" onClick={onExport}>
          Export
        </Button>
      )}
    </div>
  );
}

/** Toolbar row — standalone card, or pass embedded to nest inside a list panel. */
export function HrmFilterBar({
  embedded,
  ...props
}: React.ComponentProps<typeof HrmFilterRow> & { embedded?: boolean }) {
  const row = <HrmFilterRow {...props} />;
  if (embedded) return row;
  return <PortalContentCard contentClassName="p-3">{row}</PortalContentCard>;
}

export function HrmInsightBanner({
  title,
  children,
  action,
  icon: Icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <PortalContentCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{title}</p>
            {children}
          </div>
        </div>
        {action}
      </div>
    </PortalContentCard>
  );
}

export function HrmPipelineStrip({
  title,
  stages,
}: {
  title: string;
  stages: Array<{ label: string; value: number; color?: string }>;
}) {
  if (!stages.length) return null;
  return (
    <PortalContentCard>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <div
            key={s.label}
            className={cn(
              "min-w-[72px] rounded-lg border px-3 py-2 text-center",
              s.color ?? "border-border bg-muted/30",
            )}
          >
            <p className="text-lg font-bold tabular-nums">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </PortalContentCard>
  );
}

export const HrmTabsList = PortalTabsList;
export const HrmTabsTrigger = PortalTabsTrigger;
export const HrmContentCard = PortalContentCard;
