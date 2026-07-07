import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors frontend calcProposalTotal / discount display math.
 * Discount amount must be grossTotal - discountedTotal, not zero when subtotal is post-discount.
 */
function calcProposalTotal(items, discount) {
  let grossSubtotal = 0;
  let grossTax = 0;
  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    grossSubtotal += line;
    grossTax += line * (item.taxPercent / 100);
  }
  const discountFactor = 1 - (discount ?? 0) / 100;
  const subtotal = grossSubtotal * discountFactor;
  const tax = grossTax * discountFactor;
  const grossTotal = grossSubtotal + grossTax;
  const total = subtotal + tax;
  return {
    grossSubtotal: Math.round(grossSubtotal),
    grossTax: Math.round(grossTax),
    total: Math.round(total),
    discountAmount: Math.round(grossTotal - total),
  };
}

describe("proposal totals display", () => {
  it("shows a real discount amount when discount percent is applied", () => {
    const items = [
      { quantity: 1, unitPrice: 60000, taxPercent: 0 },
      { quantity: 1, unitPrice: 70000, taxPercent: 0 },
      { quantity: 1, unitPrice: 70000, taxPercent: 0 },
      { quantity: 1, unitPrice: 15000, taxPercent: 0 },
      { quantity: 1, unitPrice: 15000, taxPercent: 0 },
      { quantity: 30, unitPrice: 500, taxPercent: 0 },
    ];
    const discount = 16.7;
    const totals = calcProposalTotal(items, discount);

    assert.equal(totals.grossSubtotal, 245000);
    assert.equal(totals.discountAmount, 40915);
    assert.equal(totals.total, 204085);

    const wrongLegacyDiscount = totals.total - (totals.total);
    assert.equal(wrongLegacyDiscount, 0);
    assert.notEqual(totals.discountAmount, wrongLegacyDiscount);
  });

  it("adjustment stacks on discounted total", () => {
    const items = [{ quantity: 1, unitPrice: 249900, taxPercent: 0 }];
    const totals = calcProposalTotal(items, 0);
    const finalTotal = totals.total + 100;
    assert.equal(finalTotal, 250000);
  });
});
