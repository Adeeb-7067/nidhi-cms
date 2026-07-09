import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calcInvoiceTotal } from "../../src/utils/finance-totals.js";

/** Pure helpers mirrored from unified-ledger for regression coverage without DB. */
function normalizeSalesInvoiceStatus(status) {
  const map = { partial: "partially_paid" };
  return map[status] ?? status;
}

function salesInvoiceOutstanding(inv) {
  return Math.max(0, (inv.amount ?? 0) - (inv.paidAmount ?? 0));
}

function financeInvoiceOutstanding(inv) {
  const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
  return Math.max(0, total - (inv.paidAmount ?? 0));
}

describe("finance unified ledger helpers", () => {
  test("maps sales partial status to finance partially_paid", () => {
    assert.equal(normalizeSalesInvoiceStatus("partial"), "partially_paid");
    assert.equal(normalizeSalesInvoiceStatus("paid"), "paid");
  });

  test("sales invoice outstanding uses flat amount", () => {
    assert.equal(salesInvoiceOutstanding({ amount: 100_000, paidAmount: 40_000 }), 60_000);
    assert.equal(salesInvoiceOutstanding({ amount: 50_000, paidAmount: 50_000 }), 0);
  });

  test("finance invoice outstanding uses line items", () => {
    const inv = {
      items: [{ id: "1", description: "Service", quantity: 1, rate: 100_000, taxPercent: 0 }],
      discount: 0,
      gstEnabled: false,
      paidAmount: 25_000,
    };
    assert.equal(financeInvoiceOutstanding(inv), 75_000);
  });
});
