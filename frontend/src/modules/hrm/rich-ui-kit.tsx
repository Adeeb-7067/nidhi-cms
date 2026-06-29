/**
 * Rich HRM UI primitives (Satyakabir-style). Compose with hrm-ui-kit / hrm-reference-kit.
 *
 * @example HrmPersonChip — avatar + name in tables
 * @example HrmDetailDrawer — row detail side panel
 * @example HrmDataExplorerCard — KPI strip + filters + table shell
 */
import type { ReactNode } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HrmEmployeeAvatar } from "./dashboard-sections";
import {
  HrmRefDetailRow,
  HrmRefDetailSection,
} from "./hrm-reference-kit";
import { HrmFilterBar } from "./hrm-ui-kit";

export const HrmDetailSection = HrmRefDetailSection;
export const HrmDetailRow = HrmRefDetailRow;

export function HrmDetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  header,
  actions,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  header?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("w-full overflow-y-auto sm:max-w-md", className)}>
        <SheetHeader>
          {header ?? (
            <>
              <SheetTitle>{title}</SheetTitle>
              {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
            </>
          )}
        </SheetHeader>
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        <div className="mt-6 space-y-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export function HrmPersonChip({
  name,
  subtitle,
  avatarUrl,
  href,
  className,
}: {
  name: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  href?: string;
  className?: string;
}) {
  const inner = (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <HrmEmployeeAvatar name={name} avatarUrl={avatarUrl} className="h-8 w-8" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        {subtitle ? (
          <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded-lg transition-colors hover:bg-muted/40">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function HrmRatingStars({
  value = 0,
  max = 5,
  editable,
  onChange,
  size = "sm",
}: {
  value?: number;
  max?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnSize = size === "md" ? "h-7 w-7" : "h-6 w-6";
  return (
    <span className="inline-flex items-center gap-0.5" role={editable ? "group" : undefined}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!editable}
            className={cn(
              "inline-flex items-center justify-center rounded transition-colors",
              btnSize,
              editable ? "cursor-pointer hover:scale-110" : "cursor-default",
              filled ? "text-amber-500" : "text-muted-foreground/30",
            )}
            onClick={() => editable && onChange?.(i + 1)}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          >
            <Star className={cn(iconSize, filled && "fill-current")} />
          </button>
        );
      })}
    </span>
  );
}

const TREND_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "180", label: "6 months" },
] as const;

export type HrmTrendDays = (typeof TREND_OPTIONS)[number]["value"];

export function HrmTrendRangeSelect({
  value,
  onChange,
  className,
}: {
  value: HrmTrendDays;
  onChange: (value: HrmTrendDays) => void;
  className?: string;
}) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-border/60 bg-background px-3 text-sm",
        className,
      )}
      value={value}
      onChange={(e) => onChange(e.target.value as HrmTrendDays)}
    >
      {TREND_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function sliceTrendByDays<T extends { date: string }>(rows: T[], days: number): T[] {
  if (!rows.length) return rows;
  if (days >= 180) return rows;
  return rows.slice(-Math.min(days, rows.length));
}

export function HrmDataExplorerCard({
  kpis,
  filters,
  actions,
  children,
}: {
  kpis?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {kpis}
      {(filters || actions) && (
        <HrmFilterBar embedded>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {filters ? <div className="flex flex-1 flex-wrap items-center gap-2">{filters}</div> : null}
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </HrmFilterBar>
      )}
      {children}
    </div>
  );
}

export function HrmDrawerCloseButton({
  onClick,
  label = "Close",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}
