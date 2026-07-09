/**
 * Mirrors frontend/src/modules/finance/constants.ts#calcInvoiceTotal exactly —
 * tax is computed on pre-discount line totals while the final total uses the
 * post-discount subtotal. Keep this in sync with the frontend formula so
 * invoice totals never disagree between UI and API.
 */
function calcInvoiceTotal(items, discount, gstEnabled) {
  const subtotal = (items ?? []).reduce((s, i) => s + i.quantity * i.rate, 0);
  const afterDiscount = Math.max(0, subtotal - (discount ?? 0));
  const tax = gstEnabled
    ? (items ?? []).reduce((s, i) => s + (i.quantity * i.rate * (i.taxPercent ?? 0)) / 100, 0)
    : 0;
  return {
    subtotal: Math.round(subtotal),
    tax: Math.round(tax),
    total: Math.round(afterDiscount + tax),
  };
}

function deriveInvoiceStatus(invoice, newPaidAmount) {
  const { total } = calcInvoiceTotal(invoice.items, invoice.discount, invoice.gstEnabled);
  if (newPaidAmount >= total) return "paid";
  if (newPaidAmount > 0) return "partially_paid";
  return "unpaid";
}

function deriveIncomeStatus(invoice, newPaidAmount) {
  if (!invoice) return "received";
  const { total } = calcInvoiceTotal(invoice.items, invoice.discount, invoice.gstEnabled);
  if (newPaidAmount >= total) return "received";
  if (newPaidAmount > 0) return "partial";
  return "pending";
}

/** <90% on_track, 90-100% warning, >100% exceeded — mirrors the mock data's own bucketing. */
function deriveBudgetStatus(spent, allocated) {
  if (allocated <= 0) return spent > 0 ? "exceeded" : "on_track";
  const pct = spent / allocated;
  if (pct > 1) return "exceeded";
  if (pct >= 0.9) return "warning";
  return "on_track";
}

function calcBudgetConsumption(spent, allocated) {
  if (allocated <= 0) return 0;
  return Math.min(100, Math.round((spent / allocated) * 100));
}

export {
  calcInvoiceTotal,
  deriveInvoiceStatus,
  deriveIncomeStatus,
  deriveBudgetStatus,
  calcBudgetConsumption,
};
