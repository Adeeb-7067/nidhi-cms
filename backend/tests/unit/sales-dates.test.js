import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseCalendarDateOnly, parseSalesDocumentDate } from "../../src/utils/sales-dates.js";

describe("parseCalendarDateOnly", () => {
  test("parses YYYY-MM-DD as UTC noon on that calendar day", () => {
    const d = parseCalendarDateOnly("2026-07-10");
    assert.ok(d);
    assert.equal(d.getUTCFullYear(), 2026);
    assert.equal(d.getUTCMonth(), 6);
    assert.equal(d.getUTCDate(), 10);
    assert.equal(d.getUTCHours(), 12);
  });

  test("returns null for invalid date-only strings", () => {
    assert.equal(parseCalendarDateOnly("2026-13-01"), null);
    assert.equal(parseCalendarDateOnly("2026-02-31"), null);
    assert.equal(parseCalendarDateOnly("not-a-date"), null);
  });
});

describe("parseSalesDocumentDate", () => {
  test("defaults to now when value omitted", () => {
    const before = Date.now();
    const parsed = parseSalesDocumentDate(undefined, "paymentDate");
    const after = Date.now();
    assert.ok(parsed.getTime() >= before && parsed.getTime() <= after);
  });

  test("returns null when omitted and defaultNow is false", () => {
    assert.equal(parseSalesDocumentDate("", "issueDate", { defaultNow: false }), null);
    assert.equal(parseSalesDocumentDate(null, "issueDate", { defaultNow: false }), null);
  });

  test("uses calendar parsing for date-only API values", () => {
    const parsed = parseSalesDocumentDate("2026-07-10", "paymentDate");
    assert.equal(parsed.getUTCFullYear(), 2026);
    assert.equal(parsed.getUTCMonth(), 6);
    assert.equal(parsed.getUTCDate(), 10);
  });
});
