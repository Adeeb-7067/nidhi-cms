import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcLineItemsTotal,
  resolveFinalTotal,
} from "../../src/utils/sales-totals.js";

function proposalFinalTotal(proposal) {
  const calculated = calcLineItemsTotal(proposal.items ?? [], proposal.discount ?? 0);
  return resolveFinalTotal(calculated, proposal.totalAdjustment ?? 0, proposal.adjustedTotal ?? null);
}

function validateScheduleSum(rows, proposalTotal) {
  const sumDue = rows.reduce((sum, row) => sum + row.dueAmount, 0);
  return Math.abs(sumDue - proposalTotal) <= 1;
}

describe("sales installment flow totals", () => {
  it("matches proposal total when milestones sum to 100%", () => {
    const proposal = {
      items: [{ quantity: 1, unitPrice: 100000, taxPercent: 18 }],
      discount: 10,
      totalAdjustment: 0,
      adjustedTotal: null,
    };
    const total = proposalFinalTotal(proposal);
    const rows = [
      { dueAmount: Math.round(total * 0.4) },
      { dueAmount: Math.round(total * 0.4) },
      { dueAmount: total - Math.round(total * 0.4) * 2 },
    ];
    assert.equal(validateScheduleSum(rows, total), true);
  });

  it("rejects schedules that do not match proposal total", () => {
    const proposal = {
      items: [{ quantity: 1, unitPrice: 50000, taxPercent: 0 }],
      discount: 0,
      totalAdjustment: 0,
      adjustedTotal: null,
    };
    const total = proposalFinalTotal(proposal);
    assert.equal(validateScheduleSum([{ dueAmount: total - 500 }], total), false);
  });

  it("respects adjustedTotal on proposals", () => {
    const proposal = {
      items: [{ quantity: 1, unitPrice: 10000, taxPercent: 0 }],
      discount: 0,
      totalAdjustment: 0,
      adjustedTotal: 9500,
    };
    assert.equal(proposalFinalTotal(proposal), 9500);
  });
});
