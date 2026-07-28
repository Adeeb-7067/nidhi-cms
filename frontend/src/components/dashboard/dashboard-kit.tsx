import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { LucideIcon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalDashboardSkeleton } from "@/components/loading/page-skeletons";
import { CmsKpiCard } from "@/components/cms/cms-kpi";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export function DashboardHero({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_2px_24px_hsl(var(--foreground)/0.06)] p-5 sm:p-6"
    >
      <motion.div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl"
        animate={{ scale: [1.1, 1, 1.1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <motion.div className="space-y-2 min-w-0" {...fadeUp}>
          {badge && (
            <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
              {badge}
            </Badge>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground max-w-xl">{subtitle}</p>
          )}
        </motion.div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </motion.div>
    </motion.div>
  );
}

export type StatCardProps = {
  title: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: "default" | "blue" | "violet" | "green" | "amber" | "red" | "sky" | "pink";
  alert?: boolean;
  delay?: number;
};

/** Standard 2×4 grid for page-level StatCard rows. */
export function PageKpiRow({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2 lg:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={cn("grid grid-cols-1 gap-2", colClass, className)}>{children}</div>;
}

export function PageKpiSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2 lg:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-1 gap-2", colClass)}>
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
      ))}
    </div>
  );
}

/** Compact metric with icon header (Analytics, team dashboards). */
export function KpiMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-2 px-3">
        <CardTitle className="text-[10px] font-medium leading-none">{title}</CardTitle>
        {Icon && <Icon className={cn("h-3 w-3 shrink-0", iconClassName)} />}
      </CardHeader>
      <CardContent className="px-3 pb-2.5 pt-1">
        <div className="text-lg font-bold tabular-nums tracking-tight">{value}</div>
        {subtitle && <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

/** Minimal centered KPI tile — shared CMS kit. */
export function KpiSimpleCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <CmsKpiCard
      title={label}
      value={typeof value === "string" || typeof value === "number" ? value : String(value)}
      className={valueClassName}
    />
  );
}

/** Inline stat for table/list summary bars. */
export function KpiInlineStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="text-center min-w-[3.5rem]">
      <div className={cn("text-base font-bold tabular-nums", valueClassName)}>{value}</div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</div>
    </div>
  );
}

export function StatCard({
  title,
  value,
  hint,
  icon = BarChart3,
  href,
  accent = "default",
  alert,
  delay = 0,
}: StatCardProps) {
  return (
    <CmsKpiCard
      title={title}
      value={value}
      hint={hint}
      icon={icon}
      href={href}
      accent={accent}
      alert={alert}
      delay={delay}
    />
  );
}

export function QuickAction({
  title,
  description,
  icon: Icon,
  href,
  accent = "primary",
  delay = 0,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  accent?: "primary" | "green" | "red" | "amber" | "violet" | "sky";
  delay?: number;
}) {
  const accents = {
    primary: "bg-primary/10 text-primary group-hover:bg-primary/20",
    green: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20",
    red: "bg-red-500/10 text-red-500 group-hover:bg-red-500/20",
    amber: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20",
    violet: "bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20",
    sky: "bg-sky-500/10 text-sky-500 group-hover:bg-sky-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05, duration: 0.25 }}
    >
      <Link href={href}>
        <div className="group relative flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5">
          <motion.div
            className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors", accents[accent])}
            whileHover={{ scale: 1.1, rotate: -3 }}
            whileTap={{ scale: 0.92 }}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function ChartCard({
  title,
  description,
  children,
  className,
  badge,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  badge?: string | number;
}) {
  return (
    <Card className={cn("dashboard-panel border-border/50 overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <motion.div
          className="flex items-center justify-between gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
          </div>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[10px] font-bold tabular-nums">
              {badge}
            </Badge>
          )}
        </motion.div>
      </CardHeader>
      <CardContent className="pb-4">{children}</CardContent>
    </Card>
  );
}

export const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  color: "hsl(var(--card-foreground))",
  borderRadius: "8px",
  fontSize: "12px",
};

export function DashboardSkeleton() {
  return <PortalDashboardSkeleton />;
}

/** Premium KPI — delegates to shared CMS kit. */
export function ExecutiveStatCard({
  title,
  value,
  hint,
  icon = BarChart3,
  href,
  accent = "default",
  alert,
  delay = 0,
  trend,
}: StatCardProps & { trend?: { label: string; positive?: boolean } }) {
  return (
    <CmsKpiCard
      title={title}
      value={value}
      hint={hint}
      icon={icon}
      href={href}
      accent={accent}
      alert={alert}
      delay={delay}
      trend={trend}
    />
  );
}

export function PanelCard({
  title,
  description,
  children,
  className,
  badge,
  viewAllHref,
  viewAllLabel = "View all",
  contentClassName,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  badge?: string | number;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <Card className={cn("dashboard-panel flex h-full flex-col border-border/50 overflow-hidden", className)}>
      <CardHeader className="shrink-0 space-y-0 border-b border-border/40 bg-muted/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
            {description && (
              <CardDescription className="text-[11px] mt-0.5">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge !== undefined && (
              <Badge variant="secondary" className="text-[10px] font-bold tabular-nums">
                {badge}
              </Badge>
            )}
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {viewAllLabel}
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("flex-1 p-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function OverviewTile({
  label,
  value,
  sublabel,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  href?: string;
}) {
  return (
    <CmsKpiCard
      title={label}
      value={value}
      hint={sublabel}
      icon={Icon}
      href={href}
    />
  );
}

export function ActivityFeedItem({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  time,
}: {
  icon?: LucideIcon;
  iconClassName?: string;
  title: React.ReactNode;
  subtitle?: string;
  time?: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40 transition-colors">
      {Icon ? (
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted", iconClassName)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      ) : (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug">{title}</div>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>}
      </div>
      {time && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 self-start">{time}</span>
      )}
    </div>
  );
}

export function SystemHealthRow({ label, status, detail }: { label: string; status: string; detail?: string }) {
  const ok = status.toLowerCase().includes("operational") || status.toLowerCase().includes("connected");
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn("h-2 w-2 rounded-full shrink-0", ok ? "bg-emerald-500" : "bg-amber-500")} />
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-xs font-semibold", ok ? "text-emerald-600" : "text-amber-600")}>{status}</p>
        {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
