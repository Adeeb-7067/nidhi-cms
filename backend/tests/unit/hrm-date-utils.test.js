import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseDateKey, normalizeDateKey } from "../../src/services/hrm/hrm-date-utils.js";

describe("normalizeDateKey", () => {
  test("accepts ISO date strings", () => {
    assert.equal(normalizeDateKey("2026-06-19"), "2026-06-19");
    assert.equal(normalizeDateKey("2026-06-19T10:00:00Z"), "2026-06-19");
  });

  test("rejects invalid dates", () => {
    assert.equal(normalizeDateKey(""), null);
    assert.equal(normalizeDateKey("06-19-2026"), null);
    assert.equal(normalizeDateKey(null), null);
  });
});

describe("parseDateKey", () => {
  test("requires YYYY-MM-DD format", () => {
    assert.equal(parseDateKey("2026-01-31"), "2026-01-31");
    assert.equal(parseDateKey("2026-1-31"), null);
  });
});
