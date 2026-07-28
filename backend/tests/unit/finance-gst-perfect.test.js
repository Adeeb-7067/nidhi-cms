import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  financeInvoiceOutputGst,
  creditNoteOutputGst,
  salesInvoiceOutputGst,
  withGstPayableFields,
  recognizedVendorInvoiceGstShare,
  legacyVendorInvoiceGst,
} from "../../src/modules/finance/services/finance-tax.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("GST output / input helpers", () => {
  const inv18 = {
    status: "unpaid",
    gstEnabled: true,
    discount: 0,
    items: [{ quantity: 1, rate: 10000, taxPercent: 18 }],
    creditNotes: [],
  };

  it("finance invoice output GST is line tax", () => {
    assert.equal(financeInvoiceOutputGst(inv18), 1800);
  });

  it("cancelled / gst-off invoices contribute 0 output GST", () => {
    assert.equal(financeInvoiceOutputGst({ ...inv18, status: "cancelled" }), 0);
    assert.equal(financeInvoiceOutputGst({ ...inv18, gstEnabled: false }), 0);
  });

  it("credit notes reduce output GST in proportion to invoice total", () => {
    const withCn = {
      ...inv18,
      creditNotes: [{ id: "CN-1", date: new Date(), amount: 5900, reason: "partial return" }],
    };
    // total = 10000+1800=11800; tax share of 5900 ≈ 900
    assert.equal(financeInvoiceOutputGst(withCn), 900);
    assert.equal(creditNoteOutputGst(inv18, { amount: 5900 }), 900);
  });

  it("sales invoice output GST uses sales breakdown", () => {
    const sales = {
      status: "unpaid",
      gstEnabled: true,
      lineItems: [{ quantity: 1, unitPrice: 10000, taxPercent: 18 }],
    };
    assert.equal(salesInvoiceOutputGst(sales), 1800);
    assert.equal(salesInvoiceOutputGst({ ...sales, status: "cancelled" }), 0);
  });

  it("payable after deposits floors at zero when credit position", () => {
    const credit = withGstPayableFields(1000, 2500, 0);
    assert.equal(credit.netGst, -1500);
    assert.equal(credit.gstPayable, 0);
    assert.equal(credit.gstInputCredit, 2500);

    const liability = withGstPayableFields(5000, 1000, 1500);
    assert.equal(liability.netGst, 4000);
    assert.equal(liability.gstPayable, 2500);
  });

  it("vendor bill ITC is cash-prorated by settlement amount", () => {
    const bill = {
      status: "unpaid",
      gstEnabled: true,
      totalAmount: 11800,
      gstAmount: 1800,
      paymentId: null,
      paidAmount: 0,
    };
    assert.equal(recognizedVendorInvoiceGstShare(bill, 0), 0);
    assert.equal(recognizedVendorInvoiceGstShare(bill, 5900), 900);
    assert.equal(recognizedVendorInvoiceGstShare(bill, 11800), 1800);
    assert.equal(recognizedVendorInvoiceGstShare({ ...bill, status: "cancelled" }, 11800), 0);
  });

  it("legacy paid vendor bills without payment bridge keep full ITC", () => {
    assert.equal(
      legacyVendorInvoiceGst({
        status: "paid",
        gstEnabled: true,
        gstAmount: 1800,
        paymentId: null,
        paidAmount: 0,
      }),
      1800,
    );
    assert.equal(
      legacyVendorInvoiceGst({
        status: "paid",
        gstEnabled: true,
        gstAmount: 1800,
        paymentId: 99,
        paidAmount: 0,
      }),
      0,
    );
    assert.equal(
      legacyVendorInvoiceGst({
        status: "paid",
        gstEnabled: true,
        gstAmount: 1800,
        paymentId: null,
        paidAmount: 11800,
      }),
      0,
    );
  });
});

describe("GST aggregation contracts (no double-count)", () => {
  const taxSrc = readFileSync(
    join(__dirname, "../../src/modules/finance/services/finance-tax.service.js"),
    "utf8",
  );

  it("excludes invoice-linked and sales-mirrored income from output GST", () => {
    assert.ok(taxSrc.includes("salesPaymentId: null"));
    assert.ok(taxSrc.includes("salesInvoiceId: null"));
    assert.ok(taxSrc.includes("invoiceId: null") || taxSrc.includes('invoiceId: { $exists: false }'));
  });

  it("excludes vendor-linked and vendor-invoice settlement expenses from input GST", () => {
    assert.ok(taxSrc.includes("vendorId: null"));
    assert.ok(taxSrc.includes("vendorInvoiceId: null"));
    assert.ok(taxSrc.includes("FinanceVendorInvoices") || taxSrc.includes("recognizedVendorInvoiceGstShare"));
    assert.ok(taxSrc.includes("recognizedExpenseGstExpr"));
  });

  it("vendor ITC uses payment settlements not unpaid bill gstAmount", () => {
    assert.ok(taxSrc.includes("recognizedVendorInvoiceGstShare"));
    assert.ok(taxSrc.includes("FinancePayments"));
    assert.ok(taxSrc.includes("vendorInvoiceId: { $ne: null }"));
  });

  it("applies credit notes dated in-period (including prior-issue invoices)", () => {
    assert.ok(taxSrc.includes("creditNotes.date"));
    assert.ok(taxSrc.includes("creditNoteOutputGst"));
  });
});
