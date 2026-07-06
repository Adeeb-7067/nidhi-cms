import { projectsTable } from "../models/schema/index.js";

export async function loadProjectNameMap(projectIds) {
  const ids = [...new Set(projectIds.filter((id) => id != null))];
  if (!ids.length) return new Map();
  const rows = await projectsTable.find({ id: { $in: ids } }).select({ id: 1, name: 1 }).lean();
  return new Map(rows.map((p) => [p.id, p.name]));
}

/** Resolve the installment tied to a payment (payment row or parent invoice). */
export function resolvePaymentInstallment(payment, invoice, installmentMap) {
  if (payment?.installmentId != null) {
    const row = installmentMap.get(Number(payment.installmentId));
    if (row) return row;
  }
  if (invoice?.installmentId != null) {
    return installmentMap.get(Number(invoice.installmentId)) ?? null;
  }
  return null;
}

/** Prefer milestone/proposal project over a stale invoice.projectId. */
export function resolveSalesProjectId({ invoice, installment, proposal }) {
  return (
    installment?.projectId ??
    proposal?.projectId ??
    invoice?.projectId ??
    null
  );
}

export function collectInstallmentIdsFromPayments(payments, invoices) {
  return [
    ...new Set([
      ...payments.map((p) => p.installmentId).filter(Boolean),
      ...invoices.map((i) => i.installmentId).filter(Boolean),
    ]),
  ];
}

export function collectProposalIdsFromRecords(invoices, installments) {
  return [
    ...new Set([
      ...invoices.map((i) => i.proposalId).filter(Boolean),
      ...installments.map((i) => i.proposalId).filter(Boolean),
    ]),
  ];
}
