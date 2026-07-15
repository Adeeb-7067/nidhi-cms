import {
  FinanceCheques,
  FinanceExpenses,
  vendorsTable,
  clientsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, optionalString } from "../../utils/route-errors.js";
import { escapeRegex } from "../../utils/regex.js";
import {
  chequePayeeTypes,
  chequePurposes,
  chequeStatuses,
} from "../../models/schema/finance/cheques.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordOutgoingPayment } from "../../services/finance/payment-ledger.service.js";

async function nextChequeReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_chq_num_${year}`);
  return `CHQ-${year}-${String(seq).padStart(4, "0")}`;
}

async function nextExpenseReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_exp_num_${year}`);
  return `EXP-${year}-${String(seq).padStart(4, "0")}`;
}

function normalizeAttachments(raw, userId) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a?.url && a?.name)
    .map((a) => ({
      name: String(a.name).trim(),
      url: String(a.url).trim(),
      key: a.key ? String(a.key) : undefined,
      mimetype: a.mimetype ? String(a.mimetype) : undefined,
      size: a.size != null ? Number(a.size) : undefined,
      uploadedBy: userId,
      uploadedAt: new Date(),
    }));
}

async function resolvePayee(body) {
  const payeeType = body.payeeType;
  if (!chequePayeeTypes.includes(payeeType)) {
    badRequest(`payeeType must be one of: ${chequePayeeTypes.join(", ")}.`, "payeeType");
  }

  if (payeeType === "vendor") {
    const vendorId = Number(body.vendorId);
    if (!Number.isFinite(vendorId)) badRequest("vendorId is required.", "vendorId");
    const vendor = await vendorsTable.findOne({ id: vendorId }).select({ id: 1, companyName: 1 }).lean();
    if (!vendor) badRequest("Select a valid vendor.", "vendorId");
    return {
      payeeType,
      vendorId,
      clientId: null,
      employeeId: null,
      payeeName: vendor.companyName || `Vendor #${vendorId}`,
    };
  }

  if (payeeType === "client") {
    const clientId = Number(body.clientId);
    if (!Number.isFinite(clientId)) badRequest("clientId is required.", "clientId");
    const client = await clientsTable.findOne({ id: clientId }).select({ id: 1, companyName: 1 }).lean();
    if (!client) badRequest("Select a valid client.", "clientId");
    return {
      payeeType,
      vendorId: null,
      clientId,
      employeeId: null,
      payeeName: client.companyName || `Client #${clientId}`,
    };
  }

  const employeeId = Number(body.employeeId);
  if (!Number.isFinite(employeeId)) badRequest("employeeId is required.", "employeeId");
  const employee = await usersTable.findOne({ id: employeeId }).select({ id: 1, name: 1 }).lean();
  if (!employee) badRequest("Select a valid employee.", "employeeId");
  return {
    payeeType,
    vendorId: null,
    clientId: null,
    employeeId,
    payeeName: employee.name || `Employee #${employeeId}`,
  };
}

function formatCheque(row) {
  if (!row) return null;
  return {
    ...row,
    expenseReference: row.expenseReference ?? null,
  };
}

async function attachExpenseRefs(cheques) {
  const expenseIds = [...new Set(cheques.map((c) => c.expenseId).filter(Boolean))];
  if (!expenseIds.length) return cheques.map(formatCheque);
  const expenses = await FinanceExpenses.find({ id: { $in: expenseIds } })
    .select({ id: 1, reference: 1, paymentStatus: 1, status: 1 })
    .lean();
  const map = new Map(expenses.map((e) => [e.id, e]));
  return cheques.map((c) => {
    const exp = map.get(c.expenseId);
    return formatCheque({
      ...c,
      expenseReference: exp?.reference ?? null,
      expensePaymentStatus: exp?.paymentStatus ?? null,
      expenseStatus: exp?.status ?? null,
    });
  });
}

async function listCheques(req, res) {
  const { status, payeeType, purpose, search } = req.query;
  const filter = {};
  if (status && chequeStatuses.includes(String(status))) filter.status = status;
  if (payeeType && chequePayeeTypes.includes(String(payeeType))) filter.payeeType = payeeType;
  if (purpose && chequePurposes.includes(String(purpose))) filter.purpose = purpose;
  if (search) {
    const q = escapeRegex(String(search).trim());
    if (q) {
      const re = { $regex: q, $options: "i" };
      filter.$or = [{ reference: re }, { chequeNumber: re }, { payeeName: re }, { bankName: re }, { notes: re }];
    }
  }
  const rows = await FinanceCheques.find(filter).sort({ issueDate: -1, id: -1 }).lean();
  res.json({ cheques: await attachExpenseRefs(rows) });
}

async function getChequeById(req, res) {
  const id = parseIdParam(req.params.id, "cheque id");
  const cheque = await FinanceCheques.findOne({ id }).lean();
  if (!cheque) notFound("Cheque");
  const [enriched] = await attachExpenseRefs([cheque]);
  res.json(enriched);
}

async function createCheque(req, res) {
  const body = req.body ?? {};
  const payee = await resolvePayee(body);

  const purpose = body.purpose || "normal";
  if (!chequePurposes.includes(purpose)) {
    badRequest(`purpose must be one of: ${chequePurposes.join(", ")}.`, "purpose");
  }

  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!body.chequeNumber?.trim()) badRequest("chequeNumber is required.", "chequeNumber");
  if (!body.issueDate) badRequest("issueDate is required.", "issueDate");
  if (!body.clearanceDate) badRequest("clearanceDate is required.", "clearanceDate");

  const issueDate = new Date(body.issueDate);
  const clearanceDate = new Date(body.clearanceDate);
  if (Number.isNaN(issueDate.getTime())) badRequest("issueDate is invalid.", "issueDate");
  if (Number.isNaN(clearanceDate.getTime())) badRequest("clearanceDate is invalid.", "clearanceDate");
  if (clearanceDate < issueDate) {
    badRequest("clearanceDate cannot be before issueDate.", "clearanceDate");
  }

  const attachments = normalizeAttachments(body.attachments ?? (body.photo ? [body.photo] : []), req.user.id);
  const category = purpose === "security_deposit" ? "security_deposit" : "misc";
  const notesParts = [
    `Cheque ${body.chequeNumber.trim()}`,
    purpose === "security_deposit" ? "Security deposit" : null,
    optionalString(body.notes),
  ].filter(Boolean);

  const result = await runInTx(async (session) => {
    const [chequeId, chequeRef, expenseId, expenseRef] = await Promise.all([
      getNextSequence("finance_cheques"),
      nextChequeReference(),
      getNextSequence("finance_expenses"),
      nextExpenseReference(),
    ]);

    const expensePayload = {
      id: expenseId,
      reference: expenseRef,
      date: issueDate,
      category,
      amount,
      paymentMode: "cheque",
      projectId: null,
      employeeId: payee.employeeId,
      vendorId: payee.vendorId,
      clientId: payee.clientId,
      loanId: null,
      subscriptionId: null,
      chequeId,
      notes: notesParts.join(" · "),
      status: "approved",
      paidAmount: 0,
      paymentStatus: "unpaid",
      gstEnabled: false,
      gstAmount: 0,
      attachments,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      createdBy: req.user.id,
    };

    const [expense] = await FinanceExpenses.create([expensePayload], session ? { session } : undefined);

    const chequePayload = {
      id: chequeId,
      reference: chequeRef,
      payeeType: payee.payeeType,
      vendorId: payee.vendorId,
      clientId: payee.clientId,
      employeeId: payee.employeeId,
      payeeName: payee.payeeName,
      purpose,
      amount,
      chequeNumber: body.chequeNumber.trim(),
      issueDate,
      clearanceDate,
      bankName: optionalString(body.bankName) ?? null,
      attachments,
      status: "issued",
      expenseId,
      notes: optionalString(body.notes) ?? null,
      createdBy: req.user.id,
    };

    const [cheque] = await FinanceCheques.create([chequePayload], session ? { session } : undefined);
    return { cheque: cheque.toObject ? cheque.toObject() : cheque, expense };
  });

  const [enriched] = await attachExpenseRefs([result.cheque]);
  res.status(201).json(enriched);
}

async function updateCheque(req, res) {
  const id = parseIdParam(req.params.id, "cheque id");
  const cheque = await FinanceCheques.findOne({ id }).lean();
  if (!cheque) notFound("Cheque");
  if (cheque.status !== "issued") {
    badRequest("Only issued cheques can be edited.", "status");
  }

  const body = req.body ?? {};
  const updates = {};

  if (body.clearanceDate !== undefined) {
    const clearanceDate = new Date(body.clearanceDate);
    if (Number.isNaN(clearanceDate.getTime())) badRequest("clearanceDate is invalid.", "clearanceDate");
    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date(cheque.issueDate);
    if (clearanceDate < issueDate) {
      badRequest("clearanceDate cannot be before issueDate.", "clearanceDate");
    }
    updates.clearanceDate = clearanceDate;
  }
  if (body.issueDate !== undefined) {
    const issueDate = new Date(body.issueDate);
    if (Number.isNaN(issueDate.getTime())) badRequest("issueDate is invalid.", "issueDate");
    updates.issueDate = issueDate;
  }
  if (body.bankName !== undefined) updates.bankName = optionalString(body.bankName) ?? null;
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.chequeNumber !== undefined) {
    if (!body.chequeNumber?.trim()) badRequest("chequeNumber is required.", "chequeNumber");
    updates.chequeNumber = body.chequeNumber.trim();
  }
  if (body.attachments !== undefined || body.photo !== undefined) {
    updates.attachments = normalizeAttachments(
      body.attachments ?? (body.photo ? [body.photo] : []),
      req.user.id,
    );
  }

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
    const expense = await FinanceExpenses.findOne({ id: cheque.expenseId }).lean();
    if (!expense) badRequest("Linked expense missing.", "expenseId");
    if ((expense.paidAmount ?? 0) > 0) {
      badRequest("Cannot change amount after any payment has been applied.", "amount");
    }
    updates.amount = amount;
    await FinanceExpenses.updateOne({ id: cheque.expenseId }, { $set: { amount } });
  }

  if (!Object.keys(updates).length) {
    const [enriched] = await attachExpenseRefs([cheque]);
    return res.json(enriched);
  }

  const updated = await FinanceCheques.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  if (updates.attachments) {
    await FinanceExpenses.updateOne({ id: cheque.expenseId }, { $set: { attachments: updates.attachments } });
  }
  if (updates.chequeNumber || updates.notes) {
    const notesParts = [
      `Cheque ${updates.chequeNumber ?? cheque.chequeNumber}`,
      cheque.purpose === "security_deposit" ? "Security deposit" : null,
      updates.notes !== undefined ? updates.notes : cheque.notes,
    ].filter(Boolean);
    await FinanceExpenses.updateOne({ id: cheque.expenseId }, { $set: { notes: notesParts.join(" · ") } });
  }

  const [enriched] = await attachExpenseRefs([updated]);
  res.json(enriched);
}

async function clearCheque(req, res) {
  const id = parseIdParam(req.params.id, "cheque id");
  const clearDate = req.body?.date ? new Date(req.body.date) : new Date();
  if (Number.isNaN(clearDate.getTime())) badRequest("date is invalid.", "date");

  await runInTx(async (session) => {
    let cq = FinanceCheques.findOne({ id, status: "issued" });
    if (session) cq = cq.session(session);
    const cheque = await cq.lean();
    if (!cheque) {
      const exists = await FinanceCheques.findOne({ id }).select({ id: 1 }).lean();
      if (!exists) notFound("Cheque");
      badRequest("Only issued cheques can be cleared.", "status");
    }

    await recordOutgoingPayment(session, {
      partyName: cheque.payeeName,
      vendorId: cheque.vendorId,
      employeeId: cheque.employeeId,
      clientId: cheque.clientId,
      expenseId: cheque.expenseId,
      amount: cheque.amount,
      mode: "cheque",
      date: clearDate,
      reference: `CHQ-${cheque.chequeNumber}`,
      recordedBy: req.user.id,
      allowIssuedChequeExpense: true,
    });

    const result = await FinanceCheques.updateOne(
      { id, status: "issued" },
      {
        $set: {
          status: "cleared",
          clearedAt: clearDate,
          clearedBy: req.user.id,
        },
      },
      session ? { session } : undefined,
    );
    if (!result.matchedCount) {
      badRequest("Cheque status changed during clear — try again.", "status");
    }
  });

  const updated = await FinanceCheques.findOne({ id }).lean();
  const [enriched] = await attachExpenseRefs([updated]);
  res.json(enriched);
}

async function cancelCheque(req, res) {
  const id = parseIdParam(req.params.id, "cheque id");

  await runInTx(async (session) => {
    let cq = FinanceCheques.findOne({ id, status: "issued" });
    if (session) cq = cq.session(session);
    const cheque = await cq.lean();
    if (!cheque) {
      const exists = await FinanceCheques.findOne({ id }).select({ id: 1 }).lean();
      if (!exists) notFound("Cheque");
      badRequest("Only issued cheques can be cancelled.", "status");
    }

    let eq = FinanceExpenses.findOne({ id: cheque.expenseId });
    if (session) eq = eq.session(session);
    const expense = await eq.lean();
    if (expense && (expense.paidAmount ?? 0) > 0) {
      badRequest("Cannot cancel a cheque that already has payments.", "status");
    }

    const opts = session ? { session } : undefined;
    const result = await FinanceCheques.updateOne(
      { id, status: "issued" },
      { $set: { status: "cancelled" } },
      opts,
    );
    if (!result.matchedCount) {
      badRequest("Cheque status changed during cancel — try again.", "status");
    }
    if (expense) {
      await FinanceExpenses.updateOne(
        { id: expense.id },
        { $set: { status: "rejected", notes: `${expense.notes ?? ""} · Cheque cancelled`.trim() } },
        opts,
      );
    }
  });

  const updated = await FinanceCheques.findOne({ id }).lean();
  const [enriched] = await attachExpenseRefs([updated]);
  res.json(enriched);
}

async function bounceCheque(req, res) {
  const id = parseIdParam(req.params.id, "cheque id");

  const cheque = await FinanceCheques.findOne({ id, status: "issued" }).lean();
  if (!cheque) {
    const exists = await FinanceCheques.findOne({ id }).select({ id: 1 }).lean();
    if (!exists) notFound("Cheque");
    badRequest("Only issued cheques can be marked bounced.", "status");
  }

  const expense = await FinanceExpenses.findOne({ id: cheque.expenseId }).lean();
  if (expense && (expense.paidAmount ?? 0) > 0) {
    badRequest("Cannot bounce a cheque that already has payments.", "status");
  }

  const updated = await FinanceCheques.findOneAndUpdate(
    { id, status: "issued" },
    { $set: { status: "bounced" } },
    { new: true },
  ).lean();
  if (!updated) badRequest("Cheque status changed during bounce — try again.", "status");

  const [enriched] = await attachExpenseRefs([updated]);
  res.json(enriched);
}

export {
  listCheques,
  getChequeById,
  createCheque,
  updateCheque,
  clearCheque,
  cancelCheque,
  bounceCheque,
};
