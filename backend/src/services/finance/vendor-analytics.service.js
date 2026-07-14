import {
  FinanceExpenses,
  FinancePayments,
  vendorsTable,
} from "../../models/schema/index.js";

/**
 * Vendor spend analytics — everything here is derived from finance data only,
 * since vendors are payees on approved expenses and outgoing payments. "Spend"
 * is recognised cost (approved expenses linked to a vendor); outstanding
 * payables settle that cost against completed outgoing payments.
 */

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function resolvePeriodBounds(period) {
  const now = new Date();
  const base =
    period === "previous" ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
  const current = monthBounds(base);
  const previous = monthBounds(new Date(base.getFullYear(), base.getMonth() - 1, 1));
  return { current, previous };
}

const pctChange = (curr, prev) =>
  prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

export async function computeVendorAnalytics(period = "current", monthsBack = 6) {
  const { current, previous } = resolvePeriodBounds(period);
  const now = new Date();
  const trendStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const vendorMatch = { status: "approved", vendorId: { $ne: null } };

  const [
    spendThisPeriod,
    spendPrevPeriod,
    totalVendors,
    topVendorsAgg,
    categoryAgg,
    monthlyExpenseRows,
    expenseTotalsByVendor,
    paymentTotalsByVendor,
  ] = await Promise.all([
    FinanceExpenses.aggregate([
      { $match: { ...vendorMatch, date: { $gte: current.start, $lt: current.end } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    FinanceExpenses.aggregate([
      { $match: { ...vendorMatch, date: { $gte: previous.start, $lt: previous.end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    vendorsTable.countDocuments({}),
    FinanceExpenses.aggregate([
      { $match: vendorMatch },
      { $group: { _id: "$vendorId", spend: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { spend: -1 } },
      { $limit: 8 },
    ]),
    FinanceExpenses.aggregate([
      { $match: vendorMatch },
      { $group: { _id: "$category", value: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
    FinanceExpenses.aggregate([
      { $match: { ...vendorMatch, date: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          spend: { $sum: "$amount" },
        },
      },
    ]),
    FinanceExpenses.aggregate([
      { $match: vendorMatch },
      { $group: { _id: "$vendorId", total: { $sum: "$amount" } } },
    ]),
    FinancePayments.aggregate([
      {
        $match: {
          direction: "outgoing",
          status: "completed",
          vendorId: { $ne: null },
        },
      },
      { $group: { _id: "$vendorId", total: { $sum: "$amount" } } },
    ]),
  ]);

  // Resolve vendor names for the top-spend list (single round-trip).
  const topVendorIds = topVendorsAgg.map((r) => r._id);
  const vendorDocs = topVendorIds.length
    ? await vendorsTable
        .find({ id: { $in: topVendorIds } })
        .select({ id: 1, companyName: 1 })
        .lean()
    : [];
  const nameById = new Map(vendorDocs.map((v) => [v.id, v.companyName]));

  const topVendors = topVendorsAgg.map((r) => ({
    vendorId: r._id,
    name: nameById.get(r._id) ?? `Vendor #${r._id}`,
    spend: r.spend,
    count: r.count,
  }));

  // Outstanding payables = recognised cost not yet settled by outgoing payments.
  const paidByVendor = new Map(paymentTotalsByVendor.map((r) => [r._id, r.total]));
  let outstandingPayables = 0;
  const activeVendorIds = new Set();
  for (const r of expenseTotalsByVendor) {
    activeVendorIds.add(r._id);
    const owed = r.total - (paidByVendor.get(r._id) ?? 0);
    if (owed > 0) outstandingPayables += owed;
  }

  // Fill a zero-padded monthly trend so the chart has a stable x-axis.
  const spendByMonth = new Map(monthlyExpenseRows.map((r) => [r._id, r.spend]));
  const monthlyTrend = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: key, spend: spendByMonth.get(key) ?? 0 };
  });

  const totalSpend = spendThisPeriod[0]?.total ?? 0;
  const prevSpend = spendPrevPeriod[0]?.total ?? 0;

  return {
    kpis: {
      totalSpend,
      periodExpenseCount: spendThisPeriod[0]?.count ?? 0,
      activeVendors: activeVendorIds.size,
      totalVendors,
      topVendorName: topVendors[0]?.name ?? null,
      topVendorSpend: topVendors[0]?.spend ?? 0,
      outstandingPayables,
      trends: { totalSpend: pctChange(totalSpend, prevSpend) },
    },
    monthlyTrend,
    topVendors,
    categoryBreakdown: categoryAgg.map((r) => ({
      name: r._id,
      count: r.count,
      value: r.value,
    })),
  };
}
