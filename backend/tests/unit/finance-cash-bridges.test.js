import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("finance cash bridges — every pay path hits FinancePayments", () => {
  it("exposes settle helpers for freelancer, vendor bill, tax, payroll", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/services/cash-bridges.service.js"),
      "utf8",
    );
    for (const name of [
      "settleFreelancerInstallment",
      "settleVendorInvoice",
      "settleTaxDeposit",
      "settlePayrollRun",
      "recordOutgoingPayment",
    ]) {
      assert.ok(src.includes(name), `expected ${name}`);
    }
  });

  it("freelancer mark-paid controller uses cash bridge", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/controllers/freelancer-engagements.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("settleFreelancerInstallment"));
    assert.ok(src.includes("unsettleFreelancerInstallment"));
  });

  it("vendor invoice pay posts cash (not status-only)", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/controllers/vendor-invoices.controller.js"),
      "utf8",
    );
    assert.ok(src.includes("settleVendorInvoice"));
    assert.ok(src.includes("payVendorInvoice"));
  });

  it("tax deposits and payroll mark-paid post outgoing payments", () => {
    const tax = readFileSync(
      join(__dirname, "../../src/modules/finance/controllers/tax.controller.js"),
      "utf8",
    );
    const payroll = readFileSync(
      join(__dirname, "../../src/modules/hrm/services/payroll.service.js"),
      "utf8",
    );
    assert.ok(tax.includes("settleTaxDeposit"));
    assert.ok(payroll.includes("settlePayrollRun"));
  });

  it("client ledgers include sales invoices; vendor ledgers include vendor bills", () => {
    const src = readFileSync(
      join(__dirname, "../../src/modules/finance/services/finance-ledger.service.js"),
      "utf8",
    );
    assert.ok(src.includes("SalesInvoices"));
    assert.ok(src.includes("customerId"));
    assert.ok(src.includes("FinanceVendorInvoices"));
    assert.ok(src.includes("vendorInvoiceId == null"));
  });
});
