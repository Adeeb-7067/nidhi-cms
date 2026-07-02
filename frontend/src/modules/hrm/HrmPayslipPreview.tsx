import { cn } from "@/lib/utils";
import type { HrmPayslipDetail } from "./types";
import { formatInr, payslipPeriodLabel } from "./payslip-utils";

function Row({
  label,
  value,
  className,
  strong,
}: {
  label: string;
  value: string;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-xs", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums text-foreground", strong && "font-semibold text-sm")}>{value}</span>
    </div>
  );
}

export function HrmPayslipPreview({
  detail,
  className,
  id,
}: {
  detail: HrmPayslipDetail;
  className?: string;
  id?: string;
}) {
  const period = payslipPeriodLabel(detail.month, detail.year);

  return (
    <div
      id={id}
      className={cn(
        "mx-auto w-full max-w-lg overflow-hidden rounded-xl border border-border/60 bg-card text-foreground shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border/60 bg-muted/30 px-6 py-5 text-center">
        <p className="text-lg font-bold tracking-tight">{detail.companyName}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Salary Slip</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{period}</p>
      </div>

      <div className="space-y-4 p-6 text-sm">
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3 space-y-2">
          <Row label="Employee" value={detail.employeeName} strong />
          {detail.employeeId && <Row label="Employee ID" value={detail.employeeId} />}
          {detail.department && <Row label="Department" value={detail.department} />}
          <Row label="Paid days" value={String(detail.paidDays)} />
          {detail.lopDays > 0 && <Row label="LOP days" value={String(detail.lopDays)} />}
          {detail.lateCount > 0 && <Row label="Late arrivals" value={String(detail.lateCount)} />}
        </div>

        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
          <Row label="Basic" value={formatInr(detail.basic)} />
          <Row label="HRA" value={formatInr(detail.hra)} />
          <Row label="Allowances" value={formatInr(detail.allowances)} />
          <div className="border-t border-border/60 pt-2">
            <Row label="Gross" value={formatInr(detail.gross)} strong />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
          {detail.lopDeduction > 0 && (
            <Row label="LOP deduction" value={`−${formatInr(detail.lopDeduction)}`} className="text-red-700 dark:text-red-400" />
          )}
          <div className="border-t border-border/60 pt-2">
            <Row label="Total deductions" value={`−${formatInr(detail.deductions)}`} className="text-red-700 dark:text-red-400" />
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Net pay</span>
          <span className="text-lg font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
            {formatInr(detail.net)}
          </span>
        </div>
      </div>
    </div>
  );
}
