import { FinanceInvoices } from "../../models/schema/index.js";
import {
  computeDashboardKpis,
  computeExpenseCategoryBreakdown,
  computeMonthlyRevenueVsExpense,
} from "../../services/finance/finance-kpis.service.js";
import { computeRevenueTrend } from "../../services/finance/finance-reports.service.js";

async function sweepOverdueInvoices() {
  await FinanceInvoices.updateMany(
    { status: { $in: ["unpaid", "partially_paid"] }, dueDate: { $lt: new Date() } },
    { $set: { status: "overdue" } },
  );
}

async function getDashboard(req, res) {
  await sweepOverdueInvoices();
  const period = req.query.period === "previous" ? "previous" : "current";
  const [kpis, expenseBreakdown, monthlyTrend] = await Promise.all([
    computeDashboardKpis(period),
    computeExpenseCategoryBreakdown(),
    computeMonthlyRevenueVsExpense(),
  ]);
  res.json({ kpis, expenseBreakdown, monthlyTrend, period });
}

async function getRevenueTrend(req, res) {
  const months = req.query.months ? Number(req.query.months) : 6;
  const trend = await computeRevenueTrend(months);
  res.json({ trend });
}

async function getExpenseBreakdown(req, res) {
  const breakdown = await computeExpenseCategoryBreakdown();
  res.json({ breakdown });
}

export { getDashboard, getRevenueTrend, getExpenseBreakdown, sweepOverdueInvoices };
