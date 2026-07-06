import { SalesInstallments, SalesInvoices, SalesProposals, clientsTable, getNextSequence, getNextSequenceRange } from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";
import {
  calcLineItemsTotal,
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
} from "../../utils/sales-totals.js";
import {
  bdeOwnsCustomer,
  findBdeOwnedCustomerIds,
  assertBdeOwnsCustomerById,
} from "../../utils/sales-bde-customer-scope.js";

function proposalFinalTotal(proposal) {
  const calculated = calcLineItemsTotal(proposal.items ?? [], proposal.discount ?? 0);
  return resolveFinalTotal(calculated, proposal.totalAdjustment ?? 0, proposal.adjustedTotal ?? null);
}

async function enrichInstallments(items) {
  if (!items.length) return [];
  const customerIds = [...new Set(items.map((i) => i.customerId))];
  const proposalIds = [...new Set(items.map((i) => i.proposalId).filter(Boolean))];
  const [customers, proposalInstallments] = await Promise.all([
    clientsTable.find({ id: { $in: customerIds } }).select({ id: 1, companyName: 1 }).lean(),
    proposalIds.length
      ? SalesInstallments.find({ proposalId: { $in: proposalIds } })
          .select({ id: 1, proposalId: 1, dueDate: 1, sequenceNumber: 1 })
          .sort({ dueDate: 1, id: 1 })
          .lean()
      : [],
  ]);
  const customerMap = new Map(customers.map((c) => [c.id, c.companyName]));
  const sequenceById = new Map();
  const byProposal = new Map();
  for (const inst of proposalInstallments) {
    if (!byProposal.has(inst.proposalId)) byProposal.set(inst.proposalId, []);
    byProposal.get(inst.proposalId).push(inst);
  }
  for (const [, group] of byProposal) {
    group.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() || a.id - b.id
    );
    const total = group.length;
    group.forEach((inst, idx) => {
      sequenceById.set(inst.id, {
        sequenceNumber: inst.sequenceNumber ?? idx + 1,
        sequenceTotal: total,
      });
    });
  }
  return items.map((inst) => {
    const seq = sequenceById.get(inst.id);
    return {
      ...inst,
      customerName: customerMap.get(inst.customerId) ?? null,
      sequenceNumber: seq?.sequenceNumber ?? inst.sequenceNumber ?? null,
      sequenceTotal: seq?.sequenceTotal ?? null,
    };
  });
}

async function listInstallments(req, res) {
  const { customerId, projectId, invoiceId, proposalId, status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (customerId) filter.customerId = Number(customerId);
  if (projectId) filter.projectId = Number(projectId);
  if (invoiceId) filter.invoiceId = Number(invoiceId);
  if (proposalId) filter.proposalId = Number(proposalId);
  if (status) filter.status = status;
  // BDE scope: only see installments for their own customers
  if (req.user.role === "bde") {
    const myIds = await findBdeOwnedCustomerIds(clientsTable, req.user.id);
    if (filter.customerId != null) {
      if (!myIds.includes(Number(filter.customerId))) filter.customerId = -1;
    } else {
      filter.customerId = { $in: myIds };
    }
  }
  await SalesInstallments.updateMany(
    { status: "pending", dueDate: { $lt: new Date() } },
    { $set: { status: "overdue" } }
  );
  const { items, total, page: pg, limit: lim } = await paginateModel(
    SalesInstallments,
    filter,
    { page, limit, skip },
    { sort: { dueDate: 1 } }
  );
  const installments = await enrichInstallments(items);
  res.json({ installments, total, page: pg, limit: lim });
}

async function createInstallment(req, res) {
  const body = req.body;
  if (!body.name) badRequest("name is required.", "name");
  if (body.dueAmount == null) badRequest("dueAmount is required.", "dueAmount");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");

  // Resolve customerId from invoice when not explicitly provided
  let customerId = body.customerId ? Number(body.customerId) : null;
  let projectId = body.projectId ? Number(body.projectId) : null;
  let invoiceId = body.invoiceId ? Number(body.invoiceId) : null;
  const proposalId = body.proposalId ? Number(body.proposalId) : null;

  if (invoiceId && !customerId) {
    const inv = await SalesInvoices.findOne({ id: invoiceId }).lean();
    if (!inv) badRequest("invoiceId references a non-existent invoice.", "invoiceId");
    customerId = inv.customerId;
    if (!projectId && inv.projectId) projectId = inv.projectId;
  }
  if (!customerId) badRequest("customerId is required.", "customerId");
  await assertBdeOwnsCustomerById(clientsTable, req.user, customerId);

  const calculatedAmount =
    body.calculatedAmount != null ? Number(body.calculatedAmount) : Number(body.dueAmount);
  const totalAdjustment = parseTotalAdjustment(body.totalAdjustment) ?? 0;
  const adjustedTotal = parseAdjustedTotal(body.adjustedTotal) ?? null;
  const dueAmount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
  const id = await getNextSequence("sales_installments");
  const installment = await SalesInstallments.create({
    id,
    invoiceId,
    projectId,
    customerId,
    proposalId,
    sequenceNumber: body.sequenceNumber != null ? Number(body.sequenceNumber) : null,
    name: String(body.name).trim(),
    dueAmount,
    calculatedAmount: Math.round(calculatedAmount),
    totalAdjustment,
    adjustedTotal,
    paidAmount: 0,
    dueDate,
    status: "pending",
  });
  res.status(201).json(installment.toObject());
}

async function assertBdeInstallmentAccess(installment, user) {
  if (user.role !== "bde") return;
  const client = await clientsTable.findOne({ id: installment.customerId }).lean();
  if (!client || !bdeOwnsCustomer(client, user.id)) notFound("Installment");
}

async function getInstallmentById(req, res) {
  const id = parseIdParam(req.params.id, "installment id");
  const installment = await SalesInstallments.findOne({ id }).lean();
  if (!installment) notFound("Installment");
  await assertBdeInstallmentAccess(installment, req.user);
  const [enriched] = await enrichInstallments([installment]);
  res.json(enriched);
}

async function updateInstallment(req, res) {
  const id = parseIdParam(req.params.id, "installment id");
  const installment = await SalesInstallments.findOne({ id }).lean();
  if (!installment) notFound("Installment");
  await assertBdeInstallmentAccess(installment, req.user);
  const body = req.body;
  const updates = {};
  const amountFieldsTouched =
    body.dueAmount !== undefined ||
    body.calculatedAmount !== undefined ||
    body.totalAdjustment !== undefined ||
    body.adjustedTotal !== undefined;
  if (installment.invoiceId && amountFieldsTouched) {
    badRequest(
      "Cannot change installment amount after an invoice has been generated. Update the invoice instead.",
      "dueAmount"
    );
  }
  if (body.name !== undefined) updates.name = optionalString(body.name);
  if (amountFieldsTouched) {
    const calculatedAmount =
      body.calculatedAmount != null
        ? Number(body.calculatedAmount)
        : installment.calculatedAmount ?? installment.dueAmount;
    const totalAdjustment =
      body.totalAdjustment !== undefined
        ? parseTotalAdjustment(body.totalAdjustment)
        : installment.totalAdjustment ?? 0;
    const adjustedTotal =
      body.adjustedTotal !== undefined
        ? parseAdjustedTotal(body.adjustedTotal)
        : installment.adjustedTotal ?? null;
    if (body.dueAmount !== undefined && body.calculatedAmount === undefined && body.totalAdjustment === undefined && body.adjustedTotal === undefined) {
      updates.dueAmount = Number(body.dueAmount);
    } else {
      updates.calculatedAmount = Math.round(calculatedAmount);
      updates.totalAdjustment = totalAdjustment;
      updates.adjustedTotal = adjustedTotal;
      updates.dueAmount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
    }
  }
  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (isNaN(d.getTime())) badRequest("dueDate is invalid.", "dueDate");
    updates.dueDate = d;
  }
  if (body.paidAmount !== undefined) {
    badRequest("Installment paid amount is updated via payment records only.", "paidAmount");
  }
  if (body.status !== undefined) {
    badRequest("Installment status is derived from payments and due dates.", "status");
  }
  if (body.invoiceId !== undefined) {
    badRequest("Link an invoice via Generate invoice, not by editing installment.", "invoiceId");
  }
  const updated = await SalesInstallments.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function createInstallmentsFromProposal(req, res) {
  const proposalId = parseIdParam(req.params.proposalId, "proposal id");
  const proposal = await SalesProposals.findOne({ id: proposalId }).lean();
  if (!proposal) notFound("Proposal");
  if (req.user.role === "bde") {
    if (proposal.assignedTo !== req.user.id) notFound("Proposal");
    const client = await clientsTable.findOne({ id: proposal.customerId }).lean();
    if (!client || !bdeOwnsCustomer(client, req.user.id)) notFound("Proposal");
  }
  if (proposal.status !== "approved") {
    badRequest("Only approved proposals can be converted to installments.", "status");
  }
  if (!proposal.customerId) {
    badRequest(
      "Proposal has no linked customer. Convert the lead to a customer first.",
      "customerId"
    );
  }
  const existing = await SalesInstallments.countDocuments({ proposalId });
  if (existing > 0) {
    badRequest(
      "Installments already exist for this proposal.",
      "proposalId"
    );
  }
  const rows = req.body?.installments;
  if (!Array.isArray(rows) || rows.length === 0) {
    badRequest("installments array is required.", "installments");
  }
  const proposalTotal = proposalFinalTotal(proposal);
  const prepared = [];
  let sumDue = 0;
  for (const row of rows) {
    if (!row.name) badRequest("Each installment requires a name.", "name");
    if (row.dueAmount == null) badRequest("Each installment requires dueAmount.", "dueAmount");
    if (!row.dueDate) badRequest("Each installment requires dueDate.", "dueDate");
    const dueDate = new Date(row.dueDate);
    if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");
    const calculatedAmount =
      row.calculatedAmount != null ? Number(row.calculatedAmount) : Number(row.dueAmount);
    const totalAdjustment = parseTotalAdjustment(row.totalAdjustment) ?? 0;
    const adjustedTotal = parseAdjustedTotal(row.adjustedTotal) ?? null;
    const dueAmount = resolveFinalTotal(calculatedAmount, totalAdjustment, adjustedTotal);
    sumDue += dueAmount;
    prepared.push({
      name: String(row.name).trim(),
      sequenceNumber: row.sequenceNumber != null ? Number(row.sequenceNumber) : null,
      dueAmount,
      calculatedAmount: Math.round(calculatedAmount),
      totalAdjustment,
      adjustedTotal,
      dueDate,
    });
  }
  if (Math.abs(sumDue - proposalTotal) > 1) {
    badRequest(
      `Installment totals (${sumDue}) must equal proposal total (${Math.round(proposalTotal)}).`,
      "installments"
    );
  }
  const ids = await getNextSequenceRange("sales_installments", prepared.length);
  const docs = prepared.map((row, i) => ({
    id: ids[i],
    invoiceId: null,
    projectId: proposal.projectId ?? null,
    customerId: proposal.customerId,
    proposalId,
    sequenceNumber: row.sequenceNumber ?? i + 1,
    name: row.name,
    dueAmount: row.dueAmount,
    calculatedAmount: row.calculatedAmount,
    totalAdjustment: row.totalAdjustment,
    adjustedTotal: row.adjustedTotal,
    paidAmount: 0,
    dueDate: row.dueDate,
    status: "pending",
  }));
  const created = await SalesInstallments.insertMany(docs);
  res.status(201).json({ installments: created.map((d) => d.toObject()) });
}

export {
  listInstallments,
  createInstallment,
  getInstallmentById,
  updateInstallment,
  createInstallmentsFromProposal,
};
