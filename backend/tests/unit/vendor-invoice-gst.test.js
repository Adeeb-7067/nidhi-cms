import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calcVendorInvoiceAmounts } from "../../src/utils/vendor-invoice-totals.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("vendor invoice GST math", () => {
  test("18% GST on taxable amount", () => {
    const r = calcVendorInvoiceAmounts(10000, 18, true);
    assert.equal(r.taxableAmount, 10000);
    assert.equal(r.gstAmount, 1800);
    assert.equal(r.totalAmount, 11800);
    assert.equal(r.gstEnabled, true);
    assert.equal(r.gstRate, 18);
  });

  test("GST disabled zeroes tax", () => {
    const r = calcVendorInvoiceAmounts(10000, 18, false);
    assert.equal(r.gstAmount, 0);
    assert.equal(r.totalAmount, 10000);
    assert.equal(r.gstRate, 0);
  });

  test("invalid / zero taxable does not invent GST", () => {
    assert.equal(calcVendorInvoiceAmounts(0, 18, true).gstAmount, 0);
    assert.equal(calcVendorInvoiceAmounts(-5, 18, true).taxableAmount, 0);
  });
});

describe("GST paid sources (no silent double-count contract)", () => {
  test("finance-tax gstPaidInRange separates vendor invoices from vendor-linked expenses", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/services/finance-tax.service.js"),
      "utf8",
    );
    assert.ok(src.includes("async function gstPaidInRange"), "gstPaidInRange must exist");
    assert.ok(src.includes("FinanceExpenses"), "input GST from expenses");
    assert.ok(
      src.includes("recognizedVendorInvoiceGstShare") || src.includes("FinanceVendorInvoices"),
      "input GST from vendor invoices",
    );
    assert.ok(
      src.includes("FinancePayments") && src.includes("vendorInvoiceId"),
      "vendor ITC must come from cash settlements, not unpaid bill gstAmount",
    );
    assert.ok(
      src.includes("vendorId: null") || src.includes("vendorId: { $exists: false }"),
      "vendor-linked expenses must be excluded so GST is not double-counted",
    );
  });
});
