import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_PAUSE_STOP_REASONS,
  OVERTIME_HEARTBEAT_STALE_MINUTES,
  resolveOvertimeIdleEndedAt,
  resolveOvertimeIdleReferenceAt,
  shouldPauseOvertimeForStaleHeartbeat,
} from "../../src/modules/monitoring/services/work-sessions.service.js";
import { shouldNotifySessionEnd, getSessionEndCopy } from "../../src/modules/monitoring/services/work-session-notifications.js";
import { isPausedSessionResumableToday } from "../../src/modules/monitoring/services/work-session-policy.js";
import {
  computeShiftEndUtc,
  isOvertimeActiveSegment,
  isSubjectToOvertimeIdlePause,
} from "../../src/modules/monitoring/services/shift-end-clockout.service.js";

const TZ = "Asia/Kolkata";
const SHIFT = { startTime: "09:30", endTime: "18:00" };

describe("work session auto-pause policy", () => {
  test("auto pause includes shift end, sleep, shutdown, app close, and overtime idle", () => {
    assert.deepEqual([...AUTO_PAUSE_STOP_REASONS].sort(), [
      "app_quit",
      "overtime_idle",
      "shift_ended",
      "system_shutdown",
      "system_sleep",
    ].sort());
    assert.ok(!AUTO_PAUSE_STOP_REASONS.includes("network_lost"));
    assert.ok(!AUTO_PAUSE_STOP_REASONS.includes("client_disconnected"));
    assert.ok(!AUTO_PAUSE_STOP_REASONS.includes("clock_out"));
  });

  test("overtime heartbeat stale window is within 5–10 minutes", () => {
    assert.ok(OVERTIME_HEARTBEAT_STALE_MINUTES >= 5);
    assert.ok(OVERTIME_HEARTBEAT_STALE_MINUTES <= 10);
  });

  test("auto pauses notify with an explicit reason", () => {
    for (const reason of AUTO_PAUSE_STOP_REASONS) {
      assert.equal(shouldNotifySessionEnd(reason), true, reason);
      const copy = getSessionEndCopy(reason);
      assert.ok(copy?.title, reason);
      assert.ok(copy?.body, reason);
    }
    assert.equal(shouldNotifySessionEnd("clock_out"), false);
  });

  test("one day → one session: same-day pause resumes; previous day does not", () => {
    const tz = "Asia/Kolkata";
    const today = new Date("2026-07-22T10:00:00.000Z");
    const sameDay = {
      startedAt: new Date("2026-07-22T04:00:00.000Z"),
      stopReason: "shift_ended",
    };
    const yesterday = {
      startedAt: new Date("2026-07-21T04:00:00.000Z"),
      stopReason: "day_ended",
    };
    assert.equal(isPausedSessionResumableToday(sameDay, today, tz), true);
    assert.equal(isPausedSessionResumableToday(yesterday, today, tz), false);
  });
});

describe("overtime stale-activity pause", () => {
  const shiftEnd = computeShiftEndUtc("2026-07-03", SHIFT, TZ);
  const cutoff = new Date("2026-07-03T14:00:00.000Z"); // 19:30 IST
  const now = new Date("2026-07-03T14:10:00.000Z"); // 19:40 IST

  test("detects overtime segment started after shift end", () => {
    const overtime = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"), // 19:00 IST
      isActive: true,
    };
    const midShift = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T04:30:00.000Z"),
      isActive: true,
    };
    assert.equal(isOvertimeActiveSegment(overtime, SHIFT, TZ), true);
    assert.equal(isOvertimeActiveSegment(midShift, SHIFT, TZ), false);
    assert.ok(shiftEnd);
  });

  test("no shift template is still subject to overtime idle pause", () => {
    const session = {
      startedAt: new Date("2026-07-03T13:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
      isActive: true,
    };
    assert.equal(isSubjectToOvertimeIdlePause(session, null, TZ), true);
    assert.equal(isSubjectToOvertimeIdlePause(session, {}, TZ), true);
  });

  test("pauses overtime session when activity is older than cutoff", () => {
    const session = {
      isActive: true,
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
      lastHeartbeatAt: new Date("2026-07-03T14:05:00.000Z"), // fresh heartbeat
      lastUserActivityAt: new Date("2026-07-03T13:50:00.000Z"), // stale activity
    };
    assert.equal(
      shouldPauseOvertimeForStaleHeartbeat(session, { cutoff, shift: SHIFT, tz: TZ, now }),
      true,
    );
  });

  test("prefers user activity over heartbeat for idle reference", () => {
    const session = {
      lastHeartbeatAt: new Date("2026-07-03T14:05:00.000Z"),
      lastUserActivityAt: new Date("2026-07-03T13:50:00.000Z"),
    };
    assert.equal(
      resolveOvertimeIdleReferenceAt(session).toISOString(),
      "2026-07-03T13:50:00.000Z",
    );
  });

  test("endedAt uses last activity — idle gap until job runs is not credited", () => {
    const session = {
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
      lastUserActivityAt: new Date("2026-07-03T13:50:00.000Z"),
      lastHeartbeatAt: new Date("2026-07-03T14:05:00.000Z"),
    };
    const endedAt = resolveOvertimeIdleEndedAt(session, now);
    assert.equal(endedAt.toISOString(), "2026-07-03T13:50:00.000Z");
  });

  test("does not pause overtime session with fresh user activity", () => {
    const session = {
      isActive: true,
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
      lastUserActivityAt: new Date("2026-07-03T14:05:00.000Z"),
    };
    assert.equal(
      shouldPauseOvertimeForStaleHeartbeat(session, { cutoff, shift: SHIFT, tz: TZ, now }),
      false,
    );
  });

  test("never pauses mid-shift session even with very stale activity", () => {
    const session = {
      isActive: true,
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T04:30:00.000Z"),
      lastUserActivityAt: new Date("2026-07-03T05:00:00.000Z"),
    };
    const midShiftNow = new Date("2026-07-03T11:00:00.000Z"); // 16:30 IST
    const midCutoff = new Date("2026-07-03T10:50:00.000Z");
    assert.equal(
      shouldPauseOvertimeForStaleHeartbeat(session, {
        cutoff: midCutoff,
        shift: SHIFT,
        tz: TZ,
        now: midShiftNow,
      }),
      false,
    );
  });

  test("pauses no-shift session when activity is stale", () => {
    const session = {
      isActive: true,
      startedAt: new Date("2026-07-03T13:30:00.000Z"),
      segmentStartedAt: new Date("2026-07-03T13:30:00.000Z"),
      lastUserActivityAt: new Date("2026-07-03T13:50:00.000Z"),
    };
    assert.equal(
      shouldPauseOvertimeForStaleHeartbeat(session, {
        cutoff,
        shift: null,
        tz: TZ,
        now,
      }),
      true,
    );
  });

  test("same-day overtime_idle pause remains resumable", () => {
    const paused = {
      startedAt: new Date("2026-07-03T04:30:00.000Z"),
      stopReason: "overtime_idle",
      endedAt: new Date("2026-07-03T13:50:00.000Z"),
    };
    assert.equal(isPausedSessionResumableToday(paused, now, TZ), true);
  });
});
