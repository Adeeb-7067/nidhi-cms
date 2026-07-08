import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeSessionDurations } from "../../src/services/work-sessions.service.js";
import { computeShiftEndUtc } from "../../src/services/shift-end-clockout.service.js";

const TZ = "Asia/Kolkata";
const SHIFT = { startTime: "09:30", endTime: "18:00" };

describe("computeSessionDurations", () => {
  test("excludes shift-end pause when session resumes for overtime", () => {
    const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
    const overtimeStart = new Date("2026-07-03T13:30:00.000Z"); // 19:00 IST
    const clockOut = new Date("2026-07-03T16:00:00.000Z"); // 21:30 IST

    const session = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"), // 10:00 IST
      endedAt: clockOut,
      isActive: false,
      pausePeriods: [
        {
          pausedAt: shiftEnd.toISOString(),
          resumedAt: overtimeStart.toISOString(),
          stopReason: "shift_ended",
        },
      ],
    };

    const { activeDurationMs, pauseDurationMs } = computeSessionDurations(session);
    const morningMs = shiftEnd.getTime() - session.startedAt.getTime();
    const overtimeMs = clockOut.getTime() - overtimeStart.getTime();
    const gapMs = overtimeStart.getTime() - shiftEnd.getTime();

    assert.equal(pauseDurationMs, gapMs);
    assert.equal(activeDurationMs, morningMs + overtimeMs);
  });

  test("active session uses wall clock minus completed pauses", () => {
    const startedAt = new Date("2026-07-03T04:30:00.000Z");
    const pauseStart = new Date("2026-07-03T11:00:00.000Z");
    const pauseEnd = new Date("2026-07-03T11:30:00.000Z");
    const now = new Date("2026-07-03T12:00:00.000Z");

    const session = {
      startedAt,
      isActive: true,
      pausePeriods: [{ pausedAt: pauseStart.toISOString(), resumedAt: pauseEnd.toISOString() }],
    };

    const realNow = Date.now;
    Date.now = () => now.getTime();
    try {
      const { activeDurationMs, pauseDurationMs } = computeSessionDurations(session);
      assert.equal(pauseDurationMs, 30 * 60 * 1000);
      assert.equal(activeDurationMs, now.getTime() - startedAt.getTime() - pauseDurationMs);
    } finally {
      Date.now = realNow;
    }
  });
});
