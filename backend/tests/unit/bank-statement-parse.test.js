import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseBankStatementCsv,
  scorePaymentMatch,
  pickBestPaymentMatch,
} from "../../src/modules/ca/services/bank-statement-parse.js";

describe("bank statement CSV parse + match", () => {
  it("parses withdrawal/deposit Indian-style CSV", () => {
    const csv = [
      "Date,Narration,Chq/Ref No,Withdrawal Amt,Deposit Amt,Closing Balance",
      "15/07/2026,NEFT CR ACME CLIENT,UTR123,0,118000,500000",
      "16/07/2026,NEFT DR AWS,UTR456,24500,0,475500",
    ].join("\n");
    const { rows, errors } = parseBankStatementCsv(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].direction, "incoming");
    assert.equal(rows[0].amount, 118000);
    assert.equal(rows[0].reference, "UTR123");
    assert.equal(rows[1].direction, "outgoing");
    assert.equal(rows[1].amount, 24500);
  });

  it("parses amount + CR/DR style CSV", () => {
    const csv = [
      "Date,Description,Reference,Amount,Type",
      "2026-07-10,UPI/client,UPI987,5000,CR",
      "2026-07-11,Card swipe,CARD1,900,DR",
    ].join("\n");
    const { rows, errors } = parseBankStatementCsv(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows[0].direction, "incoming");
    assert.equal(rows[1].direction, "outgoing");
  });

  it("scores exact UTR + amount matches highest", () => {
    const line = {
      date: new Date("2026-07-15"),
      amount: 1000,
      direction: "incoming",
      reference: "UTR999",
    };
    const good = {
      id: 1,
      amount: 1000,
      direction: "incoming",
      reference: "UTR999",
      date: "2026-07-15",
    };
    const weak = {
      id: 2,
      amount: 1000,
      direction: "incoming",
      reference: "OTHER",
      date: "2026-07-01",
    };
    assert.ok(scorePaymentMatch(line, good) > scorePaymentMatch(line, weak));
    const pick = pickBestPaymentMatch(line, [weak, good], { minScore: 60 });
    assert.equal(pick?.payment.id, 1);
  });

  it("rejects wrong direction even if amount matches", () => {
    const score = scorePaymentMatch(
      { date: new Date(), amount: 100, direction: "incoming", reference: "" },
      { id: 1, amount: 100, direction: "outgoing", reference: "", date: new Date().toISOString() },
    );
    assert.equal(score, -1);
  });
});
