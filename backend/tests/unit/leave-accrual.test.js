import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeAvailableBalance,
  currentAccrualPeriodKey,
  getLeaveYearForDate,
  resolveAccrualDaysPerMonth,
  computeCarryForwardAmount,
  allocateOldestFirst,
  leaveProfileFieldsTouched,
} from "../../src/services/hrm/leave-accrual.service.js";

describe("computeAvailableBalance", () => {
  test("sums allocated and carried forward minus used and pending", () => {
    assert.equal(
      computeAvailableBalance({ allocated: 10, carriedForward: 2, used: 3, pending: 1 }),
      8,
    );
  });

  test("never returns negative", () => {
    assert.equal(
      computeAvailableBalance({ allocated: 1, used: 5, pending: 2 }),
      0,
    );
  });
});

describe("getLeaveYearForDate", () => {
  test("calendar year when start month is January", () => {
    assert.equal(getLeaveYearForDate(2026, 6, 1), 2026);
    assert.equal(getLeaveYearForDate(2026, 1, 1), 2026);
  });

  test("fiscal year starting April maps Jan–Mar to prior label", () => {
    assert.equal(getLeaveYearForDate(2026, 4, 4), 2026);
    assert.equal(getLeaveYearForDate(2026, 12, 4), 2026);
    assert.equal(getLeaveYearForDate(2026, 3, 4), 2025);
    assert.equal(getLeaveYearForDate(2026, 1, 4), 2025);
  });
});

describe("resolveAccrualDaysPerMonth", () => {
  test("uses leave.monthlyQuota when set (Satyakabir)", () => {
    assert.equal(resolveAccrualDaysPerMonth({ leave: { monthlyQuota: 2 } }, {}), 2);
  });

  test("uses monthlyLeaveQuota legacy field", () => {
    assert.equal(resolveAccrualDaysPerMonth({ monthlyLeaveQuota: 1.5 }, {}), 1.5);
  });

  test("uses per-user leaveAccrualDaysPerMonth override when set", () => {
    assert.equal(resolveAccrualDaysPerMonth({ leaveAccrualDaysPerMonth: 2.5 }, {}), 2.5);
    assert.equal(resolveAccrualDaysPerMonth({ leaveAccrualDaysPerMonth: 0 }, {}), 0);
  });

  test("falls back to company setting", () => {
    assert.equal(resolveAccrualDaysPerMonth({}, { hrmPaidLeavesPerMonth: 1.5 }), 1.5);
    assert.equal(resolveAccrualDaysPerMonth({}, { hrmPaidLeavesPerMonth: 0 }), 0);
  });

  test("defaults to 1 when neither override nor setting", () => {
    assert.equal(resolveAccrualDaysPerMonth({}, {}), 1);
    assert.equal(resolveAccrualDaysPerMonth({}, { hrmPaidLeavesPerMonth: null }), 1);
  });

  test("nested monthlyQuota wins over leaveAccrualDaysPerMonth", () => {
    assert.equal(
      resolveAccrualDaysPerMonth(
        { leave: { monthlyQuota: 2 }, leaveAccrualDaysPerMonth: 3 },
        { hrmPaidLeavesPerMonth: 1 },
      ),
      2,
    );
  });

  test("per-user leaveAccrualDaysPerMonth wins over global", () => {
    assert.equal(
      resolveAccrualDaysPerMonth(
        { leaveAccrualDaysPerMonth: 3 },
        { hrmPaidLeavesPerMonth: 1 },
      ),
      3,
    );
  });
});

describe("currentAccrualPeriodKey", () => {
  test("formats YYYY-MM in UTC", () => {
    const key = currentAccrualPeriodKey(new Date("2026-06-15T12:00:00Z"), null);
    assert.equal(key, "2026-06");
  });
});

describe("leaveProfileFieldsTouched", () => {
  test("detects leave quota patch keys", () => {
    assert.equal(leaveProfileFieldsTouched(["leaveAccrualDaysPerMonth"]), true);
    assert.equal(leaveProfileFieldsTouched(["name", "email"]), false);
  });
});

describe("computeCarryForwardAmount", () => {
  test("returns available balance when carry-forward allowed", () => {
    const amount = computeCarryForwardAmount(
      { allocated: 12, used: 4, pending: 2, carriedForward: 0 },
      { carryForwardAllowed: true },
    );
    assert.equal(amount, 6);
  });

  test("returns 0 when type disallows carry-forward", () => {
    const amount = computeCarryForwardAmount(
      { allocated: 12, used: 0, pending: 0, carriedForward: 0 },
      { carryForwardAllowed: false },
    );
    assert.equal(amount, 0);
  });

  test("returns 0 when no prior balance", () => {
    assert.equal(computeCarryForwardAmount(null, { carryForwardAllowed: true }), 0);
  });
});

describe("allocateOldestFirst", () => {
  const types = [
    { id: 1, code: "CL", fifoPriority: 1, status: "active", isPaid: true },
    { id: 2, code: "SL", fifoPriority: 2, status: "active", isPaid: true },
    { id: 3, code: "UL", fifoPriority: 99, status: "active", isPaid: false },
  ];

  test("consumes lowest fifoPriority first", () => {
    const balances = new Map([
      [1, { allocated: 2, carriedForward: 0, used: 0, pending: 0 }],
      [2, { allocated: 5, carriedForward: 0, used: 0, pending: 0 }],
    ]);
    const { allocations, unpaidDays } = allocateOldestFirst(types, balances, 4);
    assert.deepEqual(allocations, [
      { leaveTypeId: 1, code: "CL", days: 2 },
      { leaveTypeId: 2, code: "SL", days: 2 },
    ]);
    assert.equal(unpaidDays, 0);
  });

  test("reports LOP overflow when paid balance insufficient", () => {
    const balances = new Map([
      [1, { allocated: 1, carriedForward: 0, used: 0, pending: 0 }],
    ]);
    const { allocations, unpaidDays } = allocateOldestFirst(types, balances, 3);
    assert.deepEqual(allocations, [{ leaveTypeId: 1, code: "CL", days: 1 }]);
    assert.equal(unpaidDays, 2);
  });

  test("skips inactive and unpaid types", () => {
    const mixed = [
      { id: 10, code: "OLD", fifoPriority: 0, status: "inactive", isPaid: true },
      { id: 11, code: "EL", fifoPriority: 1, status: "active", isPaid: true },
    ];
    const balances = new Map([
      [10, { allocated: 10, carriedForward: 0, used: 0, pending: 0 }],
      [11, { allocated: 2, carriedForward: 0, used: 0, pending: 0 }],
    ]);
    const { allocations } = allocateOldestFirst(mixed, balances, 2);
    assert.deepEqual(allocations, [{ leaveTypeId: 11, code: "EL", days: 2 }]);
  });
});
