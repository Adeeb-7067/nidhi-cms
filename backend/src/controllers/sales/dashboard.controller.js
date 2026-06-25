import {
  SalesLeads,
  SalesProposals,
  SalesCustomers,
  SalesInvoices,
  SalesPayments,
  SalesFollowUps,
} from "../../models/schema/index.js";

async function getDashboard(req, res) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalLeads,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    activeFollowUps,
    totalProposals,
    activeCustomers,
    invoiceAgg,
    paymentAgg,
  ] = await Promise.all([
    SalesLeads.countDocuments({}),
    SalesLeads.countDocuments({ createdAt: { $gte: startOfToday } }),
    SalesLeads.countDocuments({ createdAt: { $gte: startOfWeek } }),
    SalesLeads.countDocuments({ createdAt: { $gte: startOfMonth } }),
    SalesFollowUps.countDocuments({ status: { $in: ["scheduled", "overdue"] } }),
    SalesProposals.countDocuments({}),
    SalesCustomers.countDocuments({ status: "active" }),
    SalesInvoices.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalPaid: { $sum: "$paidAmount" },
        },
      },
    ]),
    SalesPayments.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$amount" } } }]),
  ]);

  const invoiceByStatus = {};
  let totalBilled = 0;
  let totalOutstanding = 0;
  for (const row of invoiceAgg) {
    invoiceByStatus[row._id] = { count: row.count, amount: row.totalAmount };
    totalBilled += row.totalAmount;
    totalOutstanding += Math.max(0, row.totalAmount - row.totalPaid);
  }
  const totalRevenue = paymentAgg[0]?.totalRevenue ?? 0;
  const pendingInvoices =
    (invoiceByStatus["unpaid"]?.count ?? 0) +
    (invoiceByStatus["partial"]?.count ?? 0) +
    (invoiceByStatus["overdue"]?.count ?? 0);

  res.json({
    leads: { total: totalLeads, today: leadsToday, thisWeek: leadsThisWeek, thisMonth: leadsThisMonth },
    activeFollowUps,
    totalProposals,
    activeCustomers,
    totalRevenue,
    totalBilled,
    outstanding: totalOutstanding,
    pendingInvoices,
    invoiceByStatus,
  });
}

async function getPipeline(req, res) {
  const stages = [
    "new", "contacted", "follow_up", "interested",
    "proposal_sent", "approved", "converted", "lost",
  ];
  const counts = await SalesLeads.aggregate([
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
  const data = await SalesPayments.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({ trend: data.map((d) => ({ date: d._id, revenue: d.revenue })) });
}

export { getDashboard, getPipeline, getRevenueTrend };
