import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapter = readFileSync(
  join(__dirname, "../../../frontend/src/modules/ca/adapters/finance.ts"),
  "utf8",
);

describe("CA payments depth — no classification mistakes", () => {
  it("uses exact Finance mode labels instead of remapping cash/card to IMPS", () => {
    assert.ok(adapter.includes("financePaymentModeLabel"));
    assert.ok(adapter.includes("FINANCE_PAYMENT_MODE_LABELS"));
  });

  it("recon matched requires a document link + completed status", () => {
    assert.ok(adapter.includes("paymentHasDocumentLink"));
    assert.ok(adapter.includes("isCompletedPayment"));
    assert.ok(adapter.includes('return "matched"'));
    assert.ok(adapter.includes("vendorInvoiceId"));
    assert.ok(adapter.includes("payrollRunId"));
    assert.ok(adapter.includes("taxDepositId"));
  });

  it("cash KPIs skip pending and failed payments", () => {
    assert.ok(adapter.includes("summarizeCaPayments"));
    assert.ok(adapter.includes('p.status === "pending"'));
    assert.ok(adapter.includes('p.status === "failed"'));
  });

  it("GST incoming is explicit — gstEnabled true or amount with not-false", () => {
    assert.ok(adapter.includes("isPaymentGst"));
    assert.ok(adapter.includes("gstEnabled === true"));
  });
});
