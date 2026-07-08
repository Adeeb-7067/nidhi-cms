/** Mongo filter: invoices that count toward billed/outstanding totals. */
export const BILLABLE_INVOICE_STATUS_FILTER = { status: { $ne: "cancelled" } };

export function isBillableInvoice(invoice) {
  return invoice?.status !== "cancelled";
}

export function invoiceOutstanding(invoice) {
  if (!isBillableInvoice(invoice)) return 0;
  return Math.max(0, (invoice.amount ?? 0) - (invoice.paidAmount ?? 0));
}

export function sumInvoiceBilled(invoices) {
  return invoices.reduce(
    (sum, inv) => sum + (isBillableInvoice(inv) ? inv.amount ?? 0 : 0),
    0,
  );
}

export function sumInvoiceOutstanding(invoices) {
  return invoices.reduce((sum, inv) => sum + invoiceOutstanding(inv), 0);
}

export function sumInvoiceCollected(invoices) {
  return invoices.reduce(
    (sum, inv) => sum + (isBillableInvoice(inv) ? inv.paidAmount ?? 0 : 0),
    0,
  );
}

/** Merge a base Mongo filter with the billable-invoice constraint. */
export function billableInvoiceMatch(base = {}) {
  return { ...base, ...BILLABLE_INVOICE_STATUS_FILTER };
}
