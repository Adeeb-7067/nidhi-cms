import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateAttendanceForPayroll,
  computePayrollLineAmounts,
  evaluatePayrollReadiness,
  PAYROLL_DAYS_IN_MONTH,
} from "../../src/services/hrm/payroll-compute.js";

describe("aggregateAttendanceForPayroll", () => {
  test("counts paid, LOP, and late days", () => {
    const summaries = [
      { status: "present", compliance: "met" },
      { status: "late", compliance: "met" },
      { status: "on_leave", compliance: "exempt" },
      { status: "absent", compliance: "absent" },
      { status: "present", compliance: "short" },
    ];
    assert.deepEqual(aggregateAttendanceForPayroll(summaries), {
      paidDays: 4,
      lopDays: 2,
      lateCount: 1,
    });
  });
});

describe("computePayrollLineAmounts", () => {
  test("applies LOP deduction as gross/30 * lopDays", () => {
    const line = computePayrollLineAmounts({
      gross: 30000,
      paidDays: 28,
      lopDays: 2,
      lateCount: 1,
      pfEmployee: 1800,
      tds: 0,
    });
    assert.equal(line.lopDeduction, 2000);
    assert.equal(line.deductions, 3800);
    assert.equal(line.net, 26200);
  });

  test("never returns negative net", () => {
    const line = computePayrollLineAmounts({
      gross: 1000,
      lopDays: 30,
      pfEmployee: 500,
      tds: 500,
    });
    assert.equal(line.net, 0);
  });

  test("uses PAYROLL_DAYS_IN_MONTH constant", () => {
    assert.equal(PAYROLL_DAYS_IN_MONTH, 30);
    const line = computePayrollLineAmounts({ gross: 30000, lopDays: 1 });
    assert.equal(line.lopDeduction, 1000);
  });
});

describe("evaluatePayrollReadiness", () => {
  test("ready when no blockers", () => {
    assert.deepEqual(evaluatePayrollReadiness({ blockers: [] }), { ready: true, blockerCount: 0 });
  });

  test("not ready when blockers present", () => {
    const result = evaluatePayrollReadiness({
      blockers: [{ code: "pending_leave", count: 2 }],
    });
    assert.equal(result.ready, false);
    assert.equal(result.blockerCount, 2);
  });
});
