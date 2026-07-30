import type { Expense, FinancePayment, FinancePaymentMode, ExpenseCategory as FinExpenseCategory } from "@/api/finance";
import { PAYMENT_MODE_LABELS as FINANCE_PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import type { BankTransaction, PaymentMode, PeriodFilter, ReconciliationStatus } from "@/modules/ca/types";
import { financeExpenseHref, financeInvoiceHref, financePaymentHref } from "@/modules/ca/routes";

/** Map finance payment modes onto CA display labels where possible (legacy bank views). */
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

/** Exact Finance mode label — never remap cash/card/bank_transfer into a wrong CA enum. */
export function financePaymentModeLabel(mode: FinancePaymentMode | string | undefined): string {
  if (!mode) return "—";
  return FINANCE_PAYMENT_MODE_LABELS[mode as FinancePaymentMode] ?? String(mode);
}

export function isPaymentGst(p: Pick<FinancePayment, "gstEnabled" | "gstAmount">): boolean {
  return p.gstEnabled === true || (Number(p.gstAmount ?? 0) > 0 && p.gstEnabled !== false);
}

export function isCompletedPayment(p: Pick<FinancePayment, "status">): boolean {
  return !p.status || p.status === "completed";
}

/** Document / cash-path links that prove the payment is booked (not suspense). */
export function paymentDocumentLinks(p: FinancePayment): {
  kind: string;
  label: string;
  href: string | null;
}[] {
  const links: { kind: string; label: string; href: string | null }[] = [];
  if (p.invoiceId) {
    links.push({ kind: "Finance invoice", label: `INV #${p.invoiceId}`, href: financeInvoiceHref(p.invoiceId) });
  }
  if (p.salesInvoiceId) {
    links.push({
      kind: "Sales invoice",
      label: `S-INV #${p.salesInvoiceId}`,
      href: `/sales/invoices/${p.salesInvoiceId}`,
    });
  }
  if (p.expenseId) {
    links.push({ kind: "Expense", label: `EXP #${p.expenseId}`, href: financeExpenseHref(p.expenseId) });
  }
  if (p.vendorInvoiceId) {
    links.push({
      kind: "Vendor bill",
      label: `VB #${p.vendorInvoiceId}`,
      href: p.vendorId ? `/finance/vendors/${p.vendorId}` : `/finance/vendors`,
    });
  }
  if (p.freelancerInstallmentId) {
    links.push({
      kind: "Freelancer",
      label: `FL #${p.freelancerInstallmentId}`,
      href: `/finance/freelancer-engagements`,
    });
  }
  if (p.taxDepositId) {
    links.push({ kind: "Tax deposit", label: `TAX #${p.taxDepositId}`, href: `/finance/tax` });
  }
  if (p.payrollRunId) {
    links.push({ kind: "Payroll", label: `PR #${p.payrollRunId}`, href: `/hrm/payroll` });
  }
  if (p.salesPaymentId && p.salesReceiptHref) {
    links.push({ kind: "Sales receipt", label: p.receiptNumber || `SR #${p.salesPaymentId}`, href: p.salesReceiptHref });
  }
  return links;
}

export function paymentHasDocumentLink(p: FinancePayment): boolean {
  return (
    p.invoiceId != null ||
    p.salesInvoiceId != null ||
    p.expenseId != null ||
    p.vendorInvoiceId != null ||
    p.freelancerInstallmentId != null ||
    p.taxDepositId != null ||
    p.payrollRunId != null ||
    p.salesPaymentId != null
  );
}

export function paymentHasPartyLink(p: FinancePayment): boolean {
  return (
    (p.partyType === "client" && p.clientId != null) ||
    (p.partyType === "vendor" && p.vendorId != null) ||
    (p.partyType === "employee" && p.employeeId != null) ||
    (Boolean(p.partyName) && p.partyType !== "other")
  );
}

/**
 * Derive recon status from Finance payment linkage (no duplicate money rows).
 * matched  = completed + booked to a document (invoice / expense / tax / payroll / …)
 * partial  = has a known party but no document yet (or not completed)
 * unmatched = no party / other — needs CA review
 */
export function paymentReconciliationStatus(p: FinancePayment): ReconciliationStatus {
  const hasDoc = paymentHasDocumentLink(p);
  const hasParty = paymentHasPartyLink(p);
  if (hasDoc && isCompletedPayment(p)) return "matched";
  if (hasDoc || hasParty) return "partial";
  return "unmatched";
}

export type CaBankTxn = BankTransaction & {
  financeSource?: "finance" | "sales";
  partyType?: FinancePayment["partyType"];
  status?: FinancePayment["status"];
  gstEnabled?: boolean | null;
  gstAmount?: number;
  taxableAmount?: number;
  receiptNumber?: string;
  modeLabel?: string;
  linkedDocs?: ReturnType<typeof paymentDocumentLinks>;
  financePayment?: FinancePayment;
};

export function mapFinancePaymentToBankTxn(p: FinancePayment): CaBankTxn {
  return {
    id: p.id,
    date: p.date,
    direction: p.direction === "outgoing" ? "outgoing" : "incoming",
    mode: mapFinancePaymentMode(p.mode),
    modeLabel: financePaymentModeLabel(p.mode),
    reference: p.reference || p.receiptNumber || String(p.id),
    party: p.partyName || "—",
    partyType: p.partyType,
    amount: Number(p.amount ?? 0),
    reconciliationStatus: paymentReconciliationStatus(p),
    bankRef: p.receiptNumber || p.reference || `PMT-${p.id}`,
    financeSource: p.source === "sales" ? "sales" : "finance",
    status: p.status,
    gstEnabled: p.gstEnabled,
    gstAmount: Number(p.gstAmount ?? 0),
    taxableAmount: p.taxableAmount,
    receiptNumber: p.receiptNumber,
    linkedDocs: paymentDocumentLinks(p),
    financePayment: p,
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

/** Incoming cash received — only completed rows; GST split uses explicit classification. */
export function summarizeIncomingPayments(payments: FinancePayment[]) {
  let gst = 0;
  let nonGst = 0;
  for (const p of payments) {
    if (p.direction !== "incoming") continue;
    if (!isCompletedPayment(p)) continue;
    const amt = Number(p.amount ?? 0);
    if (isPaymentGst(p)) gst += amt;
    else nonGst += amt;
  }
  return { gst, nonGst, total: gst + nonGst };
}

/** Full ledger totals for CA — never mix failed/pending into cash KPIs. */
export function summarizeCaPayments(payments: FinancePayment[]) {
  let incoming = 0;
  let outgoing = 0;
  let gstIncoming = 0;
  let nonGstIncoming = 0;
  let gstTaxCollected = 0;
  let incomingCount = 0;
  let outgoingCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  for (const p of payments) {
    if (p.status === "pending") {
      pendingCount += 1;
      continue;
    }
    if (p.status === "failed") {
      failedCount += 1;
      continue;
    }
    const amt = Number(p.amount ?? 0);
    if (p.direction === "outgoing") {
      outgoing += amt;
      outgoingCount += 1;
      continue;
    }
    incoming += amt;
    incomingCount += 1;
    if (isPaymentGst(p)) {
      gstIncoming += amt;
      gstTaxCollected += Number(p.gstAmount ?? 0);
    } else {
      nonGstIncoming += amt;
    }
  }

  return {
    incoming,
    outgoing,
    net: incoming - outgoing,
    gstIncoming,
    nonGstIncoming,
    gstTaxCollected,
    incomingCount,
    outgoingCount,
    pendingCount,
    failedCount,
    totalCount: payments.length,
  };
}

export function paymentDetailHref(p: FinancePayment): string {
  return financePaymentHref(p.id, p.source === "sales" ? "sales" : "finance");
}

export const PARTY_TYPE_LABELS: Record<FinancePayment["partyType"], string> = {
  client: "Client",
  vendor: "Vendor",
  employee: "Employee",
  other: "Other",
};

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
