import { FinanceIncome, Projects, clientsTable, SalesPayments, SalesInvoices } from "../../models/schema/index.js";
import { badRequest, notFound, parsePagination } from "../../utils/route-errors.js";
import { runInTx } from "../../lib/db-tx.js";
import { recordIncomingPayment } from "../../services/finance/payment-ledger.service.js";
import { resolvePaymentGstFields } from "../../utils/sales-totals.js";

async function enrichIncomeGst(items) {
  const needsLookup = items.filter((i) => i.gstEnabled == null && i.salesPaymentId);
  if (!needsLookup.length) return items;

  const salesPayments = await SalesPayments.find({
    id: { $in: needsLookup.map((i) => i.salesPaymentId) },
  })
    .select({ id: 1, invoiceId: 1, amount: 1 })
    .lean();
  const salesPaymentMap = new Map(salesPayments.map((p) => [p.id, p]));
  const invoiceIds = [...new Set(salesPayments.map((p) => p.invoiceId).filter(Boolean))];
  const invoices = invoiceIds.length
    ? await SalesInvoices.find({ id: { $in: invoiceIds } }).lean()
    : [];
  const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

  return items.map((row) => {
    if (row.gstEnabled != null) {
      return {
        ...row,
        gstAmount: row.gstAmount ?? 0,
        taxableAmount: row.amount - (row.gstAmount ?? 0),
      };
    }
    const sp = row.salesPaymentId ? salesPaymentMap.get(row.salesPaymentId) : null;
    const invoice = sp?.invoiceId ? invoiceMap.get(sp.invoiceId) ?? null : null;
    const gst = resolvePaymentGstFields({
      paymentAmount: row.amount,
      invoice,
      storedGstEnabled: row.gstEnabled,
      storedGstAmount: row.gstAmount,
    });
    return { ...row, ...gst, salesInvoiceId: invoice?.id ?? row.salesInvoiceId ?? null };
  });
}

async function enrichIncome(items) {
  const clientIds = [...new Set(items.map((i) => i.clientId).filter(Boolean))];
  const projectIds = [...new Set(items.map((i) => i.projectId).filter(Boolean))];
  const [clients, projects] = await Promise.all([
    clientIds.length ? clientsTable.find({ id: { $in: clientIds } }).select({ id: 1, companyName: 1 }).lean() : [],
    projectIds.length ? Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean() : [],
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c.companyName]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  return items.map((i) => ({
    ...i,
    clientName: clientMap.get(i.clientId) ?? null,
    projectName: i.projectId ? projectMap.get(i.projectId) ?? null : null,
  }));
}

async function listIncome(req, res) {
  const { status, clientId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (clientId) filter.clientId = Number(clientId);
  if (search) {
    const q = String(search).trim();
    if (q) filter.reference = { $regex: q, $options: "i" };
  }
  const [items, total] = await Promise.all([
    FinanceIncome.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    FinanceIncome.countDocuments(filter),
  ]);
  const withGst = await enrichIncomeGst(items);
  const income = await enrichIncome(withGst);
  res.json({ income, total, page, limit });
}

async function recordIncome(req, res) {
  const body = req.body ?? {};
  if (!body.clientId) badRequest("clientId is required.", "clientId");
  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!body.paymentMode) badRequest("paymentMode is required.", "paymentMode");

  let result;
  await runInTx(async (session) => {
    result = await recordIncomingPayment(session, {
      clientId: Number(body.clientId),
      projectId: body.projectId ? Number(body.projectId) : null,
      invoiceId: body.invoiceId ? Number(body.invoiceId) : null,
      amount,
      mode: body.paymentMode,
      date: body.date,
      recordedBy: req.user.id,
    });
  });

  res.status(201).json({ income: result.income, payment: result.payment, invoiceStatus: result.invoiceStatus });
}

export { listIncome, recordIncome };
