import { vendorsTable, FinancePayments } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { runInTx } from "../../lib/db-tx.js";
import {
  recordIncomingPayment,
  recordOutgoingPayment,
  reverseIncomingPaymentPair,
  reverseCashFromExpense,
} from "../../services/finance/payment-ledger.service.js";
import { financePaymentModes } from "../../models/schema/finance/expenses.js";
import {
  listUnifiedPayments,
  getUnifiedPayment,
  computePaymentsSummary,
} from "../../services/finance/unified-ledger.service.js";

async function listPayments(req, res) {
  const { direction, search } = req.query;
  const { page, limit } = parsePagination(req.query);
  const result = await listUnifiedPayments({
    direction: direction ? String(direction) : undefined,
    search: search ? String(search) : undefined,
    page,
    limit,
  });
  res.json(result);
}

async function getPaymentsSummary(req, res) {
  const summary = await computePaymentsSummary();
  res.json(summary);
}

async function getPaymentById(req, res) {
  const id = parseIdParam(req.params.id, "payment id");
  const source = req.query.source === "sales" ? "sales" : "finance";
  const payment = await getUnifiedPayment(source, id);
  res.json(payment);
}

async function recordPayment(req, res) {
  const body = req.body ?? {};
  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!body.mode) badRequest("mode is required.", "mode");
  if (body.direction !== "incoming" && body.direction !== "outgoing") {
    badRequest("direction must be 'incoming' or 'outgoing'.", "direction");
  }

  let result;
  await runInTx(async (session) => {
    if (body.direction === "incoming") {
      if (!body.clientId) badRequest("clientId is required for incoming payments.", "clientId");
      result = await recordIncomingPayment(session, {
        clientId: Number(body.clientId),
        projectId: body.projectId ? Number(body.projectId) : null,
        invoiceId: body.invoiceId ? Number(body.invoiceId) : null,
        amount,
        mode: body.mode,
        date: body.date,
        recordedBy: req.user.id,
      });
      result = { payment: result.payment, invoiceStatus: result.invoiceStatus };
      return;
    }

    let partyName = body.partyName;
    let vendorId = body.vendorId ? Number(body.vendorId) : null;
    if (vendorId && !partyName) {
      const vendor = await vendorsTable.findOne({ id: vendorId }).session(session).select({ companyName: 1 }).lean();
      if (!vendor) notFound("Vendor");
      partyName = vendor.companyName;
    }
    const outgoing = await recordOutgoingPayment(session, {
      partyName,
      vendorId,
      employeeId: body.employeeId ? Number(body.employeeId) : null,
      expenseId: body.expenseId ? Number(body.expenseId) : null,
      bankAccountId: body.bankAccountId ? Number(body.bankAccountId) : null,
      amount,
      mode: body.mode,
      date: body.date,
      reference: body.reference,
      recordedBy: req.user.id,
    });
    result = { payment: outgoing.payment, invoiceStatus: null };
  });

  res.status(201).json(result);
}

/**
 * Edits an outgoing finance payment. Bank/vendor ledgers are computed live from
 * payment rows, so amount/date/mode/reference/payee can all change safely.
 * Incoming payments are receipts tied to income + invoices and are locked here.
 */
async function updatePayment(req, res) {
  const id = parseIdParam(req.params.id, "payment id");
  const payment = await FinancePayments.findOne({ id }).lean();
  if (!payment) notFound("Payment");
  if (payment.salesPaymentId) {
    badRequest("This payment is synced from a sales receipt — edit it in Sales.", "salesPaymentId");
  }
  if (payment.direction === "incoming") {
    badRequest("Incoming receipts can't be edited — delete and re-record if it was wrong.", "direction");
  }

  const body = req.body ?? {};
  const updates = {};
  if (body.date !== undefined) {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) badRequest("date is invalid.", "date");
    updates.date = d;
  }
  if (body.amount !== undefined) {
    if (payment.expenseId) {
      badRequest(
        "This payment is tied to an expense bill. Delete and re-record (or use Pay remaining) to change the amount so bill settlement stays correct.",
        "amount",
      );
    }
    const amount = Number(body.amount);
    if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
    updates.amount = amount;
  }
  if (body.mode !== undefined) {
    if (!financePaymentModes.includes(body.mode)) {
      badRequest(`mode must be one of: ${financePaymentModes.join(", ")}.`, "mode");
    }
    updates.mode = body.mode;
  }
  if (body.reference !== undefined) {
    updates.reference = optionalString(body.reference) ?? payment.reference;
  }
  if (body.partyName !== undefined && !payment.vendorId) {
    const name = optionalString(body.partyName);
    if (!name) badRequest("partyName cannot be empty.", "partyName");
    updates.partyName = name;
  }

  const updated = await FinancePayments.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

/**
 * Deletes a finance payment. Outgoing disbursements are removed directly (ledgers
 * recompute). Incoming receipts reverse the paired income + invoice balance in a
 * transaction. Sales-synced payments are managed in Sales and are blocked.
 */
async function deletePayment(req, res) {
  const id = parseIdParam(req.params.id, "payment id");
  const payment = await FinancePayments.findOne({ id }).lean();
  if (!payment) notFound("Payment");
  if (payment.salesPaymentId) {
    badRequest("This payment is synced from a sales receipt — delete it in Sales.", "salesPaymentId");
  }

  if (payment.direction === "incoming") {
    await runInTx(async (session) => {
      await reverseIncomingPaymentPair(session, { paymentId: id, incomeId: payment.incomeId ?? null });
    });
  } else {
    await runInTx(async (session) => {
      if (payment.expenseId) {
        await reverseCashFromExpense(session, payment.expenseId, payment.amount);
      }
      await FinancePayments.deleteOne({ id }, { session });
    });
  }
  res.json({ success: true });
}

export {
  listPayments,
  getPaymentsSummary,
  getPaymentById,
  recordPayment,
  updatePayment,
  deletePayment,
};
