import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shouldClockOutForApprovedLeave } from "../../src/services/hrm/leave-attendance-sync.js";

describe("shouldClockOutForApprovedLeave", () => {
  test("returns true for approved full-day leave covering today", () => {
    assert.equal(
      shouldClockOutForApprovedLeave(
        { status: "approved", dayPart: "full", startDate: "2026-07-04", endDate: "2026-07-04" },
        "2026-07-04",
      ),
      true,
    );
  });

  test("returns false for rejected leave", () => {
    assert.equal(
      shouldClockOutForApprovedLeave(
        { status: "rejected", dayPart: "full", startDate: "2026-07-04", endDate: "2026-07-04" },
        "2026-07-04",
      ),
      false,
    );
  });

  test("returns false for half-day leave", () => {
    assert.equal(
      shouldClockOutForApprovedLeave(
        { status: "approved", dayPart: "first_half", startDate: "2026-07-04", endDate: "2026-07-04" },
        "2026-07-04",
      ),
      false,
    );
  });

  test("returns false when today is outside leave range", () => {
    assert.equal(
      shouldClockOutForApprovedLeave(
        { status: "approved", dayPart: "full", startDate: "2026-07-05", endDate: "2026-07-10" },
        "2026-07-04",
      ),
      false,
    );
  });

  test("returns true when today is within a multi-day leave range", () => {
    assert.equal(
      shouldClockOutForApprovedLeave(
        { status: "approved", dayPart: "full", startDate: "2026-07-01", endDate: "2026-07-07" },
        "2026-07-04",
      ),
      true,
    );
  });
});
