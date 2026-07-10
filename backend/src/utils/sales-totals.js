function calcLineItemsTotal(items, discount = 0, gstEnabled = true) {
  const lineTotal = (items ?? []).reduce((s, item) => {
    const line = item.quantity * item.unitPrice;
    const tax = gstEnabled ? line * ((item.taxPercent ?? 0) / 100) : 0;
    return s + line + tax;
  }, 0);
  return Math.round(lineTotal * (1 - (discount ?? 0) / 100));
}

/** Subtotal, GST, and total for a sales invoice (line items + optional adjusted total). */
function calcSalesInvoiceBreakdown(inv) {
  const gstEnabled = inv?.gstEnabled !== false;
  const items = inv?.lineItems ?? [];
  const discount = inv?.discount ?? 0;

  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    if (gstEnabled) tax += line * ((item.taxPercent ?? 0) / 100);
  }

  const subtotalAfterDiscount = Math.round(subtotal * (1 - discount / 100));
  const taxAfterDiscount = gstEnabled ? Math.round(tax * (1 - discount / 100)) : 0;
  const computedTotal = Math.round(subtotalAfterDiscount + taxAfterDiscount);
  const total =
    inv?.adjustedTotal != null && inv.adjustedTotal !== ""
      ? Math.max(0, Math.round(Number(inv.adjustedTotal)))
      : inv?.calculatedAmount != null
        ? Math.max(0, Math.round(Number(inv.calculatedAmount)))
        : inv?.amount != null
          ? Math.max(0, Math.round(Number(inv.amount)))
          : computedTotal;

  if (!items.length) {
    return { gstEnabled, subtotal: total, tax: 0, total };
  }

  return {
    gstEnabled,
    subtotal: subtotalAfterDiscount,
    tax: taxAfterDiscount,
    total,
  };
}

/** Apportion invoice GST to a partial or full payment amount. */
function apportionPaymentGst(paymentAmount, invoice) {
  const breakdown = calcSalesInvoiceBreakdown(invoice);
  if (!breakdown.gstEnabled || breakdown.tax <= 0 || breakdown.total <= 0) {
    return {
      gstEnabled: breakdown.gstEnabled,
      gstAmount: 0,
      taxableAmount: paymentAmount,
    };
  }
  const ratio = paymentAmount / breakdown.total;
  const gstAmount = Math.round(breakdown.tax * ratio);
  return {
    gstEnabled: true,
    gstAmount,
    taxableAmount: paymentAmount - gstAmount,
  };
}

function resolvePaymentGstFields({ paymentAmount, invoice, storedGstEnabled, storedGstAmount }) {
  if (storedGstEnabled != null) {
    const gstAmount = storedGstAmount ?? 0;
    return {
      gstEnabled: storedGstEnabled,
      gstAmount,
      taxableAmount: paymentAmount - gstAmount,
    };
  }
  if (invoice) return apportionPaymentGst(paymentAmount, invoice);
  return { gstEnabled: null, gstAmount: 0, taxableAmount: paymentAmount };
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
  calcSalesInvoiceBreakdown,
  apportionPaymentGst,
  resolvePaymentGstFields,
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
  assertPositiveInvoiceAmount,
  assertValidInvoiceLineItems,
};
