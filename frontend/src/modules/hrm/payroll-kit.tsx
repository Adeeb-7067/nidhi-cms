import type { ReactNode } from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { HrmPayrollChecklist, HrmPayrollRun } from "./types";

/** INR with 2 decimal places — matches payroll dashboard mockups. */
export function formatPayrollAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Card / panel shell — works in light and dark mode via theme tokens. */
export const payrollSurfaceClass =
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm";

/** Square outline control (back, menu, period arrows). */
export const payrollIconButtonClass =
  "h-9 w-9 shrink-0 rounded-lg border border-border bg-background text-foreground hover:bg-muted/60";

function PayrollNavIconButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      className={payrollIconButtonClass}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

const metricToneClass = {
  default: "text-foreground",
  violet: "text-violet-600 dark:text-violet-400",
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
} as const;

export function PayrollMetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof metricToneClass;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn(payrollSurfaceClass, "flex min-h-[116px] flex-col p-4")}>
      <div className="flex items-start gap-2">
        {Icon && (
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        )}
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-auto pt-4">
        <p className={cn("text-[1.35rem] font-bold leading-none tabular-nums tracking-tight", metricToneClass[tone])}>
          {value}
        </p>
        {hint && <p className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function PayPeriodHeader({
  periodLabel,
  dateRangeLabel,
  run,
  isCurrentPeriod,
  onPrev,
  onNext,
  monthSelect,
  yearSelect,
  backHref = "/hrm",
}: {
  year: number;
  month: number;
  periodLabel: string;
  dateRangeLabel: string;
  run?: HrmPayrollRun;
  isCurrentPeriod: boolean;
  onPrev: () => void;
  onNext: () => void;
  monthSelect: ReactNode;
  yearSelect: ReactNode;
  backHref?: string;
}) {
  const disbursementBadge =
    run?.status === "paid"
      ? {
          label: "Disbursed",
          className:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        }
      : run?.status === "finalized" || run?.status === "reviewed"
        ? {
            label: "Pending disbursement",
            className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          }
        : null;

  return (
    <div className={cn(payrollSurfaceClass, "p-4 sm:p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon" className={payrollIconButtonClass}>
            <Link href={backHref} aria-label="Back to HRM">
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Pay period
              </span>
              {isCurrentPeriod && (
                <Badge
                  variant="outline"
                  className="h-5 rounded-md border-violet-500/30 bg-violet-500/10 px-2 text-[10px] font-medium text-violet-700 dark:text-violet-300"
                >
                  Current
                </Badge>
              )}
              {disbursementBadge && (
                <Badge
                  variant="outline"
                  className={cn("h-5 rounded-md px-2 text-[10px] font-medium", disbursementBadge.className)}
                >
                  {disbursementBadge.label}
                </Badge>
              )}
            </div>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{periodLabel}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{dateRangeLabel}</p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/20 p-1 sm:pt-0.5"
          role="group"
          aria-label="Change pay period"
        >
          <PayrollNavIconButton onClick={onPrev} label="Previous month">
            <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          </PayrollNavIconButton>
          {monthSelect}
          <PayrollNavIconButton onClick={onNext} label="Next month">
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </PayrollNavIconButton>
          {yearSelect}
        </div>
      </div>
    </div>
  );
}

export function PayrollDisbursementProgress({ progressPct }: { progressPct: number }) {
  return (
    <div className={cn(payrollSurfaceClass, "space-y-3 p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">Disbursement progress</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{Math.round(progressPct)}%</p>
      </div>
      <Progress value={progressPct} className="h-1 bg-muted [&>div]:bg-violet-600" />
    </div>
  );
}

export function payrollLineStatus(runStatus?: string): { label: string; className: string } {
  if (runStatus === "paid") {
    return {
      label: "Paid",
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }
  if (runStatus === "finalized") {
    return {
      label: "Pending disbursement",
      className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
  }
  if (runStatus === "reviewed") {
    return {
      label: "Reviewed",
      className: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    };
  }
  if (runStatus === "draft") {
    return {
      label: "Pending",
      className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
  }
  return { label: "No run", className: "border-border bg-muted text-muted-foreground" };
}

export function isLinePaid(runStatus?: string) {
  return runStatus === "paid";
}

export function isLinePending(runStatus?: string) {
  return runStatus !== "paid";
}

function formatBlockerSummary(code: string, count: number): string {
  switch (code) {
    case "missing_shift":
      return `${count} employee(s) missing shift`;
    case "missing_salary_structure":
      return `${count} employee(s) missing salary structure`;
    case "pending_leave":
      return `${count} pending leave request(s)`;
    case "pending_corrections":
      return `${count} pending attendance correction(s)`;
    default:
      return `${count} unresolved item(s)`;
  }
}

export function PayrollReadinessBanner({
  checklist,
  loading,
  onOpenPayrollSettings,
}: {
  checklist?: HrmPayrollChecklist;
  loading?: boolean;
  onOpenPayrollSettings?: () => void;
}) {
  if (loading) {
    return (
      <div className={cn(payrollSurfaceClass, "px-4 py-3 text-sm text-muted-foreground")}>
        Checking payroll readiness…
      </div>
    );
  }

  if (!checklist || checklist.ready) return null;

  return (
    <div
      className={cn(
        payrollSurfaceClass,
        "border-amber-500/40 bg-amber-50/90 px-4 py-4 dark:border-amber-500/35 dark:bg-amber-950/25 sm:px-5 sm:py-5",
      )}
    >
      <p className="text-sm font-semibold text-foreground">Resolve before running payroll</p>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {checklist.blockers.map((blocker) => (
          <li key={blocker.code}>• {formatBlockerSummary(blocker.code, blocker.count)}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className={payrollOutlineButtonClass}>
          <Link href="/hrm/employees">Employees</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={payrollOutlineButtonClass}
          onClick={onOpenPayrollSettings}
        >
          Payroll settings
        </Button>
      </div>
    </div>
  );
}

export const payrollSelectTriggerClass =
  "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-none";

export const payrollTabsListClass =
  "inline-flex h-9 items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1";

export const payrollTabsTriggerClass =
  "rounded-md px-3 text-xs font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

export const payrollPanelClass = cn(payrollSurfaceClass, "overflow-hidden");

export const payrollRunButtonClass =
  "h-9 gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500";

export const payrollOutlineButtonClass =
  "h-8 gap-1.5 rounded-lg border border-border bg-background px-3 text-xs hover:bg-muted/60 sm:h-9 sm:text-sm";
