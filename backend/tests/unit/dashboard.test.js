import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveDashboardView,
  computeAttendanceMonthPct,
  buildAttendanceTrendPoints,
  buildTodayStatusBreakdown,
  buildApprovalPipeline,
} from "../../src/services/hrm/dashboard.service.js";

describe("resolveDashboardView", () => {
  test("maps HR roles to admin", () => {
    assert.equal(resolveDashboardView("hr"), "admin");
    assert.equal(resolveDashboardView("super_admin"), "admin");
  });

  test("maps manager to manager", () => {
    assert.equal(resolveDashboardView("manager"), "manager");
  });

  test("maps staff roles to employee", () => {
    assert.equal(resolveDashboardView("developer"), "employee");
    assert.equal(resolveDashboardView("tester"), "employee");
  });
});

describe("computeAttendanceMonthPct", () => {
  test("returns 0 when no summaries", () => {
    assert.equal(computeAttendanceMonthPct([]), 0);
  });

  test("ignores weekends and holidays in denominator", () => {
    const pct = computeAttendanceMonthPct([
      { status: "weekend" },
      { status: "holiday" },
      { status: "present" },
      { status: "absent" },
    ]);
    assert.equal(pct, 50);
  });

  test("counts late and wfh as present", () => {
    const pct = computeAttendanceMonthPct([
      { status: "late" },
      { status: "wfh" },
      { status: "absent" },
    ]);
    assert.equal(pct, 67);
  });
});

describe("buildAttendanceTrendPoints", () => {
  test("aggregates present and absent by date", () => {
    const trend = buildAttendanceTrendPoints([
      { date: "2026-06-01", status: "present" },
      { date: "2026-06-01", status: "absent" },
      { date: "2026-06-02", status: "wfh" },
      { date: "2026-06-02", status: "weekend" },
    ]);
    assert.equal(trend.length, 2);
    assert.equal(trend[0].present, 1);
    assert.equal(trend[0].absent, 1);
    assert.equal(trend[1].present, 1);
  });
});

describe("buildTodayStatusBreakdown", () => {
  test("maps status counts to labeled slices", () => {
    const slices = buildTodayStatusBreakdown([
      { status: "present" },
      { status: "late" },
      { status: "on_leave" },
    ]);
    assert.deepEqual(slices, [
      { name: "Present", value: 1 },
      { name: "Onsite", value: 1 },
      { name: "On leave", value: 1 },
    ]);
  });
});

describe("buildApprovalPipeline", () => {
  test("includes only non-zero queues", () => {
    const pipeline = buildApprovalPipeline({
      pendingLeave: 2,
      pendingWfh: 0,
      pendingCorrections: 1,
    });
    assert.equal(pipeline.length, 2);
    assert.equal(pipeline[0].name, "Pending leave");
  });
});
