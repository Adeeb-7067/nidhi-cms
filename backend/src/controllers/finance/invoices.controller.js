import { FinanceInvoices, Projects, clientsTable, getNextSequence } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { calcInvoiceTotal } from "../../utils/finance-totals.js";
import { sweepOverdueInvoices } from "./dashboard.controller.js";

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_inv_num_${year}`);
  return `FIN-INV-${year}-${String(seq).padStart(4, "0")}`;
}

function parseLineItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    badRequest("At least one line item is required.", "items");
  }
  return rawItems.map((item, i) => ({
    id: item.id ?? `item-${i}-${Date.now()}`,
    description: String(item.description ?? "").trim() || "Line item",
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    rate: Math.max(0, Number(item.rate) || 0),
    taxPercent: Math.min(100, Math.max(0, Number(item.taxPercent) || 0)),
  }));
}

async function enrichInvoices(items) {
  const clientIds = [...new Set(items.map((i) => i.clientId).filter(Boolean))];
  const projectIds = [...new Set(items.map((i) => i.projectId).filter(Boolean))];
  const [clients, projects] = await Promise.all([
    clientIds.length ? clientsTable.find({ id: { $in: clientIds } }).select({ id: 1, companyName: 1 }).lean() : [],
    projectIds.length ? Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean() : [],
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c.companyName]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  return items.map((inv) => {
    const totals = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
    return {
      ...inv,
      clientName: clientMap.get(inv.clientId) ?? null,
      projectName: inv.projectId ? projectMap.get(inv.projectId) ?? null : null,
      ...totals,
    };
  });
}

async function listInvoices(req, res) {
  await sweepOverdueInvoices();
  const { status, clientId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (clientId) filter.clientId = Number(clientId);
  if (search) {
    const q = String(search).trim();
    if (q) {
      const re = { $regex: q, $options: "i" };
      const matchingClients = await clientsTable.find({ companyName: re }).select({ id: 1 }).lean();
      filter.$or = [{ number: re }, { clientId: { $in: matchingClients.map((c) => c.id) } }];
    }
  }
  const [items, total] = await Promise.all([
    FinanceInvoices.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FinanceInvoices.countDocuments(filter),
  ]);
  const invoices = await enrichInvoices(items);
  res.json({ invoices, total, page, limit });
}

async function getInvoiceAging(req, res) {
  await sweepOverdueInvoices();
  const invoices = await FinanceInvoices.find({ status: { $in: ["unpaid", "partially_paid", "overdue"] } }).lean();
  const now = new Date();
  const buckets = [
    { bucket: "Current", count: 0, amount: 0 },
    { bucket: "1–30 days", count: 0, amount: 0 },
    { bucket: "31–60 days", count: 0, amount: 0 },
    { bucket: "61–90 days", count: 0, amount: 0 },
    { bucket: "90+ days", count: 0, amount: 0 },
  ];
  for (const inv of invoices) {
    const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
    const outstanding = Math.max(0, total - inv.paidAmount);
    if (outstanding <= 0) continue;
    const daysPastDue = Math.floor((now - new Date(inv.dueDate)) / (24 * 60 * 60 * 1000));
    const idx = daysPastDue <= 0 ? 0 : daysPastDue <= 30 ? 1 : daysPastDue <= 60 ? 2 : daysPastDue <= 90 ? 3 : 4;
    buckets[idx].count += 1;
    buckets[idx].amount += outstanding;
  }
  res.json({ buckets });
}

async function getInvoiceById(req, res) {
  await sweepOverdueInvoices();
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await FinanceInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  const [enriched] = await enrichInvoices([invoice]);
  res.json(enriched);
}

async function createInvoice(req, res) {
  const body = req.body ?? {};
  if (!body.clientId) badRequest("clientId is required.", "clientId");
  const client = await clientsTable.findOne({ id: Number(body.clientId) }).select({ id: 1 }).lean();
  if (!client) notFound("Client");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (Number.isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");
  const items = parseLineItems(body.items);

  const [id, number] = await Promise.all([getNextSequence("finance_invoices"), nextInvoiceNumber()]);
  const invoice = await FinanceInvoices.create({
    id,
    number,
    clientId: Number(body.clientId),
    projectId: body.projectId ? Number(body.projectId) : null,
    issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
    dueDate,
    status: "unpaid",
    items,
    discount: Math.max(0, Number(body.discount) || 0),
    gstEnabled: body.gstEnabled !== false,
    paidAmount: 0,
    notes: optionalString(body.notes) ?? null,
    creditNotes: [],
    createdBy: req.user.id,
  });
  res.status(201).json(invoice.toObject());
}

async function updateInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await FinanceInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  if (invoice.status === "cancelled") badRequest("Cancelled invoices cannot be edited.", "status");
  if (invoice.paidAmount > 0) badRequest("Invoices with recorded payments cannot have their line items edited.", "items");

  const body = req.body ?? {};
  const updates = {};
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (Number.isNaN(d.getTime())) badRequest("dueDate is invalid.", "dueDate");
    updates.dueDate = d;
  }
  if (body.items !== undefined) updates.items = parseLineItems(body.items);
  if (body.discount !== undefined) updates.discount = Math.max(0, Number(body.discount) || 0);
  if (body.gstEnabled !== undefined) updates.gstEnabled = Boolean(body.gstEnabled);

  const updated = await FinanceInvoices.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function cancelInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await FinanceInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  if (invoice.status === "cancelled") badRequest("This invoice is already cancelled.", "status");
  if (invoice.paidAmount > 0) badRequest("Invoices with recorded payments cannot be cancelled.", "paidAmount");
  const reason = optionalString(req.body?.reason) ?? null;
  const updated = await FinanceInvoices.findOneAndUpdate(
    { id },
    { $set: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason, cancelledBy: req.user.id } },
    { new: true },
  ).lean();
  res.json(updated);
}

async function addCreditNote(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await FinanceInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  if (invoice.status === "cancelled") badRequest("Cancelled invoices cannot receive credit notes.", "status");
  const amount = Number(req.body?.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  const reason = optionalString(req.body?.reason) ?? "";

  const noteId = `CN-${String(((invoice.creditNotes?.length ?? 0) + 1)).padStart(3, "0")}-${invoice.number}`;
  const updated = await FinanceInvoices.findOneAndUpdate(
    { id },
    { $push: { creditNotes: { id: noteId, date: new Date(), amount: Math.round(amount), reason } } },
    { new: true },
  ).lean();
  res.status(201).json(updated);
}

async function remindInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await FinanceInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  // Reminder delivery (email/notification) is intentionally a no-op placeholder here —
  // wire to the email service once finance notification templates exist.
  res.json({ success: true, remindedAt: new Date().toISOString() });
}

export {
  listInvoices,
  getInvoiceAging,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  cancelInvoice,
  addCreditNote,
  remindInvoice,
};
