import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_PAUSE_STOP_REASONS,
  closeStaleHeartbeatSessions,
} from "../../src/services/work-sessions.service.js";
import { shouldNotifySessionEnd, getSessionEndCopy } from "../../src/services/work-session-notifications.js";
import { isPausedSessionResumableToday } from "../../src/services/work-session-policy.js";

describe("work session auto-pause policy", () => {
  test("auto pause is limited to shift end, sleep, shutdown, and app close", () => {
    assert.deepEqual([...AUTO_PAUSE_STOP_REASONS].sort(), [
      "app_quit",
      "shift_ended",
      "system_shutdown",
      "system_sleep",
    ].sort());
    assert.ok(!AUTO_PAUSE_STOP_REASONS.includes("client_disconnected"));
    assert.ok(!AUTO_PAUSE_STOP_REASONS.includes("network_lost"));
    assert.ok(!AUTO_PAUSE_STOP_REASONS.includes("clock_out"));
  });

  test("stale heartbeat cleanup is disabled (no silent disconnect closes)", async () => {
    const result = await closeStaleHeartbeatSessions(new Date(0));
    assert.equal(result.closed, 0);
    assert.equal(result.disabled, true);
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
