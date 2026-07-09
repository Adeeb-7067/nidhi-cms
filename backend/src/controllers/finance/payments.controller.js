import { FinancePayments, clientsTable, usersTable } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination } from "../../utils/route-errors.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordIncomingPayment, recordOutgoingPayment } from "../../services/finance/payment-ledger.service.js";

async function enrichPayments(items) {
  const recorderIds = [...new Set(items.map((p) => p.recordedBy).filter(Boolean))];
  const recorders = recorderIds.length
    ? await usersTable.find({ id: { $in: recorderIds } }).select({ id: 1, name: 1 }).lean()
    : [];
  const recorderMap = new Map(recorders.map((u) => [u.id, u.name]));
  return items.map((p) => ({ ...p, recordedByName: recorderMap.get(p.recordedBy) ?? null }));
}

async function listPayments(req, res) {
  const { direction, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (direction) filter.direction = direction;
  if (search) {
    const q = String(search).trim();
    if (q) {
      const re = { $regex: q, $options: "i" };
      filter.$or = [{ partyName: re }, { reference: re }, { receiptNumber: re }];
    }
  }
  const [items, total] = await Promise.all([
    FinancePayments.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FinancePayments.countDocuments(filter),
  ]);
  const payments = await enrichPayments(items);
  res.json({ payments, total, page, limit });
}

async function getPaymentById(req, res) {
  const id = parseIdParam(req.params.id, "payment id");
  const payment = await FinancePayments.findOne({ id }).lean();
  if (!payment) notFound("Payment");
  const [enriched] = await enrichPayments([payment]);
  res.json(enriched);
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
      const vendor = await clientsTable.findOne({ id: vendorId }).session(session).select({ companyName: 1 }).lean();
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

export { listPayments, getPaymentById, recordPayment };
