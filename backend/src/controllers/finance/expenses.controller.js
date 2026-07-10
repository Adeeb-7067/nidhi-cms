import { FinanceExpenses, Projects, clientsTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { badRequest, notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { escapeRegex } from "../../utils/regex.js";
import { expenseCategories } from "../../models/schema/finance/expenses.js";
import { resolveVendorFields } from "../../utils/vendor-fields.js";

async function assertExpenseVendorId(vendorId) {
  if (vendorId == null || vendorId === "") return null;
  const id = Number(vendorId);
  if (!Number.isFinite(id)) badRequest("vendorId must be a valid number.", "vendorId");
  const vendor = await clientsTable.findOne({ id, isVendor: true }).select({ id: 1 }).lean();
  if (!vendor) badRequest("Select a valid vendor.", "vendorId");
  return id;
}

async function nextExpenseReference() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`fin_exp_num_${year}`);
  return `EXP-${year}-${String(seq).padStart(4, "0")}`;
}

async function enrichExpenses(items) {
  const projectIds = [...new Set(items.map((e) => e.projectId).filter(Boolean))];
  const employeeIds = [...new Set(items.map((e) => e.employeeId).filter(Boolean))];
  const vendorIds = [...new Set(items.map((e) => e.vendorId).filter(Boolean))];
  const [projects, employees, vendors] = await Promise.all([
    projectIds.length ? Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean() : [],
    employeeIds.length ? usersTable.find({ id: { $in: employeeIds } }).select({ id: 1, name: 1 }).lean() : [],
    vendorIds.length
      ? clientsTable.find({ id: { $in: vendorIds }, isVendor: true }).select({
          id: 1,
          companyName: 1,
          vendorCategory: 1,
          vendorFields: 1,
          vendorNotes: 1,
        }).lean()
      : [],
  ]);
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  return items.map((e) => {
    const vendor = e.vendorId ? vendorMap.get(e.vendorId) : null;
    const vendorFields = vendor ? resolveVendorFields(vendor) : [];
    return {
      ...e,
      projectName: e.projectId ? projectMap.get(e.projectId) ?? null : null,
      employeeName: e.employeeId ? employeeMap.get(e.employeeId) ?? null : null,
      vendorName: vendor?.companyName ?? null,
      vendorFields,
      vendorSummary: vendorFields.length
        ? vendorFields.map((f) => `${f.label}: ${f.value}`).join(" · ")
        : vendor?.vendorNotes ?? null,
    };
  });
}

async function listExpenses(req, res) {
  const { status, category, projectId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (projectId) filter.projectId = Number(projectId);
  if (search) {
    const q = escapeRegex(String(search).trim());
    if (q) {
      const re = { $regex: q, $options: "i" };
      const vendorMatches = await clientsTable
        .find({ isVendor: true, companyName: re })
        .select({ id: 1 })
        .lean();
      const vendorIdsFromSearch = vendorMatches.map((v) => v.id);
      filter.$or = [
        { reference: re },
        { notes: re },
        ...(vendorIdsFromSearch.length ? [{ vendorId: { $in: vendorIdsFromSearch } }] : []),
      ];
    }
  }
  const [items, total] = await Promise.all([
    FinanceExpenses.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    FinanceExpenses.countDocuments(filter),
  ]);
  const expenses = await enrichExpenses(items);
  res.json({ expenses, total, page, limit });
}

async function getExpenseById(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id }).lean();
  if (!expense) notFound("Expense");
  const [enriched] = await enrichExpenses([expense]);
  res.json(enriched);
}

async function createExpense(req, res) {
  const body = req.body ?? {};
  if (!body.date) badRequest("date is required.", "date");
  if (!expenseCategories.includes(body.category)) {
    badRequest(`category must be one of: ${expenseCategories.join(", ")}.`, "category");
  }
  if (body.category === "salary") {
    badRequest("Salary cost is pulled automatically from HRM payroll and cannot be entered as an expense.", "category");
  }
  const amount = Number(body.amount);
  if (!(amount > 0)) badRequest("amount must be a positive number.", "amount");
  if (!body.paymentMode) badRequest("paymentMode is required.", "paymentMode");

  const vendorId = await assertExpenseVendorId(body.vendorId);

  const [id, reference] = await Promise.all([getNextSequence("finance_expenses"), nextExpenseReference()]);

  const expense = await FinanceExpenses.create({
    id,
    reference,
    date: new Date(body.date),
    category: body.category,
    amount,
    paymentMode: body.paymentMode,
    projectId: body.projectId ? Number(body.projectId) : null,
    employeeId: body.employeeId ? Number(body.employeeId) : null,
    vendorId,
    notes: optionalString(body.notes) ?? null,
    status: "pending",
    gstEnabled: Boolean(body.gstEnabled),
    gstAmount: body.gstEnabled ? Math.round(Number(body.gstAmount) || 0) : 0,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    createdBy: req.user.id,
  });
  const [enriched] = await enrichExpenses([expense.toObject()]);
  res.status(201).json(enriched);
}

async function updateExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "pending") {
    badRequest("Only pending expenses can be edited. Reverse the approval first.", "status");
  }
  const body = req.body ?? {};
  const updates = {};
  if (body.date !== undefined) updates.date = new Date(body.date);
  if (body.category !== undefined) {
    if (body.category === "salary") badRequest("Salary cost cannot be entered as an expense.", "category");
    updates.category = body.category;
  }
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.paymentMode !== undefined) updates.paymentMode = body.paymentMode;
  if (body.projectId !== undefined) updates.projectId = body.projectId ? Number(body.projectId) : null;
  if (body.employeeId !== undefined) updates.employeeId = body.employeeId ? Number(body.employeeId) : null;
  if (body.vendorId !== undefined) updates.vendorId = await assertExpenseVendorId(body.vendorId);
  if (body.notes !== undefined) updates.notes = optionalString(body.notes) ?? null;
  if (body.attachments !== undefined) updates.attachments = body.attachments;

  const updated = await FinanceExpenses.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  const [enriched] = await enrichExpenses([updated]);
  res.json(enriched);
}

async function approveExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "pending") badRequest("Only pending expenses can be approved.", "status");
  const updated = await FinanceExpenses.findOneAndUpdate(
    { id },
    { $set: { status: "approved", approvedBy: req.user.id, approvedAt: new Date() } },
    { new: true },
  ).lean();
  res.json(updated);
}

async function rejectExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id }).lean();
  if (!expense) notFound("Expense");
  if (expense.status !== "pending") badRequest("Only pending expenses can be rejected.", "status");
  const updated = await FinanceExpenses.findOneAndUpdate(
    { id },
    { $set: { status: "rejected", approvedBy: req.user.id, approvedAt: new Date() } },
    { new: true },
  ).lean();
  res.json(updated);
}

async function deleteExpense(req, res) {
  const id = parseIdParam(req.params.id, "expense id");
  const expense = await FinanceExpenses.findOne({ id }).lean();
  if (!expense) notFound("Expense");
  if (expense.status === "approved") {
    badRequest("Approved expenses cannot be deleted — reject instead if this was recorded in error.", "status");
  }
  await FinanceExpenses.deleteOne({ id });
  res.json({ success: true });
}

export {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
};
