import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("recruitment onboarding stage", () => {
  test("is included in recruitment pipeline stages", async () => {
    const { recruitmentStages } = await import("../../src/constants/hrm-workflow.js");
    assert.ok(recruitmentStages.includes("onboarding"));
    assert.deepEqual(
      recruitmentStages.slice(3, 6),
      ["offer", "onboarding", "hired"],
    );
  });
});
