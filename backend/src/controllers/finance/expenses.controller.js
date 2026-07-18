import { FinanceExpenses, FinancePayments, FinanceLoans, FinanceSubscriptions, FinanceCheques, Projects, vendorsTable, clientsTable, usersTable, getNextSequence, companySettingsTable } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { escapeRegex } from "../../utils/regex.js";
import { expenseCategories, financePaymentModes } from "../../models/schema/finance/expenses.js";
import { resolveVendorFields } from "../../utils/vendor-fields.js";
import { assertLoanId, maybeAutoCloseLoan } from "./loans.controller.js";
import { assertSubscriptionId } from "./subscriptions.controller.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordOutgoingPayment } from "../../services/finance/payment-ledger.service.js";
import {
  isLegacyFullyPaidExpense,
  outstandingExpenseAmount,
  withExpenseSettlementView,
} from "../../services/finance/expense-cash.service.js";
import { deleteStoredFile } from "../../lib/file-storage.js";

async function assertExpenseVendorId(vendorId) {
  if (vendorId == null || vendorId === "") return null;
  const id = Number(vendorId);
  if (!Number.isFinite(id)) badRequest("vendorId must be a valid number.", "vendorId");
  const vendor = await vendorsTable.findOne({ id }).select({ id: 1 }).lean();
  if (!vendor) badRequest("Select a valid vendor.", "vendorId");
  return id;
}

async function assertAfterLockDate(dateToCheck) {
  if (!dateToCheck) return;
  const settings = await companySettingsTable.findOne().select({ fiscalLockDate: 1 }).lean();
  if (settings?.fiscalLockDate) {
    const checkTime = startOfDayDate(dateToCheck).getTime();
    const lockTime = startOfDayDate(settings.fiscalLockDate).getTime();
    if (checkTime <= lockTime) {
      badRequest("Transaction date cannot be on or before the closed fiscal lock date.", "date");
    }
  }
}

function startOfDayDate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function nextExpenseReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_exp_num_${year}`);
  return `EXP-${year}-${String(seq).padStart(4, "0")}`;
}

/** Block cash settlement outside Cheques when an issued cheque owns this bill. */
async function assertNotOpenChequeExpense(expense, session) {
  if (!expense?.chequeId) return;
  let q = FinanceCheques.findOne({ id: expense.chequeId }).select({ id: 1, status: 1, reference: 1 });
  if (session) q = q.session(session);
  const cheque = await q.lean();
  if (cheque?.status === "issued") {
    badRequest(
      `This bill is tied to issued cheque ${cheque.reference || `#${cheque.id}`}. Mark it cleared under Finance → Cheques.`,
      "chequeId",
    );
  }
}

async function resolvePayeeForExpense(expense, session) {
  if (expense.vendorId) {
    let q = vendorsTable.findOne({ id: expense.vendorId }).select({ companyName: 1 });
    if (session) q = q.session(session);
    const vendor = await q.lean();
    if (vendor?.companyName) {
      return {
        partyName: vendor.companyName,
        vendorId: expense.vendorId,
        employeeId: null,
        clientId: null,
      };
    }
  }
  if (expense.employeeId) {
    let q = usersTable.findOne({ id: expense.employeeId }).select({ name: 1 });
    if (session) q = q.session(session);
    const employee = await q.lean();
    if (employee?.name) {
      return {
        partyName: employee.name,
        vendorId: null,
        employeeId: expense.employeeId,
        clientId: null,
      };
    }
  }
  if (expense.clientId) {
    let q = clientsTable.findOne({ id: expense.clientId }).select({ companyName: 1 });
    if (session) q = q.session(session);
    const client = await q.lean();
    if (client?.companyName) {
      return {
        partyName: client.companyName,
        vendorId: null,
        employeeId: null,
        clientId: expense.clientId,
      };
    }
  }
  return {
    partyName: optionalString(expense.notes)?.slice(0, 120) || expense.reference,
    vendorId: expense.vendorId ?? null,
    employeeId: expense.employeeId ?? null,
    clientId: expense.clientId ?? null,
  };
}

async function enrichExpenses(items) {
  const projectIds = [...new Set(items.map((e) => e.projectId).filter(Boolean))];
  const employeeIds = [...new Set(items.map((e) => e.employeeId).filter(Boolean))];
  const vendorIds = [...new Set(items.map((e) => e.vendorId).filter(Boolean))];
  const loanIds = [...new Set(items.map((e) => e.loanId).filter(Boolean))];
  const subscriptionIds = [...new Set(items.map((e) => e.subscriptionId).filter(Boolean))];
  const chequeIds = [...new Set(items.map((e) => e.chequeId).filter(Boolean))];
  const [projects, employees, vendors, loans, subscriptions, cheques] = await Promise.all([
    projectIds.length ? Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean() : [],
    employeeIds.length ? usersTable.find({ id: { $in: employeeIds } }).select({ id: 1, name: 1 }).lean() : [],
    vendorIds.length
      ? vendorsTable.find({ id: { $in: vendorIds } }).select({
          id: 1,
          companyName: 1,
          vendorCategory: 1,
          vendorFields: 1,
          vendorNotes: 1,
        }).lean()
      : [],
    loanIds.length
      ? FinanceLoans.find({ id: { $in: loanIds } }).select({ id: 1, name: 1, reference: 1 }).lean()
      : [],
    subscriptionIds.length
      ? FinanceSubscriptions.find({ id: { $in: subscriptionIds } }).select({ id: 1, name: 1, reference: 1 }).lean()
      : [],
    chequeIds.length
      ? FinanceCheques.find({ id: { $in: chequeIds } }).select({ id: 1, reference: 1, chequeNumber: 1, status: 1 }).lean()
      : [],
  ]);
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const loanMap = new Map(loans.map((l) => [l.id, l]));
  const subscriptionMap = new Map(subscriptions.map((s) => [s.id, s]));
  const chequeMap = new Map(cheques.map((c) => [c.id, c]));
  return items.map((e) => {
    const vendor = e.vendorId ? vendorMap.get(e.vendorId) : null;
    const vendorFields = vendor ? resolveVendorFields(vendor) : [];
    const loan = e.loanId ? loanMap.get(e.loanId) : null;
    const subscription = e.subscriptionId ? subscriptionMap.get(e.subscriptionId) : null;
    const cheque = e.chequeId ? chequeMap.get(e.chequeId) : null;
    return withExpenseSettlementView({
      ...e,
      projectName: e.projectId ? projectMap.get(e.projectId) ?? null : null,
      employeeName: e.employeeId ? employeeMap.get(e.employeeId) ?? null : null,
      vendorName: vendor?.companyName ?? null,
      vendorFields,
      vendorSummary: vendorFields.length
        ? vendorFields.map((f) => `${f.label}: ${f.value}`).join(" · ")
        : vendor?.vendorNotes ?? null,
      loanName: loan?.name ?? null,
      loanReference: loan?.reference ?? null,
      subscriptionName: subscription?.name ?? null,
      subscriptionReference: subscription?.reference ?? null,
      chequeReference: cheque?.reference ?? null,
      chequeNumber: cheque?.chequeNumber ?? null,
      chequeStatus: cheque?.status ?? null,
    });
  });
}

async function listExpenses(req, res) {
  const { status, category, projectId, loanId, paymentStatus, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { isDeleted: { $ne: true } };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (projectId) filter.projectId = Number(projectId);
  if (loanId) filter.loanId = Number(loanId);
  if (paymentStatus) {
    if (paymentStatus === "paid") {
      // Include legacy approved bills (no settlement fields = treated as fully paid in UI).
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { paymentStatus: "paid" },
            {
              status: "approved",
              $and: [
                { $or: [{ paymentStatus: null }, { paymentStatus: { $exists: false } }] },
                { $or: [{ paidAmount: null }, { paidAmount: { $exists: false } }] },
              ],
            },
          ],
        },
      ];
    } else {
      filter.paymentStatus = paymentStatus;
    }
  }
  if (search) {
    const q = escapeRegex(String(search).trim());
    if (q) {
      const re = { $regex: q, $options: "i" };
      const vendorMatches = await vendorsTable
        .find({ companyName: re })
        .select({ id: 1 })
        .lean();
      const vendorIdsFromSearch = vendorMatches.map((v) => v.id);
      filter.$or = [
        { reference: re },
        { notes: re },
        ...(vendorIdsFromSearch.length ? [{ vendorId: { $in: vendorIdsFromSearch } }] : []),
      ];
    }
  }
  const [items, total] = await Promise.all([
    FinanceExpenses.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    FinanceExpenses.countDocuments(filter),
  ]);
  const expenses = await enrichExpenses(items);
  res.json({ expenses, total, page, limit });
}

async function getExpenseById(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id, isDeleted: { $ne: true } }).lean();
  if (!expense) notFound("Expense");
  const [enriched] = await enrichExpenses([expense]);

  const paymentRows = await FinancePayments.find({ expenseId: id })
    .sort({ date: -1, id: -1 })
    .select({
      id: 1,
      date: 1,
      amount: 1,
      mode: 1,
      reference: 1,
      receiptNumber: 1,
      status: 1,
      partyName: 1,
      vendorId: 1,
      recordedBy: 1,
      createdAt: 1,
    })
    .lean();

  const recorderIds = [...new Set(paymentRows.map((p) => p.recordedBy).filter(Boolean))];
  const recorders = recorderIds.length
    ? await usersTable.find({ id: { $in: recorderIds } }).select({ id: 1, name: 1 }).lean()
    : [];
  const recorderMap = new Map(recorders.map((u) => [u.id, u.name]));

  const payments = paymentRows.map((p) => ({
    ...p,
    recordedByName: p.recordedBy ? recorderMap.get(p.recordedBy) ?? null : null,
  }));

  res.json({
    ...enriched,
    payments,
    paymentCount: payments.length,
    paymentsTotal: payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
  });
}

async function createExpense(req, res) {
  const body = req.body ?? {};
  if (!body.date) badRequest("date is required.", "date");
  if (!expenseCategories.includes(body.category)) {
    badRequest(`category must be one of: ${expenseCategories.join(", ")}.`, "category");
  }
  if (body.category === "salary") {
    badRequest("Salary cost is pulled automatically from HRM payroll and cannot be entered as an expense.", "category");
  }
  await assertAfterLockDate(body.date);
  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!body.paymentMode) badRequest("paymentMode is required.", "paymentMode");

  const vendorId = await assertExpenseVendorId(body.vendorId);
  const loan = await assertLoanId(body.loanId);
  const loanId = loan?.id ?? null;
  if (loanId && loan.status === "closed") {
    badRequest("Cannot link a repayment to a closed loan.", "loanId");
  }
  const subscription = await assertSubscriptionId(body.subscriptionId);
  const subscriptionId = subscription?.id ?? null;

  const [id, reference] = await Promise.all([getNextSequence("finance_expenses"), nextExpenseReference()]);

  const expense = await FinanceExpenses.create({
    id,
    reference,
    date: new Date(body.date),
    category: body.category,
    amount,
    paymentMode: body.paymentMode,
    projectId: body.projectId ? Number(body.projectId) : null,
    employeeId: body.employeeId ? Number(body.employeeId) : null,
    vendorId,
    loanId,
    subscriptionId,
    notes: optionalString(body.notes) ?? null,
    status: "pending",
    gstEnabled: Boolean(body.gstEnabled),
    gstAmount: body.gstEnabled ? Math.round(Number(body.gstAmount) || 0) : 0,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    createdBy: req.user.id,
  });
  const [enriched] = await enrichExpenses([expense.toObject()]);
  res.status(201).json(enriched);
}

async function updateExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id, isDeleted: { $ne: true } }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "pending") {
    badRequest("Only pending expenses can be edited. Reverse the approval first.", "status");
  }
  const body = req.body ?? {};
  await assertAfterLockDate(expense.date);
  if (body.date !== undefined) {
    await assertAfterLockDate(body.date);
  }
  const updates = {};
  if (body.date !== undefined) updates.date = new Date(body.date);
  if (body.category !== undefined) {
    if (body.category === "salary") badRequest("Salary cost cannot be entered as an expense.", "category");
    if (!expenseCategories.includes(body.category)) {
      badRequest(`category must be one of: ${expenseCategories.join(", ")}.`, "category");
    }
    updates.category = body.category;
  }
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.paymentMode !== undefined) updates.paymentMode = body.paymentMode;
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  if (body.employeeId !== undefined) updates.employeeId = body.employeeId ? Number(body.employeeId) : null;
  if (body.vendorId !== undefined) updates.vendorId = await assertExpenseVendorId(body.vendorId);
  if (body.loanId !== undefined) {
    const loan = await assertLoanId(body.loanId);
    updates.loanId = loan?.id ?? null;
    if (updates.loanId && loan.status === "closed") {
      badRequest("Cannot link a repayment to a closed loan.", "loanId");
    }
  }
  if (body.subscriptionId !== undefined) {
    const subscription = await assertSubscriptionId(body.subscriptionId);
    updates.subscriptionId = subscription?.id ?? null;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.attachments !== undefined) updates.attachments = body.attachments;

  const updated = await FinanceExpenses.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const [enriched] = await enrichExpenses([updated]);
  res.json(enriched);
}

/**
 * Approve a bill and optionally record cash paid now.
 * Body: { paidAmount?: number, paymentMode?: string, paymentDate?: string, paymentReference?: string }
 * Default paidAmount = full bill (one-step approve & pay in full).
 */
async function approveExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id, isDeleted: { $ne: true } }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "pending") badRequest("Only pending expenses can be approved.", "status");

  const body = req.body ?? {};
  await assertAfterLockDate(expense.date);
  if (body.paymentDate) {
    await assertAfterLockDate(body.paymentDate);
  }
  const paidNowRaw =
    body.paidAmount !== undefined && body.paidAmount !== null && body.paidAmount !== ""
      ? Number(body.paidAmount)
      : Number(expense.amount);
  if (!Number.isFinite(paidNowRaw) || paidNowRaw < 0) {
    badRequest("paidAmount must be a number ≥ 0.", "paidAmount");
  }
  const paidNow = Math.round(paidNowRaw * 100) / 100;
  if (paidNow > expense.amount + 0.0001) {
    badRequest("paidAmount cannot exceed the bill amount.", "paidAmount");
  }

  const paymentMode = body.paymentMode || expense.paymentMode;
  if (paidNow > 0 && !financePaymentModes.includes(paymentMode)) {
    badRequest(`paymentMode must be one of: ${financePaymentModes.join(", ")}.`, "paymentMode");
  }

  let updated;

  await runInTx(async (session) => {
    // Start unsettled; optimistic lock on pending so concurrent approve cannot double-pay.
    updated = await FinanceExpenses.findOneAndUpdate(
      { id, status: "pending" },
      {
        $set: {
          status: "approved",
          approvedBy: req.user.id,
          approvedAt: new Date(),
          paidAmount: 0,
          paymentStatus: "unpaid",
        },
      },
      session ? { new: true, session } : { new: true },
    ).lean();
    if (!updated) {
      badRequest("Only pending expenses can be approved (it may have just been approved).", "status");
    }

    if (paidNow > 0) {
      await assertNotOpenChequeExpense(updated, session);
      const payee = await resolvePayeeForExpense(updated, session);
      const result = await recordOutgoingPayment(session, {
        partyName: payee.partyName,
        vendorId: payee.vendorId,
        employeeId: payee.employeeId,
        clientId: payee.clientId,
        expenseId: id,
        amount: paidNow,
        mode: paymentMode,
        date: body.paymentDate || expense.date,
        reference: optionalString(body.paymentReference),
        recordedBy: req.user.id,
      });
      updated = result.expense ?? updated;
    }
  });

  if (updated?.loanId) await maybeAutoCloseLoan(updated.loanId);
  const fresh = await FinanceExpenses.findOne({ id }).lean();
  const [enriched] = await enrichExpenses([fresh]);
  res.json(enriched);
}

async function rejectExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "pending") badRequest("Only pending expenses can be rejected.", "status");
  const updated = await FinanceExpenses.findOneAndUpdate(
    { id },
    { $set: { status: "rejected", approvedBy: req.user.id, approvedAt: new Date() } },
    { new: true },
  ).lean();
  const [enriched] = await enrichExpenses([updated]);
  res.json(enriched);
}

/**
 * Pay more toward an approved partially paid / unpaid bill.
 * Body: { amount, paymentMode?, date?, reference? }
 */
async function payExpenseRemaining(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id, isDeleted: { $ne: true } }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "approved") badRequest("Only approved expenses can be paid.", "status");
  if (isLegacyFullyPaidExpense(expense)) {
    badRequest("This expense is already fully settled.", "status");
  }
  const remaining = outstandingExpenseAmount(expense);
  if (!(remaining > 0)) badRequest("This expense has nothing remaining to pay.", "amount");

  const body = req.body ?? {};
  await assertAfterLockDate(expense.date);
  if (body.date) {
    await assertAfterLockDate(body.date);
  }
  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (amount > remaining + 0.0001) {
    badRequest(`Payment exceeds remaining due of ${remaining}.`, "amount");
  }

  const mode = body.paymentMode || expense.paymentMode;
  if (!financePaymentModes.includes(mode)) {
    badRequest(`paymentMode must be one of: ${financePaymentModes.join(", ")}.`, "paymentMode");
  }

  let payment;
  await runInTx(async (session) => {
    await assertNotOpenChequeExpense(expense, session);
    const payee = await resolvePayeeForExpense(expense, session);
    const result = await recordOutgoingPayment(session, {
      partyName: payee.partyName,
      vendorId: payee.vendorId,
      employeeId: payee.employeeId,
      clientId: payee.clientId,
      expenseId: id,
      amount,
      mode,
      date: body.date,
      reference: optionalString(body.reference),
      recordedBy: req.user.id,
    });
    payment = result.payment;
  });

  if (expense.loanId) await maybeAutoCloseLoan(expense.loanId);
  const fresh = await FinanceExpenses.findOne({ id }).lean();
  const [enriched] = await enrichExpenses([fresh]);
  res.status(201).json({ expense: enriched, payment });
}

async function deleteExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id, isDeleted: { $ne: true } }).lean();
  if (!expense) notFound("Expense");
  await assertAfterLockDate(expense.date);
  if (expense.status === "approved") {
    badRequest("Approved expenses cannot be deleted — reject instead if this was recorded in error.", "status");
  }
  const linkedPayment = await FinancePayments.findOne({ expenseId: id }).select({ id: 1 }).lean();
  if (linkedPayment) {
    badRequest("This expense has a linked payment. Delete the payment first.", "expenseId");
  }
  const linkedCheque = await FinanceCheques.findOne({ expenseId: id }).select({ id: 1, reference: 1 }).lean();
  if (linkedCheque) {
    badRequest(`This expense is linked to cheque ${linkedCheque.reference || `#${linkedCheque.id}`}. Delete the cheque first.`, "status");
  }

  // Delete cloud assets
  if (expense.attachments && expense.attachments.length > 0) {
    for (const attachment of expense.attachments) {
      try {
        await deleteStoredFile(attachment.url);
      } catch (err) {
        console.error(`Failed to delete storage file: ${attachment.url}`, err);
      }
    }
  }

  await FinanceExpenses.updateOne({ id }, { $set: { isDeleted: true, deletedAt: new Date() } });
  res.json({ success: true });
}

export {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  payExpenseRemaining,
  deleteExpense,
};
