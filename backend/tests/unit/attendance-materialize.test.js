import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveExpectedMinutes,
  isPartialLeaveDay,
  detectMissingClockOut,
  resolveAttendanceStatus,
  applyCorrectionOverlay,
  dailyAttendanceToSummary,
  computeLateInfo,
  MIN_ACTIVE_MINUTES_FOR_PRESENT,
} from "../../src/modules/hrm/services/attendance-engine.js";

const weekendDays = [0, 6];
const shift = { startTime: "09:00", endTime: "18:00", graceMinutesIn: 15 };
const timezone = "Asia/Kolkata";

describe("effectiveExpectedMinutes", () => {
  test("full-day leave expects zero working minutes", () => {
    assert.equal(effectiveExpectedMinutes(480, { dayPart: "full" }), 0);
  });

  test("half-day leave expects half shift", () => {
    assert.equal(effectiveExpectedMinutes(480, { dayPart: "first_half" }), 240);
    assert.equal(effectiveExpectedMinutes(480, { dayPart: "second_half" }), 240);
  });

  test("short leave reduces expected by 25%", () => {
    assert.equal(effectiveExpectedMinutes(480, { dayPart: "short" }), 360);
  });
});

describe("isPartialLeaveDay", () => {
  test("detects half-day parts", () => {
    assert.equal(isPartialLeaveDay({ dayPart: "first_half" }), true);
    assert.equal(isPartialLeaveDay({ dayPart: "full" }), false);
  });
});

describe("detectMissingClockOut", () => {
  test("flags auto-closed sessions", () => {
    assert.equal(
      detectMissingClockOut([{ endedAt: new Date(), stopReason: "day_ended" }]),
      true,
    );
  });

  test("ignores manual clock out", () => {
    assert.equal(
      detectMissingClockOut([{ endedAt: new Date(), stopReason: "clock_out" }]),
      false,
    );
  });
});

describe("resolveAttendanceStatus — simplified rules", () => {
  const leaveHalf = { id: 9, dayPart: "first_half" };

  test("≥5 min active time yields present", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 480,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T05:30:00.000Z"),
      shift,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
  });

  test("late clock-in still yields present (no separate late status)", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 480,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T08:30:00.000Z"),
      shift,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
  });

  test("approved leave with no clock stays on_leave", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: leaveHalf,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 0,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: null,
      shift,
      timezone,
    });
    assert.equal(result.status, "on_leave");
    assert.equal(result.partialLeave, true);
  });

  test("approved leave with clock ≥5 min yields present", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: leaveHalf,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 250,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
  });

  test("full-day leave blocks work status when no clock", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: { id: 1, dayPart: "full" },
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 0,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: null,
      shift,
      timezone,
    });
    assert.equal(result.status, "on_leave");
  });

  test("full-day leave stays on_leave even when employee clocked in before approval", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: { id: 1, dayPart: "full" },
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 480,
      expectedMinutes: 0,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "on_leave");
    assert.equal(result.leaveRequestId, 1);
  });

  test("under minimum active minutes on weekday is absent", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: MIN_ACTIVE_MINUTES_FOR_PRESENT - 1,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift,
      timezone,
    });
    assert.equal(result.status, "absent");
  });

  test("weekend without clock stays weekend", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-14",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 0,
      expectedMinutes: 0,
      threshold: 0,
      firstSessionStart: null,
      shift: null,
      timezone,
    });
    assert.equal(result.status, "weekend");
  });

  test("weekend with ≥5 min clock yields present", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-14",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 11,
      expectedMinutes: 0,
      threshold: 0,
      firstSessionStart: new Date("2026-06-14T17:17:00.000Z"),
      shift: null,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
  });

  test("global WFH with clock ≥5 min yields present", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: true,
      activeMinutes: 60,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
    assert.equal(result.globalWfh, true);
  });
});

describe("computeLateInfo — grace-aware late detection", () => {
  // Shift 09:30, 10-minute grace → allowed latest clock-in 09:40 (Asia/Kolkata).
  const graceShift = { startTime: "09:30", graceMinutesIn: 10 };

  test("clock-in exactly at the grace boundary (09:40) is NOT late", () => {
    // 09:40 IST === 04:10 UTC.
    const info = computeLateInfo({
      firstSessionStart: new Date("2026-06-18T04:10:00.000Z"),
      shift: graceShift,
      timezone: "Asia/Kolkata",
    });
    assert.equal(info.late, false);
    assert.equal(info.lateMinutes, 0);
  });

  test("clock-in one minute past grace (09:41) is late by 1 minute", () => {
    // 09:41 IST === 04:11 UTC.
    const info = computeLateInfo({
      firstSessionStart: new Date("2026-06-18T04:11:00.000Z"),
      shift: graceShift,
      timezone: "Asia/Kolkata",
    });
    assert.equal(info.late, true);
    assert.equal(info.lateMinutes, 1);
  });

  test("early clock-in (09:00) is not late", () => {
    // 09:00 IST === 03:30 UTC.
    const info = computeLateInfo({
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift: graceShift,
      timezone: "Asia/Kolkata",
    });
    assert.equal(info.late, false);
  });

  test("missing shift or clock-in is a safe no-op", () => {
    assert.deepEqual(computeLateInfo({ firstSessionStart: new Date(), shift: null }), {
      late: false,
      lateMinutes: 0,
    });
    assert.deepEqual(
      computeLateInfo({ firstSessionStart: null, shift: graceShift, timezone: "Asia/Kolkata" }),
      { late: false, lateMinutes: 0 },
    );
  });

  test("resolveAttendanceStatus flags a late present day", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 400,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T04:11:00.000Z"), // 09:41 IST
      shift: graceShift,
      timezone: "Asia/Kolkata",
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
    assert.equal(result.late, true);
    assert.equal(result.lateMinutes, 1);
  });

  test("Global WFH mode still flags a late clock-in", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: true,
      activeMinutes: 400,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T04:11:00.000Z"), // 09:41 IST
      shift: graceShift,
      timezone: "Asia/Kolkata",
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
    assert.equal(result.globalWfh, true);
    assert.equal(result.late, true);
    assert.equal(result.lateMinutes, 1);
  });

  test("WFH days never incur a late flag", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: { id: 7 },
      globalWfhMode: false,
      activeMinutes: 400,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T06:00:00.000Z"), // 11:30 IST — very late
      shift: graceShift,
      timezone: "Asia/Kolkata",
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
    assert.equal(result.late, false);
  });
});

describe("applyCorrectionOverlay", () => {
  test("overrides status and minutes from approved correction", () => {
    const base = {
      status: "absent",
      activeMinutes: 0,
      expectedMinutes: 480,
      varianceMinutes: -480,
      threshold: 0,
      compliance: "absent",
    };
    const next = applyCorrectionOverlay(base, {
      id: 5,
      requestedStatus: "present",
      requestedActiveMinutes: 480,
    });
    assert.equal(next.status, "present");
    assert.equal(next.activeMinutes, 480);
    assert.equal(next.corrected, true);
    assert.equal(next.source, "manual_correction");
  });
});

describe("dailyAttendanceToSummary", () => {
  test("maps persisted row to API summary shape", () => {
    const summary = dailyAttendanceToSummary(
      {
        userId: 1,
        date: "2026-06-01",
        timezone: "UTC",
        status: "late",
        compliance: "met",
        expectedMinutes: 480,
        activeMinutes: 500,
        varianceMinutes: 20,
        sessionCount: 1,
        threshold: 0,
        missingClockOut: true,
        source: "engine",
      },
      { userName: "Ada", employeeId: "AD001" },
    );
    assert.equal(summary.userName, "Ada");
    assert.equal(summary.status, "onsite");
    assert.equal(summary.missingClockOut, true);
    assert.equal(summary.persisted, true);
  });
});
