import {
  FinanceIncome,
  FinanceInvoices,
  FinancePayments,
  FinanceExpenses,
  FinanceCheques,
  clientsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { badRequest, notFound } from "../../../utils/route-errors.js";
import { calcInvoiceTotal, deriveInvoiceStatus, deriveIncomeStatus } from "../../../utils/finance-totals.js";
import {
  deriveExpensePaymentStatus,
  isLegacyFullyPaidExpense,
  outstandingExpenseAmount,
} from "./expense-cash.service.js";

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
 * Apply cash against an approved bill. Skips legacy fully-paid rows (no settlement fields).
 */
export async function applyCashToExpense(session, expenseId, amount) {
  if (!(amount > 0)) return null;
  const pay = Math.round(Number(amount) * 100) / 100;
  if (!(pay > 0)) return null;

  // Atomic guard: only apply if remaining coverage is enough (prevents concurrent overpay).
  const updated = await FinanceExpenses.findOneAndUpdate(
    {
      id: expenseId,
      status: "approved",
      paymentStatus: { $in: ["unpaid", "partially_paid"] },
      $expr: {
        $lte: [{ $add: [{ $ifNull: ["$paidAmount", 0] }, pay] }, { $ifNull: ["$amount", 0] }],
      },
    },
    [
      {
        $set: {
          paidAmount: { $round: [{ $add: [{ $ifNull: ["$paidAmount", 0] }, pay] }, 2] },
        },
      },
      {
        $set: {
          paymentStatus: {
            $switch: {
              branches: [
                { case: { $lte: ["$paidAmount", 0] }, then: "unpaid" },
                { case: { $gte: ["$paidAmount", "$amount"] }, then: "paid" },
              ],
              default: "partially_paid",
            },
          },
        },
      },
    ],
    session ? { new: true, session } : { new: true },
  ).lean();

  if (!updated) {
    let q = FinanceExpenses.findOne({ id: expenseId });
    if (session) q = q.session(session);
    const expense = await q.lean();
    if (!expense) notFound("Expense");
    if (expense.status !== "approved") {
      badRequest("Only approved expenses can receive payments.", "expenseId");
    }
    if (isLegacyFullyPaidExpense(expense)) {
      badRequest("This expense is already fully settled (legacy). Create a new bill for additional payables.", "expenseId");
    }
    const remaining = outstandingExpenseAmount(expense);
    badRequest(`Payment exceeds remaining due of ${remaining}.`, "amount");
  }
  return updated;
}

/** Reverse cash when an outgoing payment linked to an expense is deleted. */
export async function reverseCashFromExpense(session, expenseId, amount) {
  if (!(amount > 0)) return null;
  let q = FinanceExpenses.findOne({ id: expenseId });
  if (session) q = q.session(session);
  const expense = await q.lean();
  if (!expense) return null;
  if (isLegacyFullyPaidExpense(expense)) return expense;
  if (expense.paymentStatus == null && expense.paidAmount == null) return expense;
  const newPaid = Math.max(0, (Number(expense.paidAmount) || 0) - amount);
  const paymentStatus = deriveExpensePaymentStatus(expense.amount, newPaid);
  return FinanceExpenses.findOneAndUpdate(
    { id: expenseId },
    { $set: { paidAmount: newPaid, paymentStatus } },
    session ? { new: true, session } : { new: true },
  ).lean();
}

/**
 * Records an outgoing disbursement (vendor payment, payroll payout, etc.).
 * When expenseId is set, updates that bill's paidAmount (cash settlement).
 */
export async function recordOutgoingPayment(
  session,
  {
    partyName,
    vendorId = null,
    employeeId = null,
    clientId = null,
    expenseId = null,
    bankAccountId = null,
    amount,
    mode,
    date,
    reference,
    recordedBy,
    /** Set by cheque clear flow — normally issued-cheque bills must clear via Cheques. */
    allowIssuedChequeExpense = false,
    vendorInvoiceId = null,
    freelancerInstallmentId = null,
    taxDepositId = null,
    payrollRunId = null,
  },
) {
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!partyName?.trim()) badRequest("partyName is required.", "partyName");

  let expense = null;
  if (expenseId) {
    let eq = FinanceExpenses.findOne({ id: expenseId });
    if (session) eq = eq.session(session);
    expense = await eq.lean();
    if (!expense) notFound("Expense");
    if (expense.status !== "approved") {
      badRequest("Link payments only to approved expenses.", "expenseId");
    }
    if (expense.chequeId && !allowIssuedChequeExpense) {
      let cq = FinanceCheques.findOne({ id: expense.chequeId }).select({ id: 1, status: 1, reference: 1 });
      if (session) cq = cq.session(session);
      const cheque = await cq.lean();
      if (cheque?.status === "issued") {
        badRequest(
          `This bill is tied to issued cheque ${cheque.reference || `#${cheque.id}`}. Mark it cleared under Finance → Cheques.`,
          "chequeId",
        );
      }
    }
    if (!isLegacyFullyPaidExpense(expense)) {
      const remaining = outstandingExpenseAmount(expense);
      if (amount > remaining + 0.0001) {
        badRequest(`Payment exceeds remaining due of ${remaining}.`, "amount");
      }
    } else {
      badRequest("This expense is already fully settled (legacy).", "expenseId");
    }
  }

  const [paymentId, receiptNumber] = await Promise.all([
    getNextSequence("finance_payments"),
    nextFinanceNumber("FIN-REC", "fin_rec_num"),
  ]);

  const partyType = vendorId
    ? "vendor"
    : employeeId
      ? "employee"
      : clientId
        ? "client"
        : "other";

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
        partyType,
        partyName: partyName.trim(),
        vendorId,
        employeeId,
        clientId,
        expenseId,
        bankAccountId,
        vendorInvoiceId,
        freelancerInstallmentId,
        taxDepositId,
        payrollRunId,
        recordedBy,
      },
    ],
    session ? { session } : undefined,
  );

  if (expenseId) {
    expense = await applyCashToExpense(session, expenseId, amount);
  }

  return { payment, expense };
}
