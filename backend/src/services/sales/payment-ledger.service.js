import {
  SalesPayments,
  SalesInvoices,
  SalesInstallments,
  clientsTable,
} from "../../models/schema/index.js";
import { badRequest, notFound, optionalString } from "../../utils/route-errors.js";
import { bdeOwnsCustomer } from "../../utils/sales-bde-customer-scope.js";

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
