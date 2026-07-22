import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Mirrors backend/src/controllers/finance/loans.controller.js (monthly % rate). */
function calcEmiAmount(principal, monthlyRatePercent, tenureMonths) {
  const p = Number(principal);
  const n = Number(tenureMonths);
  const rate = Number(monthlyRatePercent) || 0;
  if (!(p > 0) || !(n >= 1)) return null;
  if (!(rate > 0)) return Math.round(p / n);
  const r = rate / 100;
  const factor = Math.pow(1 + r, n);
  if (!Number.isFinite(factor) || factor === 1) return Math.round(p / n);
  return Math.round((p * r * factor) / (factor - 1));
}

function monthlyInterestDue(outstanding, monthlyRatePercent) {
  const rate = Number(monthlyRatePercent) || 0;
  if (!(outstanding > 0) || !(rate > 0)) return 0;
  return Math.round(outstanding * (rate / 100));
}

function splitInstallment(outstanding, amount, allocation, monthlyRatePercent) {
  const interestDue = monthlyInterestDue(outstanding, monthlyRatePercent);
  let principalPortion = 0;
  let interestActual = 0;

  if (allocation === "interest") {
    interestActual = Math.min(amount, interestDue);
    principalPortion = amount - interestActual;
    if (principalPortion > outstanding) principalPortion = outstanding;
    interestActual = amount - principalPortion;
  } else if (allocation === "principal") {
    principalPortion = Math.min(amount, outstanding);
    interestActual = amount - principalPortion;
  } else {
    const interestCap = Math.min(amount, interestDue);
    principalPortion = amount - interestCap;
    if (principalPortion > outstanding) principalPortion = outstanding;
    if (principalPortion < 0) principalPortion = 0;
    interestActual = amount - principalPortion;
  }

  return { principalPortion, interestActual };
}

describe("loan interest (monthly % rate)", () => {
  it("computes EMI with 1.5% monthly on 100k for 12 months", () => {
    const emi = calcEmiAmount(100_000, 1.5, 12);
    assert.ok(emi != null && emi > 9000 && emi < 9500);
  });

  it("zero rate splits principal evenly", () => {
    assert.equal(calcEmiAmount(120_000, 0, 12), 10_000);
  });

  it("standard EMI applies 1% monthly interest first", () => {
    const { principalPortion, interestActual } = splitInstallment(100_000, 10_000, "both", 1);
    assert.equal(interestActual, 1_000);
    assert.equal(principalPortion, 9_000);
  });

  it("interest-only caps at monthly due and surplus hits principal", () => {
    const { principalPortion, interestActual } = splitInstallment(100_000, 5_000, "interest", 1);
    assert.equal(interestActual, 1_000);
    assert.equal(principalPortion, 4_000);
  });
});
