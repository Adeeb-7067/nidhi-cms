import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEntriesWithBalance,
  normalizeLedgerDate,
} from "../../src/modules/finance/services/finance-ledger.service.js";

describe("finance ledger date normalization", () => {
  it("coerces null/invalid dates to epoch instead of throwing", () => {
    assert.equal(normalizeLedgerDate(null).getTime(), 0);
    assert.equal(normalizeLedgerDate(undefined).getTime(), 0);
    assert.equal(normalizeLedgerDate("").getTime(), 0);
    assert.equal(normalizeLedgerDate("not-a-date").getTime(), 0);
    assert.equal(normalizeLedgerDate(new Date("invalid")).getTime(), 0);
  });

  it("preserves valid Date and ISO string values", () => {
    const d = new Date("2026-03-15T12:00:00.000Z");
    assert.equal(normalizeLedgerDate(d).getTime(), d.getTime());
    assert.equal(normalizeLedgerDate("2026-03-15T12:00:00.000Z").getTime(), d.getTime());
  });

  it("sorts mixed null/string/Date entries without throwing", () => {
    const { entries, closingBalance } = buildEntriesWithBalance(
      [
        { date: null, debit: 100, credit: 0, description: "missing date", reference: "A" },
        { date: "2026-02-01T00:00:00.000Z", debit: 0, credit: 40, description: "string date", reference: "B" },
        { date: new Date("2026-01-01T00:00:00.000Z"), debit: 50, credit: 0, description: "real date", reference: "C" },
      ],
      0,
    );
    assert.equal(entries.length, 3);
    assert.equal(entries[0].reference, "A");
    assert.equal(entries[1].reference, "C");
    assert.equal(entries[2].reference, "B");
    assert.equal(entries[0].date.getTime(), 0);
    assert.equal(closingBalance, 110);
  });
});
