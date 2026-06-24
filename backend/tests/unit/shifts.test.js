import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeExpectedMinutes,
  formatExpectedHours,
  DEFAULT_OFFICE_SHIFT,
} from "../../src/services/hrm/shifts.service.js";

describe("computeExpectedMinutes", () => {
  test("9:30–18:00 with 30 min break equals 8 hours", () => {
    const mins = computeExpectedMinutes(DEFAULT_OFFICE_SHIFT);
    assert.equal(mins, 480);
    assert.equal(formatExpectedHours(DEFAULT_OFFICE_SHIFT), "8h");
  });

  test("returns 0 when template is missing", () => {
    assert.equal(computeExpectedMinutes(null), 0);
  });

  test("subtracts break from gross shift duration", () => {
    const mins = computeExpectedMinutes({
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 60,
    });
    assert.equal(mins, 420);
    assert.equal(formatExpectedHours({ startTime: "09:00", endTime: "17:00", breakMinutes: 60 }), "7h");
  });

  test("9:30–18:00 with 60 min break equals 7.5 hours (legacy schema default)", () => {
    const mins = computeExpectedMinutes({
      startTime: "09:30",
      endTime: "18:00",
      breakMinutes: 60,
    });
    assert.equal(mins, 450);
    assert.equal(formatExpectedHours({ startTime: "09:30", endTime: "18:00", breakMinutes: 60 }), "7.5h");
  });
});
