import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveInstallmentStatus,
  deriveInvoiceStatus,
} from "../../src/services/sales/payment-ledger.service.js";

describe("payment-ledger.service", () => {
  it("deriveInstallmentStatus marks partial when below due", () => {
    assert.equal(deriveInstallmentStatus({ dueAmount: 100_000 }, 5_000), "partial");
    assert.equal(deriveInstallmentStatus({ dueAmount: 100_000 }, 100_000), "paid");
    assert.equal(deriveInstallmentStatus({ dueAmount: 100_000 }, 0), "pending");
  });

  it("deriveInvoiceStatus marks paid when amount collected", () => {
    assert.equal(deriveInvoiceStatus({ amount: 5_000 }, 5_000), "paid");
    assert.equal(deriveInvoiceStatus({ amount: 5_000 }, 2_000), "partial");
  });
});
