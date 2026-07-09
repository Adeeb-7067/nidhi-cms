import { clientsTable } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination } from "../../utils/route-errors.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordIncomingPayment, recordOutgoingPayment } from "../../services/finance/payment-ledger.service.js";
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

export { listPayments, getPaymentsSummary, getPaymentById, recordPayment };
