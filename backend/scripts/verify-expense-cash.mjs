/**
 * Offline verification of expense cash-settlement helpers (no DB).
 * Run: node backend/scripts/verify-expense-cash.mjs
 */
import assert from "node:assert/strict";
import {
  deriveExpensePaymentStatus,
  isLegacyFullyPaidExpense,
  outstandingExpenseAmount,
  recognizedExpenseAmount,
  recognizedExpenseGst,
  withExpenseSettlementView,
} from "../src/modules/finance/services/expense-cash.service.js";

function step(name, fn) {
  fn();
  console.log(`  ok  ${name}`);
}

console.log("expense-cash settlement logic");

step("pending → no recognition / no due", () => {
  const e = { status: "pending", amount: 30000 };
  assert.equal(recognizedExpenseAmount(e), 0);
  assert.equal(outstandingExpenseAmount(e), 0);
});

step("legacy approved (no settlement fields) → fully paid", () => {
  const e = { status: "approved", amount: 30000 };
  assert.equal(isLegacyFullyPaidExpense(e), true);
  assert.equal(recognizedExpenseAmount(e), 30000);
  assert.equal(outstandingExpenseAmount(e), 0);
  const view = withExpenseSettlementView(e);
  assert.equal(view.paymentStatus, "paid");
  assert.equal(view.paidAmount, 30000);
  assert.equal(view.remainingDue, 0);
});

step("approve unpaid (paid 0) → due = bill, P&L = 0", () => {
  const e = { status: "approved", amount: 30000, paidAmount: 0, paymentStatus: "unpaid" };
  assert.equal(recognizedExpenseAmount(e), 0);
  assert.equal(outstandingExpenseAmount(e), 30000);
  assert.equal(deriveExpensePaymentStatus(30000, 0), "unpaid");
});

step("partial 15k of 30k → P&L 15k, due 15k", () => {
  const e = { status: "approved", amount: 30000, paidAmount: 15000, paymentStatus: "partially_paid" };
  assert.equal(recognizedExpenseAmount(e), 15000);
  assert.equal(outstandingExpenseAmount(e), 15000);
  assert.equal(deriveExpensePaymentStatus(30000, 15000), "partially_paid");
});

step("fully paid → P&L = bill, due 0", () => {
  const e = { status: "approved", amount: 30000, paidAmount: 30000, paymentStatus: "paid" };
  assert.equal(recognizedExpenseAmount(e), 30000);
  assert.equal(outstandingExpenseAmount(e), 0);
  assert.equal(deriveExpensePaymentStatus(30000, 30000), "paid");
});

step("paidAmount never exceeds bill in recognition", () => {
  const e = { status: "approved", amount: 100, paidAmount: 150, paymentStatus: "paid" };
  assert.equal(recognizedExpenseAmount(e), 100);
});

step("GST prorated by cash", () => {
  const e = {
    status: "approved",
    amount: 10000,
    paidAmount: 5000,
    paymentStatus: "partially_paid",
    gstEnabled: true,
    gstAmount: 1800,
  };
  assert.equal(recognizedExpenseGst(e), 900);
  const legacy = { status: "approved", amount: 10000, gstEnabled: true, gstAmount: 1800 };
  assert.equal(recognizedExpenseGst(legacy), 1800);
});

step("two-step pay path totals", () => {
  // Simulate: approve with 15k → then pay remaining 15k
  let e = { status: "approved", amount: 30000, paidAmount: 0, paymentStatus: "unpaid" };
  e = { ...e, paidAmount: 15000, paymentStatus: deriveExpensePaymentStatus(30000, 15000) };
  assert.equal(recognizedExpenseAmount(e), 15000);
  assert.equal(outstandingExpenseAmount(e), 15000);
  e = { ...e, paidAmount: 30000, paymentStatus: deriveExpensePaymentStatus(30000, 30000) };
  assert.equal(recognizedExpenseAmount(e), 30000);
  assert.equal(outstandingExpenseAmount(e), 0);
  assert.equal(e.paymentStatus, "paid");
});

console.log("\nAll settlement logic checks passed.");
