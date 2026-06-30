import { SalesInvoices, SalesProposals, SalesCustomers, getNextSequence } from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
} from "../../utils/route-errors.js";
import {
  calcLineItemsTotal,
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
} from "../../utils/sales-totals.js";

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`inv_num_${year}`);
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

function parseLineItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, i) => ({
    itemId: item.itemId ?? `item-${i}-${Date.now()}`,
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    taxPercent: Math.min(100, Math.max(0, Number(item.taxPercent) || 0)),
  }));
}

async function listInvoices(req, res) {
  const { status, customerId, projectId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customerId = Number(customerId);
  if (projectId) filter.projectId = Number(projectId);
  if (search) {
    const q = String(search).trim();
    if (q) filter.number = { $regex: q, $options: "i" };
  }
  // BDE scope: only see invoices for customers assigned to them
  if (req.user.role === "bde") {
    const myCustomers = await SalesCustomers.find({ assignedAdminId: req.user.id }).select({ id: 1 }).lean();
    const myCustomerIds = myCustomers.map((c) => c.id);
    if (filter.customerId != null) {
      if (!myCustomerIds.includes(Number(filter.customerId))) {
        filter.customerId = -1;
      }
    } else {
      filter.customerId = { $in: myCustomerIds };
    }
  }
  // Auto-mark overdue on read
  await SalesInvoices.updateMany(
    { status: "unpaid", dueDate: { $lt: new Date() } },
    { $set: { status: "overdue" } }
  );
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesInvoices,
    filter,
    { page, limit, skip },
    { sort: { createdAt: -1 } }
  );
  res.json({ invoices: items, total, page: pg, limit: lim });
}

async function createInvoice(req, res) {
  const body = req.body;
  if (!body.customerId) badRequest("customerId is required.", "customerId");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");

  const lineItems = parseLineItems(body.lineItems);
  const totalAdjustment = parseTotalAdjustment(body.totalAdjustment) ?? 0;
  const adjustedTotal = parseAdjustedTotal(body.adjustedTotal) ?? null;

  let calculatedAmount;
  if (lineItems.length > 0) {
    calculatedAmount = calcLineItemsTotal(lineItems, 0);
  } else if (body.calculatedAmount != null) {
    calculatedAmount = Number(body.calculatedAmount);
  } else if (body.amount != null) {
    calculatedAmount = Number(body.amount);
  } else {
    badRequest("amount or lineItems is required.", "amount");
  }

  const amount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);
  const invoice = await SalesInvoices.create({
    id,
    number,
    title: body.title?.trim() || null,
    customerId: Number(body.customerId),
    projectId: body.projectId ? Number(body.projectId) : null,
    installmentId: body.installmentId ? Number(body.installmentId) : null,
    proposalId: body.proposalId ? Number(body.proposalId) : null,
    lineItems,
    notes: body.notes?.trim() || null,
    amount,
    calculatedAmount: Math.round(calculatedAmount),
    totalAdjustment,
    adjustedTotal,
    paidAmount: 0,
    status: "unpaid",
    dueDate,
  });
  res.status(201).json(invoice.toObject());
}

async function getInvoiceById(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  res.json(invoice);
}

async function updateInvoice(req, res) {
  const id = parseIdParam(req.params.id, "invoice id");
  const invoice = await SalesInvoices.findOne({ id }).lean();
  if (!invoice) notFound("Invoice");
  const body = req.body;
  const updates = {};

  // Core editable fields
  if (body.title !== undefined) updates.title = body.title?.trim() || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.customerId !== undefined) updates.customerId = Number(body.customerId);
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  if (body.installmentId !== undefined) updates.installmentId = body.installmentId ? Number(body.installmentId) : null;
  if (body.proposalId !== undefined) updates.proposalId = body.proposalId ? Number(body.proposalId) : null;

  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (isNaN(d.getTime())) badRequest("dueDate is invalid.", "dueDate");
    updates.dueDate = d;
  }
  if (body.status !== undefined) updates.status = body.status;

  // Line items — recalculate amount when provided
  if (body.lineItems !== undefined) {
    const lineItems = parseLineItems(body.lineItems);
    updates.lineItems = lineItems;
    const fromItems = lineItems.length > 0 ? calcLineItemsTotal(lineItems, 0) : invoice.calculatedAmount ?? invoice.amount;
    const totalAdjustment = body.totalAdjustment !== undefined
      ? parseTotalAdjustment(body.totalAdjustment)
      : invoice.totalAdjustment ?? 0;
    const adjustedTotal = body.adjustedTotal !== undefined
      ? parseAdjustedTotal(body.adjustedTotal)
      : invoice.adjustedTotal ?? null;
    updates.calculatedAmount = Math.round(fromItems);
    updates.totalAdjustment = totalAdjustment;
    updates.adjustedTotal = adjustedTotal;
    updates.amount = resolveFinalTotal(fromItems, totalAdjustment, adjustedTotal);
  } else if (body.amount !== undefined || body.calculatedAmount !== undefined || body.totalAdjustment !== undefined || body.adjustedTotal !== undefined) {
    // Amount-only edit (legacy / from detail page adjust card)
    const calculatedAmount = body.calculatedAmount != null
      ? Number(body.calculatedAmount)
      : invoice.calculatedAmount ?? invoice.amount;
    const totalAdjustment = body.totalAdjustment !== undefined
      ? parseTotalAdjustment(body.totalAdjustment)
      : invoice.totalAdjustment ?? 0;
    const adjustedTotal = body.adjustedTotal !== undefined
      ? parseAdjustedTotal(body.adjustedTotal)
      : invoice.adjustedTotal ?? null;
    if (body.amount !== undefined && body.calculatedAmount === undefined && body.totalAdjustment === undefined && body.adjustedTotal === undefined) {
      updates.amount = Number(body.amount);
    } else {
      updates.calculatedAmount = Math.round(calculatedAmount);
      updates.totalAdjustment = totalAdjustment;
      updates.adjustedTotal = adjustedTotal;
      updates.amount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
    }
  }

  const updated = await SalesInvoices.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function createInvoiceFromProposal(req, res) {
  const proposalId = parseIdParam(req.params.proposalId, "proposal id");
  const proposal = await SalesProposals.findOne({ id: proposalId }).lean();
  if (!proposal) notFound("Proposal");
  if (!proposal.customerId) {
    badRequest(
      "Proposal has no linked customer. Convert the lead to a customer first.",
      "customerId"
    );
  }
  let calculatedAmount = calcLineItemsTotal(proposal.items, proposal.discount);
  calculatedAmount = resolveFinalTotal(
    calculatedAmount,
    proposal.totalAdjustment ?? 0,
    proposal.adjustedTotal ?? null
  );
  const body = req.body;
  const totalAdjustment = parseTotalAdjustment(body.totalAdjustment) ?? 0;
  const adjustedTotal = parseAdjustedTotal(body.adjustedTotal) ?? null;
  const amount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
  const dueDate = body.dueDate
    ? new Date(body.dueDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");
  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);
  const lineItems = (proposal.items ?? []).map((item) => ({
    itemId: item.itemId ?? String(Math.random()),
    name: item.name ?? "",
    description: item.description ?? "",
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxPercent: item.taxPercent,
  }));
  const invoice = await SalesInvoices.create({
    id,
    number,
    title: proposal.title ?? null,
    customerId: proposal.customerId,
    projectId: proposal.projectId ?? null,
    proposalId,
    lineItems,
    notes: null,
    amount,
    calculatedAmount: Math.round(calculatedAmount),
    totalAdjustment,
    adjustedTotal,
    paidAmount: 0,
    status: "unpaid",
    dueDate,
  });
  res.status(201).json(invoice.toObject());
}

export { listInvoices, createInvoice, getInvoiceById, updateInvoice, createInvoiceFromProposal };
