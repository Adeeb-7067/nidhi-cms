import type { HrmPayslipDetail } from "./types";
import { LEGACY_LEAVE_YEAR_MONTHS } from "./hrm-legacy-labels";

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function payslipPeriodLabel(month: number, year: number) {
  const label = LEGACY_LEAVE_YEAR_MONTHS.find((m) => m.value === month)?.label ?? String(month);
  return `${label} ${year}`;
}

export function payslipDownloadFilename(detail: Pick<HrmPayslipDetail, "month" | "year" | "employeeId">) {
  const period = payslipPeriodLabel(detail.month, detail.year).replace(/\s+/g, "-");
  const id = detail.employeeId?.trim() || "employee";
  return `salary-slip-${id}-${period}`;
}

/** Open payslip in a print dialog so the user can save as PDF. */
export function printPayslipHtml(htmlContent: string, title: string) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return false;
  win.document.write(htmlContent);
  win.document.close();
  win.document.title = title;
  win.focus();
  win.onload = () => {
    win.print();
  };
  return true;
}

/** Download stored HTML payslip (fallback when print is blocked). */
export function downloadPayslipHtml(htmlContent: string, filename: string) {
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildPayslipPrintHtml(detail: HrmPayslipDetail) {
  const period = payslipPeriodLabel(detail.month, detail.year);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Salary Slip ${period}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:640px;margin:0 auto}
  h1{font-size:1.125rem;margin:0 0 4px}
  .sub{font-size:0.75rem;color:#666;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:0.875rem}
  td,th{border:1px solid #ddd;padding:8px;text-align:left}
  th{background:#f5f5f5}
  .net td{font-weight:bold;font-size:1rem}
  .deduct{color:#b91c1c}
</style></head><body>
  <h1>${detail.companyName}</h1>
  <p class="sub">Salary Slip — ${period}</p>
  <p><strong>${detail.employeeName}</strong>${detail.employeeId ? ` · ${detail.employeeId}` : ""}</p>
  ${detail.department ? `<p class="sub">${detail.department}</p>` : ""}
  <table>
    <tr><th>Item</th><th>Amount (INR)</th></tr>
    <tr><td>Basic</td><td>${detail.basic}</td></tr>
    <tr><td>HRA</td><td>${detail.hra}</td></tr>
    <tr><td>Allowances</td><td>${detail.allowances}</td></tr>
    <tr><td>Gross</td><td>${detail.gross}</td></tr>
    <tr><td>Paid days</td><td>${detail.paidDays}</td></tr>
    <tr><td>LOP days</td><td>${detail.lopDays}</td></tr>
    <tr><td>Late count</td><td>${detail.lateCount}</td></tr>
    <tr class="deduct"><td>LOP deduction</td><td>${detail.lopDeduction}</td></tr>
    <tr class="deduct"><td>Total deductions</td><td>${detail.deductions}</td></tr>
    <tr class="net"><td>Net pay</td><td>${detail.net}</td></tr>
  </table>
</body></html>`;
}
