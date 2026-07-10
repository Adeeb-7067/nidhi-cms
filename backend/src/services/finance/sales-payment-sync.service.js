import {
  FinanceIncome,
  FinancePayments,
  SalesPayments,
  SalesInvoices,
  SalesInstallments,
  SalesProposals,
  clientsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { resolveSalesProjectId } from "../../utils/sales-project-labels.js";
import { apportionPaymentGst } from "../../utils/sales-totals.js";
import { nextFinanceNumber } from "./payment-ledger.service.js";
import { runInTx } from "../../lib/db-tx.js";

/**
 * Mirror a recorded sales payment into finance income + incoming payment ledger.
 * Idempotent via salesPaymentId — safe to retry after partial failures.
 */
export async function mirrorSalesPaymentToFinanceInTx(session, salesPayment) {
  if (!salesPayment?.id) return null;

  const existing = await FinanceIncome.findOne({ salesPaymentId: salesPayment.id })
    .session(session)
    .lean();
  if (existing) return { income: existing, payment: null, skipped: true };

  const client = await clientsTable.findOne({ id: salesPayment.customerId }).session(session).lean();
  if (!client) return null;

  const [invoice, installment] = await Promise.all([
    salesPayment.invoiceId
      ? SalesInvoices.findOne({ id: salesPayment.invoiceId }).session(session).lean()
      : null,
    salesPayment.installmentId
      ? SalesInstallments.findOne({ id: salesPayment.installmentId }).session(session).lean()
      : null,
  ]);

  let proposal = null;
  const proposalId = installment?.proposalId ?? invoice?.proposalId ?? null;
  if (proposalId) {
    proposal = await SalesProposals.findOne({ id: proposalId })
      .select({ id: 1, projectId: 1 })
      .session(session)
      .lean();
  }

  const projectId = resolveSalesProjectId({ invoice, installment, proposal });
  const paidDate = salesPayment.paymentDate
    ? new Date(salesPayment.paymentDate)
    : salesPayment.createdAt
      ? new Date(salesPayment.createdAt)
      : new Date();
  const paymentMode = salesPayment.paymentMethod;
  const gst = invoice
    ? apportionPaymentGst(salesPayment.amount, invoice)
    : { gstEnabled: null, gstAmount: 0, taxableAmount: salesPayment.amount };
  const salesInvoiceId = invoice?.id ?? salesPayment.invoiceId ?? null;

  const [incomeId, paymentId, receiptNumber] = await Promise.all([
    getNextSequence("finance_income"),
    getNextSequence("finance_payments"),
    nextFinanceNumber("FIN-REC", "fin_rec_num"),
  ]);

  const incomeReference = `SALES-${salesPayment.receiptNumber}`;

  const [income] = await FinanceIncome.create(
    [
      {
        id: incomeId,
        reference: incomeReference,
        date: paidDate,
        clientId: salesPayment.customerId,
        projectId,
        amount: salesPayment.amount,
        paymentMode,
        status: "received",
        invoiceId: null,
        salesPaymentId: salesPayment.id,
        salesInvoiceId,
        gstEnabled: gst.gstEnabled,
        gstAmount: gst.gstAmount,
        recordedBy: salesPayment.recordedBy,
      },
    ],
    { session },
  );

  const [payment] = await FinancePayments.create(
    [
      {
        id: paymentId,
        date: paidDate,
        amount: salesPayment.amount,
        mode: paymentMode,
        direction: "incoming",
        reference: incomeReference,
        receiptNumber,
        status: "completed",
        partyType: "client",
        partyName: client.companyName,
        clientId: salesPayment.customerId,
        invoiceId: null,
        incomeId,
        salesPaymentId: salesPayment.id,
        salesInvoiceId,
        gstEnabled: gst.gstEnabled,
        gstAmount: gst.gstAmount,
        recordedBy: salesPayment.recordedBy,
      },
    ],
    { session },
  );

  return { income, payment, skipped: false };
}

/** Backfill historical sales payments into finance ledger (idempotent). */
export async function backfillSalesPaymentsToFinance({ limit = 500 } = {}) {
  const mirroredIds = await FinancePayments.distinct("salesPaymentId", { salesPaymentId: { $ne: null } });
  const pending = await SalesPayments.find({
    id: { $nin: mirroredIds.length ? mirroredIds : [-1] },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  let mirrored = 0;
  let skipped = 0;
  let failed = 0;

  for (const payment of pending) {
    try {
      const result = await runInTx((session) => mirrorSalesPaymentToFinanceInTx(session, payment));
      if (result?.skipped) skipped += 1;
      else if (result) mirrored += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed: pending.length, mirrored, skipped, failed, remaining: Math.max(0, pending.length - mirrored - skipped - failed) };
}
