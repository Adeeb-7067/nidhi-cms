/** Satyakabir pay-period helpers — reference: HRM Satyakabir/Frontend/src/components/payroll/payrollPeriodUtils.ts */

export type PayrollPeriod = { month: number; year: number };

export const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export function currentPayrollPeriod(): PayrollPeriod {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function formatPayrollPeriodLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function formatPayPeriodRange(month: number, year: number): string {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function isCurrentPayrollPeriod(period: PayrollPeriod): boolean {
  const now = currentPayrollPeriod();
  return period.month === now.month && period.year === now.year;
}

export function shiftPayrollPeriod(period: PayrollPeriod, deltaMonths: number): PayrollPeriod {
  const d = new Date(period.year, period.month - 1 + deltaMonths, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function buildYearOptions(centerYear = new Date().getFullYear(), span = 15): number[] {
  const years: number[] = [];
  for (let y = centerYear - span; y <= centerYear + 1; y += 1) years.push(y);
  return years.sort((a, b) => b - a);
}

export type PayPeriodRunStatus = "not_run" | "in_progress" | "completed";

export function derivePayPeriodStatus(employeeCount: number, pendingCount: number): PayPeriodRunStatus {
  if (employeeCount === 0) return "not_run";
  if (pendingCount > 0) return "in_progress";
  return "completed";
}

export function deriveRunStatusFromPayrollRun(
  status?: string,
  employeeCount = 0,
): PayPeriodRunStatus {
  if (!status || employeeCount === 0) return "not_run";
  if (status === "paid") return "completed";
  if (status === "finalized" || status === "reviewed" || status === "draft") return "in_progress";
  return "not_run";
}
