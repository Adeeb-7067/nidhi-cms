function calcLineItemsTotal(items, discount = 0) {
  const lineTotal = (items ?? []).reduce((s, item) => {
    const line = item.quantity * item.unitPrice;
    return s + line + line * (item.taxPercent / 100);
  }, 0);
  return Math.round(lineTotal * (1 - (discount ?? 0) / 100));
}

function resolveFinalTotal(calculated, totalAdjustment = 0, adjustedTotal = null) {
  const base = Math.round(Number(calculated) || 0);
  if (adjustedTotal != null && adjustedTotal !== "" && !Number.isNaN(Number(adjustedTotal))) {
    return Math.max(0, Math.round(Number(adjustedTotal)));
  }
  return Math.max(0, Math.round(base + (Number(totalAdjustment) || 0)));
}

function parseAdjustedTotal(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : Math.max(0, Math.round(n));
}

function parseTotalAdjustment(value) {
  if (value === undefined) return undefined;
  return Number(value) || 0;
}

function assertPositiveInvoiceAmount(amount, badRequest, field = "amount") {
  if (!Number.isFinite(amount) || amount <= 0) {
    badRequest("Invoice total must be greater than zero.", field);
  }
}

function assertValidInvoiceLineItems(lineItems, badRequest) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    badRequest("At least one line item is required.", "lineItems");
  }
  lineItems.forEach((item, i) => {
    const label = `Line item ${i + 1}`;
    if (!String(item.name ?? "").trim()) {
      badRequest(`${label}: name is required.`, "lineItems");
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
      badRequest(`${label}: unit price must be greater than zero.`, "lineItems");
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      badRequest(`${label}: quantity must be greater than zero.`, "lineItems");
    }
  });
}

export {
  calcLineItemsTotal,
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
  assertPositiveInvoiceAmount,
  assertValidInvoiceLineItems,
};
