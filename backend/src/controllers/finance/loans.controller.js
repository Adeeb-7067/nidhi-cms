import { FinanceLoans, FinanceExpenses, getNextSequence } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, optionalString } from "../../utils/route-errors.js";
import { escapeRegex } from "../../utils/regex.js";
import { loanStatuses } from "../../models/schema/finance/loans.js";
import { financePaymentModes } from "../../models/schema/finance/expenses.js";
import { recognizedExpenseAmount } from "../../services/finance/expense-cash.service.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordOutgoingPayment } from "../../services/finance/payment-ledger.service.js";

async function nextLoanReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_loan_num_${year}`);
  return `LOAN-${year}-${String(seq).padStart(4, "0")}`;
}

async function nextExpenseReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_exp_num_${year}`);
  return `EXP-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Allocate each approved installment into interest vs principal (reducing balance).
 * Payments must be chronological (oldest first).
 */
function allocateInstallments(loan, paymentsAsc) {
  const monthlyRate = (Number(loan.interestRate) || 0) / 12 / 100;
  let outstanding = Number(loan.principal) || 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalCashPaid = 0;

  const allocated = paymentsAsc.map((p) => {
    const base = {
      id: p.id,
      reference: p.reference,
      date: p.date,
      amount: p.amount,
      status: p.status,
      notes: p.notes ?? null,
      paymentMode: p.paymentMode,
      principalPortion: null,
      interestPortion: null,
      outstandingAfter: null,
    };

    if (p.status !== "approved") return base;

    const amount = recognizedExpenseAmount(p);
    totalCashPaid += amount;

    if (outstanding <= 0) {
      return {
        ...base,
        interestPortion: amount,
        principalPortion: 0,
        outstandingAfter: 0,
      };
    }

    const interestPortion = Math.min(amount, Math.round(outstanding * monthlyRate));
    let principalPortion = amount - interestPortion;
    if (principalPortion > outstanding) {
      principalPortion = outstanding;
    }
    if (principalPortion < 0) principalPortion = 0;

    // If payment didn't cover full interest due, rest still counts as interest.
    const interestActual = amount - principalPortion;

    outstanding = Math.max(0, outstanding - principalPortion);
    totalInterestPaid += interestActual;
    totalPrincipalPaid += principalPortion;

    return {
      ...base,
      interestPortion: interestActual,
      principalPortion,
      outstandingAfter: Math.round(outstanding),
    };
  });

  const remainingPrincipal = Math.max(0, Math.round(outstanding));
  const estimatedTotalInterest =
    loan.emiAmount && loan.tenureMonths
      ? Math.max(0, Math.round(loan.emiAmount * loan.tenureMonths - loan.principal))
      : null;

  return {
    payments: allocated.reverse(), // newest first for UI
    summary: {
      totalCashPaid: Math.round(totalCashPaid),
      totalPrincipalPaid: Math.round(totalPrincipalPaid),
      totalInterestPaid: Math.round(totalInterestPaid),
      remainingPrincipal,
      /** @deprecated alias — remaining principal */
      paidAmount: Math.round(totalPrincipalPaid),
      remainingAmount: remainingPrincipal,
      estimatedTotalInterest,
      estimatedTotalPayable:
        estimatedTotalInterest != null
          ? Math.round(loan.principal + estimatedTotalInterest)
          : null,
      installmentsPaid: paymentsAsc.filter((p) => p.status === "approved" && recognizedExpenseAmount(p) > 0).length,
      installmentsPending: paymentsAsc.filter((p) => p.status === "pending" || (p.status === "approved" && recognizedExpenseAmount(p) <= 0)).length,
    },
  };
}

async function loadLoanPayments(loanId) {
  return FinanceExpenses.find({ loanId })
    .sort({ date: 1, id: 1 })
    .select({ id: 1, reference: 1, date: 1, amount: 1, status: 1, notes: 1, paymentMode: 1, paidAmount: 1, paymentStatus: 1 })
    .lean();
}

function enrichLoan(loan, summary) {
  return {
    ...loan,
    paidAmount: summary.paidAmount,
    remainingAmount: summary.remainingAmount,
    totalCashPaid: summary.totalCashPaid,
    totalPrincipalPaid: summary.totalPrincipalPaid,
    totalInterestPaid: summary.totalInterestPaid,
    remainingPrincipal: summary.remainingPrincipal,
    estimatedTotalInterest: summary.estimatedTotalInterest,
    estimatedTotalPayable: summary.estimatedTotalPayable,
    installmentsPaid: summary.installmentsPaid,
    installmentsPending: summary.installmentsPending,
  };
}

async function buildSummariesForLoans(loans) {
  if (!loans.length) return new Map();
  const ids = loans.map((l) => l.id);
  const expenses = await FinanceExpenses.find({ loanId: { $in: ids } })
    .sort({ date: 1, id: 1 })
    .select({ id: 1, loanId: 1, reference: 1, date: 1, amount: 1, status: 1, notes: 1, paymentMode: 1, paidAmount: 1, paymentStatus: 1 })
    .lean();

  const byLoan = new Map();
  for (const e of expenses) {
    if (!byLoan.has(e.loanId)) byLoan.set(e.loanId, []);
    byLoan.get(e.loanId).push(e);
  }

  const summaries = new Map();
  for (const loan of loans) {
    const payments = byLoan.get(loan.id) ?? [];
    const { summary } = allocateInstallments(loan, payments);
    summaries.set(loan.id, summary);
  }
  return summaries;
}

async function assertLoanId(loanId) {
  if (loanId == null || loanId === "") return null;
  const id = Number(loanId);
  if (!Number.isFinite(id)) badRequest("loanId must be a valid number.", "loanId");
  const loan = await FinanceLoans.findOne({ id }).select({ id: 1, status: 1, name: 1, emiAmount: 1 }).lean();
  if (!loan) badRequest("Select a valid loan.", "loanId");
  return loan;
}

/** After an approved repayment, close the loan if principal is fully paid. */
async function maybeAutoCloseLoan(loanId) {
  if (!loanId) return;
  const loan = await FinanceLoans.findOne({ id: loanId }).lean();
  if (!loan || loan.status === "closed") return;
  const payments = await loadLoanPayments(loanId);
  const { summary } = allocateInstallments(loan, payments);
  if (summary.remainingPrincipal <= 0) {
    await FinanceLoans.updateOne({ id: loanId }, { $set: { status: "closed" } });
  }
}

async function listLoans(req, res) {
  const { status, search } = req.query;
  const filter = {};
  if (status && loanStatuses.includes(String(status))) filter.status = status;
  if (search) {
    const q = escapeRegex(String(search).trim());
    if (q) {
      const re = { $regex: q, $options: "i" };
      filter.$or = [{ name: re }, { lender: re }, { reference: re }, { notes: re }];
    }
  }
  const rows = await FinanceLoans.find(filter).sort({ createdAt: -1 }).lean();
  const summaries = await buildSummariesForLoans(rows);
  const loans = rows.map((l) => enrichLoan(l, summaries.get(l.id)));
  res.json({ loans });
}

async function getLoanById(req, res) {
  const id = parseIdParam(req.params.id, "loan id");
  const loan = await FinanceLoans.findOne({ id }).lean();
  if (!loan) notFound("Loan");
  const paymentsAsc = await loadLoanPayments(id);
  const { payments, summary } = allocateInstallments(loan, paymentsAsc);
  res.json({
    ...enrichLoan(loan, summary),
    payments,
  });
}

async function createLoan(req, res) {
  const body = req.body ?? {};
  if (!body.name?.trim()) badRequest("name is required.", "name");
  if (!body.lender?.trim()) badRequest("lender is required.", "lender");
  if (!body.startDate) badRequest("startDate is required.", "startDate");
  const principal = Number(body.principal);
  if (!(principal > 0)) badRequest("principal must be a positive number.", "principal");

  let interestRate = null;
  if (body.interestRate != null && body.interestRate !== "") {
    interestRate = Number(body.interestRate);
    if (!(interestRate >= 0)) badRequest("interestRate must be zero or positive.", "interestRate");
  }

  let tenureMonths = null;
  if (body.tenureMonths != null && body.tenureMonths !== "") {
    tenureMonths = Number(body.tenureMonths);
    if (!(tenureMonths >= 1)) badRequest("tenureMonths must be at least 1.", "tenureMonths");
  }

  let emiAmount = null;
  if (body.emiAmount != null && body.emiAmount !== "") {
    emiAmount = Number(body.emiAmount);
    if (!(emiAmount >= 0)) badRequest("emiAmount must be zero or positive.", "emiAmount");
  }

  const [id, reference] = await Promise.all([getNextSequence("finance_loans"), nextLoanReference()]);
  const loan = await FinanceLoans.create({
    id,
    reference,
    name: body.name.trim(),
    lender: body.lender.trim(),
    principal,
    interestRate,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : null,
    tenureMonths,
    emiAmount,
    status: "active",
    notes: optionalString(body.notes) ?? null,
    createdBy: req.user.id,
  });
  const empty = allocateInstallments(loan.toObject(), []).summary;
  res.status(201).json(enrichLoan(loan.toObject(), empty));
}

async function updateLoan(req, res) {
  const id = parseIdParam(req.params.id, "loan id");
  const loan = await FinanceLoans.findOne({ id }).lean();
  if (!loan) notFound("Loan");
  const body = req.body ?? {};
  const updates = {};

  if (body.name !== undefined) {
    if (!body.name?.trim()) badRequest("name is required.", "name");
    updates.name = body.name.trim();
  }
  if (body.lender !== undefined) {
    if (!body.lender?.trim()) badRequest("lender is required.", "lender");
    updates.lender = body.lender.trim();
  }
  if (body.principal !== undefined) {
    const principal = Number(body.principal);
    if (!(principal > 0)) badRequest("principal must be a positive number.", "principal");
    updates.principal = principal;
  }
  if (body.interestRate !== undefined) {
    if (body.interestRate == null || body.interestRate === "") updates.interestRate = null;
    else {
      const interestRate = Number(body.interestRate);
      if (!(interestRate >= 0)) badRequest("interestRate must be zero or positive.", "interestRate");
      updates.interestRate = interestRate;
    }
  }
  if (body.startDate !== undefined) updates.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.tenureMonths !== undefined) {
    if (body.tenureMonths == null || body.tenureMonths === "") updates.tenureMonths = null;
    else {
      const tenureMonths = Number(body.tenureMonths);
      if (!(tenureMonths >= 1)) badRequest("tenureMonths must be at least 1.", "tenureMonths");
      updates.tenureMonths = tenureMonths;
    }
  }
  if (body.emiAmount !== undefined) {
    if (body.emiAmount == null || body.emiAmount === "") updates.emiAmount = null;
    else {
      const emiAmount = Number(body.emiAmount);
      if (!(emiAmount >= 0)) badRequest("emiAmount must be zero or positive.", "emiAmount");
      updates.emiAmount = emiAmount;
    }
  }
  if (body.status !== undefined) {
    if (!loanStatuses.includes(body.status)) {
      badRequest(`status must be one of: ${loanStatuses.join(", ")}.`, "status");
    }
    updates.status = body.status;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;

  const updated = await FinanceLoans.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const paymentsAsc = await loadLoanPayments(id);
  const { summary } = allocateInstallments(updated, paymentsAsc);
  res.json(enrichLoan(updated, summary));
}

async function deleteLoan(req, res) {
  const id = parseIdParam(req.params.id, "loan id");
  const loan = await FinanceLoans.findOne({ id }).lean();
  if (!loan) notFound("Loan");
  const linked = await FinanceExpenses.findOne({ loanId: id }).select({ id: 1 }).lean();
  if (linked) {
    badRequest("This loan has linked expenses. Remove those repayments before deleting the loan.", "loanId");
  }
  await FinanceLoans.deleteOne({ id });
  res.json({ success: true });
}

/**
 * Record an installment payment — creates a Finance expense linked to this loan.
 * Status pending by default so it appears under Expenses for approval; pass
 * approve: true to mark approved immediately (counts toward balance).
 */
async function recordInstallment(req, res) {
  const id = parseIdParam(req.params.id, "loan id");
  const loan = await FinanceLoans.findOne({ id }).lean();
  if (!loan) notFound("Loan");
  if (loan.status === "closed") badRequest("Cannot record an installment on a closed loan.", "status");

  const body = req.body ?? {};
  const amount = Number(body.amount ?? loan.emiAmount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  const paymentMode = body.paymentMode || "bank_transfer";
  if (!financePaymentModes.includes(paymentMode)) {
    badRequest(`paymentMode must be one of: ${financePaymentModes.join(", ")}.`, "paymentMode");
  }
  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) badRequest("date is invalid.", "date");

  const autoApprove = body.approve === true || body.approve === "true";
  const [expenseId, reference] = await Promise.all([
    getNextSequence("finance_expenses"),
    nextExpenseReference(),
  ]);

  const notes =
    optionalString(body.notes) ??
    `Installment for ${loan.reference} · ${loan.name}`;

  let expenseDoc;
  await runInTx(async (session) => {
    const [created] = await FinanceExpenses.create(
      [
        {
          id: expenseId,
          reference,
          date,
          category: "loan",
          amount,
          paymentMode,
          projectId: null,
          employeeId: null,
          vendorId: null,
          loanId: id,
          notes,
          status: autoApprove ? "approved" : "pending",
          ...(autoApprove
            ? {
                paidAmount: 0,
                paymentStatus: "unpaid",
                approvedBy: req.user.id,
                approvedAt: new Date(),
              }
            : { approvedBy: null, approvedAt: null }),
          gstEnabled: false,
          gstAmount: 0,
          attachments: [],
          createdBy: req.user.id,
        },
      ],
      session ? { session } : undefined,
    );
    expenseDoc = created;

    if (autoApprove) {
      await recordOutgoingPayment(session, {
        partyName: `Loan · ${loan.reference} · ${loan.name}`,
        expenseId,
        amount,
        mode: paymentMode,
        date,
        recordedBy: req.user.id,
      });
    }
  });

  if (autoApprove) await maybeAutoCloseLoan(id);

  const refreshed = await FinanceLoans.findOne({ id }).lean();
  const paymentsAsc = await loadLoanPayments(id);
  const { payments, summary } = allocateInstallments(refreshed, paymentsAsc);
  const freshExpense = await FinanceExpenses.findOne({ id: expenseId }).lean();

  res.status(201).json({
    expense: freshExpense ?? expenseDoc?.toObject?.() ?? expenseDoc,
    loan: {
      ...enrichLoan(refreshed, summary),
      payments,
    },
  });
}

export {
  listLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  recordInstallment,
  assertLoanId,
  maybeAutoCloseLoan,
};
