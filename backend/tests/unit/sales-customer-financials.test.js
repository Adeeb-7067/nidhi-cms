import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveCustomerFinancials } from "../../src/utils/sales-customer-financials.js";

describe("sales-customer-financials", () => {
  it("uses all installment milestones for scheduled, collected, and outstanding", () => {
    const installments = [
      { dueAmount: 70_000, paidAmount: 1_100 },
      { dueAmount: 30_000, paidAmount: 0 },
    ];
    const result = resolveCustomerFinancials(installments, []);
    assert.equal(result.totalSales, 100_000);
    assert.equal(result.totalCollected, 1_100);
    assert.equal(result.outstanding, 98_900);
    assert.equal(result.source, "installments");
  });

  it("falls back to invoices when no installment schedule exists", () => {
    const invoices = [
      { status: "partial", amount: 50_000, paidAmount: 10_000, customerId: 1 },
    ];
    const result = resolveCustomerFinancials([], invoices);
    assert.equal(result.totalSales, 50_000);
    assert.equal(result.totalCollected, 10_000);
    assert.equal(result.outstanding, 40_000);
    assert.equal(result.source, "invoices");
  });
});
