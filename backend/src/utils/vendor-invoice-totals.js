/** Compute GST and total for a vendor purchase invoice. */
export function calcVendorInvoiceAmounts(taxableAmount, gstRate, gstEnabled) {
  const base = Math.max(0, Math.round(Number(taxableAmount) || 0));
  const enabled = Boolean(gstEnabled);
  const rate = enabled ? Math.min(100, Math.max(0, Number(gstRate) || 0)) : 0;
  const gstAmount = enabled && base > 0 ? Math.round((base * rate) / 100) : 0;
  return {
    taxableAmount: base,
    gstEnabled: enabled,
    gstRate: rate,
    gstAmount,
    totalAmount: base + gstAmount,
  };
}
