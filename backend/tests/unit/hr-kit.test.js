import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listHrKits,
  createHrKit,
  updateHrKit,
  deleteHrKit,
} from "../../src/services/hrm/hr-kit.service.js";

describe("HR Kit Service", () => {
  it("validates title requirement on creation", async () => {
    await assert.rejects(
      async () => {
        await createHrKit({ title: "   " });
      },
      {
        message: "HR Kit item title is required.",
      },
    );
  });
});
