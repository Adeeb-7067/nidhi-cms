import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeAvailableBalance,
  currentAccrualPeriodKey,
  getLeaveYearForDate,
  isLeaveCycleResetMonth,
  isInFirstLeaveCycle,
  shouldReclaimStrandedAccrualTouch,
  resolveAccrualDaysPerMonth,
  resolveLeaveResetCycleMonths,
  computeCarryForwardAmount,
  allocateOldestFirst,
  leaveProfileFieldsTouched,
  listAccrualPeriodsAfter,
  nextAccrualPeriodKey,
  previousAccrualPeriodKey,
} from "../../src/modules/hrm/services/leave-accrual.service.js";

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
  test("fiscal year starting June keeps Jun–Dec in same leave year", () => {
    assert.equal(getLeaveYearForDate(2026, 6, 6), 2026);
    assert.equal(getLeaveYearForDate(2026, 7, 6), 2026);
    assert.equal(getLeaveYearForDate(2026, 5, 6), 2025);
  });
});

describe("isLeaveCycleResetMonth", () => {
  test("resets every 3 months from January (Jan, Apr, Jul, Oct)", () => {
    assert.equal(isLeaveCycleResetMonth(1, 1, 3), true);
    assert.equal(isLeaveCycleResetMonth(2, 1, 3), false);
    assert.equal(isLeaveCycleResetMonth(3, 1, 3), false);
    assert.equal(isLeaveCycleResetMonth(4, 1, 3), true);
    assert.equal(isLeaveCycleResetMonth(7, 1, 3), true);
    assert.equal(isLeaveCycleResetMonth(10, 1, 3), true);
  });

  test("respects leave year start month", () => {
    assert.equal(isLeaveCycleResetMonth(4, 4, 3), true);
    assert.equal(isLeaveCycleResetMonth(5, 4, 3), false);
    assert.equal(isLeaveCycleResetMonth(7, 4, 3), true);
  });

  test("June start resets Jun / Sep / Dec / Mar", () => {
    assert.equal(isLeaveCycleResetMonth(6, 6, 3), true);
    assert.equal(isLeaveCycleResetMonth(7, 6, 3), false);
    assert.equal(isLeaveCycleResetMonth(8, 6, 3), false);
    assert.equal(isLeaveCycleResetMonth(9, 6, 3), true);
  });
});

describe("isInFirstLeaveCycle", () => {
  test("June start: Jun–Aug are first cycle", () => {
    assert.equal(isInFirstLeaveCycle(6, 6, 3), true);
    assert.equal(isInFirstLeaveCycle(7, 6, 3), true);
    assert.equal(isInFirstLeaveCycle(8, 6, 3), true);
    assert.equal(isInFirstLeaveCycle(9, 6, 3), false);
  });
});

describe("shouldReclaimStrandedAccrualTouch", () => {
  test("reclaims June touch into current leave year during Jul of June-start cycle", () => {
    assert.equal(
      shouldReclaimStrandedAccrualTouch({
        calendarMonth: 7,
        startMonth: 6,
        cycleMonths: 3,
        currentLeaveYear: 2026,
        touchYear: 2026,
        touchMonth: 6,
      }),
      true,
    );
  });

  test("does not reclaim closed-year May leftover after June start", () => {
    assert.equal(
      shouldReclaimStrandedAccrualTouch({
        calendarMonth: 7,
        startMonth: 6,
        cycleMonths: 3,
        currentLeaveYear: 2026,
        touchYear: 2026,
        touchMonth: 5,
      }),
      false,
    );
  });

  test("does not reclaim outside the first cycle", () => {
    assert.equal(
      shouldReclaimStrandedAccrualTouch({
        calendarMonth: 10,
        startMonth: 6,
        cycleMonths: 3,
        currentLeaveYear: 2026,
        touchYear: 2026,
        touchMonth: 6,
      }),
      false,
    );
  });
});

describe("resolveLeaveResetCycleMonths", () => {
  test("defaults to 3 months", () => {
    assert.equal(resolveLeaveResetCycleMonths({}), 3);
    assert.equal(resolveLeaveResetCycleMonths({ hrmLeaveResetCycleMonths: null }), 3);
  });

  test("clamps configured value to 1–12", () => {
    assert.equal(resolveLeaveResetCycleMonths({ hrmLeaveResetCycleMonths: 6 }), 6);
    assert.equal(resolveLeaveResetCycleMonths({ hrmLeaveResetCycleMonths: 0 }), 1);
    assert.equal(resolveLeaveResetCycleMonths({ hrmLeaveResetCycleMonths: 99 }), 12);
  });
});

describe("resolveAccrualDaysPerMonth", () => {
  test("uses per-user leaveAccrualDaysPerMonth override when set", () => {
    assert.equal(resolveAccrualDaysPerMonth({ leaveAccrualDaysPerMonth: 2.5 }, {}), 2.5);
    assert.equal(resolveAccrualDaysPerMonth({ leaveAccrualDaysPerMonth: 0 }, {}), 0);
  });

  test("company setting applies when employee has no personal override", () => {
    assert.equal(resolveAccrualDaysPerMonth({}, { hrmPaidLeavesPerMonth: 1.5 }), 1.5);
    assert.equal(resolveAccrualDaysPerMonth({}, { hrmPaidLeavesPerMonth: 0 }), 0);
    assert.equal(
      resolveAccrualDaysPerMonth(
        { leave: { monthlyQuota: 9 }, monthlyLeaveQuota: 9 },
        { hrmPaidLeavesPerMonth: 1.5 },
      ),
      1.5,
    );
  });

  test("defaults to 1 when neither override nor setting", () => {
    assert.equal(resolveAccrualDaysPerMonth({}, {}), 1);
    assert.equal(resolveAccrualDaysPerMonth({}, { hrmPaidLeavesPerMonth: null }), 1);
  });

  test("leaveAccrualDaysPerMonth wins over company and nested quota", () => {
    assert.equal(
      resolveAccrualDaysPerMonth(
        { leave: { monthlyQuota: 2 }, leaveAccrualDaysPerMonth: 3 },
        { hrmPaidLeavesPerMonth: 1 },
      ),
      3,
    );
  });

  test("legacy nested monthlyQuota used only when no company setting and no leaveAccrualDaysPerMonth", () => {
    assert.equal(resolveAccrualDaysPerMonth({ leave: { monthlyQuota: 2 } }, {}), 2);
    assert.equal(resolveAccrualDaysPerMonth({ monthlyLeaveQuota: 1.5 }, {}), 1.5);
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

describe("listAccrualPeriodsAfter", () => {
  test("returns only throughPeriod when no prior accrual", () => {
    assert.deepEqual(listAccrualPeriodsAfter(null, "2026-07"), ["2026-07"]);
  });

  test("lists every missed month through the target period", () => {
    assert.deepEqual(listAccrualPeriodsAfter("2026-04", "2026-07"), [
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  test("returns empty when already credited through target", () => {
    assert.deepEqual(listAccrualPeriodsAfter("2026-07", "2026-07"), []);
  });
});

describe("nextAccrualPeriodKey", () => {
  test("rolls year boundary", () => {
    assert.equal(nextAccrualPeriodKey("2026-12"), "2027-01");
    assert.equal(nextAccrualPeriodKey("2026-06"), "2026-07");
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
