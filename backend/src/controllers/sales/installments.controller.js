import { SalesInstallments, SalesInvoices, SalesCustomers, getNextSequence } from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";
import {
  resolveFinalTotal,
  parseAdjustedTotal,
  parseTotalAdjustment,
} from "../../utils/sales-totals.js";

async function listInstallments(req, res) {
  const { customerId, projectId, invoiceId, status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (customerId) filter.customerId = Number(customerId);
  if (projectId) filter.projectId = Number(projectId);
  if (invoiceId) filter.invoiceId = Number(invoiceId);
  if (status) filter.status = status;
  // BDE scope: only see installments for their own customers
  if (req.user.role === "bde") {
    const myCustomers = await SalesCustomers.find({ assignedAdminId: req.user.id }).select({ id: 1 }).lean();
    const myIds = myCustomers.map((c) => c.id);
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
  res.json({ installments: items, total, page: pg, limit: lim });
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

  if (invoiceId && !customerId) {
    const inv = await SalesInvoices.findOne({ id: invoiceId }).lean();
    if (!inv) badRequest("invoiceId references a non-existent invoice.", "invoiceId");
    customerId = inv.customerId;
    if (!projectId && inv.projectId) projectId = inv.projectId;
  }
  if (!customerId) badRequest("customerId is required.", "customerId");

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
  const mine = await SalesCustomers.findOne({ id: installment.customerId, assignedAdminId: user.id }).lean();
  if (!mine) notFound("Installment");
}

async function getInstallmentById(req, res) {
  const id = parseIdParam(req.params.id, "installment id");
  const installment = await SalesInstallments.findOne({ id }).lean();
  if (!installment) notFound("Installment");
  await assertBdeInstallmentAccess(installment, req.user);
  res.json(installment);
}

async function updateInstallment(req, res) {
  const id = parseIdParam(req.params.id, "installment id");
  const installment = await SalesInstallments.findOne({ id }).lean();
  if (!installment) notFound("Installment");
  await assertBdeInstallmentAccess(installment, req.user);
  const body = req.body;
  const updates = {};
  if (body.name !== undefined) updates.name = optionalString(body.name);
  if (body.dueAmount !== undefined || body.calculatedAmount !== undefined || body.totalAdjustment !== undefined || body.adjustedTotal !== undefined) {
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
  if (body.paidAmount !== undefined) updates.paidAmount = Number(body.paidAmount);
  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (isNaN(d.getTime())) badRequest("dueDate is invalid.", "dueDate");
    updates.dueDate = d;
  }
  if (body.status !== undefined) updates.status = body.status;
  if (body.invoiceId !== undefined) updates.invoiceId = body.invoiceId ? Number(body.invoiceId) : null;
  const updated = await SalesInstallments.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

export { listInstallments, createInstallment, getInstallmentById, updateInstallment };
