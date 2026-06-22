import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DashboardHero,
  ExecutiveStatCard,
  PageKpiSkeleton,
  type StatCardProps,
} from "@/components/dashboard/dashboard-kit";
import { PageTableSkeleton } from "@/components/loading";

/** Shared page wrapper for all portal roles (admin, dev, client, etc.). */
export function PortalPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-4 pb-8", className)}>{children}</div>;
}

/** Hero banner — consistent across every role portal. */
export function PortalPageHero(props: React.ComponentProps<typeof DashboardHero>) {
  return <DashboardHero {...props} />;
}

export type PortalKpiItem = StatCardProps;

/** Executive KPI row used across portal pages. */
export function PortalKpiGrid({
  loading,
  count = 4,
  columns = 4,
  items,
}: {
  loading?: boolean;
  count?: number;
  columns?: 2 | 3 | 4;
  items: PortalKpiItem[];
}) {
  if (loading) return <PageKpiSkeleton count={count} columns={columns} />;
  const colClass =
    columns === 2
      ? "sm:grid-cols-2 xl:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 xl:grid-cols-3"
        : "sm:grid-cols-2 xl:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass)}>
      {items.map((item, i) => (
        <ExecutiveStatCard key={item.title || `kpi-${i}`} {...item} delay={item.delay ?? i} />
      ))}
    </div>
  );
}

/** Toolbar row: tabs on the left, filters/actions on the right. */
export function PortalToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const portalTabsListClass =
  "inline-flex h-9 w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden bg-muted/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
export const portalTabsTriggerClass =
  "h-7 shrink-0 rounded-md px-3 py-0 text-xs leading-none";

export function PortalTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return <TabsList className={cn(portalTabsListClass, className)} {...props} />;
}

export function PortalTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger className={cn(portalTabsTriggerClass, className)} {...props} />;
}

/** Primary content panel for tables and lists. */
export function PortalContentCard({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-border/60 bg-card", className)}>
      <CardContent className={cn("p-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/** Team / Admin list tab: PortalContentCard + skeleton or AdvancedTable. */
export function PortalTablePanel({
  isLoading,
  loadingRows = 8,
  loadingColumns = 6,
  children,
}: {
  isLoading?: boolean;
  loadingRows?: number;
  loadingColumns?: number;
  children: React.ReactNode;
}) {
  return (
    <PortalContentCard>
      {isLoading ? (
        <PageTableSkeleton rows={loadingRows} columns={loadingColumns} showToolbar />
      ) : (
        children
      )}
    </PortalContentCard>
  );
}

export function PortalSectionMeta({
  label,
  count,
}: {
  label: string;
  count?: number;
}) {
  return (
    <p className="px-1 text-xs text-muted-foreground">
      {label}
      {count != null ? (
        <>
          {" "}
          · <span className="font-medium text-foreground">{count}</span>
        </>
      ) : null}
    </p>
  );
}

export function PortalEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <Card className="border-dashed border-border/60">
      <CardContent className="py-16 text-center">
        <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Standard hero action buttons (h-9, text-xs). */
export function portalActionButtonClass(extra?: string) {
  return cn("h-9 text-xs", extra);
}
