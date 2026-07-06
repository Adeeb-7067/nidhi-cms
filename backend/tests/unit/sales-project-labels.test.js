import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePaymentInstallment,
  resolveSalesProjectId,
  collectInstallmentIdsFromPayments,
} from "../../src/utils/sales-project-labels.js";

test("resolvePaymentInstallment falls back to invoice installment", () => {
  const map = new Map([[42, { id: 42, name: "Milestone 1", projectId: 7 }]]);
  const installment = resolvePaymentInstallment(
    { installmentId: null },
    { installmentId: 42 },
    map,
  );
  assert.equal(installment?.projectId, 7);
});

test("resolvePaymentInstallment prefers payment installment when present", () => {
  const map = new Map([
    [1, { id: 1, projectId: 10 }],
    [2, { id: 2, projectId: 20 }],
  ]);
  const installment = resolvePaymentInstallment(
    { installmentId: 2 },
    { installmentId: 1 },
    map,
  );
  assert.equal(installment?.projectId, 20);
});

test("resolveSalesProjectId prefers installment and proposal over invoice", () => {
  assert.equal(
    resolveSalesProjectId({
      invoice: { projectId: 99 },
      installment: { projectId: 7 },
      proposal: { projectId: 3 },
    }),
    7,
  );
  assert.equal(
    resolveSalesProjectId({
      invoice: { projectId: 99 },
      installment: null,
      proposal: { projectId: 3 },
    }),
    3,
  );
  assert.equal(
    resolveSalesProjectId({
      invoice: { projectId: 99 },
      installment: null,
      proposal: null,
    }),
    99,
  );
});

test("collectInstallmentIdsFromPayments merges payment and invoice links", () => {
  const ids = collectInstallmentIdsFromPayments(
    [{ installmentId: 5 }],
    [{ installmentId: 8 }],
  );
  assert.deepEqual(ids.sort((a, b) => a - b), [5, 8]);
});
