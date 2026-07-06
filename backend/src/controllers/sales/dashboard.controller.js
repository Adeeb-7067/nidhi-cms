import {
  SalesLeads,
  SalesProposals,
  clientsTable,
  SalesInvoices,
  SalesPayments,
  SalesFollowUps,
  usersTable,
} from "../../models/schema/index.js";
import { billableInvoiceMatch } from "../../utils/sales-invoice-filters.js";
import { buildBdeSalesScope, findBdeOwnedCustomerIds } from "../../utils/sales-bde-customer-scope.js";

async function getBdeScope(userId) {
  return buildBdeSalesScope(clientsTable, userId);
}

async function getDashboard(req, res) {
  const isBde = req.user.role === "bde";
  const scope = isBde ? await getBdeScope(req.user.id) : null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const lf = scope?.leadFilter ?? {};
  const pf = scope?.proposalFilter ?? {};
  const fuf = scope?.followUpFilter ?? {};
  const pyf = scope?.paymentFilter ?? {};
  const cf = scope?.customerFilter ?? { status: "active" };
  const invF = scope?.invoiceFilter ?? {};

  const [
    totalLeads,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    totalLeadsClosed,
    activeFollowUps,
    totalProposals,
    activeCustomers,
    leadsBySourceRows,
    invoiceAgg,
    paymentAgg,
    proposalAgg,
  ] = await Promise.all([
    SalesLeads.countDocuments(lf),
    SalesLeads.countDocuments({ ...lf, createdAt: { $gte: startOfToday } }),
    SalesLeads.countDocuments({ ...lf, createdAt: { $gte: startOfWeek } }),
    SalesLeads.countDocuments({ ...lf, createdAt: { $gte: startOfMonth } }),
    SalesLeads.countDocuments({ ...lf, status: "converted" }),
    SalesFollowUps.countDocuments({ ...fuf, status: { $in: ["scheduled", "overdue"] } }),
    SalesProposals.countDocuments(pf),
    clientsTable.countDocuments(cf),
    SalesLeads.aggregate([
      { $match: lf },
      { $group: { _id: { $ifNull: ["$source", "other"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    SalesInvoices.aggregate([
      { $match: invF },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
        },
      },
    ]),
    SalesPayments.aggregate([
      { $match: pyf },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]),
    SalesProposals.aggregate([
      { $match: pf },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const invoiceByStatus = {};
  const proposalByStatus = {};
  let totalBilled = 0;
  let totalOutstanding = 0;
  for (const row of invoiceAgg) {
    invoiceByStatus[row._id] = { count: row.count, amount: row.totalAmount };
    if (row._id === "cancelled") continue;
    totalBilled += row.totalAmount;
    totalOutstanding += Math.max(0, row.totalAmount - row.totalPaid);
  }
  for (const row of proposalAgg) {
    proposalByStatus[row._id] = row.count;
  }
  const totalRevenue = paymentAgg[0]?.totalRevenue ?? 0;
  const pendingInvoices =
    (invoiceByStatus["unpaid"]?.count ?? 0) +
    (invoiceByStatus["partial"]?.count ?? 0) +
    (invoiceByStatus["overdue"]?.count ?? 0);

  res.json({
    leads: { total: totalLeads, today: leadsToday, thisWeek: leadsThisWeek, thisMonth: leadsThisMonth, closed: totalLeadsClosed },
    totalLeadsClosed,
    activeFollowUps,
    totalProposals,
    activeCustomers,
    totalRevenue,
    totalBilled,
    totalSales: totalBilled,
    outstanding: totalOutstanding,
    pendingInvoices,
    invoiceByStatus,
    proposalByStatus,
    leadsBySource: leadsBySourceRows.map((row) => ({
      source: row._id,
      count: row.count,
    })),
  });
}

async function getPipeline(req, res) {
  const stages = [
    "new", "contacted", "follow_up", "interested", "project_planning",
    "proposal_sent", "approved", "converted", "lost",
  ];
  const matchStage = req.user.role === "bde"
    ? { $match: { $or: [{ assignedTo: req.user.id }, { createdBy: req.user.id }] } }
    : { $match: {} };
  const counts = await SalesLeads.aggregate([
    matchStage,
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const pipeline = Object.fromEntries(stages.map((s) => [s, 0]));
  for (const row of counts) {
    if (Object.prototype.hasOwnProperty.call(pipeline, row._id)) {
      pipeline[row._id] = row.count;
    }
  }
  res.json({ pipeline });
}

async function getRevenueTrend(req, res) {
  const { period = "month" } = req.query;
  const now = new Date();
  let startDate;
  let groupFormat;
  if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    groupFormat = "%Y-%m-%d";
  } else if (period === "year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    groupFormat = "%Y-%m";
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    groupFormat = "%Y-%m-%d";
  }
  const payMatch = { createdAt: { $gte: startDate } };
  const invMatch = billableInvoiceMatch({ createdAt: { $gte: startDate } });
  if (req.user.role === "bde") {
    const myCustomerIds = await findBdeOwnedCustomerIds(clientsTable, req.user.id);
    const scope = { customerId: { $in: myCustomerIds.length ? myCustomerIds : [-1] } };
    Object.assign(payMatch, scope);
    Object.assign(invMatch, scope);
  }
  const [paymentRows, invoiceRows] = await Promise.all([
    SalesPayments.aggregate([
      { $match: payMatch },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          collected: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SalesInvoices.aggregate([
      { $match: invMatch },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
          billed: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const byDate = new Map();
  for (const row of invoiceRows) {
    byDate.set(row._id, { date: row._id, billed: row.billed, collected: 0 });
  }
  for (const row of paymentRows) {
    const entry = byDate.get(row._id) ?? { date: row._id, billed: 0, collected: 0 };
    entry.collected = row.collected;
    byDate.set(row._id, entry);
  }
  const trend = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  res.json({
    trend: trend.map((d) => ({
      date: d.date,
      billed: d.billed,
      collected: d.collected,
      revenue: d.collected,
    })),
  });
}

async function getReports(req, res) {
  const isBde = req.user.role === "bde";
  const scope = isBde ? await getBdeScope(req.user.id) : null;
  const lf = scope?.leadFilter ?? {};
  const pf = scope?.paymentFilter ?? {};
  const invF = scope?.invoiceFilter ?? {};

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    leadsBySourceRows,
    leadsByStatusRows,
    executiveRows,
    paymentsByMonth,
    invoicesByMonth,
    paymentTotals,
    invoiceTotals,
  ] = await Promise.all([
    SalesLeads.aggregate([
      ...(Object.keys(lf).length ? [{ $match: lf }] : []),
      { $group: { _id: { $ifNull: ["$source", "other"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SalesLeads.aggregate([
      ...(Object.keys(lf).length ? [{ $match: lf }] : []),
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    SalesPayments.aggregate([
      ...(Object.keys(pf).length ? [{ $match: pf }] : []),
      { $group: { _id: "$recordedBy", revenue: { $sum: "$amount" }, payments: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: isBde ? 1 : 12 },
    ]),
    SalesPayments.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, ...pf } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          collected: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SalesInvoices.aggregate([
      { $match: billableInvoiceMatch({ createdAt: { $gte: sixMonthsAgo }, ...invF }) },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          billed: { $sum: "$amount" },
          paid: { $sum: "$paidAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SalesPayments.aggregate([
      ...(Object.keys(pf).length ? [{ $match: pf }] : []),
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    SalesInvoices.aggregate([
      { $match: billableInvoiceMatch(invF) },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
        },
      },
    ]),
  ]);

  const userIds = executiveRows.map((r) => r._id).filter(Boolean);
  const users = userIds.length
    ? await usersTable.find({ id: { $in: userIds } }).select({ id: 1, name: 1 }).lean()
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const invoiceSummary = invoiceTotals[0] ?? { totalBilled: 0, totalPaid: 0 };
  const totalPaid = paymentTotals[0]?.total ?? 0;
  const totalOutstanding = Math.max(0, invoiceSummary.totalBilled - invoiceSummary.totalPaid);

  const billedByMonth = new Map(invoicesByMonth.map((r) => [r._id, r]));
  const monthlyCollections = paymentsByMonth.map((row) => {
    const inv = billedByMonth.get(row._id);
    const billed = inv?.billed ?? 0;
    const paidOnInvoices = inv?.paid ?? 0;
    return {
      month: row._id,
      collected: row.collected,
      outstanding: Math.max(0, billed - paidOnInvoices),
    };
  });

  res.json({
    leadsBySource: leadsBySourceRows.map((r) => ({ source: r._id, count: r.count })),
    leadsByStatus: leadsByStatusRows.map((r) => ({ status: r._id, count: r.count })),
    executivePerformance: executiveRows.map((r) => ({
      userId: r._id,
      name: userMap.get(r._id) ?? `User #${r._id}`,
      revenue: r.revenue,
      payments: r.payments,
    })),
    monthlyCollections,
    outstandingVsPaid: [
      { name: "Paid", value: totalPaid },
      { name: "Outstanding", value: totalOutstanding },
    ],
  });
}

export { getDashboard, getPipeline, getRevenueTrend, getReports };
