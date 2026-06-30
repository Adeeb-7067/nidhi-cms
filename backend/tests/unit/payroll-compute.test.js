import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateAttendanceForPayroll,
  buildLeavePayrollByDate,
  computePayrollLineAmounts,
  countSundaysInRange,
  evaluatePayrollReadiness,
  PAYROLL_DAYS_IN_MONTH,
} from "../../src/services/hrm/payroll-compute.js";

const period = { startDate: "2026-06-01", endDate: "2026-06-30" };
const weekendDays = [0, 6];

describe("countSundaysInRange", () => {
  test("counts Sundays in June 2026", () => {
    assert.equal(countSundaysInRange("2026-06-01", "2026-06-30"), 4);
  });
});

describe("buildLeavePayrollByDate", () => {
  test("marks balance-covered leave as paid and overflow as LOP", () => {
    const byDate = buildLeavePayrollByDate(
      [
        {
          status: "approved",
          startDate: "2026-06-02",
          endDate: "2026-06-04",
          dayPart: "full",
          days: 3,
          lopDays: 1,
        },
      ],
      { ...period, weekendDays, holidayDates: new Set() },
    );
    assert.deepEqual(byDate.get("2026-06-02"), { paid: 1, lop: 0 });
    assert.deepEqual(byDate.get("2026-06-03"), { paid: 1, lop: 0 });
    assert.deepEqual(byDate.get("2026-06-04"), { paid: 0, lop: 1 });
  });

  test("half-day paid leave uses fractional paid days", () => {
    const byDate = buildLeavePayrollByDate(
      [
        {
          status: "approved",
          startDate: "2026-06-02",
          endDate: "2026-06-02",
          dayPart: "half",
          days: 0.5,
          lopDays: 0,
        },
      ],
      { ...period, weekendDays, holidayDates: new Set() },
    );
    assert.deepEqual(byDate.get("2026-06-02"), { paid: 0.5, lop: 0 });
  });
});

describe("aggregateAttendanceForPayroll", () => {
  test("includes all Sundays as paid days", () => {
    const result = aggregateAttendanceForPayroll([], period);
    assert.equal(result.paidDays, 4);
    assert.equal(result.lopDays, 0);
  });

  test("paid leave from balance counts as paid, not LOP", () => {
    const leavePayrollByDate = buildLeavePayrollByDate(
      [
        {
          status: "approved",
          startDate: "2026-06-03",
          endDate: "2026-06-03",
          dayPart: "full",
          days: 1,
          lopDays: 0,
        },
      ],
      { ...period, weekendDays, holidayDates: new Set() },
    );
    const summaries = [
      { date: "2026-06-02", status: "present", compliance: "met" },
      { date: "2026-06-03", status: "on_leave", compliance: "exempt" },
      { date: "2026-06-04", status: "absent", compliance: "absent" },
    ];
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate,
    });
    assert.equal(result.paidDays, 6);
    assert.equal(result.lopDays, 0);
  });

  test("only unpaid leave (LOP) is deducted", () => {
    const leavePayrollByDate = buildLeavePayrollByDate(
      [
        {
          status: "approved",
          startDate: "2026-06-03",
          endDate: "2026-06-03",
          dayPart: "full",
          days: 1,
          lopDays: 1,
        },
      ],
      { ...period, weekendDays, holidayDates: new Set() },
    );
    const summaries = [{ date: "2026-06-03", status: "on_leave", compliance: "exempt" }];
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate,
    });
    assert.equal(result.paidDays, 4);
    assert.equal(result.lopDays, 1);
  });

  test("absent days are unpaid with no LOP", () => {
    const summaries = [{ date: "2026-06-02", status: "absent", compliance: "absent" }];
    const result = aggregateAttendanceForPayroll(summaries, { ...period, leavePayrollByDate: new Map() });
    assert.equal(result.paidDays, 4);
    assert.equal(result.lopDays, 0);
  });
});

describe("computePayrollLineAmounts", () => {
  test("earns gross/30 per paid day; LOP only for unpaid leave days", () => {
    const line = computePayrollLineAmounts({
      gross: 30000,
      paidDays: 28,
      lopDays: 2,
      pfEmployee: 1800,
      tds: 0,
    });
    assert.equal(line.gross, 28000);
    assert.equal(line.lopDeduction, 2000);
    assert.equal(line.deductions, 3800);
    assert.equal(line.net, 24200);
  });

  test("never returns negative net", () => {
    const line = computePayrollLineAmounts({
      gross: 1000,
      paidDays: 0,
      lopDays: 30,
      pfEmployee: 500,
      tds: 500,
    });
    assert.equal(line.net, 0);
  });

  test("uses PAYROLL_DAYS_IN_MONTH constant", () => {
    assert.equal(PAYROLL_DAYS_IN_MONTH, 30);
    const line = computePayrollLineAmounts({ gross: 30000, paidDays: 1, lopDays: 1 });
    assert.equal(line.gross, 1000);
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
