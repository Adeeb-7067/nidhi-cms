import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveFinalTotal,
  assertPositiveInvoiceAmount,
  assertValidInvoiceLineItems,
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
});
