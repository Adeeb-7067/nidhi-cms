import React from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type CmsKpiAccent =
  | "default"
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "red"
  | "sky"
  | "pink";

export type CmsKpiItem = {
  title: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
  accent?: CmsKpiAccent;
  alert?: boolean;
  delay?: number;
  trend?: { label: string; positive?: boolean };
};

type AccentStyle = {
  /** Soft wash — no border, light tinted gradient */
  surface: string;
  /** Ambient orb color */
  glow: string;
  /** Icon well */
  iconWell: string;
  value: string;
};

const accentMap: Record<CmsKpiAccent, AccentStyle> = {
  default: {
    surface:
      "bg-gradient-to-br from-primary/[0.09] via-background/80 to-primary/[0.03] dark:from-primary/15 dark:via-card/40 dark:to-primary/[0.04]",
    glow: "bg-primary/30",
    iconWell:
      "bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-primary",
  },
  blue: {
    surface:
      "bg-gradient-to-br from-blue-500/[0.09] via-background/80 to-sky-500/[0.04] dark:from-blue-500/15 dark:via-card/40 dark:to-sky-500/[0.05]",
    glow: "bg-blue-400/35",
    iconWell:
      "bg-gradient-to-br from-blue-500/20 to-sky-500/5 text-blue-600 dark:text-blue-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-blue-700 dark:text-blue-300",
  },
  violet: {
    surface:
      "bg-gradient-to-br from-violet-500/[0.09] via-background/80 to-fuchsia-500/[0.03] dark:from-violet-500/15 dark:via-card/40 dark:to-fuchsia-500/[0.05]",
    glow: "bg-violet-400/35",
    iconWell:
      "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/5 text-violet-600 dark:text-violet-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-violet-700 dark:text-violet-300",
  },
  green: {
    surface:
      "bg-gradient-to-br from-emerald-500/[0.09] via-background/80 to-teal-500/[0.04] dark:from-emerald-500/15 dark:via-card/40 dark:to-teal-500/[0.05]",
    glow: "bg-emerald-400/35",
    iconWell:
      "bg-gradient-to-br from-emerald-500/20 to-teal-500/5 text-emerald-600 dark:text-emerald-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    surface:
      "bg-gradient-to-br from-amber-500/[0.10] via-background/80 to-orange-500/[0.04] dark:from-amber-500/15 dark:via-card/40 dark:to-orange-500/[0.05]",
    glow: "bg-amber-400/35",
    iconWell:
      "bg-gradient-to-br from-amber-500/20 to-orange-500/5 text-amber-600 dark:text-amber-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-amber-700 dark:text-amber-300",
  },
  red: {
    surface:
      "bg-gradient-to-br from-rose-500/[0.09] via-background/80 to-red-500/[0.04] dark:from-rose-500/15 dark:via-card/40 dark:to-red-500/[0.05]",
    glow: "bg-rose-400/35",
    iconWell:
      "bg-gradient-to-br from-rose-500/20 to-red-500/5 text-rose-600 dark:text-rose-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-rose-700 dark:text-rose-300",
  },
  sky: {
    surface:
      "bg-gradient-to-br from-sky-500/[0.09] via-background/80 to-cyan-500/[0.04] dark:from-sky-500/15 dark:via-card/40 dark:to-cyan-500/[0.05]",
    glow: "bg-sky-400/35",
    iconWell:
      "bg-gradient-to-br from-sky-500/20 to-cyan-500/5 text-sky-600 dark:text-sky-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-sky-700 dark:text-sky-300",
  },
  pink: {
    surface:
      "bg-gradient-to-br from-pink-500/[0.09] via-background/80 to-rose-500/[0.03] dark:from-pink-500/15 dark:via-card/40 dark:to-rose-500/[0.05]",
    glow: "bg-pink-400/35",
    iconWell:
      "bg-gradient-to-br from-pink-500/20 to-rose-500/5 text-pink-600 dark:text-pink-400 shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5)]",
    value: "text-pink-700 dark:text-pink-300",
  },
};

/** Soft gradient KPI card — no border chrome; icon + metric alignment first. */
export function CmsKpiCard({
  title,
  value,
  hint,
  icon: Icon = BarChart3,
  href,
  accent = "default",
  alert,
  delay = 0,
  trend,
  className,
}: CmsKpiItem & { className?: string }) {
  const styles = accentMap[accent] ?? accentMap.default;
  const reduceMotion = useReducedMotion();

  const inner = (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl",
        styles.surface,
        alert && "ring-1 ring-inset ring-destructive/25",
        href && "cursor-pointer transition-[transform,filter] duration-200 hover:brightness-[1.03] active:scale-[0.99]",
        className,
      )}
    >
      {/* Soft ambient texture */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl opacity-50",
          styles.glow,
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full blur-3xl opacity-30",
          styles.glow,
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.06) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative flex h-full min-h-[4.75rem] items-center gap-3.5 px-3.5 py-3 sm:gap-4 sm:px-4 sm:py-3.5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl backdrop-blur-[2px]",
            styles.iconWell,
          )}
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} aria-hidden />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
            {alert && value !== 0 && value !== "0" ? (
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive animate-pulse" />
            ) : null}
          </div>

          <p
            className={cn(
              "truncate text-[1.375rem] font-semibold tabular-nums tracking-tight leading-none",
              alert && Number(value) > 0 ? "text-destructive" : styles.value,
            )}
          >
            {value}
          </p>

          {(hint || trend) && (
            <div className="flex min-h-[0.875rem] flex-wrap items-center gap-x-2 gap-y-0.5">
              {hint ? (
                <span className="line-clamp-1 text-[10px] leading-tight text-muted-foreground/90">
                  {hint}
                </span>
              ) : null}
              {trend ? (
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-semibold leading-tight",
                    trend.positive === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {trend.label}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      className="h-full"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { delay: delay * 0.04, duration: 0.22 }
      }
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

export function CmsKpiSkeleton({
  count = 4,
  columns = 4,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}) {
  const colClass = gridColsClass(columns);
  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[4.75rem] rounded-2xl" />
      ))}
    </div>
  );
}

function gridColsClass(columns: 2 | 3 | 4 | 6) {
  if (columns === 2) return "sm:grid-cols-2 xl:grid-cols-2";
  if (columns === 3) return "sm:grid-cols-2 xl:grid-cols-3";
  if (columns === 6) return "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6";
  return "sm:grid-cols-2 xl:grid-cols-4";
}

/** Responsive KPI strip used on list/dashboard pages. */
export function CmsKpiGrid({
  items,
  loading,
  count,
  columns = 4,
  className,
}: {
  items: CmsKpiItem[];
  loading?: boolean;
  /** Skeleton tile count while loading (defaults to items.length or columns). */
  count?: number;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}) {
  const skeletonCount = count ?? Math.max(items.length, columns);
  if (loading) {
    return <CmsKpiSkeleton count={skeletonCount} columns={columns} className={className} />;
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3", gridColsClass(columns), className)}>
      {items.map((item, i) => (
        <CmsKpiCard key={item.title || `kpi-${i}`} {...item} delay={item.delay ?? i} />
      ))}
    </div>
  );
}
