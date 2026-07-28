import { FinanceLoans, FinanceExpenses, getNextSequence } from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, optionalString } from "../../../utils/route-errors.js";
import { escapeRegex } from "../../../utils/regex.js";
import { loanStatuses, loanSources } from "../schema/loans.js";
import { financePaymentModes } from "../schema/expenses.js";
import { recognizedExpenseAmount } from "../services/expense-cash.service.js";
import { runInTx } from "../../../lib/db-tx.js";
import { recordOutgoingPayment } from "../services/payment-ledger.service.js";

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

const LOAN_ALLOCATIONS = new Set(["both", "interest", "principal"]);

/** Reducing-balance EMI; interestRate is % per month. */
function calcEmiAmount(principal, monthlyRatePercent, tenureMonths) {
  const p = Number(principal);
  const n = Number(tenureMonths);
  const rate = Number(monthlyRatePercent) || 0;
  if (!(p > 0) || !(n >= 1)) return null;
  if (!(rate > 0)) return Math.round(p / n);
  const r = rate / 100;
  const factor = Math.pow(1 + r, n);
  if (!Number.isFinite(factor) || factor === 1) return Math.round(p / n);
  return Math.round((p * r * factor) / (factor - 1));
}

function monthlyInterestDue(outstanding, monthlyRatePercent) {
  const rate = Number(monthlyRatePercent) || 0;
  if (!(outstanding > 0) || !(rate > 0)) return 0;
  return Math.round(outstanding * (rate / 100));
}

/**
 * Allocate each approved installment into interest vs principal (reducing balance).
 * Payments must be chronological (oldest first).
 *
 * loanAllocation on the expense:
 * - both (default): interest due first, remainder to principal (standard EMI)
 * - interest: up to one month's interest due; any excess reduces principal
 * - principal: apply to principal first; any excess beyond outstanding → interest
 */
function allocateInstallments(loan, paymentsAsc) {
  // interestRate is % per month (not annual).
  const monthlyRatePercent = Number(loan.interestRate) || 0;
  let outstanding = Number(loan.principal) || 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalCashPaid = 0;

  const allocated = paymentsAsc.map((p) => {
    const allocation = LOAN_ALLOCATIONS.has(p.loanAllocation) ? p.loanAllocation : "both";
    const base = {
      id: p.id,
      reference: p.reference,
      date: p.date,
      amount: p.amount,
      status: p.status,
      notes: p.notes ?? null,
      paymentMode: p.paymentMode,
      loanAllocation: allocation,
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

    let principalPortion = 0;
    let interestActual = 0;
    const interestDue = monthlyInterestDue(outstanding, monthlyRatePercent);

    if (allocation === "interest") {
      // Cap interest at this month's due; surplus reduces principal.
      interestActual = Math.min(amount, interestDue);
      principalPortion = amount - interestActual;
      if (principalPortion > outstanding) principalPortion = outstanding;
      interestActual = amount - principalPortion;
    } else if (allocation === "principal") {
      principalPortion = Math.min(amount, outstanding);
      interestActual = amount - principalPortion;
    } else {
      // both — interest due first, remainder to principal
      const interestCap = Math.min(amount, interestDue);
      principalPortion = amount - interestCap;
      if (principalPortion > outstanding) principalPortion = outstanding;
      if (principalPortion < 0) principalPortion = 0;
      interestActual = amount - principalPortion;
    }

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
    .select({
      id: 1,
      reference: 1,
      date: 1,
      amount: 1,
      status: 1,
      notes: 1,
      paymentMode: 1,
      paidAmount: 1,
      paymentStatus: 1,
      loanAllocation: 1,
    })
    .lean();
}

function emptyLoanSummary(principal = 0) {
  return {
    totalCashPaid: 0,
    totalPrincipalPaid: 0,
    totalInterestPaid: 0,
    remainingPrincipal: Math.round(Number(principal) || 0),
    paidAmount: 0,
    remainingAmount: Math.round(Number(principal) || 0),
    estimatedTotalInterest: null,
    estimatedTotalPayable: null,
    installmentsPaid: 0,
    installmentsPending: 0,
  };
}

function enrichLoan(loan, summary) {
  const s = summary ?? emptyLoanSummary(loan?.principal);
  return {
    ...loan,
    paidAmount: s.paidAmount,
    remainingAmount: s.remainingAmount,
    totalCashPaid: s.totalCashPaid,
    totalPrincipalPaid: s.totalPrincipalPaid,
    totalInterestPaid: s.totalInterestPaid,
    remainingPrincipal: s.remainingPrincipal,
    estimatedTotalInterest: s.estimatedTotalInterest,
    estimatedTotalPayable: s.estimatedTotalPayable,
    installmentsPaid: s.installmentsPaid,
    installmentsPending: s.installmentsPending,
  };
}

async function buildSummariesForLoans(loans) {
  if (!loans.length) return new Map();
  const ids = loans.map((l) => l.id);
  const expenses = await FinanceExpenses.find({ loanId: { $in: ids } })
    .sort({ date: 1, id: 1 })
    .select({
      id: 1,
      loanId: 1,
      reference: 1,
      date: 1,
      amount: 1,
      status: 1,
      notes: 1,
      paymentMode: 1,
      paidAmount: 1,
      paymentStatus: 1,
      loanAllocation: 1,
    })
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
  const { status, source, search } = req.query;
  const filter = {};
  if (status && loanStatuses.includes(String(status))) filter.status = status;
  if (source && loanSources.includes(String(source))) filter.source = source;
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
  const source = body.source || "bank";
  if (!loanSources.includes(source)) {
    badRequest(`source must be one of: ${loanSources.join(", ")}.`, "source");
  }
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

  // Prefer server-side EMI so the stored schedule matches monthly-rate math.
  let emiAmount = calcEmiAmount(principal, interestRate ?? 0, tenureMonths);
  if (emiAmount == null && body.emiAmount != null && body.emiAmount !== "") {
    emiAmount = Number(body.emiAmount);
    if (!(emiAmount >= 0)) badRequest("emiAmount must be zero or positive.", "emiAmount");
  }

  const [id, reference] = await Promise.all([getNextSequence("finance_loans"), nextLoanReference()]);
  const loan = await FinanceLoans.create({
    id,
    reference,
    name: body.name.trim(),
    lender: body.lender.trim(),
    source,
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
  if (body.source !== undefined) {
    if (!loanSources.includes(body.source)) {
      badRequest(`source must be one of: ${loanSources.join(", ")}.`, "source");
    }
    updates.source = body.source;
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

  const nextPrincipal = updates.principal ?? loan.principal;
  const nextRate =
    updates.interestRate !== undefined ? updates.interestRate : loan.interestRate;
  const nextTenure =
    updates.tenureMonths !== undefined ? updates.tenureMonths : loan.tenureMonths;
  const recomputedEmi = calcEmiAmount(nextPrincipal, nextRate ?? 0, nextTenure);
  if (recomputedEmi != null) {
    updates.emiAmount = recomputedEmi;
  } else if (
    body.emiAmount !== undefined ||
    updates.principal !== undefined ||
    updates.interestRate !== undefined ||
    updates.tenureMonths !== undefined
  ) {
    if (body.emiAmount == null || body.emiAmount === "") updates.emiAmount = null;
    else if (body.emiAmount !== undefined) {
      const emiAmount = Number(body.emiAmount);
      if (!(emiAmount >= 0)) badRequest("emiAmount must be zero or positive.", "emiAmount");
      updates.emiAmount = emiAmount;
    } else {
      updates.emiAmount = null;
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
  const loanAllocationRaw = optionalString(body.loanAllocation) ?? optionalString(body.allocation) ?? "both";
  const loanAllocation = LOAN_ALLOCATIONS.has(loanAllocationRaw) ? loanAllocationRaw : null;
  if (!loanAllocation) {
    badRequest('loanAllocation must be one of: both, interest, principal.', "loanAllocation");
  }

  const [expenseId, reference] = await Promise.all([
    getNextSequence("finance_expenses"),
    nextExpenseReference(),
  ]);

  const allocationLabel =
    loanAllocation === "interest"
      ? "interest only"
      : loanAllocation === "principal"
        ? "principal only"
        : "interest + principal";
  const notes =
    optionalString(body.notes) ??
    `Installment for ${loan.reference} · ${loan.name} (${allocationLabel})`;

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
          loanAllocation,
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
