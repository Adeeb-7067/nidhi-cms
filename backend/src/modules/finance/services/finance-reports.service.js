import {
  FinanceIncome,
  FinanceExpenses,
  FinanceInvoices,
  Projects,
  PayrollRuns,
  PayrollLines,
} from "../../../models/schema/index.js";
import { getPayrollCostForPeriod } from "./finance-kpis.service.js";
import { recognizedExpenseAmountExpr } from "./expense-cash.service.js";

async function payrollCostByMonth(months) {
  const costs = await Promise.all(
    months.map(({ year, month }) => getPayrollCostForPeriod(year, month)),
  );
  return new Map(months.map((m, i) => [`${m.year}-${String(m.month).padStart(2, "0")}`, costs[i].employerCost]));
}

function lastNMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString("en-US", { month: "short" }) };
  });
}

export async function computeMonthlyPnl(monthsBack = 6) {
  const months = lastNMonths(monthsBack);
  const start = new Date(months[0].year, months[0].month - 1, 1);

  const [incomeRows, expenseRows, payrollByMonth] = await Promise.all([
    FinanceIncome.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, income: { $sum: "$amount" } } },
    ]),
    FinanceExpenses.aggregate([
      { $match: { date: { $gte: start }, status: "approved" } },
      { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, expenses: { $sum: "$_recognized" } } },
    ]),
    payrollCostByMonth(months),
  ]);

  const incomeMap = new Map(incomeRows.map((r) => [r._id, r.income]));
  const expenseMap = new Map(expenseRows.map((r) => [r._id, r.expenses]));

  return months.map((m) => {
    const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
    const income = incomeMap.get(key) ?? 0;
    const expenses = (expenseMap.get(key) ?? 0) + (payrollByMonth.get(key) ?? 0);
    return { month: m.label, income, expenses, profit: income - expenses };
  });
}

export async function computeYearlyPnl(yearsBack = 4) {
  const now = new Date();
  const startYear = now.getFullYear() - (yearsBack - 1);
  const start = new Date(startYear, 3, 1); // Indian FY starts in April

  const [incomeRows, expenseRows, payrollRows] = await Promise.all([
    FinanceIncome.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, income: { $sum: "$amount" } } },
    ]),
    FinanceExpenses.aggregate([
      { $match: { date: { $gte: start }, status: "approved" } },
      { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, expenses: { $sum: "$_recognized" } } },
    ]),
    PayrollLines.aggregate([
      {
        $lookup: {
          from: "payrollruns",
          let: { runId: "$payrollRunId" },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$runId"] }, status: { $in: ["finalized", "paid"] } } }],
          as: "run",
        },
      },
      { $unwind: "$run" },
      {
        $group: {
          _id: { year: "$run.year", month: "$run.month" },
          net: { $sum: "$net" },
          pfEmployer: { $sum: "$pfEmployer" },
        },
      },
    ]),
  ]);

  function fiscalYearLabel(dateKey) {
    const [y, m] = dateKey.split("-").map(Number);
    return m >= 4 ? `${y}-${String((y + 1) % 100).padStart(2, "0")}` : `${y - 1}-${String(y % 100).padStart(2, "0")}`;
  }

  const byFy = new Map();
  for (const r of incomeRows) {
    const fy = fiscalYearLabel(r._id);
    const entry = byFy.get(fy) ?? { year: fy, income: 0, expenses: 0 };
    entry.income += r.income;
    byFy.set(fy, entry);
  }
  for (const r of expenseRows) {
    const fy = fiscalYearLabel(r._id);
    const entry = byFy.get(fy) ?? { year: fy, income: 0, expenses: 0 };
    entry.expenses += r.expenses;
    byFy.set(fy, entry);
  }
  for (const r of payrollRows) {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
    const fy = fiscalYearLabel(key);
    const entry = byFy.get(fy) ?? { year: fy, income: 0, expenses: 0 };
    entry.expenses += r.net + r.pfEmployer;
    byFy.set(fy, entry);
  }

  return [...byFy.values()]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((r) => ({ ...r, profit: r.income - r.expenses }));
}

export async function computeProjectProfitability() {
  const [incomeRows, expenseRows] = await Promise.all([
    FinanceIncome.aggregate([
      { $match: { projectId: { $ne: null } } },
      { $group: { _id: "$projectId", revenue: { $sum: "$amount" } } },
    ]),
    FinanceExpenses.aggregate([
      { $match: { projectId: { $ne: null }, status: "approved" } },
      { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
      { $group: { _id: "$projectId", cost: { $sum: "$_recognized" } } },
    ]),
  ]);
  const projectIds = [...new Set([...incomeRows.map((r) => r._id), ...expenseRows.map((r) => r._id)])];
  if (!projectIds.length) return [];
  const projects = await Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean();
  const nameMap = new Map(projects.map((p) => [p.id, p.name]));
  const revenueMap = new Map(incomeRows.map((r) => [r._id, r.revenue]));
  const costMap = new Map(expenseRows.map((r) => [r._id, r.cost]));
  return projectIds.map((id) => ({
    project: nameMap.get(id) ?? `Project #${id}`,
    revenue: revenueMap.get(id) ?? 0,
    cost: costMap.get(id) ?? 0,
  }));
}

/** Department-wise cost comes from HRM payroll (per-user department) joined against project income by department is not tracked directly, so this rolls up payroll cost by department as "cost" with 0 revenue unless a project's income is manually attributed — kept simple and payroll-driven for now. */
export async function computeDepartmentProfitability() {
  const rows = await PayrollLines.aggregate([
    {
      $lookup: {
        from: "payrollruns",
        let: { runId: "$payrollRunId" },
        pipeline: [{ $match: { $expr: { $eq: ["$id", "$$runId"] }, status: { $in: ["finalized", "paid"] } } }],
        as: "run",
      },
    },
    { $unwind: "$run" },
    {
      $lookup: {
        from: "users",
        let: { uid: "$userId" },
        pipeline: [{ $match: { $expr: { $eq: ["$id", "$$uid"] } } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "departments",
        let: { deptId: "$user.departmentId" },
        pipeline: [{ $match: { $expr: { $eq: ["$id", "$$deptId"] } } }],
        as: "dept",
      },
    },
    { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ["$dept.name", "Unassigned"] },
        cost: { $sum: { $add: ["$net", "$pfEmployer"] } },
      },
    },
  ]);
  return rows.map((r) => ({ department: r._id, revenue: 0, cost: r.cost }));
}

/**
 * Department-wise salary spend for a specific payroll period.
 * Defaults to "paid" runs only (money actually disbursed); pass status "all"
 * to include finalized-but-unpaid runs. Cost-to-company = net + employer PF.
 */
export async function computeDepartmentPayroll({ year, month, status = "paid" } = {}) {
  const statuses = status === "all" ? ["finalized", "paid"] : ["paid"];
  const runMatch = { status: { $in: statuses } };
  if (year) runMatch.year = year;
  if (month) runMatch.month = month;

  // Surface the actual run status for the requested period so the UI can hint
  // "not paid yet" even when there are no matching (paid) lines.
  let runStatus = null;
  if (year && month) {
    const run = await PayrollRuns.findOne({ year, month }).select({ status: 1 }).lean();
    runStatus = run?.status ?? null;
  }

  const rows = await PayrollLines.aggregate([
    {
      $lookup: {
        from: "payrollruns",
        let: { runId: "$payrollRunId" },
        pipeline: [{ $match: { $expr: { $eq: ["$id", "$$runId"] }, ...runMatch } }],
        as: "run",
      },
    },
    { $unwind: "$run" },
    {
      $lookup: {
        from: "users",
        let: { uid: "$userId" },
        pipeline: [{ $match: { $expr: { $eq: ["$id", "$$uid"] } } }],
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "departments",
        let: { deptId: "$user.departmentId" },
        pipeline: [{ $match: { $expr: { $eq: ["$id", "$$deptId"] } } }],
        as: "dept",
      },
    },
    { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ["$dept.name", "Unassigned"] },
        employees: { $sum: 1 },
        net: { $sum: "$net" },
        cost: { $sum: { $add: ["$net", "$pfEmployer"] } },
      },
    },
    { $sort: { cost: -1 } },
  ]);

  const departments = rows.map((r) => ({
    department: r._id,
    employees: r.employees,
    net: r.net,
    cost: r.cost,
  }));
  const totals = departments.reduce(
    (acc, d) => ({ employees: acc.employees + d.employees, net: acc.net + d.net, cost: acc.cost + d.cost }),
    { employees: 0, net: 0, cost: 0 },
  );

  return {
    period: year && month ? { year, month } : null,
    runStatus,
    departments,
    totals,
  };
}

export async function computeRevenueTrend(monthsBack = 6) {
  const months = lastNMonths(monthsBack);
  const start = new Date(months[0].year, months[0].month - 1, 1);
  const rows = await FinanceIncome.aggregate([
    { $match: { date: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, revenue: { $sum: "$amount" } } },
  ]);
  const revenueMap = new Map(rows.map((r) => [r._id, r.revenue]));
  let prevRevenue = null;
  return months.map((m) => {
    const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
    const revenue = revenueMap.get(key) ?? 0;
    const growth = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0;
    prevRevenue = revenue;
    return { month: m.label, revenue, growth };
  });
}
