import React from "react";
import { useLocation } from "wouter";
import { getRouteMeta } from "@/lib/route-meta";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Force hide auto header even if route has one */
  hideHeader?: boolean;
};

export function PageShell({
  children,
  title,
  description,
  actions,
  className,
  hideHeader,
}: PageShellProps) {
  const [location] = useLocation();
  const meta = getRouteMeta(location);
  const showHeader = !hideHeader && !meta.hideHeader && (title || meta.title);
  const headerTitle = title ?? meta.title;
  const headerDesc = description ?? meta.description;

  return (
    <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
      {showHeader && (
        <PageHeader title={headerTitle} description={headerDesc}>
          {actions}
        </PageHeader>
      )}
      {children}
    </div>
  );
}
