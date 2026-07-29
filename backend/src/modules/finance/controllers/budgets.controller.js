import { FinanceBudgets, FinanceExpenses, Projects, usersTable, departmentsTable, getNextSequence } from "../../../models/schema/index.js";
import { badRequest, notFound, parseIdParam } from "../../../utils/route-errors.js";
import { budgetTypes, budgetStatuses } from "../schema/budgets.js";
import { deriveBudgetStatus } from "../../../utils/finance-totals.js";
import { getPayrollCostForPeriod } from "../services/finance-kpis.service.js";
import { recognizedExpenseAmountExpr } from "../services/expense-cash.service.js";

/** "2026-27" -> [Apr 1 2026, Apr 1 2027) — Indian fiscal year. */
function parseFiscalYear(fy) {
  const [startYear] = String(fy).split("-");
  const y = Number(startYear);
  return { start: new Date(y, 3, 1), end: new Date(y + 1, 3, 1) };
}

async function sumRecognized(match) {
  const rows = await FinanceExpenses.aggregate([
    { $match: match },
    { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
    { $group: { _id: null, total: { $sum: "$_recognized" } } },
  ]);
  return rows[0]?.total ?? 0;
}

function fiscalYearDateRange(fy) {
  return parseFiscalYear(fy);
}

async function computeSpentForBudget(budget) {
  const { start, end } = fiscalYearDateRange(budget.fiscalYear);
  const fiscalDate = { $gte: start, $lt: end };
  const approved = { status: "approved", date: fiscalDate };

  const explicit = await sumRecognized({ budgetId: budget.id, ...approved });

  if (budget.type === "project") {
    if (!budget.projectId) return explicit;
    const legacy = await sumRecognized({
      budgetId: null,
      projectId: budget.projectId,
      ...approved,
    });
    return explicit + legacy;
  }

  // Annual/company or annual/department budgets: sum approved expenses whose
  // linked employee sits in that department (undated/general expenses roll
  // into the department-less "whole company" total below).
  if (budget.department) {
    const deptUsers = await usersTable
      .find({})
      .select({ id: 1, departmentId: 1 })
      .lean();
    const dept = await departmentsTable.findOne({ name: budget.department }).select({ id: 1 }).lean();
    const employeeIds = dept ? deptUsers.filter((u) => u.departmentId === dept.id).map((u) => u.id) : [];
    const legacy = await sumRecognized({
      budgetId: null,
      employeeId: { $in: employeeIds },
      ...approved,
    });
    return explicit + legacy;
  }

  const [legacyExpenses, payrollTotal] = await Promise.all([
    sumRecognized({ budgetId: null, ...approved }),
    (async () => {
      let total = 0;
      for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const cost = await getPayrollCostForPeriod(d.getFullYear(), d.getMonth() + 1);
        total += cost.employerCost;
      }
      return total;
    })(),
  ]);
  return explicit + legacyExpenses + payrollTotal;
}

async function listBudgets(req, res) {
  const { type, fiscalYear } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (fiscalYear) filter.fiscalYear = fiscalYear;
  const rows = await FinanceBudgets.find(filter).sort({ createdAt: -1 }).lean();
  const projectIds = [...new Set(rows.map((b) => b.projectId).filter(Boolean))];
  const projects = projectIds.length
    ? await Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean()
    : [];
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const budgets = await Promise.all(
    rows.map(async (b) => {
      const spent = await computeSpentForBudget(b);
      return {
        ...b,
        projectName: b.projectId ? projectMap.get(b.projectId) ?? null : null,
        spent,
        status: deriveBudgetStatus(spent, b.allocated),
      };
    }),
  );
  res.json({ budgets });
}

async function createBudget(req, res) {
  const body = req.body ?? {};
  if (!body.name?.trim()) badRequest("name is required.", "name");
  if (!budgetTypes.includes(body.type)) badRequest(`type must be one of: ${budgetTypes.join(", ")}.`, "type");
  if (!body.fiscalYear?.trim()) badRequest("fiscalYear is required.", "fiscalYear");
  const allocated = Number(body.allocated);
  if (!(allocated > 0)) badRequest("allocated must be a positive number.", "allocated");
  if (body.type === "project" && !body.projectId) badRequest("projectId is required for project budgets.", "projectId");

  const id = await getNextSequence("finance_budgets");
  const budget = await FinanceBudgets.create({
    id,
    name: body.name.trim(),
    type: body.type,
    projectId: body.projectId ? Number(body.projectId) : null,
    fiscalYear: body.fiscalYear.trim(),
    allocated,
    department: body.department?.trim() || null,
    createdBy: req.user.id,
  });
  res.status(201).json(budget.toObject());
}

async function updateBudget(req, res) {
  const id = parseIdParam(req.params.id, "budget id");
  const budget = await FinanceBudgets.findOne({ id }).lean();
  if (!budget) notFound("Budget");
  const body = req.body ?? {};
  const updates = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.allocated !== undefined) {
    const allocated = Number(body.allocated);
    if (!(allocated > 0)) badRequest("allocated must be a positive number.", "allocated");
    updates.allocated = allocated;
  }
  if (body.department !== undefined) updates.department = body.department?.trim() || null;
  if (body.fiscalYear !== undefined) updates.fiscalYear = body.fiscalYear.trim();

  const updated = await FinanceBudgets.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  res.json(updated);
}

async function deleteBudget(req, res) {
  const id = parseIdParam(req.params.id, "budget id");
  const budget = await FinanceBudgets.findOne({ id }).lean();
  if (!budget) notFound("Budget");
  await FinanceBudgets.deleteOne({ id });
  res.json({ success: true });
}

export { listBudgets, createBudget, updateBudget, deleteBudget, budgetStatuses, computeSpentForBudget };
