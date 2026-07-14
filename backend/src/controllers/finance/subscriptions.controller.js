import {
  FinanceSubscriptions,
  FinanceExpenses,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, optionalString } from "../../utils/route-errors.js";
import { escapeRegex } from "../../utils/regex.js";
import { subscriptionStatuses, billingCycles } from "../../models/schema/finance/subscriptions.js";
import { financePaymentModes } from "../../models/schema/finance/expenses.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordOutgoingPayment } from "../../services/finance/payment-ledger.service.js";

async function nextSubscriptionReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_sub_num_${year}`);
  return `SUB-${year}-${String(seq).padStart(4, "0")}`;
}

async function nextExpenseReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_exp_num_${year}`);
  return `EXP-${year}-${String(seq).padStart(4, "0")}`;
}

function activeAssignments(sub) {
  return (sub.assignments ?? []).filter((a) => !a.revokedAt);
}

function enrichSubscription(sub, employeeMap = new Map()) {
  const active = activeAssignments(sub);
  const seatsUsed = active.length;
  const seatsPurchased = sub.seatsPurchased ?? 0;
  return {
    ...sub,
    seatsUsed,
    seatsAvailable: Math.max(0, seatsPurchased - seatsUsed),
    assignments: (sub.assignments ?? []).map((a) => ({
      ...a,
      employeeName: employeeMap.get(a.employeeId) ?? null,
      isActive: !a.revokedAt,
    })),
  };
}

async function employeeNameMap(employeeIds) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await usersTable.find({ id: { $in: ids } }).select({ id: 1, name: 1 }).lean();
  return new Map(rows.map((u) => [u.id, u.name]));
}

async function assertSubscriptionId(subscriptionId) {
  if (subscriptionId == null || subscriptionId === "") return null;
  const id = Number(subscriptionId);
  if (!Number.isFinite(id)) badRequest("subscriptionId must be a valid number.", "subscriptionId");
  const sub = await FinanceSubscriptions.findOne({ id }).select({ id: 1, status: 1, name: 1 }).lean();
  if (!sub) badRequest("Select a valid subscription.", "subscriptionId");
  return sub;
}

async function listSubscriptions(req, res) {
  const { status, search } = req.query;
  const filter = {};
  if (status && subscriptionStatuses.includes(String(status))) filter.status = status;
  if (search) {
    const q = escapeRegex(String(search).trim());
    if (q) {
      const re = { $regex: q, $options: "i" };
      filter.$or = [{ name: re }, { vendorName: re }, { reference: re }, { plan: re }];
    }
  }
  const rows = await FinanceSubscriptions.find(filter).sort({ createdAt: -1 }).lean();
  const employeeIds = rows.flatMap((s) => (s.assignments ?? []).map((a) => a.employeeId));
  const map = await employeeNameMap(employeeIds);
  res.json({ subscriptions: rows.map((s) => enrichSubscription(s, map)) });
}

async function getSubscriptionById(req, res) {
  const id = parseIdParam(req.params.id, "subscription id");
  const sub = await FinanceSubscriptions.findOne({ id }).lean();
  if (!sub) notFound("Subscription");
  const map = await employeeNameMap((sub.assignments ?? []).map((a) => a.employeeId));
  const expenses = await FinanceExpenses.find({ subscriptionId: id })
    .sort({ date: -1 })
    .select({ id: 1, reference: 1, date: 1, amount: 1, status: 1, notes: 1, paymentMode: 1 })
    .lean();
  res.json({
    ...enrichSubscription(sub, map),
    expenses,
  });
}

async function createSubscription(req, res) {
  const body = req.body ?? {};
  if (!body.name?.trim()) badRequest("name is required.", "name");
  const seatsPurchased = Number(body.seatsPurchased);
  if (!(seatsPurchased >= 1)) badRequest("seatsPurchased must be at least 1.", "seatsPurchased");
  const costAmount = Number(body.costAmount);
  if (!(costAmount >= 0) || Number.isNaN(costAmount)) {
    badRequest("costAmount must be zero or positive.", "costAmount");
  }
  const billingCycle = body.billingCycle || "monthly";
  if (!billingCycles.includes(billingCycle)) {
    badRequest(`billingCycle must be one of: ${billingCycles.join(", ")}.`, "billingCycle");
  }

  const [id, reference] = await Promise.all([
    getNextSequence("finance_subscriptions"),
    nextSubscriptionReference(),
  ]);

  const sub = await FinanceSubscriptions.create({
    id,
    reference,
    name: body.name.trim(),
    vendorName: optionalString(body.vendorName) ?? null,
    plan: optionalString(body.plan) ?? null,
    billingCycle,
    seatsPurchased,
    costAmount,
    renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
    status: "active",
    notes: optionalString(body.notes) ?? null,
    assignments: [],
    createdBy: req.user.id,
  });

  res.status(201).json(enrichSubscription(sub.toObject()));
}

async function updateSubscription(req, res) {
  const id = parseIdParam(req.params.id, "subscription id");
  const sub = await FinanceSubscriptions.findOne({ id }).lean();
  if (!sub) notFound("Subscription");
  const body = req.body ?? {};
  const updates = {};

  if (body.name !== undefined) {
    if (!body.name?.trim()) badRequest("name is required.", "name");
    updates.name = body.name.trim();
  }
  if (body.vendorName !== undefined) updates.vendorName = optionalString(body.vendorName) ?? null;
  if (body.plan !== undefined) updates.plan = optionalString(body.plan) ?? null;
  if (body.billingCycle !== undefined) {
    if (!billingCycles.includes(body.billingCycle)) {
      badRequest(`billingCycle must be one of: ${billingCycles.join(", ")}.`, "billingCycle");
    }
    updates.billingCycle = body.billingCycle;
  }
  if (body.seatsPurchased !== undefined) {
    const seatsPurchased = Number(body.seatsPurchased);
    if (!(seatsPurchased >= 1)) badRequest("seatsPurchased must be at least 1.", "seatsPurchased");
    const used = activeAssignments(sub).length;
    if (seatsPurchased < used) {
      badRequest(`Cannot set seats below currently assigned seats (${used}).`, "seatsPurchased");
    }
    updates.seatsPurchased = seatsPurchased;
  }
  if (body.costAmount !== undefined) {
    const costAmount = Number(body.costAmount);
    if (!(costAmount >= 0) || Number.isNaN(costAmount)) {
      badRequest("costAmount must be zero or positive.", "costAmount");
    }
    updates.costAmount = costAmount;
  }
  if (body.renewalDate !== undefined) {
    updates.renewalDate = body.renewalDate ? new Date(body.renewalDate) : null;
  }
  if (body.status !== undefined) {
    if (!subscriptionStatuses.includes(body.status)) {
      badRequest(`status must be one of: ${subscriptionStatuses.join(", ")}.`, "status");
    }
    updates.status = body.status;
  }
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;

  const updated = await FinanceSubscriptions.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const map = await employeeNameMap((updated.assignments ?? []).map((a) => a.employeeId));
  res.json(enrichSubscription(updated, map));
}

async function deleteSubscription(req, res) {
  const id = parseIdParam(req.params.id, "subscription id");
  const sub = await FinanceSubscriptions.findOne({ id }).lean();
  if (!sub) notFound("Subscription");
  if (activeAssignments(sub).length > 0) {
    badRequest("Revoke all seats before deleting this subscription.", "assignments");
  }
  const linked = await FinanceExpenses.findOne({ subscriptionId: id }).select({ id: 1 }).lean();
  if (linked) {
    badRequest("This subscription has linked expenses. Remove them before deleting.", "subscriptionId");
  }
  await FinanceSubscriptions.deleteOne({ id });
  res.json({ success: true });
}

async function assignSeat(req, res) {
  const id = parseIdParam(req.params.id, "subscription id");
  const sub = await FinanceSubscriptions.findOne({ id }).lean();
  if (!sub) notFound("Subscription");
  if (sub.status !== "active") badRequest("Cannot assign seats on a cancelled subscription.", "status");

  const body = req.body ?? {};
  const employeeId = Number(body.employeeId);
  if (!Number.isFinite(employeeId)) badRequest("employeeId is required.", "employeeId");
  const employee = await usersTable.findOne({ id: employeeId }).select({ id: 1, name: 1 }).lean();
  if (!employee) badRequest("Select a valid employee.", "employeeId");

  const active = activeAssignments(sub);
  if (active.length >= sub.seatsPurchased) {
    badRequest("No seats available. Increase seats purchased or revoke an assignment.", "seatsPurchased");
  }
  if (active.some((a) => a.employeeId === employeeId)) {
    badRequest("This employee already has an active seat on this subscription.", "employeeId");
  }

  const assignmentId = await getNextSequence(`fin_sub_seat_${id}`);
  const assignment = {
    id: assignmentId,
    employeeId,
    seatEmail: optionalString(body.seatEmail) ?? null,
    assignedAt: new Date(),
    revokedAt: null,
    notes: optionalString(body.notes) ?? null,
  };

  const updated = await FinanceSubscriptions.findOneAndUpdate(
    { id },
    { $push: { assignments: assignment } },
    { new: true },
  ).lean();

  const map = await employeeNameMap((updated.assignments ?? []).map((a) => a.employeeId));
  res.status(201).json(enrichSubscription(updated, map));
}

async function revokeSeat(req, res) {
  const id = parseIdParam(req.params.id, "subscription id");
  const assignmentId = parseIdParam(req.params.assignmentId, "assignment id");
  const sub = await FinanceSubscriptions.findOne({ id }).lean();
  if (!sub) notFound("Subscription");

  const assignment = (sub.assignments ?? []).find((a) => a.id === assignmentId);
  if (!assignment) notFound("Assignment");
  if (assignment.revokedAt) badRequest("This seat is already revoked.", "assignmentId");

  const updated = await FinanceSubscriptions.findOneAndUpdate(
    { id, "assignments.id": assignmentId },
    { $set: { "assignments.$.revokedAt": new Date() } },
    { new: true },
  ).lean();

  const map = await employeeNameMap((updated.assignments ?? []).map((a) => a.employeeId));
  res.json(enrichSubscription(updated, map));
}

/** Record a subscription renewal / bill as a software expense. */
async function recordPayment(req, res) {
  const id = parseIdParam(req.params.id, "subscription id");
  const sub = await FinanceSubscriptions.findOne({ id }).lean();
  if (!sub) notFound("Subscription");

  const body = req.body ?? {};
  const amount = Number(body.amount ?? sub.costAmount);
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

  const notes = optionalString(body.notes) ?? `Subscription payment · ${sub.reference} · ${sub.name}`;

  let expenseDoc;
  await runInTx(async (session) => {
    const [created] = await FinanceExpenses.create(
      [
        {
          id: expenseId,
          reference,
          date,
          category: "software",
          amount,
          paymentMode,
          projectId: null,
          employeeId: null,
          vendorId: null,
          loanId: null,
          subscriptionId: id,
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
        partyName: `Subscription · ${sub.reference} · ${sub.name}`,
        expenseId,
        amount,
        mode: paymentMode,
        date,
        recordedBy: req.user.id,
      });
    }
  });

  if (body.renewalDate) {
    await FinanceSubscriptions.updateOne({ id }, { $set: { renewalDate: new Date(body.renewalDate) } });
  }

  const refreshed = await FinanceSubscriptions.findOne({ id }).lean();
  const map = await employeeNameMap((refreshed.assignments ?? []).map((a) => a.employeeId));
  const expenses = await FinanceExpenses.find({ subscriptionId: id })
    .sort({ date: -1 })
    .select({ id: 1, reference: 1, date: 1, amount: 1, status: 1, notes: 1, paymentMode: 1 })
    .lean();
  const freshExpense = await FinanceExpenses.findOne({ id: expenseId }).lean();

  res.status(201).json({
    expense: freshExpense ?? expenseDoc?.toObject?.() ?? expenseDoc,
    subscription: { ...enrichSubscription(refreshed, map), expenses },
  });
}

export {
  listSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  assignSeat,
  revokeSeat,
  recordPayment,
  assertSubscriptionId,
};
