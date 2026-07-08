import {
  SalesLeads,
  SalesProposals,
  SalesPayments,
  SalesFollowUps,
  SalesInstallments,
  usersTable,
  clientsTable,
} from "../../models/schema/index.js";
import { formatUser } from "../../mappers/user-format.js";
import { notFound, forbidden, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { toIso } from "../../utils/mongo-list.js";
import { calcLineItemsTotal, resolveFinalTotal } from "../../utils/sales-totals.js";
import { findBdeAssignedProposalIds, findBdeOwnedCustomerIds } from "../../utils/sales-bde-customer-scope.js";
import { computeSalesKpis, computeOverdueByCustomer } from "../../services/sales/sales-kpis.service.js";

const BDE_USER_SELECT = {
  id: 1,
  name: 1,
  email: 1,
  avatarUrl: 1,
  employeeId: 1,
  designation: 1,
  status: 1,
  lastLoginAt: 1,
  lastSeenAt: 1,
  phoneNumber: 1,
  joiningDate: 1,
  departmentId: 1,
  department: 1,
  subType: 1,
  linkedinUrl: 1,
  createdAt: 1,
};

/**
 * @param {number[]} bdeIds
 * @param {{ start: Date, end: Date } | null} [dateRange] Scopes revenue/deals/leads to a period;
 *   pendingFollowUps always reflects current state regardless of period.
 * @param {{ includeFollowUps?: boolean }} [options] Set includeFollowUps:false when the caller
 *   already has (or doesn't need) the period-independent follow-up counts, to skip the redundant query.
 */
async function aggregateBdeStats(bdeIds, dateRange = null, { includeFollowUps = true } = {}) {
  if (!bdeIds.length) {
    return {
      revenueMap: new Map(),
      dealsMap: new Map(),
      closedProjectValueMap: new Map(),
      followUpMap: new Map(),
      leadMap: new Map(),
    };
  }

  const periodMatch = dateRange ? { createdAt: { $gte: dateRange.start, $lt: dateRange.end } } : {};
  const approvedMatch = dateRange ? { approvedAt: { $gte: dateRange.start, $lt: dateRange.end } } : {};
  const installmentDateMatch = dateRange
    ? { createdAt: { $gte: dateRange.start, $lt: dateRange.end } }
    : {};

  const [paymentAgg, proposalAgg, closedProjectAgg, followUpAgg, leadAgg] = await Promise.all([
    SalesPayments.aggregate([
      { $match: { recordedBy: { $in: bdeIds }, ...periodMatch } },
      { $group: { _id: "$recordedBy", revenue: { $sum: "$amount" } } },
    ]),
    SalesProposals.aggregate([
      { $match: { assignedTo: { $in: bdeIds }, status: "approved", ...approvedMatch } },
      { $group: { _id: "$assignedTo", dealsClosed: { $sum: 1 } } },
    ]),
    // Closed project value = sum of installment due amounts for deals whose
    // payment schedule was created in-period (matches sales-kpis salesValue).
    SalesInstallments.aggregate([
      { $match: { proposalId: { $ne: null }, ...installmentDateMatch } },
      { $group: { _id: "$proposalId", value: { $sum: "$dueAmount" } } },
      {
        $lookup: {
          from: SalesProposals.collection.name,
          localField: "_id",
          foreignField: "id",
          as: "proposal",
        },
      },
      { $unwind: "$proposal" },
      { $match: { "proposal.assignedTo": { $in: bdeIds } } },
      { $group: { _id: "$proposal.assignedTo", closedProjectValue: { $sum: "$value" } } },
    ]),
    includeFollowUps
      ? SalesFollowUps.aggregate([
          { $match: { executiveId: { $in: bdeIds }, status: { $in: ["scheduled", "overdue"] } } },
          { $group: { _id: "$executiveId", pendingFollowUps: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    SalesLeads.aggregate([
      { $match: { assignedTo: { $in: bdeIds }, ...periodMatch } },
      { $group: { _id: "$assignedTo", leadCount: { $sum: 1 } } },
    ]),
  ]);

  return {
    revenueMap: new Map(paymentAgg.map((r) => [r._id, r.revenue])),
    dealsMap: new Map(proposalAgg.map((r) => [r._id, r.dealsClosed])),
    closedProjectValueMap: new Map(closedProjectAgg.map((r) => [r._id, r.closedProjectValue])),
    followUpMap: new Map(followUpAgg.map((r) => [r._id, r.pendingFollowUps])),
    leadMap: new Map(leadAgg.map((r) => [r._id, r.leadCount])),
  };
}

function parseMonthYear(query) {
  const month = Number(query.month);
  const year = Number(query.year);
  if (!month || month < 1 || month > 12 || !year || year < 2000) return null;
  // UTC-based so the boundary doesn't shift relative to createdAt/approvedAt
  // (stored as UTC instants) depending on the server's local timezone.
  return { month, year, start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

function mapBdeUserToTeamMember(u, stats) {
  const { revenueMap, dealsMap, closedProjectValueMap, followUpMap, leadMap } = stats;
  const formatted = formatUser(u, { withPresence: true });
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
    employeeId: u.employeeId ?? null,
    designation: u.designation ?? "BDE",
    role: "bde",
    status: u.status,
    phoneNumber: u.phoneNumber ?? null,
    joiningDate: toIso(u.joiningDate),
    department: u.department ?? null,
    subType: u.subType ?? null,
    linkedinUrl: u.linkedinUrl ?? null,
    createdAt: toIso(u.createdAt),
    lastLoginAt: formatted.lastLoginAt ?? null,
    lastSeenAt: formatted.lastSeenAt ?? null,
    presenceStatus: formatted.presenceStatus ?? null,
    isActiveNow: formatted.isActiveNow ?? false,
    revenue: revenueMap.get(u.id) ?? 0,
    closedProjectValue: closedProjectValueMap.get(u.id) ?? 0,
    dealsClosed: dealsMap.get(u.id) ?? 0,
    leadCount: leadMap.get(u.id) ?? 0,
    pendingFollowUps: followUpMap.get(u.id) ?? 0,
  };
}

function buildBdeFilter(query) {
  const filter = { role: "bde" };
  const status = optionalString(query.status);
  if (status && status !== "all") {
    filter.status = status;
  } else if (!status) {
    filter.status = "active";
  }

  const search = optionalString(query.search)?.trim();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
}

function isLeaderboardRequest(query) {
  return query.leaderboard === "true" || query.leaderboard === "1";
}

/** BDE dashboard leaderboard — stats only, no contact/admin fields. */
function toLeaderboardMember(member) {
  return {
    id: member.id,
    name: member.name,
    avatarUrl: member.avatarUrl ?? null,
    designation: member.designation ?? "BDE",
    role: member.role,
    status: member.status,
    revenue: member.revenue,
    closedProjectValue: member.closedProjectValue,
    dealsClosed: member.dealsClosed,
    pendingFollowUps: member.pendingFollowUps,
  };
}

async function getSalesTeam(req, res) {
  const leaderboard = isLeaderboardRequest(req.query);
  if (req.user.role === "bde" && !leaderboard) {
    forbidden("Sales team roster is only available to admins.");
  }

  const filter = buildBdeFilter(req.query);
  const paginate = req.query.page != null || req.query.limit != null;
  const { page, limit, skip } = parsePagination(req.query);

  const userQuery = usersTable.find(filter).select(BDE_USER_SELECT).sort({ name: 1 });
  if (paginate) {
    userQuery.skip(skip).limit(limit);
  }

  const bdeRoleFilter = { role: "bde" };
  const [total, bdeUsers, activeCount, inactiveCount] = await Promise.all([
    paginate ? usersTable.countDocuments(filter) : Promise.resolve(0),
    userQuery.lean(),
    usersTable.countDocuments({ ...bdeRoleFilter, status: "active" }),
    usersTable.countDocuments({ ...bdeRoleFilter, status: "inactive" }),
  ]);

  const bdeIds = bdeUsers.map((u) => u.id);
  const period = parseMonthYear(req.query);
  const stats = await aggregateBdeStats(bdeIds, period);
  let team = bdeUsers.map((u) => mapBdeUserToTeamMember(u, stats));
  if (req.user.role === "bde" && leaderboard) {
    team = team.map(toLeaderboardMember);
  }

  const totals = team.reduce(
    (acc, m) => ({
      count: acc.count + 1,
      revenue: acc.revenue + m.revenue,
      dealsClosed: acc.dealsClosed + m.dealsClosed,
      pendingFollowUps: acc.pendingFollowUps + m.pendingFollowUps,
    }),
    { count: 0, revenue: 0, dealsClosed: 0, pendingFollowUps: 0 },
  );

  const payload = {
    team,
    totals,
    summary: {
      total: activeCount + inactiveCount,
      active: activeCount,
      inactive: inactiveCount,
    },
  };
  if (paginate) {
    payload.pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  res.json(payload);
}

async function getSalesTeamMember(req, res) {
  const userId = parseIdParam(req.params.userId, "user id");
  if (req.user.role === "bde" && req.user.id !== userId) {
    notFound("BDE team member");
  }
  const user = await usersTable.findOne({ id: userId, role: "bde" }).lean();
  if (!user) notFound("BDE team member");

  const stats = await aggregateBdeStats([userId]);
  const member = mapBdeUserToTeamMember(user, stats);

  const [myProposalIds, myCustomerIds] = await Promise.all([
    findBdeAssignedProposalIds(SalesProposals, userId),
    findBdeOwnedCustomerIds(clientsTable, userId),
  ]);
  const installmentFilter = { proposalId: { $in: myProposalIds.length ? myProposalIds : [-1] } };
  // Scoped by customer ownership, not by who recorded the payment — matches
  // dashboard.controller.js's definition of "this BDE's collected money" so the
  // same-named metric means the same thing in both the dashboard and this view.
  const overdueScope = { customerId: { $in: myCustomerIds.length ? myCustomerIds : [-1] } };
  const paymentFilter = overdueScope;

  const period = parseMonthYear(req.query);
  let periodStats = null;
  if (period) {
    const [periodAgg, salesKpis] = await Promise.all([
      aggregateBdeStats([userId], period, { includeFollowUps: false }),
      computeSalesKpis({
        installmentFilter,
        paymentFilter,
        periodStart: period.start,
        periodEnd: period.end,
      }),
    ]);
    periodStats = {
      month: period.month,
      year: period.year,
      revenue: periodAgg.revenueMap.get(userId) ?? 0,
      closedProjectValue: salesKpis.salesValue ?? periodAgg.closedProjectValueMap.get(userId) ?? 0,
      dealsClosed: periodAgg.dealsMap.get(userId) ?? 0,
      leadCount: periodAgg.leadMap.get(userId) ?? 0,
      ...salesKpis,
    };
  }

  const overdueResult = await computeOverdueByCustomer(overdueScope);

  const [
    leadsByStatusRows,
    proposalsByStatusRows,
    recentLeads,
    recentProposals,
    followUps,
    leadCount,
    proposalCount,
  ] = await Promise.all([
    SalesLeads.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    SalesProposals.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    SalesLeads.find({ assignedTo: userId })
      .select({ id: 1, name: 1, company: 1, status: 1, priority: 1, expectedValue: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    SalesProposals.find({ assignedTo: userId })
      .select({
        id: 1,
        title: 1,
        status: 1,
        items: 1,
        discount: 1,
        totalAdjustment: 1,
        adjustedTotal: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    SalesFollowUps.find({ executiveId: userId })
      .select({ id: 1, leadId: 1, type: 1, status: 1, scheduledAt: 1, notes: 1 })
      .sort({ scheduledAt: 1 })
      .limit(12)
      .lean(),
    SalesLeads.countDocuments({ assignedTo: userId }),
    SalesProposals.countDocuments({ assignedTo: userId }),
  ]);

  const followUpLeadIds = [...new Set(followUps.map((f) => f.leadId).filter(Boolean))];
  const followUpLeads = followUpLeadIds.length
    ? await SalesLeads.find({ id: { $in: followUpLeadIds } }).select({ id: 1, name: 1 }).lean()
    : [];
  const followUpLeadMap = new Map(followUpLeads.map((l) => [l.id, l]));

  res.json({
    member: formatUser(user, { withPresence: true, includeSensitive: true }),
    periodStats,
    overdueByCustomer: overdueResult.rows,
    overdueTotal: overdueResult.totalAmount,
    stats: {
      revenue: member.revenue,
      dealsClosed: member.dealsClosed,
      pendingFollowUps: member.pendingFollowUps,
      leadCount,
      proposalCount,
    },
    leadsByStatus: leadsByStatusRows.map((r) => ({ status: r._id, count: r.count })),
    proposalsByStatus: proposalsByStatusRows.map((r) => ({ status: r._id, count: r.count })),
    recentLeads: recentLeads.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company ?? null,
      status: l.status,
      priority: l.priority,
      expectedValue: l.expectedValue ?? 0,
      createdAt: toIso(l.createdAt),
    })),
    recentProposals: recentProposals.map((p) => {
      const calculated = calcLineItemsTotal(p.items ?? [], p.discount ?? 0);
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        totalAmount: resolveFinalTotal(calculated, p.totalAdjustment ?? 0, p.adjustedTotal ?? null),
        createdAt: toIso(p.createdAt),
      };
    }),
    followUps: followUps.map((f) => ({
      id: f.id,
      leadId: f.leadId,
      leadName: followUpLeadMap.get(f.leadId)?.name ?? null,
      type: f.type,
      status: f.status,
      scheduledAt: toIso(f.scheduledAt),
      notes: f.notes ?? "",
    })),
  });
}

export { getSalesTeam, getSalesTeamMember };
