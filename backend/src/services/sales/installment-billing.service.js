import {
  SalesInvoices,
  SalesInstallments,
  SalesProposals,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound } from "../../utils/route-errors.js";

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`inv_num_${year}`);
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function loadProposalForInstallment(installment) {
  if (!installment?.proposalId) return null;
  return SalesProposals.findOne({ id: installment.proposalId }).lean();
}

export function resolveInstallmentInvoiceDueDate(installment, dueDateOverride) {
  const dueDate = dueDateOverride ? new Date(dueDateOverride) : new Date(installment.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    badRequest("dueDate is invalid.", "dueDate");
  }
  return dueDate;
}

export function buildInvoicePayloadFromInstallment(installment, proposal, dueDate) {
  let title = installment.name;
  if (proposal?.title) title = `${proposal.title} — ${installment.name}`;

  const amount = installment.dueAmount;
  const calculatedAmount = installment.calculatedAmount ?? installment.dueAmount;
  const proposalId = installment.proposalId ?? null;

  return {
    title,
    customerId: installment.customerId,
    projectId: installment.projectId ?? null,
    installmentId: installment.id,
    proposalId,
    lineItems: [
      {
        itemId: `inst-${installment.id}`,
        name: installment.name,
        description: proposal ? `From proposal ${proposal.number}` : "",
        quantity: 1,
        unitPrice: amount,
        taxPercent: 0,
      },
    ],
    notes: proposal?.clientNote?.trim() || null,
    terms: proposal?.terms?.trim() || null,
    amount,
    calculatedAmount: Math.round(calculatedAmount),
    totalAdjustment: installment.totalAdjustment ?? 0,
    adjustedTotal: installment.adjustedTotal ?? null,
    paidAmount: 0,
    status: "unpaid",
    dueDate,
  };
}

/**
 * Return linked invoice or create one inside an existing transaction.
 * @returns {{ invoice: object, created: boolean }}
 */
export async function ensureInvoiceForInstallment(installmentId, session, options = {}) {
  const installment = await SalesInstallments.findOne({ id: installmentId }).session(session).lean();
  if (!installment) notFound("Installment");
  if (installment.dueAmount <= 0) {
    badRequest("Installment amount must be greater than zero.", "dueAmount");
  }

  if (installment.invoiceId) {
    const invoice = await SalesInvoices.findOne({ id: installment.invoiceId }).session(session).lean();
    if (!invoice) badRequest("Linked invoice is missing.", "invoiceId");
    return { invoice, created: false };
  }

  const dueDate = resolveInstallmentInvoiceDueDate(installment, options.dueDate);
  const proposal = await loadProposalForInstallment(installment);
  const payload = buildInvoicePayloadFromInstallment(installment, proposal, dueDate);
  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);

  const created = await SalesInvoices.create([{ id, number, ...payload }], { session });
  const invoice = created[0].toObject ? created[0].toObject() : created[0];

  const linked = await SalesInstallments.updateOne(
    { id: installmentId, invoiceId: null },
    { $set: { invoiceId: id } },
    { session },
  );
  if (linked.matchedCount === 0) {
    badRequest("This installment already has an invoice.", "invoiceId");
  }

  return { invoice, created: true };
}
