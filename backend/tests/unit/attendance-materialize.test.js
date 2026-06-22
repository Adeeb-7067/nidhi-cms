import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveExpectedMinutes,
  isPartialLeaveDay,
  detectMissingClockOut,
  resolveAttendanceStatus,
  applyCorrectionOverlay,
  dailyAttendanceToSummary,
  MIN_ACTIVE_MINUTES_FOR_PRESENT,
} from "../../src/services/hrm/attendance-engine.js";

const weekendDays = [0, 6];
const shift = { startTime: "09:00", graceMinutesIn: 15 };
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

describe("resolveAttendanceStatus — half-day overlay", () => {
  const leaveHalf = { id: 9, dayPart: "first_half" };

  test("half-day leave with work logged yields half_day/combined record", () => {
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
    assert.equal(result.partialLeave, true);
    assert.equal(result.leaveDayPart, "first_half");
    assert.equal(result.status, "half_day");
    assert.equal(result.compliance, "met");
  });

  test("on-time office work yields present", () => {
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
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
  });

  test("late office work yields onsite", () => {
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
    assert.equal(result.status, "onsite");
  });

  test("half-day leave with no work stays on_leave", () => {
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

  test("full-day leave blocks work status", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: { id: 1, dayPart: "full" },
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 400,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: null,
      shift,
      timezone,
    });
    assert.equal(result.status, "on_leave");
  });

  test("weekday with clock time but no shift uses expected minutes (not weekend)", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
      weekendDays,
      holiday: null,
      leave: null,
      wfh: null,
      globalWfhMode: false,
      activeMinutes: 30,
      expectedMinutes: 480,
      threshold: 0,
      firstSessionStart: new Date("2026-06-18T03:30:00.000Z"),
      shift: null,
      timezone,
      missingClockOut: false,
    });
    assert.equal(result.status, "present");
    assert.equal(result.compliance, "short");
  });

  test("under minimum active minutes stays absent", () => {
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

  test("no expected minutes on weekday without work is absent", () => {
    const result = resolveAttendanceStatus({
      date: "2026-06-18",
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
    assert.equal(result.status, "absent");
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
