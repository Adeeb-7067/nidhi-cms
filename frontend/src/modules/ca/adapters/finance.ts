import type { Expense, FinancePayment, FinancePaymentMode, ExpenseCategory as FinExpenseCategory } from "@/api/finance";
import type { BankTransaction, PaymentMode, PeriodFilter, ReconciliationStatus } from "@/modules/ca/types";

/** Map finance payment modes onto CA display labels where possible. */
export function mapFinancePaymentMode(mode: FinancePaymentMode | string | undefined): PaymentMode {
  switch (mode) {
    case "upi":
      return "upi";
    case "cheque":
      return "cheque";
    case "neft":
      return "neft";
    case "bank_transfer":
      return "rtgs";
    default:
      return "imps";
  }
}

/** Derive recon status from Finance payment linkage (no duplicate money rows). */
export function paymentReconciliationStatus(p: FinancePayment): ReconciliationStatus {
  const linked =
    p.invoiceId != null ||
    p.salesInvoiceId != null ||
    p.expenseId != null ||
    (p.partyType !== "other" && (p.clientId != null || p.vendorId != null || p.employeeId != null));
  if (linked && p.status === "completed") return "matched";
  if (linked) return "partial";
  return "unmatched";
}

export function mapFinancePaymentToBankTxn(p: FinancePayment): BankTransaction & {
  financeSource?: "finance" | "sales";
} {
  return {
    id: p.id,
    date: p.date,
    direction: p.direction === "outgoing" ? "outgoing" : "incoming",
    mode: mapFinancePaymentMode(p.mode),
    reference: p.reference || p.receiptNumber || String(p.id),
    party: p.partyName || "—",
    amount: Number(p.amount ?? 0),
    reconciliationStatus: paymentReconciliationStatus(p),
    bankRef: p.receiptNumber || p.reference || `PMT-${p.id}`,
    financeSource: p.source === "sales" ? "sales" : "finance",
  };
}

export function summarizeBankRecon(rows: BankTransaction[]) {
  let matched = 0;
  let unmatched = 0;
  let partial = 0;
  let incomingTotal = 0;
  let outgoingTotal = 0;
  for (const t of rows) {
    if (t.reconciliationStatus === "matched") matched += 1;
    else if (t.reconciliationStatus === "partial") partial += 1;
    else unmatched += 1;
    if (t.direction === "incoming") incomingTotal += t.amount;
    else outgoingTotal += t.amount;
  }
  return { matched, unmatched, partial, incomingTotal, outgoingTotal };
}

export function financeExpenseCategoryLabel(category: FinExpenseCategory | string): string {
  const labels: Record<string, string> = {
    software: "Software & SaaS",
    hardware: "Hardware",
    travel: "Travel",
    office: "Office",
    marketing: "Marketing",
    utilities: "Utilities",
    professional: "Professional",
    loan: "Loan",
    misc: "Miscellaneous",
    security_deposit: "Security deposit",
  };
  return labels[category] ?? category;
}

export function summarizeExpensesByCategory(expenses: Expense[]) {
  const totals: Record<string, number> = {};
  let total = 0;
  for (const e of expenses) {
    const amt = Number(e.recognizedAmount ?? e.paidAmount ?? e.amount ?? 0);
    total += amt;
    totals[e.category] = (totals[e.category] ?? 0) + amt;
  }
  return {
    total,
    salary: totals.professional ?? 0,
    rent: totals.office ?? 0,
    software: totals.software ?? 0,
    hosting: totals.hardware ?? 0,
    byCategory: totals,
  };
}

export function summarizeIncomingPayments(payments: FinancePayment[]) {
  let gst = 0;
  let nonGst = 0;
  for (const p of payments) {
    if (p.direction !== "incoming") continue;
    const amt = Number(p.amount ?? 0);
    if (p.gstEnabled || (p.gstAmount ?? 0) > 0) gst += amt;
    else nonGst += amt;
  }
  return { gst, nonGst, total: gst + nonGst };
}

/** Client-side period filter on ISO date strings (approx month/quarter/year windows). */
export function filterByPeriod<T extends { date?: string; receivedAt?: string; dueDate?: string }>(
  rows: T[],
  period: PeriodFilter,
  now = new Date(),
): T[] {
  const start = new Date(now);
  if (period === "monthly") start.setDate(1);
  else if (period === "quarterly") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(q, 1);
  } else {
    start.setMonth(0, 1);
  }
  start.setHours(0, 0, 0, 0);
  return rows.filter((r) => {
    const raw = r.date ?? r.receivedAt ?? r.dueDate;
    if (!raw) return true;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d >= start && d <= now;
  });
}

/** Indian FY starts April. Resolve CA filter-bar date chips to [start, end]. */
export function resolveCaDateRange(
  dateRange: string,
  now = new Date(),
): { start: Date; end: Date; taxPeriod: "monthly" | "quarterly" | "annual"; dashboardPeriod: "current" | "previous" } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  switch (dateRange) {
    case "prev": {
      start.setMonth(now.getMonth() - 1, 1);
      end.setDate(0); // last day of previous month
      end.setHours(23, 59, 59, 999);
      return { start, end, taxPeriod: "monthly", dashboardPeriod: "previous" };
    }
    case "q1": {
      start.setFullYear(fyStartYear, 3, 1); // Apr 1
      end.setFullYear(fyStartYear, 5, 30); // Jun 30
      end.setHours(23, 59, 59, 999);
      return { start, end, taxPeriod: "quarterly", dashboardPeriod: "current" };
    }
    case "fy": {
      start.setFullYear(fyStartYear, 3, 1);
      end.setFullYear(fyStartYear + 1, 2, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end, taxPeriod: "annual", dashboardPeriod: "current" };
    }
    case "ytd": {
      start.setFullYear(fyStartYear, 3, 1);
      return { start, end, taxPeriod: "annual", dashboardPeriod: "current" };
    }
    case "jun":
    default: {
      start.setDate(1);
      return { start, end, taxPeriod: "monthly", dashboardPeriod: "current" };
    }
  }
}

export function filterByCaDateRange<T>(
  rows: T[],
  dateRange: string,
  now = new Date(),
): T[] {
  const { start, end } = resolveCaDateRange(dateRange, now);
  return rows.filter((r) => {
    const row = r as { date?: string | null; dueDate?: string | null; receivedAt?: string | null; filedAt?: string | null };
    const raw = row.date ?? row.dueDate ?? row.receivedAt ?? row.filedAt;
    if (!raw) return true;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d >= start && d <= end;
  });
}
