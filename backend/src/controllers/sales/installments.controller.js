import { SalesInstallments, getNextSequence } from "../../models/schema/index.js";
import { paginateModel } from "../../utils/mongo-list.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../utils/route-errors.js";

async function listInstallments(req, res) {
  const { customerId, projectId, status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (customerId) filter.customerId = Number(customerId);
  if (projectId) filter.projectId = Number(projectId);
  if (status) filter.status = status;
  // Bulk overdue update before returning results
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
  if (!body.projectId) badRequest("projectId is required.", "projectId");
  if (!body.customerId) badRequest("customerId is required.", "customerId");
  if (!body.name) badRequest("name is required.", "name");
  if (body.dueAmount == null) badRequest("dueAmount is required.", "dueAmount");
  if (!body.dueDate) badRequest("dueDate is required.", "dueDate");
  const dueDate = new Date(body.dueDate);
  if (isNaN(dueDate.getTime())) badRequest("dueDate is invalid.", "dueDate");
  const id = await getNextSequence("sales_installments");
  const installment = await SalesInstallments.create({
    id,
    projectId: Number(body.projectId),
    customerId: Number(body.customerId),
    name: String(body.name).trim(),
    dueAmount: Number(body.dueAmount),
    paidAmount: 0,
    dueDate,
    status: "pending",
  });
  res.status(201).json(installment.toObject());
}

async function getInstallmentById(req, res) {
  const id = parseIdParam(req.params.id, "installment id");
  const installment = await SalesInstallments.findOne({ id }).lean();
  if (!installment) notFound("Installment");
  res.json(installment);
}

async function updateInstallment(req, res) {
  const id = parseIdParam(req.params.id, "installment id");
  const installment = await SalesInstallments.findOne({ id }).lean();
  if (!installment) notFound("Installment");
  const body = req.body;
  const updates = {};
  if (body.name !== undefined) updates.name = optionalString(body.name);
  if (body.dueAmount !== undefined) updates.dueAmount = Number(body.dueAmount);
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
