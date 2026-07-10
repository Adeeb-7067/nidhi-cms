import {
  SalesPayments,
  SalesInvoices,
  SalesInstallments,
  clientsTable,
} from "../../models/schema/index.js";
import { badRequest, notFound, optionalString } from "../../utils/route-errors.js";
import { bdeOwnsCustomer } from "../../utils/sales-bde-customer-scope.js";
import {
  createPaidInvoiceForInstallmentPayment,
  loadProposalForInstallment,
} from "./installment-billing.service.js";

export function deriveInvoiceStatus(invoice, newPaidAmount) {
  if (newPaidAmount >= invoice.amount) return "paid";
  if (newPaidAmount > 0) return "partial";
  return "unpaid";
}

export function deriveInstallmentStatus(installment, newPaidAmount) {
  if (newPaidAmount >= installment.dueAmount) return "paid";
  if (newPaidAmount > 0) return "partial";
  return "pending";
}

/**
 * Apply a payment to an invoice (and optional installment) inside a transaction.
 * Caller must validate access before invoking.
 */
export async function applyPaymentInTx(
  session,
  {
    invoiceId,
    installmentId = null,
    amount,
    paymentMethod,
    transactionId = null,
    note = null,
    proofImageUrl = null,
    paymentDate = new Date(),
    recordedBy,
    receiptNumber,
    paymentId,
    bdeUser = null,
  },
) {
  const invoice = await SalesInvoices.findOne({ id: invoiceId }).session(session).lean();
  if (!invoice) notFound("Invoice");
  if (bdeUser?.role === "bde") {
    const client = await clientsTable.findOne({ id: invoice.customerId }).session(session).lean();
    if (!client || !bdeOwnsCustomer(client, bdeUser.id)) notFound("Invoice");
  }
  if (invoice.status === "cancelled") badRequest("This invoice has been cancelled.", "invoiceId");
  if (invoice.status === "paid") badRequest("This invoice is already fully paid.", "invoiceId");

  let linkedInstallmentId = installmentId;
  if (!linkedInstallmentId && invoice.installmentId) {
    linkedInstallmentId = invoice.installmentId;
  }

  if (linkedInstallmentId) {
    const inst = await SalesInstallments.findOne({ id: linkedInstallmentId }).session(session).lean();
    if (!inst) notFound("Installment");
    if (inst.invoiceId && inst.invoiceId !== invoiceId) {
      badRequest("Installment does not belong to this invoice.", "installmentId");
    }
    if (inst.status === "paid") badRequest("This installment is already fully paid.", "installmentId");

    const instRemaining = inst.dueAmount - inst.paidAmount;
    const appliedToInst = Math.min(amount, instRemaining);
    const newInstPaid = inst.paidAmount + appliedToInst;
    const newInstStatus = deriveInstallmentStatus(inst, newInstPaid);

    await SalesInstallments.updateOne(
      { id: linkedInstallmentId },
      { $set: { paidAmount: newInstPaid, status: newInstStatus } },
      { session },
    );
  }

  const remaining = invoice.amount - invoice.paidAmount;
  if (amount > remaining) {
    badRequest(`Payment exceeds remaining balance of ${remaining}.`, "amount");
  }
  const newPaidAmount = invoice.paidAmount + amount;
  const newStatus = deriveInvoiceStatus(invoice, newPaidAmount);

  await SalesPayments.create(
    [
      {
        id: paymentId,
        invoiceId,
        installmentId: linkedInstallmentId,
        customerId: invoice.customerId,
        amount,
        paymentMethod,
        transactionId: optionalString(transactionId) ?? null,
        note: optionalString(note) ?? null,
        proofImageUrl: optionalString(proofImageUrl) ?? null,
        paymentDate,
        recordedBy,
        receiptNumber,
      },
    ],
    { session },
  );
  await SalesInvoices.updateOne(
    { id: invoiceId },
    { $set: { paidAmount: newPaidAmount, status: newStatus } },
    { session },
  );

  return { invoiceStatus: newStatus, installmentId: linkedInstallmentId };
}

/**
 * Record a payment against an installment milestone: creates a paid invoice for the
 * payment amount plus a receipt, and updates installment totals.
 */
export async function applyInstallmentPaymentInTx(
  session,
  {
    installmentId,
    amount,
    paymentMethod,
    transactionId = null,
    note = null,
    proofImageUrl = null,
    paymentDate = new Date(),
    recordedBy,
    receiptNumber,
    paymentId,
    bdeUser = null,
  },
) {
  const installment = await SalesInstallments.findOne({ id: installmentId }).session(session).lean();
  if (!installment) notFound("Installment");
  if (bdeUser?.role === "bde") {
    const client = await clientsTable.findOne({ id: installment.customerId }).session(session).lean();
    if (!client || !bdeOwnsCustomer(client, bdeUser.id)) notFound("Installment");
  }
  if (installment.status === "paid") {
    badRequest("This installment is already fully paid.", "installmentId");
  }
  const remaining = installment.dueAmount - installment.paidAmount;
  if (amount > remaining) {
    badRequest(`Payment exceeds remaining balance of ${remaining}.`, "amount");
  }

  const proposal = await loadProposalForInstallment(installment);
  const paymentInvoice = await createPaidInvoiceForInstallmentPayment(session, installment, amount, {
    proposal,
    issueDate: paymentDate,
  });

  let masterInvoiceId = installment.invoiceId ?? null;
  let masterInvoice = null;
  if (masterInvoiceId) {
    masterInvoice = await SalesInvoices.findOne({ id: masterInvoiceId }).session(session).lean();
    if (!masterInvoice) masterInvoiceId = null;
  }

  await SalesPayments.create(
    [
      {
        id: paymentId,
        invoiceId: masterInvoiceId ?? paymentInvoice.id,
        paymentInvoiceId: paymentInvoice.id,
        installmentId,
        customerId: installment.customerId,
        amount,
        paymentMethod,
        transactionId: optionalString(transactionId) ?? null,
        note: optionalString(note) ?? null,
        proofImageUrl: optionalString(proofImageUrl) ?? null,
        paymentDate,
        recordedBy,
        receiptNumber,
      },
    ],
    { session },
  );

  if (masterInvoice) {
    const newMasterPaid = masterInvoice.paidAmount + amount;
    await SalesInvoices.updateOne(
      { id: masterInvoiceId },
      { $set: { paidAmount: newMasterPaid, status: deriveInvoiceStatus(masterInvoice, newMasterPaid) } },
      { session },
    );
  }

  const newInstPaid = installment.paidAmount + amount;
  await SalesInstallments.updateOne(
    { id: installmentId },
    { $set: { paidAmount: newInstPaid, status: deriveInstallmentStatus(installment, newInstPaid) } },
    { session },
  );

  return {
    invoiceStatus: masterInvoice ? deriveInvoiceStatus(masterInvoice, masterInvoice.paidAmount + amount) : "paid",
    installmentId,
    invoice: paymentInvoice,
    invoiceId: paymentInvoice.id,
    masterInvoiceId,
    invoiceCreated: true,
  };
}

function isDedicatedPaymentInvoice(invoice, payment) {
  if (!invoice || !payment) return false;
  return invoice.amount === payment.amount && invoice.paidAmount === payment.amount;
}

async function syncMasterInvoicePaidFromPayments(session, masterInvoiceId, installmentId) {
  const [master, payments] = await Promise.all([
    SalesInvoices.findOne({ id: masterInvoiceId }).session(session).lean(),
    SalesPayments.find({ installmentId, invoiceId: masterInvoiceId }).session(session).lean(),
  ]);
  if (!master) return;
  const newPaid = payments.reduce((sum, row) => sum + row.amount, 0);
  await SalesInvoices.updateOne(
    { id: masterInvoiceId },
    { $set: { paidAmount: newPaid, status: deriveInvoiceStatus(master, newPaid) } },
    { session },
  );
}

async function findOrCreatePaymentInvoice(session, installment, payment) {
  const existing = await SalesInvoices.findOne({
    installmentId: payment.installmentId,
    amount: payment.amount,
    paidAmount: payment.amount,
    status: "paid",
  })
    .session(session)
    .lean();
  if (existing) return existing;

  const proposal = await loadProposalForInstallment(installment);
  return createPaidInvoiceForInstallmentPayment(session, installment, payment.amount, { proposal });
}

/**
 * Ensure installment payments keep the main milestone invoice on payment.invoiceId
 * while storing the per-payment paid invoice on paymentInvoiceId.
 */
export async function repairPaymentInvoiceLinkInTx(session, paymentId) {
  const payment = await SalesPayments.findOne({ id: paymentId }).session(session).lean();
  if (!payment?.installmentId) return payment;

  const installment = await SalesInstallments.findOne({ id: payment.installmentId }).session(session).lean();
  if (!installment) notFound("Installment");

  const masterInvoiceId = installment.invoiceId ?? null;
  const linked = await SalesInvoices.findOne({ id: payment.invoiceId }).session(session).lean();
  const updates = {};

  if (payment.paymentInvoiceId) {
    const paymentInvoice = await SalesInvoices.findOne({ id: payment.paymentInvoiceId }).session(session).lean();
    if (paymentInvoice && isDedicatedPaymentInvoice(paymentInvoice, payment)) {
      if (masterInvoiceId && payment.invoiceId !== masterInvoiceId) {
        updates.invoiceId = masterInvoiceId;
      }
      if (Object.keys(updates).length) {
        await SalesPayments.updateOne({ id: paymentId }, { $set: updates }, { session });
        if (updates.invoiceId) {
          await syncMasterInvoicePaidFromPayments(session, masterInvoiceId, payment.installmentId);
        }
      }
      return { ...payment, ...updates };
    }
  }

  if (linked && isDedicatedPaymentInvoice(linked, payment)) {
    updates.paymentInvoiceId = linked.id;
    if (masterInvoiceId) updates.invoiceId = masterInvoiceId;
    await SalesPayments.updateOne({ id: paymentId }, { $set: updates }, { session });
    if (masterInvoiceId) {
      await syncMasterInvoicePaidFromPayments(session, masterInvoiceId, payment.installmentId);
    }
    return { ...payment, ...updates };
  }

  if (masterInvoiceId && linked?.id === masterInvoiceId) {
    const paymentInvoice = await findOrCreatePaymentInvoice(session, installment, payment);
    await SalesPayments.updateOne(
      { id: paymentId },
      { $set: { paymentInvoiceId: paymentInvoice.id } },
      { session },
    );
    return { ...payment, paymentInvoiceId: paymentInvoice.id };
  }

  return payment;
}
