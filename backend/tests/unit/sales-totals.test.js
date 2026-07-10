import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveFinalTotal,
  assertPositiveInvoiceAmount,
  assertValidInvoiceLineItems,
  calcLineItemsTotal,
} from "../../src/utils/sales-totals.js";

describe("sales-totals", () => {
  it("resolveFinalTotal rejects negative adjustments below zero", () => {
    assert.equal(resolveFinalTotal(1000, -2000), 0);
  });

  it("assertPositiveInvoiceAmount rejects zero and negative totals", () => {
    const errors = [];
    const badRequest = (msg, field) => {
      errors.push({ msg, field });
      throw new Error(msg);
    };
    assert.throws(() => assertPositiveInvoiceAmount(0, badRequest), /greater than zero/);
    assert.throws(() => assertPositiveInvoiceAmount(-1, badRequest), /greater than zero/);
    assert.doesNotThrow(() => assertPositiveInvoiceAmount(1, badRequest));
  });

  it("assertValidInvoiceLineItems requires names and positive prices", () => {
    const badRequest = (msg) => {
      throw new Error(msg);
    };
    assert.throws(
      () => assertValidInvoiceLineItems([], badRequest),
      /At least one line item/,
    );
    assert.throws(
      () => assertValidInvoiceLineItems([{ name: "", unitPrice: 100, quantity: 1 }], badRequest),
      /name is required/,
    );
    assert.throws(
      () => assertValidInvoiceLineItems([{ name: "Design", unitPrice: 0, quantity: 1 }], badRequest),
      /unit price must be greater than zero/,
    );
    assert.doesNotThrow(() =>
      assertValidInvoiceLineItems([{ name: "Design", unitPrice: 5000, quantity: 1 }], badRequest),
    );
  });

  it("calcLineItemsTotal excludes tax when gstEnabled is false", () => {
    const items = [{ quantity: 1, unitPrice: 1000, taxPercent: 18 }];
    assert.equal(calcLineItemsTotal(items, 0, true), 1180);
    assert.equal(calcLineItemsTotal(items, 0, false), 1000);
  });

  it("calcSalesInvoiceBreakdown computes tax from line items", async () => {
    const { calcSalesInvoiceBreakdown, apportionPaymentGst } = await import("../../src/utils/sales-totals.js");
    const inv = {
      gstEnabled: true,
      lineItems: [{ quantity: 1, unitPrice: 1000, taxPercent: 18 }],
      amount: 1180,
    };
    const breakdown = calcSalesInvoiceBreakdown(inv);
    assert.equal(breakdown.subtotal, 1000);
    assert.equal(breakdown.tax, 180);
    assert.equal(breakdown.total, 1180);

    const partial = apportionPaymentGst(590, inv);
    assert.equal(partial.gstAmount, 90);
    assert.equal(partial.taxableAmount, 500);
  });

  it("calcSalesInvoiceBreakdown marks non-GST invoices with zero tax", async () => {
    const { calcSalesInvoiceBreakdown } = await import("../../src/utils/sales-totals.js");
    const inv = {
      gstEnabled: false,
      lineItems: [{ quantity: 1, unitPrice: 1000, taxPercent: 18 }],
      amount: 1000,
    };
    const breakdown = calcSalesInvoiceBreakdown(inv);
    assert.equal(breakdown.gstEnabled, false);
    assert.equal(breakdown.tax, 0);
    assert.equal(breakdown.total, 1000);
  });
});
