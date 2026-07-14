import { FinanceInvoices, FinanceExpenses, FinanceIncome, PayrollRuns, PayrollLines, FinanceTaxDeposits, SalesInvoices } from "../../models/schema/index.js";
import { calcInvoiceTotal } from "../../utils/finance-totals.js";
import { calcSalesInvoiceBreakdown } from "../../utils/sales-totals.js";
import { recognizedExpenseGstExpr } from "./expense-cash.service.js";

function monthRange(year, month) {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  return { start: new Date(year, startMonth, 1), end: new Date(year, startMonth + 3, 1) };
}

/** Indian FY: April 1 (year) – March 31 (year+1). */
function fiscalYearRange(fyStartYear) {
  return { start: new Date(fyStartYear, 3, 1), end: new Date(fyStartYear + 1, 3, 1) };
}

async function gstCollectedInRange(start, end) {
  const [financeInvoices, salesInvoices, manualIncome] = await Promise.all([
    FinanceInvoices.find({
      issueDate: { $gte: start, $lt: end },
      status: { $ne: "cancelled" },
    }).lean(),
    SalesInvoices.find({
      issueDate: { $gte: start, $lt: end },
      status: { $ne: "cancelled" },
    }).lean(),
    FinanceIncome.find({
      date: { $gte: start, $lt: end },
      status: "received",
      salesPaymentId: null,
      gstAmount: { $gt: 0 },
    }).lean(),
  ]);

  const fromFinanceInvoices = financeInvoices.reduce(
    (sum, inv) => sum + calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled).tax,
    0,
  );
  const fromSalesInvoices = salesInvoices.reduce(
    (sum, inv) => sum + calcSalesInvoiceBreakdown(inv).tax,
    0,
  );
  const fromManualIncome = manualIncome.reduce((sum, row) => sum + (row.gstAmount ?? 0), 0);

  return fromFinanceInvoices + fromSalesInvoices + fromManualIncome;
}

async function gstPaidInRange(start, end) {
  const rows = await FinanceExpenses.aggregate([
    { $match: { date: { $gte: start, $lt: end }, status: "approved", gstEnabled: true } },
    { $addFields: { _gstPaid: recognizedExpenseGstExpr() } },
    { $group: { _id: null, total: { $sum: "$_gstPaid" } } },
  ]);
  return rows[0]?.total ?? 0;
}

async function tdsDeductedInRange(startYear, startMonth, endYear, endMonth) {
  const runs = await PayrollRuns.find({ status: { $in: ["finalized", "paid"] } }).lean();
  const lowerKey = startYear * 100 + startMonth;
  const upperKey = endYear * 100 + endMonth;
  const inRange = runs.filter((r) => {
    const key = r.year * 100 + r.month;
    return key >= lowerKey && key <= upperKey;
  });
  if (!inRange.length) return 0;
  const runIds = inRange.map((r) => r.id);
  const agg = await PayrollLines.aggregate([
    { $match: { payrollRunId: { $in: runIds } } },
    { $group: { _id: null, total: { $sum: "$tds" } } },
  ]);
  return agg[0]?.total ?? 0;
}

async function taxDeposited(type, periodKey) {
  const rows = await FinanceTaxDeposits.find({ type, period: periodKey }).lean();
  return rows.reduce((s, r) => s + r.amount, 0);
}

async function computePeriodSummary({ label, periodType, periodKey, start, end, tdsStart, tdsEnd }) {
  const [gstCollected, gstPaid, tdsDeducted, gstDeposited, tdsDeposited] = await Promise.all([
    gstCollectedInRange(start, end),
    gstPaidInRange(start, end),
    tdsDeductedInRange(tdsStart.year, tdsStart.month, tdsEnd.year, tdsEnd.month),
    taxDeposited("gst", periodKey),
    taxDeposited("tds", periodKey),
  ]);
  return {
    period: label,
    periodKey,
    periodType,
    gstCollected,
    gstPaid,
    netGst: gstCollected - gstPaid,
    tdsDeducted,
    tdsDeposited,
    gstDeposited,
  };
}

/** Returns the last `count` periods of the given type, most recent first. */
export async function listTaxSummaries(periodType = "monthly", count = 4) {
  const now = new Date();
  const periods = [];

  if (periodType === "monthly") {
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start, end } = monthRange(d.getFullYear(), d.getMonth() + 1);
      periods.push({
        label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
        periodType,
        periodKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        start,
        end,
        tdsStart: { year: d.getFullYear(), month: d.getMonth() + 1 },
        tdsEnd: { year: d.getFullYear(), month: d.getMonth() + 1 },
      });
    }
  } else if (periodType === "quarterly") {
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    for (let i = 0; i < count; i++) {
      let q = currentQuarter - i;
      let y = now.getFullYear();
      while (q < 1) {
        q += 4;
        y -= 1;
      }
      const { start, end } = quarterRange(y, q);
      const startMonth = (q - 1) * 3 + 1;
      periods.push({
        label: `Q${q} ${y}`,
        periodType,
        periodKey: `${y}-Q${q}`,
        start,
        end,
        tdsStart: { year: y, month: startMonth },
        tdsEnd: { year: y, month: startMonth + 2 },
      });
    }
  } else {
    const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    for (let i = 0; i < count; i++) {
      const fyStart = currentFyStart - i;
      const { start, end } = fiscalYearRange(fyStart);
      periods.push({
        label: `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`,
        periodType,
        periodKey: `FY${fyStart}`,
        start,
        end,
        tdsStart: { year: fyStart, month: 4 },
        tdsEnd: { year: fyStart + 1, month: 3 },
      });
    }
  }

  return Promise.all(periods.map(computePeriodSummary));
}
