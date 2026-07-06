import { format } from "date-fns";
import type { SalesInvoice, SalesPayment } from "@/api/sales";

export type StatementLedgerRow = {
  key: string;
  date: string;
  details: string;
  amount: number;
  payment: number;
  balance: number;
  href?: string;
};

export type StatementLedger = {
  beginningBalance: number;
  rows: StatementLedgerRow[];
  invoicedInPeriod: number;
  paidInPeriod: number;
  balanceDue: number;
};

export function buildCustomerStatementLedger(
  invoices: SalesInvoice[],
  payments: SalesPayment[],
  from: Date | null,
  to: Date | null,
): StatementLedger {
  const billableInvoices = invoices.filter((inv) => inv.status !== "cancelled");
  const invoiceById = new Map(billableInvoices.map((inv) => [inv.id, inv]));

  let beginningBalance = 0;
  if (from) {
    for (const inv of billableInvoices) {
      if (new Date(inv.createdAt) < from) beginningBalance += inv.amount;
    }
    for (const pay of payments) {
      if (new Date(pay.createdAt) < from) beginningBalance -= pay.amount;
    }
  }

  const entries = [
    ...billableInvoices
      .filter((i) => {
        const d = new Date(i.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .map((i) => ({ sortKey: new Date(i.createdAt).getTime(), type: "invoice" as const, data: i })),
    ...payments
      .filter((p) => {
        const d = new Date(p.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .map((p) => ({ sortKey: new Date(p.createdAt).getTime(), type: "payment" as const, data: p })),
  ].sort((a, b) => a.sortKey - b.sortKey);

  let balance = beginningBalance;
  const rows: StatementLedgerRow[] = [];

  for (const entry of entries) {
    if (entry.type === "invoice") {
      const inv = entry.data as SalesInvoice;
      balance += inv.amount;
      const dueSuffix = inv.dueDate
        ? ` - due on ${format(new Date(inv.dueDate), "yyyy-MM-dd")}`
        : "";
      rows.push({
        key: `inv-${inv.id}`,
        date: inv.createdAt,
        details: `Invoice ${inv.number}${dueSuffix}`,
        amount: inv.amount,
        payment: 0,
        balance,
        href: `/sales/invoices/${inv.id}`,
      });
    } else {
      const pay = entry.data as SalesPayment;
      balance -= pay.amount;
      const invoiceNumber =
        pay.invoiceNumber ?? invoiceById.get(pay.invoiceId)?.number ?? `Invoice #${pay.invoiceId}`;
      rows.push({
        key: `pay-${pay.id}`,
        date: pay.createdAt,
        details: `Payment (#${pay.id}) to invoice ${invoiceNumber}`,
        amount: 0,
        payment: pay.amount,
        balance,
        href: `/sales/receipts/${pay.id}`,
      });
    }
  }

  const invoicedInPeriod = rows.reduce((s, r) => s + r.amount, 0);
  const paidInPeriod = rows.reduce((s, r) => s + r.payment, 0);
  const balanceDue = Math.max(0, beginningBalance + invoicedInPeriod - paidInPeriod);

  return { beginningBalance, rows, invoicedInPeriod, paidInPeriod, balanceDue };
}

/** Statement amounts with two decimal places (table cells — no currency symbol). */
export function formatStatementTableAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Statement summary / footer amounts with rupee symbol. */
export function formatStatementSummaryAmount(amount: number): string {
  const formatted = formatStatementTableAmount(amount);
  return `₹${formatted}`;
}
