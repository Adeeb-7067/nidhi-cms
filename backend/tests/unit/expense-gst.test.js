import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  recognizedExpenseGst,
  recognizedExpenseAmount,
} from "../../src/modules/finance/services/expense-cash.service.js";
import { calcVendorInvoiceAmounts } from "../../src/utils/vendor-invoice-totals.js";

describe("expense GST classification", () => {
  it("non-GST expenses contribute zero input GST", () => {
    assert.equal(
      recognizedExpenseGst({
        status: "approved",
        gstEnabled: false,
        amount: 11800,
        gstAmount: 1800,
        paidAmount: 11800,
        paymentStatus: "paid",
      }),
      0,
    );
  });

  it("GST expenses recognize full gstAmount when fully paid", () => {
    assert.equal(
      recognizedExpenseGst({
        status: "approved",
        gstEnabled: true,
        amount: 11800,
        gstAmount: 1800,
        paidAmount: 11800,
        paymentStatus: "paid",
      }),
      1800,
    );
  });

  it("GST expenses prorate input GST by paid/bill on partial settlement", () => {
    assert.equal(
      recognizedExpenseGst({
        status: "approved",
        gstEnabled: true,
        amount: 11800,
        gstAmount: 1800,
        paidAmount: 5900,
        paymentStatus: "partially_paid",
      }),
      900,
    );
  });

  it("pending GST expenses do not feed tax totals", () => {
    assert.equal(
      recognizedExpenseGst({
        status: "pending",
        gstEnabled: true,
        amount: 11800,
        gstAmount: 1800,
      }),
      0,
    );
    assert.equal(
      recognizedExpenseAmount({
        status: "pending",
        amount: 11800,
      }),
      0,
    );
  });

  it("form math stores bill total + gstAmount like vendor invoices", () => {
    const totals = calcVendorInvoiceAmounts(10000, 18, true);
    assert.equal(totals.taxableAmount, 10000);
    assert.equal(totals.gstAmount, 1800);
    assert.equal(totals.totalAmount, 11800);
    assert.equal(
      recognizedExpenseGst({
        status: "approved",
        gstEnabled: true,
        amount: totals.totalAmount,
        gstAmount: totals.gstAmount,
        paidAmount: totals.totalAmount,
        paymentStatus: "paid",
      }),
      1800,
    );
  });
});
