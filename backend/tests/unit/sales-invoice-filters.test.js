import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBillableInvoice,
  invoiceOutstanding,
  sumInvoiceBilled,
  sumInvoiceOutstanding,
  billableInvoiceMatch,
} from "../../src/utils/sales-invoice-filters.js";

describe("sales-invoice-filters", () => {
  it("treats cancelled invoices as non-billable", () => {
    assert.equal(isBillableInvoice({ status: "unpaid" }), true);
    assert.equal(isBillableInvoice({ status: "cancelled" }), false);
  });

  it("returns zero outstanding for cancelled invoices", () => {
    assert.equal(
      invoiceOutstanding({ status: "cancelled", amount: 10000, paidAmount: 0 }),
      0,
    );
    assert.equal(
      invoiceOutstanding({ status: "partial", amount: 10000, paidAmount: 3000 }),
      7000,
    );
  });

  it("sums billed and outstanding excluding cancelled", () => {
    const rows = [
      { status: "unpaid", amount: 5000, paidAmount: 0 },
      { status: "cancelled", amount: 8000, paidAmount: 0 },
      { status: "partial", amount: 10000, paidAmount: 2000 },
    ];
    assert.equal(sumInvoiceBilled(rows), 15000);
    assert.equal(sumInvoiceOutstanding(rows), 13000);
  });

  it("merges billable filter into a base match", () => {
    assert.deepEqual(billableInvoiceMatch({ customerId: 3 }), {
      customerId: 3,
      status: { $ne: "cancelled" },
    });
  });
});
