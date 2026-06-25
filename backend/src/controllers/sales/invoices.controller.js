import { SalesInvoices, SalesProposals, getNextSequence } from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
} from "../../utils/route-errors.js";

async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await SalesInvoices.countDocuments({ number: { $regex: `^INV-${year}-` } });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function listInvoices(req, res) {
  const { status, customerId, projectId } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customerId = Number(customerId);
  if (projectId) filter.projectId = Number(projectId);
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
  if (body.amount == null) badRequest("amount is required.", "amount");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");
  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);
  const invoice = await SalesInvoices.create({
    id,
    number,
    customerId: Number(body.customerId),
    projectId: body.projectId ? Number(body.projectId) : null,
    installmentId: body.installmentId ? Number(body.installmentId) : null,
    proposalId: body.proposalId ? Number(body.proposalId) : null,
    amount: Number(body.amount),
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
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (isNaN(d.getTime())) badRequest("dueDate is invalid.", "dueDate");
    updates.dueDate = d;
  }
  if (body.status !== undefined) updates.status = body.status;
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
  let amount = 0;
  for (const item of proposal.items) {
    const lineTotal = item.quantity * item.unitPrice;
    amount += lineTotal + lineTotal * (item.taxPercent / 100);
  }
  const discountAmt = amount * (proposal.discount / 100);
  amount = Math.round((amount - discountAmt) * 100) / 100;
  const body = req.body;
  const dueDate = body.dueDate
    ? new Date(body.dueDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
  const [number, id] = await Promise.all([nextInvoiceNumber(), getNextSequence("sales_invoices")]);
  const invoice = await SalesInvoices.create({
    id,
    number,
    customerId: proposal.customerId,
    projectId: proposal.projectId ?? null,
    proposalId,
    amount,
    paidAmount: 0,
    status: "unpaid",
    dueDate,
  });
  res.status(201).json(invoice.toObject());
}

export { listInvoices, createInvoice, getInvoiceById, updateInvoice, createInvoiceFromProposal };
