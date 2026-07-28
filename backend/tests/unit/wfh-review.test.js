import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canUserReviewLeaveRequest } from "../../src/modules/hrm/services/leave-approval.js";

describe("WFH review authorization (shared leave rules)", () => {
  test("assigned reporting manager may approve WFH", () => {
    assert.equal(
      canUserReviewLeaveRequest(
        { id: 10, role: "manager" },
        { id: 20, reportingManagerId: 10 },
      ),
      true,
    );
  });

  test("unrelated manager cannot approve WFH", () => {
    assert.equal(
      canUserReviewLeaveRequest(
        { id: 11, role: "manager" },
        { id: 20, reportingManagerId: 10 },
      ),
      false,
    );
  });
});
