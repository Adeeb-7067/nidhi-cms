import {
  FinanceIncome,
  FinanceInvoices,
  FinancePayments,
  FinanceExpenses,
  clientsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound } from "../../utils/route-errors.js";
import { calcInvoiceTotal, deriveInvoiceStatus, deriveIncomeStatus } from "../../utils/finance-totals.js";

export async function nextFinanceNumber(prefix, counterKey) {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`${counterKey}_${year}`);
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Records an incoming client payment. In one transaction: creates the
 * FinanceIncome row (client-relationship view) and the matching FinancePayments
 * row (direction: incoming — the transaction ledger); if invoiceId is given,
 * applies the amount to that invoice and re-derives its status. Both the
 * Income page "Record payment" action and the Invoice Detail "Record payment"
 * action call this same function so the two pages never drift out of sync.
 */
export async function recordIncomingPayment(
  session,
  { clientId, projectId = null, invoiceId = null, amount, mode, date, recordedBy },
) {
  if (!clientId) badRequest("clientId is required.", "clientId");
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");

  const client = await clientsTable.findOne({ id: clientId }).session(session).lean();
  if (!client) notFound("Client");

  let invoice = null;
  if (invoiceId) {
    invoice = await FinanceInvoices.findOne({ id: invoiceId }).session(session).lean();
    if (!invoice) notFound("Invoice");
    if (invoice.status === "cancelled") badRequest("This invoice has been cancelled.", "invoiceId");
    const { total } = calcInvoiceTotal(invoice.items, invoice.discount, invoice.gstEnabled);
    const remaining = total - invoice.paidAmount;
    if (amount > remaining) {
      badRequest(`Payment exceeds remaining balance of ${remaining}.`, "amount");
    }
  }

  const [incomeId, paymentId, incomeRef, receiptNumber] = await Promise.all([
    getNextSequence("finance_income"),
    getNextSequence("finance_payments"),
    nextFinanceNumber("INC", "fin_inc_num"),
    nextFinanceNumber("FIN-REC", "fin_rec_num"),
  ]);

  const paidDate = date ? new Date(date) : new Date();
  const status = invoice ? deriveIncomeStatus(invoice, invoice.paidAmount + amount) : "received";

  const [income] = await FinanceIncome.create(
    [
      {
        id: incomeId,
        reference: incomeRef,
        date: paidDate,
        clientId,
        projectId,
        amount,
        paymentMode: mode,
        status,
        invoiceId,
        recordedBy,
      },
    ],
    { session },
  );

  const [payment] = await FinancePayments.create(
    [
      {
        id: paymentId,
        date: paidDate,
        amount,
        mode,
        direction: "incoming",
        reference: incomeRef,
        receiptNumber,
        status: "completed",
        partyType: "client",
        partyName: client.companyName,
        clientId,
        invoiceId,
        incomeId,
        recordedBy,
      },
    ],
    { session },
  );

  let invoiceStatus = null;
  if (invoice) {
    const newPaidAmount = invoice.paidAmount + amount;
    invoiceStatus = deriveInvoiceStatus(invoice, newPaidAmount);
    await FinanceInvoices.updateOne(
      { id: invoiceId },
      { $set: { paidAmount: newPaidAmount, status: invoiceStatus } },
      { session },
    );
  }

  return { income, payment, invoiceStatus };
}

/**
 * Reverses an incoming payment / income pair inside a transaction. Restores the
 * linked invoice's paidAmount + status (so an accidental receipt can be removed
 * without leaving the invoice marked paid), then removes both ledger rows. Used
 * by both "delete income" and "delete incoming payment" so the two stay in sync.
 */
export async function reverseIncomingPaymentPair(session, { incomeId = null, paymentId = null }) {
  let income = null;
  if (incomeId != null) {
    income = await FinanceIncome.findOne({ id: incomeId }).session(session).lean();
  }
  let payment = null;
  if (paymentId != null) {
    payment = await FinancePayments.findOne({ id: paymentId }).session(session).lean();
  } else if (income) {
    payment = await FinancePayments.findOne({ incomeId: income.id }).session(session).lean();
  }
  if (!income && payment?.incomeId != null) {
    income = await FinanceIncome.findOne({ id: payment.incomeId }).session(session).lean();
  }

  const invoiceId = income?.invoiceId ?? payment?.invoiceId ?? null;
  const amount = income?.amount ?? payment?.amount ?? 0;

  if (invoiceId != null && amount > 0) {
    const invoice = await FinanceInvoices.findOne({ id: invoiceId }).session(session).lean();
    if (invoice) {
      const newPaid = Math.max(0, (invoice.paidAmount ?? 0) - amount);
      const status = deriveInvoiceStatus(invoice, newPaid);
      await FinanceInvoices.updateOne(
        { id: invoiceId },
        { $set: { paidAmount: newPaid, status } },
        { session },
      );
    }
  }

  if (income) await FinanceIncome.deleteOne({ id: income.id }, { session });
  if (payment) await FinancePayments.deleteOne({ id: payment.id }, { session });

  return { removedIncomeId: income?.id ?? null, removedPaymentId: payment?.id ?? null };
}

/**
 * Records an outgoing disbursement (vendor payment, payroll payout, etc.).
 * Optionally links an expenseId for traceability — does not mutate the
 * expense's approval status (approval and disbursement are decoupled).
 */
export async function recordOutgoingPayment(
  session,
  { partyName, vendorId = null, employeeId = null, expenseId = null, bankAccountId = null, amount, mode, date, reference, recordedBy },
) {
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!partyName?.trim()) badRequest("partyName is required.", "partyName");

  let expense = null;
  if (expenseId) {
    expense = await FinanceExpenses.findOne({ id: expenseId }).session(session).lean();
    if (!expense) notFound("Expense");
  }

  const [paymentId, receiptNumber] = await Promise.all([
    getNextSequence("finance_payments"),
    nextFinanceNumber("FIN-REC", "fin_rec_num"),
  ]);

  const [payment] = await FinancePayments.create(
    [
      {
        id: paymentId,
        date: date ? new Date(date) : new Date(),
        amount,
        mode,
        direction: "outgoing",
        reference: reference?.trim() || receiptNumber,
        receiptNumber,
        status: "completed",
        partyType: vendorId ? "vendor" : employeeId ? "employee" : "other",
        partyName: partyName.trim(),
        vendorId,
        employeeId,
        expenseId,
        bankAccountId,
        recordedBy,
      },
    ],
    { session },
  );

  return { payment, expense };
}
