/**
 * Satyakabir payroll UI primitives — reference: HRM Satyakabir/Frontend/src/components/payroll/
 */
import { useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  IndianRupee,
  FileSpreadsheet,
  Play,
  Search,
  Users,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  TrendingUp,
  AlertTriangle,
  BadgeIndianRupee,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HrmRefPageHeader, HrmRefStatusPill } from "./hrm-reference-kit";
import { inrMoney } from "./payslip-view-model";
import {
  MONTH_OPTIONS,
  buildYearOptions,
  currentPayrollPeriod,
  derivePayPeriodStatus,
  formatPayPeriodRange,
  formatPayrollPeriodLabel,
  isCurrentPayrollPeriod,
  shiftPayrollPeriod,
  type PayrollPeriod,
  type PayPeriodRunStatus,
  deriveRunStatusFromPayrollRun,
} from "./payroll-period-utils";
import type { HrmPayrollOrgOverview, HrmSalaryStructure } from "./types";

export type PayrollStatusFilter = "ALL" | "PAID" | "UNPAID";

export type PayrollPeriodTotals = {
  contractPay: number;
  totalNet: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  employeeCount: number;
};

/** Pre-run period totals from org overview (team profile + structure salaries). */
export function totalsFromOrgOverview(overview?: HrmPayrollOrgOverview): PayrollPeriodTotals {
  const contractPay = overview?.monthlyCommitmentNet ?? 0;
  const employeeCount = overview?.totalActive ?? 0;
  return {
    contractPay,
    totalNet: contractPay,
    paidAmount: 0,
    pendingAmount: contractPay,
    paidCount: 0,
    pendingCount: employeeCount,
    employeeCount,
  };
}

/** @deprecated Prefer totalsFromOrgOverview when team-form salaries are in use. */
export function estimateTotalsFromStructures(structures: HrmSalaryStructure[]): PayrollPeriodTotals {
  const contractPay = structures.reduce((s, r) => s + (r.net ?? 0), 0);
  const totalNet = contractPay;
  const employeeCount = structures.length;
  return {
    contractPay,
    totalNet,
    paidAmount: 0,
    pendingAmount: totalNet,
    paidCount: 0,
    pendingCount: employeeCount,
    employeeCount,
  };
}

export function totalsFromPayrollLines(
  lines: Array<{ gross?: number; net?: number; totalSalary?: number }>,
  runPaid: boolean,
): PayrollPeriodTotals {
  const contractPay = lines.reduce((s, l) => s + (l.totalSalary ?? 0), 0);
  const totalNet = lines.reduce((s, l) => s + (l.net ?? 0), 0);
  const employeeCount = lines.length;
  const paidCount = runPaid ? employeeCount : 0;
  const pendingCount = runPaid ? 0 : employeeCount;
  return {
    contractPay,
    totalNet,
    paidAmount: runPaid ? totalNet : 0,
    pendingAmount: runPaid ? 0 : totalNet,
    paidCount,
    pendingCount,
    employeeCount,
  };
}

export function totalsFromPayslipRows(
  rows: Array<{ gross?: number | null; net?: number | null; contractNet?: number | null; status?: string }>,
): PayrollPeriodTotals {
  const contractPay = rows.reduce((s, r) => s + (r.contractNet ?? 0), 0);
  const totalNet = rows.reduce((s, r) => s + (r.net ?? 0), 0);
  const paidCount = rows.filter((r) => r.status === "PAID").length;
  const pendingCount = rows.length - paidCount;
  const paidAmount = rows.filter((r) => r.status === "PAID").reduce((s, r) => s + (r.net ?? 0), 0);
  return {
    contractPay,
    totalNet,
    paidAmount,
    pendingAmount: totalNet - paidAmount,
    paidCount,
    pendingCount,
    employeeCount: rows.length,
  };
}

const STATUS_LABEL: Record<PayPeriodRunStatus, { label: string; tone: string }> = {
  not_run: { label: "Not processed", tone: "bg-muted text-muted-foreground border-border" },
  in_progress: { label: "Pending disbursement", tone: "bg-warning/15 text-warning border-warning/30" },
  completed: { label: "Fully disbursed", tone: "bg-success/15 text-success border-success/30" },
};

export function PayPeriodNavigator({
  period,
  onChange,
  runStatus = "not_run",
  payrollRunStatus,
  className,
}: {
  period: PayrollPeriod;
  onChange: (period: PayrollPeriod) => void;
  runStatus?: PayPeriodRunStatus;
  /** When set, refines disbursement badge (draft/reviewed/finalized/paid). */
  payrollRunStatus?: string;
  className?: string;
}) {
  const isCurrent = isCurrentPayrollPeriod(period);
  const status = STATUS_LABEL[runStatus];
  const years = buildYearOptions(period.year);

  const disbursementBadge =
    payrollRunStatus === "paid"
      ? { label: "Fully disbursed", tone: "bg-success/15 text-success border-success/30" }
      : payrollRunStatus === "finalized" || payrollRunStatus === "reviewed" || payrollRunStatus === "draft"
        ? { label: "Pending disbursement", tone: "bg-warning/15 text-warning border-warning/30" }
        : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Previous pay period"
          onClick={() => onChange(shiftPayrollPeriod(period, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange className="size-4 shrink-0 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pay period
            </span>
            {isCurrent ? (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Current
              </Badge>
            ) : null}
            {disbursementBadge ? (
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  disbursementBadge.tone,
                )}
              >
                {disbursementBadge.label}
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  status.tone,
                )}
              >
                {status.label}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {formatPayrollPeriodLabel(period.month, period.year)}
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatPayPeriodRange(period.month, period.year)}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Next pay period"
          onClick={() => onChange(shiftPayrollPeriod(period, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Select value={String(period.month)} onValueChange={(v) => onChange({ ...period, month: Number(v) })}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(period.year)} onValueChange={(v) => onChange({ ...period, year: Number(v) })}>
          <SelectTrigger className="h-9 w-[92px] text-xs">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isCurrent ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => onChange(currentPayrollPeriod())}
          >
            Jump to current
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function PayPeriodSummary({
  totalEmployees,
  totalPay,
  totalContractPay = 0,
  paidAmount,
  pendingAmount,
  paidCount,
  pendingCount,
  className,
}: {
  totalEmployees: number;
  totalPay: number;
  totalContractPay?: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  className?: string;
}) {
  const progress = totalEmployees > 0 ? Math.round((paidCount / totalEmployees) * 100) : 0;
  const deductions = Math.max(0, totalContractPay - totalPay);

  const items = [
    {
      label: "Contract pay",
      value: inrMoney(totalContractPay),
      hint: "Sum of monthly net contract salaries",
      icon: FileSpreadsheet,
      tone: "text-foreground",
    },
    {
      label: "Total net payroll",
      value: inrMoney(totalPay),
      hint: deductions > 0 ? `${inrMoney(deductions)} deductions applied` : `${totalEmployees} employees`,
      icon: IndianRupee,
      tone: "text-primary",
    },
    {
      label: "Paid amount",
      value: inrMoney(paidAmount),
      hint: `${paidCount} payslip${paidCount === 1 ? "" : "s"}`,
      icon: CheckCircle2,
      tone: "text-success",
    },
    {
      label: "Pending amount",
      value: inrMoney(pendingAmount),
      hint: `${pendingCount} payslip${pendingCount === 1 ? "" : "s"}`,
      icon: Clock,
      tone: pendingCount > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "Employees",
      value: String(totalEmployees),
      hint: "In this pay period",
      icon: Users,
      tone: "text-foreground",
    },
  ];

  return (
    <Card className={cn("border-border/60 p-4 shadow-sm", className)}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <item.icon className="size-3.5" />
              {item.label}
            </div>
            <p className={cn("mt-1 text-lg font-bold tabular-nums", item.tone)}>{item.value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>
      {totalEmployees > 0 ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Disbursement progress</span>
            <span className="font-semibold tabular-nums text-foreground">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function OrgPayrollKpis({
  totalActive,
  configuredCount,
  monthlyCommitmentNet,
  avgNetSalary,
  notConfiguredCount,
  loading,
  className,
}: {
  totalActive: number;
  configuredCount: number;
  monthlyCommitmentNet: number;
  avgNetSalary: number;
  notConfiguredCount: number;
  loading?: boolean;
  className?: string;
}) {
  const items = [
    {
      label: "Active employees",
      value: loading ? "—" : String(totalActive),
      hint: "Org headcount",
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      iconBg: "bg-white/20",
    },
    {
      label: "Monthly commitment",
      value: loading ? "—" : inrMoney(monthlyCommitmentNet),
      hint: `${configuredCount} employee${configuredCount === 1 ? "" : "s"} with net salary configured`,
      icon: BadgeIndianRupee,
      gradient: "from-violet-500 to-purple-700",
      iconBg: "bg-white/20",
    },
    {
      label: "Avg net salary",
      value: loading ? "—" : avgNetSalary > 0 ? inrMoney(avgNetSalary) : "—",
      hint: "Contract net per employee / month",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-white/20",
    },
    {
      label: "Not configured",
      value: loading ? "—" : String(notConfiguredCount),
      hint: notConfiguredCount > 0 ? "Salary not set — action needed" : "All employees configured",
      icon: AlertTriangle,
      gradient: notConfiguredCount > 0 ? "from-amber-500 to-orange-600" : "from-green-500 to-emerald-600",
      iconBg: "bg-white/20",
    },
  ];

  return (
    <Card className={cn("border-border/60 p-4 shadow-sm", className)}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Organisation payroll overview
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "relative overflow-hidden rounded-xl bg-gradient-to-br px-4 py-4 shadow-sm",
              item.gradient,
            )}
          >
            <item.icon className="absolute -right-3 -top-3 size-20 text-white opacity-10" />
            <div className={cn("mb-3 inline-flex size-8 items-center justify-center rounded-lg", item.iconBg)}>
              <item.icon className="size-4 text-white" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{item.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-white">{item.value}</p>
            <p className="mt-1 text-[10px] text-white/60">{item.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PayrollFilterBar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  counts,
  className,
}: {
  status: PayrollStatusFilter;
  onStatusChange: (status: PayrollStatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  counts?: { all: number; paid: number; unpaid: number };
  className?: string;
}) {
  const tabs: Array<{ id: PayrollStatusFilter; label: string }> = [
    { id: "ALL", label: "All" },
    { id: "UNPAID", label: "Pending" },
    { id: "PAID", label: "Paid" },
  ];

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
        {tabs.map((tab) => {
          const count =
            tab.id === "ALL" ? counts?.all : tab.id === "PAID" ? counts?.paid : counts?.unpaid;
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                status === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onStatusChange(tab.id)}
            >
              {tab.label}
              {count !== undefined ? (
                <span className="ml-1.5 tabular-nums text-[10px] opacity-70">({count})</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employee name or ID…"
          className="h-9 pl-8 text-xs"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function PayrollEmptyState({
  period,
  onRunPayroll,
  disabled,
  loading,
}: {
  period: PayrollPeriod;
  onRunPayroll: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const label = formatPayrollPeriodLabel(period.month, period.year);
  return (
    <Card className="flex flex-col items-center justify-center border-dashed px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <IndianRupee className="size-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">No payroll for {label}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Run payroll to calculate salaries from attendance and leave data. You can review each payslip,
        mark disbursements, and export reports afterward.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onRunPayroll} disabled={disabled || loading} className="gap-2">
          <Play className="size-4" />
          Run payroll
        </Button>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileSpreadsheet className="size-3.5" />
        Excel export and PDF slips unlock after payroll is processed
      </p>
    </Card>
  );
}

export type PayrollExplorerColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export type PayrollExplorerViewMode = "list" | "grid";

export function HrmPayrollExplorer<T>({
  title,
  subtitle,
  data,
  columns,
  getId,
  actions,
  filterBar,
  renderDetail,
  renderCard,
  detailTitle,
  detailSubtitle,
  detailSheetClassName,
  emptyHint = "No records match your filters.",
  pageSize = 20,
  defaultView = "list",
}: {
  title: string;
  subtitle?: string;
  data: T[];
  columns: PayrollExplorerColumn<T>[];
  getId: (row: T) => string;
  actions?: ReactNode;
  filterBar?: ReactNode;
  renderDetail?: (row: T) => ReactNode;
  renderCard?: (row: T) => ReactNode;
  detailTitle?: (row: T) => string;
  detailSubtitle?: (row: T) => string;
  detailSheetClassName?: string;
  emptyHint?: string;
  pageSize?: number;
  defaultView?: PayrollExplorerViewMode;
}) {
  const [active, setActive] = useState<T | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<PayrollExplorerViewMode>(defaultView);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageData = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openDetail = (row: T) => {
    if (renderDetail) setActive(row);
  };

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <HrmRefPageHeader title={title} subtitle={subtitle} actions={actions} />

      <Card className="overflow-hidden border-border/60 shadow-sm">
        {filterBar ? (
          <div className="flex flex-col gap-3 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">{filterBar}</div>
            {renderCard ? (
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  aria-label="List view"
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    view === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setView("list")}
                >
                  <List className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    view === "grid"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {view === "grid" && renderCard ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">{emptyHint}</p>
            ) : (
              pageData.map((row) => (
                <div
                  key={getId(row)}
                  className={cn(
                    "rounded-lg border border-border/60 bg-card p-3 transition-colors",
                    renderDetail ? "cursor-pointer hover:border-primary/40 hover:bg-muted/20" : "",
                    active && getId(active) === getId(row) ? "border-primary/50 bg-primary/5" : "",
                  )}
                  onClick={() => openDetail(row)}
                >
                  {renderCard(row)}
                </div>
              ))
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                {columns.map((col) => (
                  <th key={col.key} className={cn("px-4 py-2.5 font-semibold", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                pageData.map((row) => (
                  <tr
                    key={getId(row)}
                    className={cn(
                      "border-b border-border/40 transition-colors",
                      renderDetail ? "cursor-pointer hover:bg-muted/30" : "",
                      active && getId(active) === getId(row) ? "bg-primary/5" : "",
                    )}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-stop-row-click]")) return;
                      openDetail(row);
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3 align-middle", col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        {data.length > pageSize ? (
          <div className="flex items-center justify-end gap-2 border-t border-border/50 px-4 py-3">
            <Button variant="outline" size="sm" className="h-8" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </Card>

      {renderDetail && active ? (
        <Sheet open={!!active} onOpenChange={(open) => !open && setActive(null)}>
          <SheetContent className={cn("w-full overflow-y-auto p-4 sm:max-w-2xl sm:p-6", detailSheetClassName)}>
            <SheetHeader>
              <SheetTitle>{detailTitle?.(active) ?? title}</SheetTitle>
              {detailSubtitle ? <SheetDescription>{detailSubtitle(active)}</SheetDescription> : null}
            </SheetHeader>
            <div className="mt-4">{renderDetail(active)}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

export function payrollStatusPill(paid: boolean) {
  return (
    <HrmRefStatusPill tone={paid ? "success" : "warning"}>
      {paid ? "Paid" : "Pending"}
    </HrmRefStatusPill>
  );
}

export { derivePayPeriodStatus, deriveRunStatusFromPayrollRun, formatPayrollPeriodLabel, currentPayrollPeriod };
