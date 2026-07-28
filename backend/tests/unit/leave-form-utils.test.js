import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { workDayKeyForDate } from "../../src/modules/hrm/services/hrm-date-utils.js";

describe("leave past-date guard", () => {
  test("start date before today is rejected by comparison", () => {
    const todayKey = workDayKeyForDate(new Date("2026-06-22T12:00:00Z"), "UTC");
    const startDate = "2026-06-21";
    assert.ok(startDate < todayKey);
  });

  test("today is allowed", () => {
    const todayKey = workDayKeyForDate(new Date("2026-06-22T12:00:00Z"), "UTC");
    const startDate = "2026-06-22";
    assert.ok(!(startDate < todayKey));
  });

  test("future start is allowed", () => {
    const todayKey = workDayKeyForDate(new Date("2026-06-22T12:00:00Z"), "UTC");
    const startDate = "2026-06-25";
    assert.ok(!(startDate < todayKey));
  });
});
