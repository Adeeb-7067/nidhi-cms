import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";

function PortalSkeletonShell({
  label = "Loading",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" aria-label={label}>
      <PortalPageShell>{children}</PortalPageShell>
    </div>
  );
}

function PageKpiSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 2 ? "lg:grid-cols-2" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <div className={cn("grid gap-2 grid-cols-2", colClass)}>
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
      ))}
    </div>
  );
}

/** Breadcrumb trail placeholder */
export function PageBreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** Matches PortalPageHero / DashboardHero layout */
export function PageHeroSkeleton({
  withBreadcrumb = true,
  withActions = true,
  className,
}: {
  withBreadcrumb?: boolean;
  withActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {withBreadcrumb && <PageBreadcrumbSkeleton />}
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-8 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          {withActions && (
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Matches SalesFilterBar / FinanceFilterBar */
export function PageFilterBarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/80 p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      <Skeleton className="h-9 flex-1 min-w-[200px] rounded-md" />
      <Skeleton className="h-9 w-full sm:w-[200px] rounded-md" />
      <div className="flex gap-2 sm:ml-auto">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** Horizontal tab strip */
export function PageTabsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-7 w-20 rounded-md" />
      ))}
    </div>
  );
}

/** Single table row with multiple cell placeholders */
export function PageTableRowSkeleton({
  columns = 5,
  cellHeights,
}: {
  columns?: number;
  cellHeights?: string[];
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0">
      {[...Array(columns)].map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 flex-1 rounded-md", cellHeights?.[i])}
          style={{ maxWidth: i === 0 ? "28%" : undefined }}
        />
      ))}
    </div>
  );
}

/** Full bordered table skeleton */
export function PageTableSkeleton({
  rows = 8,
  columns = 5,
  showToolbar = false,
  className,
}: {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      )}
      <div className="bg-muted/30 px-4 py-2.5 border-b border-border/40">
        <div className="flex gap-3">
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1 rounded-md" />
          ))}
        </div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <PageTableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

/** Card with title + body lines */
export function PageCardSkeleton({
  lines = 3,
  className,
  header = true,
}: {
  lines?: number;
  className?: string;
  header?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {header && (
        <div className="border-b border-border/40 bg-muted/20 px-4 py-3 space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      )}
      <div className="p-4 space-y-3">
        {[...Array(lines)].map((_, i) => (
          <Skeleton key={i} className={cn("h-4 w-full rounded-md", i === lines - 1 && "w-2/3")} />
        ))}
      </div>
    </div>
  );
}

/** Grid of card placeholders */
export function PageCardGridSkeleton({
  count = 3,
  className,
  itemClassName = "h-48",
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-xl", itemClassName)} />
      ))}
    </div>
  );
}

/** Chart panel placeholder */
export function PageChartPanelSkeleton({
  height = "h-[220px]",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <div className="border-b border-border/40 bg-muted/20 px-4 py-3 space-y-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className={cn("p-4", height)}>
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Two-column chart row */
export function PageChartGridSkeleton({
  count = 2,
  className,
}: {
  count?: 2 | 3;
  className?: string;
}) {
  const cols = count === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <div className={cn("grid grid-cols-1 gap-3", cols, className)}>
      {[...Array(count)].map((_, i) => (
        <PageChartPanelSkeleton key={i} />
      ))}
    </div>
  );
}

/** Daily log entry cards */
export function PageLogEntriesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-3/4 max-w-md" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Notification list items */
export function PageNotificationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Generic route chunk load (lazy pages inside AppLayout) */
export function RouteChunkSkeleton() {
  return (
    <div className="space-y-4 pb-8" aria-busy="true" aria-label="Loading page">
      <PageHeroSkeleton withBreadcrumb={false} />
      <PageKpiSkeleton count={4} columns={4} />
      <PageFilterBarSkeleton />
      <PageTableSkeleton rows={6} columns={5} />
    </div>
  );
}

/** Admin / dev / client dashboard pages */
export function PortalDashboardSkeleton() {
  return (
    <PortalSkeletonShell label="Loading dashboard">
      <PageHeroSkeleton />
      <PageKpiSkeleton count={4} columns={4} />
      <PageChartGridSkeleton count={2} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PageCardSkeleton lines={4} />
        <PageTableSkeleton rows={5} columns={4} />
      </div>
    </PortalSkeletonShell>
  );
}

/** Standard list/table portal page */
export function PortalListPageSkeleton({
  kpiCount = 4,
  kpiColumns = 4 as 2 | 3 | 4,
  tableRows = 8,
  tableColumns = 6,
  showFilter = true,
  showTabs = false,
  tabCount = 4,
  withHero = true,
}: {
  kpiCount?: number;
  kpiColumns?: 2 | 3 | 4;
  tableRows?: number;
  tableColumns?: number;
  showFilter?: boolean;
  showTabs?: boolean;
  tabCount?: number;
  withHero?: boolean;
}) {
  return (
    <PortalSkeletonShell>
      {withHero && <PageHeroSkeleton />}
      <PageKpiSkeleton count={kpiCount} columns={kpiColumns} />
      {showFilter && <PageFilterBarSkeleton />}
      {showTabs && <PageTabsSkeleton count={tabCount} />}
      <PageTableSkeleton rows={tableRows} columns={tableColumns} showToolbar />
    </PortalSkeletonShell>
  );
}

/** Project hub / detail pages */
export function ProjectDetailPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading project">
      <div className="rounded-xl border bg-card p-5 md:p-6">
        <div className="flex gap-4">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-1/2 max-w-sm" />
            <Skeleton className="h-4 w-2/3 max-w-md" />
          </div>
        </div>
      </div>
      <PageTabsSkeleton count={8} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <PageCardSkeleton lines={5} />
          <PageTableSkeleton rows={5} columns={4} />
        </div>
        <PageCardSkeleton lines={4} />
      </div>
    </div>
  );
}

/** Task detail two-column layout */
export function TaskDetailPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading task">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[min(60vh,520px)] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Profile page layout */
export function ProfilePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-xl border overflow-hidden">
          <Skeleton className="h-28 w-full" />
          <div className="px-6 pb-6 pt-0 space-y-4">
            <Skeleton className="h-28 w-28 rounded-full -mt-14 mx-auto" />
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <div className="space-y-3 pt-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 space-y-4">
          <PageCardSkeleton lines={6} />
          <PageCardSkeleton lines={4} />
        </div>
      </div>
    </div>
  );
}

/** Settings organization form */
export function SettingsFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b border-border/40 bg-muted/20 px-4 py-3 space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="p-4 space-y-4 max-w-xl">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-9 w-32 rounded-md mt-2" />
        </div>
      </div>
    </div>
  );
}

/** Discussions split-pane */
export function DiscussionsPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] gap-0 rounded-xl border overflow-hidden" aria-busy="true">
      <div className="w-full max-w-sm border-r bg-muted/10 p-3 space-y-2">
        <Skeleton className="h-9 w-full rounded-md" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 p-2 rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 1 && "flex-row-reverse")}>
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className={cn("h-16 rounded-xl", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
            </div>
          ))}
        </div>
        <div className="border-t p-3">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Client analytics charts */
export function AnalyticsChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      <Skeleton className="h-[400px] w-full rounded-xl" />
      <Skeleton className="h-[400px] w-full rounded-xl" />
      <Skeleton className="h-[300px] w-full rounded-xl md:col-span-2" />
    </div>
  );
}

/** Finance module dashboard */
export function FinanceDashboardSkeleton() {
  return (
    <PortalSkeletonShell label="Loading finance dashboard">
      <PageHeroSkeleton />
      <PageFilterBarSkeleton />
      <PageKpiSkeleton count={5} columns={3} />
      <PageChartGridSkeleton count={2} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PageCardSkeleton lines={5} />
        <PageCardGridSkeleton count={4} itemClassName="h-24" className="grid-cols-2" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PageTableSkeleton rows={5} columns={4} />
        <PageTableSkeleton rows={5} columns={3} />
      </div>
    </PortalSkeletonShell>
  );
}

/** Finance list pages (expenses, income, invoices, etc.) */
export function FinanceListPageSkeleton({
  kpiCount = 3,
  tableRows = 8,
  showCharts = false,
}: {
  kpiCount?: number;
  tableRows?: number;
  showCharts?: boolean;
}) {
  return (
    <PortalSkeletonShell>
      <PageHeroSkeleton />
      <PageKpiSkeleton count={kpiCount} columns={3} />
      {showCharts && <PageChartGridSkeleton count={2} />}
      <PageFilterBarSkeleton />
      <PageTabsSkeleton count={5} />
      <PageTableSkeleton rows={tableRows} columns={7} showToolbar />
    </PortalSkeletonShell>
  );
}

/** Invoice / finance detail */
export function FinanceDetailPageSkeleton() {
  return (
    <PortalSkeletonShell label="Loading details">
      <PageHeroSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <PageCardSkeleton lines={8} />
          <PageTableSkeleton rows={4} columns={5} />
        </div>
        <PageCardSkeleton lines={4} />
      </div>
    </PortalSkeletonShell>
  );
}

/** Payroll tabs page */
export function FinancePayrollSkeleton() {
  return (
    <PortalSkeletonShell>
      <PageHeroSkeleton />
      <PageKpiSkeleton count={3} columns={3} />
      <PageTabsSkeleton count={3} />
      <PageTableSkeleton rows={8} columns={7} showToolbar />
    </PortalSkeletonShell>
  );
}

/** Budgets with charts */
export function FinanceBudgetsSkeleton() {
  return (
    <PortalSkeletonShell>
      <PageHeroSkeleton />
      <PageKpiSkeleton count={3} columns={3} />
      <PageFilterBarSkeleton />
      <PageTabsSkeleton count={3} />
      <PageChartGridSkeleton count={2} />
      <PageTableSkeleton rows={8} columns={8} showToolbar />
    </PortalSkeletonShell>
  );
}

/** Ledgers / tax tables */
export function FinanceSectionSkeleton() {
  return (
    <PortalSkeletonShell>
      <PageHeroSkeleton />
      <PageFilterBarSkeleton />
      <PageTabsSkeleton count={4} />
      <PageCardSkeleton lines={6} />
      <PageCardSkeleton lines={6} />
    </PortalSkeletonShell>
  );
}

/** Reports with chart tabs */
export function FinanceReportsSkeleton() {
  return (
    <PortalSkeletonShell>
      <PageHeroSkeleton />
      <PageTabsSkeleton count={3} />
      <PageChartPanelSkeleton height="h-[260px]" />
      <PageTableSkeleton rows={6} columns={4} showToolbar />
    </PortalSkeletonShell>
  );
}
