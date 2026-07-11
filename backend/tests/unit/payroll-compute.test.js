import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateAttendanceForPayroll,
  buildLeavePayrollByDate,
  computePayrollLineAmounts,
  countSundaysInRange,
  evaluatePayrollReadiness,
  PAYROLL_DAYS_IN_MONTH,
  resolveContractSalary,
} from "../../src/services/hrm/payroll-compute.js";
import { eachDateInRange, getDayOfWeek } from "../../src/services/hrm/hrm-date-utils.js";

const period = { startDate: "2026-06-01", endDate: "2026-06-30" };
const weekendDays = [0, 6];

/** Materialize weekend/holiday rows like getAttendanceDailySummaries does in production. */
function baseSummariesForPeriod(startDate, endDate, weekend = weekendDays) {
  const rows = [];
  for (const date of eachDateInRange(startDate, endDate)) {
    if (weekend.includes(getDayOfWeek(date))) {
      rows.push({ date, status: "weekend", compliance: "exempt" });
    }
  }
  return rows;
}

function mergeSummaries(...groups) {
  const byDate = new Map();
  for (const group of groups) {
    for (const row of group) {
      byDate.set(row.date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

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
  test("includes weekend summaries as paid days", () => {
    const summaries = baseSummariesForPeriod(period.startDate, period.endDate);
    const result = aggregateAttendanceForPayroll(summaries, period);
    assert.equal(result.paidDays, 8);
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
    const summaries = mergeSummaries(baseSummariesForPeriod(period.startDate, period.endDate), [
      { date: "2026-06-02", status: "present", compliance: "met" },
      { date: "2026-06-03", status: "on_leave", compliance: "exempt" },
      { date: "2026-06-04", status: "absent", compliance: "absent" },
    ]);
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate,
    });
    assert.equal(result.paidDays, 10);
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
    const summaries = mergeSummaries(baseSummariesForPeriod(period.startDate, period.endDate), [
      { date: "2026-06-03", status: "on_leave", compliance: "exempt" },
    ]);
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate,
    });
    assert.equal(result.paidDays, 9);
    assert.equal(result.lopDays, 1);
  });

  test("absent days are unpaid with no LOP", () => {
    const summaries = mergeSummaries(baseSummariesForPeriod(period.startDate, period.endDate), [
      { date: "2026-06-02", status: "absent", compliance: "absent" },
    ]);
    const result = aggregateAttendanceForPayroll(summaries, { ...period, leavePayrollByDate: new Map() });
    assert.equal(result.paidDays, 8);
    assert.equal(result.lopDays, 0);
  });

  test("counts chargeable late days after the free-lates allowance", () => {
    const summaries = [
      { date: "2026-06-01", status: "present", compliance: "met", late: true },
      { date: "2026-06-02", status: "present", compliance: "met", late: true },
      { date: "2026-06-03", status: "present", compliance: "met", late: true },
      { date: "2026-06-04", status: "present", compliance: "met", late: true },
      { date: "2026-06-05", status: "present", compliance: "met", late: false },
    ];
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate: new Map(),
      maxFreeLates: 2,
    });
    // 4 late days, first 2 free → 2 chargeable.
    assert.equal(result.lateCount, 2);
  });

  test("excused (forgivenLate) days are never charged and do not consume free lates", () => {
    const summaries = [
      { date: "2026-06-01", status: "present", compliance: "met", late: true, forgivenLate: true },
      { date: "2026-06-02", status: "present", compliance: "met", late: true },
      { date: "2026-06-03", status: "present", compliance: "met", late: true },
    ];
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate: new Map(),
      maxFreeLates: 1,
    });
    // Excused day skipped; of the 2 remaining lates, 1 is free → 1 chargeable.
    assert.equal(result.lateCount, 1);
  });

  test("no penalty when free lates cover all late days", () => {
    const summaries = [
      { date: "2026-06-01", status: "present", compliance: "met", late: true },
      { date: "2026-06-02", status: "present", compliance: "met", late: true },
    ];
    const result = aggregateAttendanceForPayroll(summaries, {
      ...period,
      leavePayrollByDate: new Map(),
      maxFreeLates: 3,
    });
    assert.equal(result.lateCount, 0);
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

  test("adds late penalty (lateCount × per-day amount) to deductions", () => {
    const line = computePayrollLineAmounts({
      gross: 30000,
      paidDays: 30,
      lopDays: 0,
      lateCount: 3,
      latePenaltyPerDay: 100,
    });
    assert.equal(line.gross, 30000);
    assert.equal(line.latePenalty, 300);
    assert.equal(line.deductions, 300);
    assert.equal(line.net, 29700);
  });

  test("no late penalty when penalty amount is zero", () => {
    const line = computePayrollLineAmounts({
      gross: 30000,
      paidDays: 30,
      lopDays: 0,
      lateCount: 5,
      latePenaltyPerDay: 0,
    });
    assert.equal(line.latePenalty, 0);
    assert.equal(line.deductions, 0);
    assert.equal(line.net, 30000);
  });
});

describe("resolveContractSalary", () => {
  test("uses employee profile salary when basic is set", () => {
    const contract = resolveContractSalary({
      profileSalary: { basicSalary: 50000, allowances: 5000, deductions: 2000, netSalary: 53000 },
    });
    assert.equal(contract.gross, 55000);
    assert.equal(contract.totalSalary, 53000);
    assert.equal(contract.contractNet, 53000);
    assert.equal(contract.payrollBase, 53000);
    assert.equal(contract.pfEmployee, 0);
    assert.equal(contract.source, "profile");
  });

  test("computes profile net when netSalary is missing", () => {
    const contract = resolveContractSalary({
      profileSalary: { basicSalary: 40000, allowances: 10000, deductions: 1500 },
    });
    assert.equal(contract.gross, 50000);
    assert.equal(contract.contractNet, 48500);
    assert.equal(contract.totalSalary, 48500);
    assert.equal(contract.payrollBase, 48500);
  });

  test("falls back to salary structure row when profile basic is missing", () => {
    const contract = resolveContractSalary({
      profileSalary: {},
      structureRow: { basic: 30000, hra: 5000, allowances: 2000, pfEmployee: 1800, tds: 500, gross: 37000, net: 34700 },
    });
    assert.equal(contract.gross, 37000);
    assert.equal(contract.totalSalary, 34700);
    assert.equal(contract.contractNet, 34700);
    assert.equal(contract.payrollBase, 34700);
    assert.equal(contract.pfEmployee, 0);
    assert.equal(contract.source, "structure");
  });

  test("uses profile net when basic is missing but netSalary is set", () => {
    const contract = resolveContractSalary({
      profileSalary: { netSalary: 42000 },
    });
    assert.equal(contract.configured, true);
    assert.equal(contract.contractNet, 42000);
    assert.equal(contract.payrollBase, 42000);
    assert.equal(contract.source, "profile");
  });

  test("returns unconfigured when no salary data exists", () => {
    const contract = resolveContractSalary({ profileSalary: {}, structureRow: {} });
    assert.equal(contract.configured, false);
    assert.equal(contract.gross, 0);
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
