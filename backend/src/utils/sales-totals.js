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

export { calcLineItemsTotal, resolveFinalTotal, parseAdjustedTotal, parseTotalAdjustment };
