import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeShiftEndUtc,
  shouldAutoClockOutAtShiftEnd,
} from "../../src/services/shift-end-clockout.service.js";
import {
  isPausedSessionResumableToday,
  resolveActiveSegmentStart,
} from "../../src/services/work-session-policy.js";

const TZ = "Asia/Kolkata";
const SHIFT = { startTime: "09:30", endTime: "18:00" };

describe("computeShiftEndUtc", () => {
  test("returns local shift end as UTC instant", () => {
    const end = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    assert.ok(end);
    // 18:00 IST = 12:30 UTC
    assert.equal(end.toISOString(), "2026-07-03T12:30:00.000Z");
  });

  test("overnight shift ends on the next calendar day", () => {
    const night = { startTime: "22:00", endTime: "06:00" };
    const end = computeShiftEndUtc("2026-07-03", night, TZ);
    assert.ok(end);
    // 06:00 IST on 2026-07-04 = 00:30 UTC
    assert.equal(end.toISOString(), "2026-07-04T00:30:00.000Z");
  });
});

describe("shouldAutoClockOutAtShiftEnd", () => {
  test("closes session that started during shift after shift end", () => {
    const session = { startedAt: new Date("2026-07-03T04:30:00.000Z") }; // 10:00 IST
    const now = new Date("2026-07-03T13:00:00.000Z"); // 18:30 IST
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), true);
  });

  test("does not close overtime session started after shift end", () => {
    const session = { startedAt: new Date("2026-07-03T13:30:00.000Z") }; // 19:00 IST
    const now = new Date("2026-07-03T15:00:00.000Z"); // 20:30 IST
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), false);
  });

  test("does not close before shift end", () => {
    const session = { startedAt: new Date("2026-07-03T04:30:00.000Z") };
    const now = new Date("2026-07-03T11:00:00.000Z"); // 16:30 IST
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), false);
  });

  test("does not close same-day session resumed after shift end (overtime)", () => {
    const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"), // 10:00 IST
      pausePeriods: [
        {
          pausedAt: shiftEnd.toISOString(),
          resumedAt: new Date("2026-07-03T13:30:00.000Z").toISOString(), // 19:00 IST
          stopReason: "shift_ended",
        },
      ],
    };
    const now = new Date("2026-07-03T15:00:00.000Z"); // 20:30 IST
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), false);
  });

  test("does not close session resumed after shift end following a manual break", () => {
    const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      pausePeriods: [
        {
          pausedAt: new Date("2026-07-03T11:00:00.000Z").toISOString(),
          resumedAt: new Date("2026-07-03T13:30:00.000Z").toISOString(), // after shift end
          stopReason: "clock_out",
        },
      ],
    };
    const now = new Date("2026-07-03T15:00:00.000Z");
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), false);
    assert.equal(
      resolveActiveSegmentStart(session, shiftEnd).toISOString(),
      "2026-07-03T13:30:00.000Z",
    );
  });

  test("uses explicit segmentStartedAt for overtime (preferred over startedAt)", () => {
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
    };
    const now = new Date("2026-07-03T15:00:00.000Z");
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), false);
  });

  test("regression: overtime segment survives repeated policy checks (heartbeat simulation)", () => {
    const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    const overtimeStart = new Date("2026-07-03T13:30:00.000Z"); // 19:00 IST
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: overtimeStart,
      isActive: true,
      pausePeriods: [
        {
          pausedAt: shiftEnd.toISOString(),
          resumedAt: overtimeStart.toISOString(),
          stopReason: "shift_ended",
        },
      ],
    };

    const checks = [
      new Date("2026-07-03T14:00:00.000Z"), // 19:30 IST
      new Date("2026-07-03T16:00:00.000Z"), // 21:30 IST
      new Date("2026-07-03T18:00:00.000Z"), // 23:30 IST
    ];

    for (const now of checks) {
      assert.equal(
        shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ),
        false,
        `should stay open at ${now.toISOString()}`,
      );
    }
  });

  test("regression: legacy rows without segmentStartedAt infer overtime from pause periods", () => {
    const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      pausePeriods: [
        {
          pausedAt: shiftEnd.toISOString(),
          resumedAt: new Date("2026-07-03T13:30:00.000Z").toISOString(),
          stopReason: "shift_ended",
        },
      ],
    };
    const now = new Date("2026-07-03T16:00:00.000Z");
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), false);
    assert.equal(
      resolveActiveSegmentStart(session, shiftEnd).toISOString(),
      "2026-07-03T13:30:00.000Z",
    );
  });

  test("regression: pre-fix bug would have re-closed resumed session (startedAt-only check)", () => {
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"), // during shift — old logic used only this
    };
    const now = new Date("2026-07-03T15:00:00.000Z"); // after shift end
    const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    const legacyWouldClose =
      session.startedAt.getTime() < shiftEnd.getTime() && now.getTime() > shiftEnd.getTime();
    assert.equal(legacyWouldClose, true, "sanity: old startedAt-only logic would wrongly close");
    assert.equal(shouldAutoClockOutAtShiftEnd(session, now, SHIFT, TZ), true);

    const resumed = {
      ...session,
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
    };
    assert.equal(shouldAutoClockOutAtShiftEnd(resumed, now, SHIFT, TZ), false);
  });
});

describe("isPausedSessionResumableToday", () => {
  test("same-day shift_ended session resumes later that day", () => {
    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      endedAt: new Date("2026-07-03T12:30:00.000Z"),
      stopReason: "shift_ended",
    };
    const now = new Date("2026-07-03T15:00:00.000Z");
    assert.equal(isPausedSessionResumableToday(session, now, TZ), true);
  });

  test("overnight shift_ended session resumes on the morning end day", () => {
    const session = {
      startedAt: new Date("2026-07-03T16:30:00.000Z"),
      endedAt: new Date("2026-07-04T00:30:00.000Z"),
      stopReason: "shift_ended",
    };
    const now = new Date("2026-07-04T02:00:00.000Z");
    assert.equal(isPausedSessionResumableToday(session, now, TZ), true);
  });

  test("yesterday session does not resume today", () => {
    const session = {
      startedAt: new Date("2026-07-02T04:30:00.000Z"),
      endedAt: new Date("2026-07-02T12:30:00.000Z"),
      stopReason: "shift_ended",
    };
    const now = new Date("2026-07-03T15:00:00.000Z");
    assert.equal(isPausedSessionResumableToday(session, now, TZ), false);
  });

  test("day_ended overnight session resumes on the morning it ended", () => {
    const session = {
      startedAt: new Date("2026-07-03T16:30:00.000Z"),
      endedAt: new Date("2026-07-03T18:30:00.000Z"),
      stopReason: "day_ended",
    };
    const now = new Date("2026-07-04T02:00:00.000Z");
    assert.equal(isPausedSessionResumableToday(session, now, TZ), true);
  });
});
