/**
 * Bridges operational "mark paid" flows into FinanceExpenses + FinancePayments
 * so every rupee in/out appears on the finance ledger (Payments, ledgers, P&L cash).
 */
import {
  getNextSequence,
  FinanceExpenses,
  FinancePayments,
  FinanceVendorInvoices,
  FinanceTaxDeposits,
  FreelancerInstallments,
  usersTable,
  vendorsTable,
} from "../../../models/schema/index.js";
import { financePaymentModes } from "../schema/expenses.js";
import { badRequest, notFound } from "../../../utils/route-errors.js";
import {
  recordOutgoingPayment,
  reverseCashFromExpense,
} from "./payment-ledger.service.js";

export async function nextExpenseReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_exp_num_${year}`);
  return `EXP-${year}-${String(seq).padStart(4, "0")}`;
}

function sess(session) {
  return session ? { session } : undefined;
}

function normalizeMode(mode) {
  const m = mode || "bank_transfer";
  if (!financePaymentModes.includes(m)) {
    badRequest(`paymentMode must be one of: ${financePaymentModes.join(", ")}.`, "paymentMode");
  }
  return m;
}

async function findUser(session, userId) {
  let q = usersTable.findOne({ id: userId }).select({ id: 1, name: 1 });
  if (session) q = q.session(session);
  return q.lean();
}

async function findVendor(session, vendorId) {
  let q = vendorsTable.findOne({ id: vendorId }).select({ id: 1, companyName: 1 });
  if (session) q = q.session(session);
  return q.lean();
}

/**
 * Freelancer installment → approved expense + outgoing payment (employee).
 */
export async function settleFreelancerInstallment(
  session,
  {
    engagement,
    installment,
    mode,
    reference = null,
    notes = null,
    proofImageUrl = null,
    recordedBy,
    date = null,
  },
) {
  if (!installment || installment.status === "paid") {
    badRequest("Installment is already paid.", "status");
  }
  const amount = Number(installment.amount);
  if (!(amount > 0)) badRequest("Installment amount must be positive.", "amount");

  const user = await findUser(session, engagement.userId);
  if (!user) notFound("Freelancer");

  const paymentMode = normalizeMode(mode);
  const paidDate = date ? new Date(date) : new Date();
  const noteText =
    (typeof notes === "string" && notes.trim()) ||
    (typeof installment.notes === "string" && installment.notes.trim()) ||
    null;
  const proof =
    (typeof proofImageUrl === "string" && proofImageUrl.trim()) ||
    (typeof installment.proofImageUrl === "string" && installment.proofImageUrl.trim()) ||
    null;
  const [expenseId, expenseRef] = await Promise.all([
    getNextSequence("finance_expenses"),
    nextExpenseReference(),
  ]);

  await FinanceExpenses.create(
    [
      {
        id: expenseId,
        reference: expenseRef,
        date: paidDate,
        category: "professional",
        amount,
        paymentMode,
        projectId: engagement.projectId ?? null,
        employeeId: user.id,
        vendorId: null,
        freelancerInstallmentId: installment.id,
        notes: noteText || `Freelancer payout · ${installment.label} · ${user.name}`,
        status: "approved",
        paidAmount: 0,
        paymentStatus: "unpaid",
        approvedBy: recordedBy,
        approvedAt: paidDate,
        gstEnabled: false,
        gstAmount: 0,
        attachments: [],
        createdBy: recordedBy,
      },
    ],
    sess(session),
  );

  const { payment } = await recordOutgoingPayment(session, {
    partyName: user.name,
    employeeId: user.id,
    expenseId,
    amount,
    mode: paymentMode,
    date: paidDate,
    reference: reference?.trim() || `FL-${installment.id}`,
    recordedBy,
    freelancerInstallmentId: installment.id,
  });

  await FreelancerInstallments.updateOne(
    { id: installment.id },
    {
      $set: {
        status: "paid",
        paidAt: paidDate,
        paymentMode,
        reference: reference?.trim() || null,
        receiptNumber: payment.receiptNumber,
        notes: noteText,
        proofImageUrl: proof,
        recordedBy,
        expenseId,
        paymentId: payment.id,
      },
    },
    sess(session),
  );

  return { expenseId, paymentId: payment.id, receiptNumber: payment.receiptNumber };
}

export async function unsettleFreelancerInstallment(session, installment) {
  if (!installment || installment.status !== "paid") return null;

  if (installment.paymentId) {
    let pq = FinancePayments.findOne({ id: installment.paymentId });
    if (session) pq = pq.session(session);
    const payment = await pq.lean();
    if (payment) {
      if (payment.expenseId) {
        await reverseCashFromExpense(session, payment.expenseId, payment.amount);
        await FinanceExpenses.deleteOne({ id: payment.expenseId }, sess(session));
      }
      await FinancePayments.deleteOne({ id: payment.id }, sess(session));
    }
  } else if (installment.expenseId) {
    await FinanceExpenses.deleteOne({ id: installment.expenseId }, sess(session));
  }

  await FreelancerInstallments.updateOne(
    { id: installment.id },
    {
      $set: {
        status: "pending",
        paidAt: null,
        recordedBy: null,
        expenseId: null,
        paymentId: null,
        receiptNumber: null,
        proofImageUrl: null,
      },
    },
    sess(session),
  );
  return true;
}

/**
 * Vendor purchase bill → expense (GST stays on bill) + outgoing payment.
 */
export async function settleVendorInvoice(
  session,
  { invoice, mode, reference = null, recordedBy, date = null, amount = null },
) {
  if (!invoice || invoice.status === "cancelled") {
    badRequest("Cancelled vendor invoices cannot be paid.", "status");
  }
  if (invoice.status === "paid" && (invoice.paidAmount ?? 0) >= (invoice.totalAmount ?? 0)) {
    badRequest("Vendor invoice is already fully paid.", "status");
  }

  const payAmount = amount != null ? Number(amount) : Number(invoice.totalAmount);
  if (!(payAmount > 0)) badRequest("amount must be positive.", "amount");
  const remaining = Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount ?? 0));
  if (payAmount > remaining + 0.0001) {
    badRequest(`Payment exceeds remaining due of ${remaining}.`, "amount");
  }

  const vendor = await findVendor(session, invoice.vendorId);
  if (!vendor) notFound("Vendor");

  const paymentMode = normalizeMode(mode);
  const paidDate = date ? new Date(date) : new Date();
  const [expenseId, expenseRef] = await Promise.all([
    getNextSequence("finance_expenses"),
    nextExpenseReference(),
  ]);

  await FinanceExpenses.create(
    [
      {
        id: expenseId,
        reference: expenseRef,
        date: paidDate,
        category: "professional",
        amount: payAmount,
        paymentMode,
        projectId: null,
        employeeId: null,
        vendorId: vendor.id,
        vendorInvoiceId: invoice.id,
        notes: `Vendor bill ${invoice.invoiceNumber}`,
        status: "approved",
        paidAmount: 0,
        paymentStatus: "unpaid",
        approvedBy: recordedBy,
        approvedAt: paidDate,
        gstEnabled: false,
        gstAmount: 0,
        attachments: [],
        createdBy: recordedBy,
      },
    ],
    sess(session),
  );

  const { payment } = await recordOutgoingPayment(session, {
    partyName: vendor.companyName,
    vendorId: vendor.id,
    expenseId,
    amount: payAmount,
    mode: paymentMode,
    date: paidDate,
    reference: reference?.trim() || invoice.invoiceNumber,
    recordedBy,
    vendorInvoiceId: invoice.id,
  });

  const newPaid = Math.round((Number(invoice.paidAmount ?? 0) + payAmount) * 100) / 100;
  const status = newPaid >= Number(invoice.totalAmount) - 0.0001 ? "paid" : "unpaid";

  await FinanceVendorInvoices.updateOne(
    { id: invoice.id },
    { $set: { paidAmount: newPaid, status, paymentId: payment.id } },
    sess(session),
  );

  return { expenseId, paymentId: payment.id, status, paidAmount: newPaid };
}

export async function settleTaxDeposit(session, { deposit, recordedBy, mode = "neft" }) {
  if (deposit.paymentId) return { paymentId: deposit.paymentId };

  const paymentMode = normalizeMode(mode);
  const [expenseId, expenseRef] = await Promise.all([
    getNextSequence("finance_expenses"),
    nextExpenseReference(),
  ]);
  const label = `Tax deposit · ${String(deposit.type).toUpperCase()} · ${deposit.period}`;

  await FinanceExpenses.create(
    [
      {
        id: expenseId,
        reference: expenseRef,
        date: deposit.depositedAt,
        category: "misc",
        amount: deposit.amount,
        paymentMode,
        notes: label,
        status: "approved",
        paidAmount: 0,
        paymentStatus: "unpaid",
        approvedBy: recordedBy,
        approvedAt: deposit.depositedAt,
        gstEnabled: false,
        gstAmount: 0,
        attachments: [],
        createdBy: recordedBy,
        taxDepositId: deposit.id,
      },
    ],
    sess(session),
  );

  const { payment } = await recordOutgoingPayment(session, {
    partyName: label,
    expenseId,
    amount: deposit.amount,
    mode: paymentMode,
    date: deposit.depositedAt,
    reference: deposit.challanNumber || `TAX-${deposit.id}`,
    recordedBy,
    taxDepositId: deposit.id,
  });

  await FinanceTaxDeposits.updateOne(
    { id: deposit.id },
    { $set: { paymentId: payment.id, expenseId } },
    sess(session),
  );

  return { paymentId: payment.id, expenseId };
}

export async function reverseTaxDepositCash(session, deposit) {
  if (!deposit?.paymentId && !deposit?.expenseId) return null;
  if (deposit.paymentId) {
    let pq = FinancePayments.findOne({ id: deposit.paymentId });
    if (session) pq = pq.session(session);
    const payment = await pq.lean();
    if (payment) {
      if (payment.expenseId) {
        await reverseCashFromExpense(session, payment.expenseId, payment.amount);
        await FinanceExpenses.deleteOne({ id: payment.expenseId }, sess(session));
      }
      await FinancePayments.deleteOne({ id: payment.id }, sess(session));
    }
  }
  return true;
}

export async function settlePayrollRun(session, { run, lines, recordedBy, mode = "bank_transfer" }) {
  if (run.financePaymentId) return { paymentId: run.financePaymentId };

  const totalNet = lines.reduce((s, l) => s + (Number(l.net) || 0), 0);
  if (!(totalNet > 0)) return { paymentId: null, amount: 0 };

  const paymentMode = normalizeMode(mode);
  const paidDate = new Date();
  const [expenseId, expenseRef] = await Promise.all([
    getNextSequence("finance_expenses"),
    nextExpenseReference(),
  ]);
  const label = `Payroll · ${run.year}-${String(run.month).padStart(2, "0")}`;

  await FinanceExpenses.create(
    [
      {
        id: expenseId,
        reference: expenseRef,
        date: paidDate,
        category: "misc",
        amount: totalNet,
        paymentMode,
        notes: label,
        status: "approved",
        paidAmount: 0,
        paymentStatus: "unpaid",
        approvedBy: recordedBy,
        approvedAt: paidDate,
        gstEnabled: false,
        gstAmount: 0,
        attachments: [],
        createdBy: recordedBy,
        payrollRunId: run.id,
      },
    ],
    sess(session),
  );

  const { payment } = await recordOutgoingPayment(session, {
    partyName: label,
    expenseId,
    amount: totalNet,
    mode: paymentMode,
    date: paidDate,
    reference: `PAYROLL-${run.year}${String(run.month).padStart(2, "0")}`,
    recordedBy,
    payrollRunId: run.id,
  });

  return { paymentId: payment.id, expenseId, amount: totalNet };
}
