import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { monthBounds } from "../../src/services/hrm/employees.service.js";

describe("monthBounds", () => {
  test("returns first and last day of month", () => {
    assert.deepEqual(monthBounds(2026, 6), {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });

  test("handles February in a leap year", () => {
    assert.deepEqual(monthBounds(2024, 2), {
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });
});
