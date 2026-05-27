import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

const accentMap = {
  default: {
    ring: "ring-primary/20",
    icon: "bg-primary/15 text-primary",
    glow: "from-primary/5",
    fill: "border-l-4 border-l-primary bg-gradient-to-br from-primary/12 via-card to-card",
    value: "text-primary",
  },
  blue: {
    ring: "ring-blue-500/25",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    glow: "from-blue-500/5",
    fill: "border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/12 via-card to-card",
    value: "text-blue-600 dark:text-blue-400",
  },
  violet: {
    ring: "ring-violet-500/25",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    glow: "from-violet-500/5",
    fill: "border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-500/12 via-card to-card",
    value: "text-violet-600 dark:text-violet-400",
  },
  green: {
    ring: "ring-green-500/25",
    icon: "bg-green-500/15 text-green-600 dark:text-green-400",
    glow: "from-green-500/5",
    fill: "border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/12 via-card to-card",
    value: "text-green-600 dark:text-green-400",
  },
  amber: {
    ring: "ring-amber-500/25",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    glow: "from-amber-500/5",
    fill: "border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/12 via-card to-card",
    value: "text-amber-600 dark:text-amber-400",
  },
  red: {
    ring: "ring-red-500/25",
    icon: "bg-red-500/15 text-red-600 dark:text-red-400",
    glow: "from-red-500/5",
    fill: "border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/12 via-card to-card",
    value: "text-red-600 dark:text-red-400",
  },
  sky: {
    ring: "ring-sky-500/25",
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    glow: "from-sky-500/5",
    fill: "border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-500/12 via-card to-card",
    value: "text-sky-600 dark:text-sky-400",
  },
  pink: {
    ring: "ring-pink-500/25",
    icon: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
    glow: "from-pink-500/5",
    fill: "border-l-4 border-l-pink-500 bg-gradient-to-br from-pink-500/12 via-card to-card",
    value: "text-pink-600 dark:text-pink-400",
  },
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
    columns === 2 ? "lg:grid-cols-2" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return <div className={cn("grid gap-2 grid-cols-2", colClass, className)}>{children}</div>;
}

export function PageKpiSkeleton({ count = 4, columns = 4 }: { count?: number; columns?: 2 | 3 | 4 }) {
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

/** Minimal centered KPI tile (project analytics, etc.). */
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
    <Card className="bg-card border-border/60">
      <CardContent className="p-2 text-center">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wide leading-tight">{label}</p>
        <p className={cn("mt-0.5 text-base font-bold tabular-nums", valueClassName)}>{value}</p>
      </CardContent>
    </Card>
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
  icon: Icon,
  href,
  accent = "default",
  alert,
  delay = 0,
}: StatCardProps) {
  const styles = accentMap[accent];
  const inner = (
    <Card
      className={cn(
        "dashboard-kpi relative overflow-hidden border-border/50 transition-all duration-200",
        "hover:shadow-[0_4px_20px_hsl(var(--foreground)/0.08)] hover:border-primary/20",
        alert && "border-destructive/30 bg-destructive/[0.03]",
        href && "cursor-pointer group",
      )}
    >
      <motion.div
        className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity", styles.glow)}
      />
      <CardContent className="relative p-3">
        <motion.div
          className="flex items-start justify-between gap-2"
          whileHover={href ? { x: 2 } : undefined}
        >
          <motion.div
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg ring-1", styles.ring, styles.icon)}
            whileHover={{ scale: 1.06, rotate: 4 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </motion.div>
          {alert && value !== 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          )}
        </motion.div>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className={cn("mt-0.5 text-lg font-bold tabular-nums tracking-tight", alert && Number(value) > 0 && "text-destructive")}>
          {value}
        </p>
        {hint && <p className="mt-0.5 text-[10px] text-muted-foreground leading-snug">{hint}</p>}
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.3 }}
    >
      {href ? <Link href={href}>{inner}</Link> : inner}
    </motion.div>
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
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[4.5rem] rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 h-80 rounded-xl bg-muted/50 animate-pulse" />
        <div className="lg:col-span-4 h-80 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    </motion.div>
  );
}

/** Premium KPI — icon left, large metric (executive dashboard style). */
export function ExecutiveStatCard({
  title,
  value,
  hint,
  icon: Icon,
  href,
  accent = "default",
  alert,
  delay = 0,
  trend,
}: StatCardProps & { trend?: { label: string; positive?: boolean } }) {
  const styles = accentMap[accent];
  const inner = (
    <Card
      className={cn(
        "dashboard-kpi h-full border-border/50 transition-all duration-200 overflow-hidden",
        styles.fill,
        "hover:shadow-[0_4px_20px_hsl(var(--foreground)/0.08)]",
        alert && "border-destructive/40",
        href && "cursor-pointer group",
      )}
    >
      <CardContent className="flex h-full items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 shadow-sm",
            styles.ring,
            styles.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums tracking-tight leading-none mt-1",
              alert && Number(value) > 0 ? "text-destructive" : styles.value,
            )}
          >
            {value}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            {trend && (
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  trend.positive === false ? "text-destructive" : "text-emerald-600",
                )}
              >
                {trend.label}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
    >
      {href ? (
        <Link href={href} className="block h-full">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
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
  const body = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors",
        href && "hover:border-primary/25 hover:bg-muted/30 cursor-pointer",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
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
