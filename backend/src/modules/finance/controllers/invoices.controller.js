import { FinanceInvoices, FinancePayments, Projects, clientsTable, getNextSequence } from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../../utils/route-errors.js";
import { calcInvoiceTotal } from "../../../utils/finance-totals.js";
import { sweepOverdueInvoices } from "./dashboard.controller.js";
import {
  listUnifiedInvoices,
  computeInvoicesSummary,
  computeUnifiedInvoiceAging,
} from "../services/unified-ledger.service.js";

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
  const { page, limit } = parsePagination(req.query);
  const result = await listUnifiedInvoices({
    status: status ? String(status) : undefined,
    clientId: clientId ? Number(clientId) : undefined,
    search: search ? String(search) : undefined,
    page,
    limit,
  });
  res.json(result);
}

async function getInvoicesSummary(req, res) {
  await sweepOverdueInvoices();
  const summary = await computeInvoicesSummary();
  res.json(summary);
}

async function getInvoiceAging(req, res) {
  await sweepOverdueInvoices();
  const buckets = await computeUnifiedInvoiceAging();
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
  const discount = Math.max(0, Number(body.discount) || 0);
  const gstEnabled = body.gstEnabled !== false;
  const { total } = calcInvoiceTotal(items, discount, gstEnabled);
  if (!(total > 0)) badRequest("Invoice total must be greater than zero.", "items");

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
    discount,
    gstEnabled,
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

async function deleteInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await FinanceInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  if ((invoice.paidAmount ?? 0) > 0) {
    badRequest("Invoices with recorded payments cannot be deleted — cancel it instead.", "paidAmount");
  }
  if ((invoice.creditNotes?.length ?? 0) > 0) {
    badRequest("Invoices with credit notes cannot be deleted — cancel it instead.", "creditNotes");
  }
  const linkedPayment = await FinancePayments.findOne({ invoiceId: id }).select({ id: 1 }).lean();
  if (linkedPayment) {
    badRequest("This invoice has linked payments and cannot be deleted — cancel it instead.", "invoiceId");
  }
  await FinanceInvoices.deleteOne({ id });
  res.json({ success: true });
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
  getInvoicesSummary,
  getInvoiceAging,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  cancelInvoice,
  addCreditNote,
  remindInvoice,
};
