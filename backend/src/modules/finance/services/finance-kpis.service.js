import {
  FinanceIncome,
  FinanceExpenses,
  FinancePayments,
  PayrollRuns,
  PayrollLines,
} from "../../../models/schema/index.js";
import { computeUnifiedOutstanding, computeUnifiedInvoiceAging } from "./unified-ledger.service.js";
import { outstandingExpenseAmount, recognizedExpenseAmountExpr } from "./expense-cash.service.js";
import { getGstKpiForMonth } from "./finance-tax.service.js";

function recognizedSumPipeline(match) {
  return [
    { $match: match },
    { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
    { $group: { _id: null, total: { $sum: "$_recognized" } } },
  ];
}

/**
 * Read-only wrapper over HRM payroll — finance never stores its own payroll
 * cost, it folds HRM's finalized/paid run totals into dashboard & P&L figures.
 * Cost-to-company = employee net pay + employer PF contribution (gross alone
 * understates true cost; net alone excludes the employer-side PF the company
 * actually pays).
 */
export async function getPayrollCostForPeriod(year, month) {
  const run = await PayrollRuns.findOne({ year, month, status: { $in: ["finalized", "paid"] } }).lean();
  if (!run) return { employeeCount: 0, gross: 0, net: 0, employerCost: 0 };
  const agg = await PayrollLines.aggregate([
    { $match: { payrollRunId: run.id } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        gross: { $sum: "$gross" },
        net: { $sum: "$net" },
        pfEmployer: { $sum: "$pfEmployer" },
      },
    },
  ]);
  const row = agg[0] ?? { count: 0, gross: 0, net: 0, pfEmployer: 0 };
  return {
    employeeCount: row.count,
    gross: row.gross,
    net: row.net,
    employerCost: row.net + row.pfEmployer,
  };
}

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end, year: date.getFullYear(), month: date.getMonth() + 1 };
}

function resolvePeriodBounds(period) {
  const now = new Date();
  if (period === "previous") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { current: monthBounds(prev), previous: monthBounds(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)) };
  }
  const current = monthBounds(now);
  const previous = monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  return { current, previous };
}

export async function computeDashboardKpis(period = "current") {
  const { current, previous: prev } = resolvePeriodBounds(period);
  const { start, end, year, month } = current;

  const [
    incomeThisMonth,
    incomePrevMonth,
    expenseThisMonth,
    expensePrevMonth,
    payrollThisMonth,
    payrollPrevMonth,
    outstandingAgg,
    gstThis,
    gstPrev,
  ] = await Promise.all([
    FinanceIncome.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    FinanceIncome.aggregate([
      { $match: { date: { $gte: prev.start, $lt: prev.end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    FinanceExpenses.aggregate(recognizedSumPipeline({ date: { $gte: start, $lt: end }, status: "approved" })),
    FinanceExpenses.aggregate(recognizedSumPipeline({ date: { $gte: prev.start, $lt: prev.end }, status: "approved" })),
    getPayrollCostForPeriod(year, month),
    getPayrollCostForPeriod(prev.year, prev.month),
    computeUnifiedOutstanding(),
    getGstKpiForMonth(year, month),
    getGstKpiForMonth(prev.year, prev.month),
  ]);

  const totalIncome = incomeThisMonth[0]?.total ?? 0;
  const prevIncome = incomePrevMonth[0]?.total ?? 0;
  const totalExpenses = (expenseThisMonth[0]?.total ?? 0) + payrollThisMonth.employerCost;
  const prevExpenses = (expensePrevMonth[0]?.total ?? 0) + payrollPrevMonth.employerCost;
  const netProfit = totalIncome - totalExpenses;
  const prevNetProfit = prevIncome - prevExpenses;
  const pendingInvoices = outstandingAgg.pendingCount ?? 0;
  const overdueAmount = outstandingAgg.overdueAmount ?? 0;

  const pctChange = (curr, prev) => (prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0);

  const apOutstanding = await computeApOutstandingTotal();

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    pendingInvoices,
    overdueAmount,
    outstandingPayables: apOutstanding,
    gstCollected: gstThis.gstCollected,
    gstInputCredit: gstThis.gstInputCredit,
    netGst: gstThis.netGst,
    gstDeposited: gstThis.gstDeposited,
    gstPayable: gstThis.gstPayable,
    trends: {
      totalIncome: pctChange(totalIncome, prevIncome),
      totalExpenses: pctChange(totalExpenses, prevExpenses),
      netProfit: pctChange(netProfit, prevNetProfit),
      pendingInvoices: 0,
      overdueAmount: 0,
      gstCollected: pctChange(gstThis.gstCollected, gstPrev.gstCollected),
      gstInputCredit: pctChange(gstThis.gstInputCredit, gstPrev.gstInputCredit),
      netGst: pctChange(gstThis.netGst, gstPrev.netGst),
    },
  };
}

export async function computeExpenseCategoryBreakdown(period = null) {
  const match = { status: "approved" };
  if (period === "current" || period === "previous") {
    const { current, previous } = resolvePeriodBounds(period);
    const bounds = period === "previous" ? previous : current;
    match.date = { $gte: bounds.start, $lt: bounds.end };
  }
  const rows = await FinanceExpenses.aggregate([
    { $match: match },
    { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
    { $group: { _id: "$category", count: { $sum: 1 }, value: { $sum: "$_recognized" } } },
    { $sort: { value: -1 } },
  ]);
  return rows.map((r) => ({ name: r._id, count: r.count, value: r.value }));
}

export async function computeMonthlyRevenueVsExpense(monthsBack = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const [incomeRows, expenseRows] = await Promise.all([
    FinanceIncome.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, revenue: { $sum: "$amount" } } },
    ]),
    FinanceExpenses.aggregate([
      { $match: { date: { $gte: start }, status: "approved" } },
      { $addFields: { _recognized: recognizedExpenseAmountExpr() } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, expense: { $sum: "$_recognized" } } },
    ]),
  ]);

  const byMonth = new Map();
  for (const r of incomeRows) byMonth.set(r._id, { month: r._id, revenue: r.revenue, expense: 0 });
  for (const r of expenseRows) {
    const entry = byMonth.get(r._id) ?? { month: r._id, revenue: 0, expense: 0 };
    entry.expense = r.expense;
    byMonth.set(r._id, entry);
  }

  const payrollMonths = await Promise.all(
    Array.from({ length: monthsBack }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return getPayrollCostForPeriod(d.getFullYear(), d.getMonth() + 1).then((payroll) => ({ key, cost: payroll.employerCost }));
    }),
  );
  for (const { key, cost } of payrollMonths) {
    if (!cost) continue;
    const entry = byMonth.get(key) ?? { month: key, revenue: 0, expense: 0 };
    entry.expense += cost;
    byMonth.set(key, entry);
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** True cash movement by payment date (incoming vs outgoing completed). */
export async function computeCashFlowByMonth(monthsBack = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const rows = await FinancePayments.aggregate([
    { $match: { date: { $gte: start }, status: "completed" } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$date" } },
          direction: "$direction",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const byMonth = new Map();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, { month: key, inflow: 0, outflow: 0 });
  }
  for (const r of rows) {
    const entry = byMonth.get(r._id.month);
    if (!entry) continue;
    if (r._id.direction === "incoming") entry.inflow += r.total;
    else if (r._id.direction === "outgoing") entry.outflow += r.total;
  }
  return [...byMonth.values()];
}

/** Vendor / bill dues aging from remaining Due on approved expenses. */
export async function computeApAging() {
  const expenses = await FinanceExpenses.find({ status: "approved" })
    .select({ date: 1, amount: 1, paidAmount: 1, paymentStatus: 1, status: 1 })
    .lean();
  const labels = ["0-30", "31-60", "61-90", "90+"];
  const buckets = Object.fromEntries(labels.map((b) => [b, { bucket: b, count: 0, amount: 0 }]));
  const now = Date.now();
  for (const e of expenses) {
    const due = outstandingExpenseAmount(e);
    if (!(due > 0)) continue;
    const days = Math.max(0, Math.floor((now - new Date(e.date).getTime()) / 86_400_000));
    const key = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
    buckets[key].count += 1;
    buckets[key].amount += due;
  }
  return labels.map((b) => ({
    bucket: buckets[b].bucket,
    count: buckets[b].count,
    amount: Math.round(buckets[b].amount),
  }));
}

export async function computeApOutstandingTotal() {
  const expenses = await FinanceExpenses.find({ status: "approved" })
    .select({ amount: 1, paidAmount: 1, paymentStatus: 1, status: 1 })
    .lean();
  return Math.round(expenses.reduce((s, e) => s + outstandingExpenseAmount(e), 0));
}

export async function computeDashboardExtras() {
  const [cashFlowTrend, apAging, arAging] = await Promise.all([
    computeCashFlowByMonth(6),
    computeApAging(),
    computeUnifiedInvoiceAging(),
  ]);
  return { cashFlowTrend, apAging, arAging };
}
