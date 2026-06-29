import {
  SalesLeads,
  SalesProposals,
  SalesPayments,
  SalesFollowUps,
  usersTable,
} from "../../models/schema/index.js";
import { formatUser } from "../../mappers/user-format.js";
import { notFound, parseIdParam, parsePagination, optionalString } from "../../utils/route-errors.js";
import { toIso } from "../../utils/mongo-list.js";

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

async function aggregateBdeStats(bdeIds) {
  if (!bdeIds.length) {
    return {
      revenueMap: new Map(),
      dealsMap: new Map(),
      followUpMap: new Map(),
    };
  }

  const [paymentAgg, proposalAgg, followUpAgg] = await Promise.all([
    SalesPayments.aggregate([
      { $match: { recordedBy: { $in: bdeIds } } },
      { $group: { _id: "$recordedBy", revenue: { $sum: "$amount" } } },
    ]),
    SalesProposals.aggregate([
      { $match: { assignedTo: { $in: bdeIds }, status: "approved" } },
      { $group: { _id: "$assignedTo", dealsClosed: { $sum: 1 } } },
    ]),
    SalesFollowUps.aggregate([
      { $match: { executiveId: { $in: bdeIds }, status: { $in: ["scheduled", "overdue"] } } },
      { $group: { _id: "$executiveId", pendingFollowUps: { $sum: 1 } } },
    ]),
  ]);

  return {
    revenueMap: new Map(paymentAgg.map((r) => [r._id, r.revenue])),
    dealsMap: new Map(proposalAgg.map((r) => [r._id, r.dealsClosed])),
    followUpMap: new Map(followUpAgg.map((r) => [r._id, r.pendingFollowUps])),
  };
}

function mapBdeUserToTeamMember(u, stats) {
  const { revenueMap, dealsMap, followUpMap } = stats;
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
    dealsClosed: dealsMap.get(u.id) ?? 0,
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

async function getSalesTeam(req, res) {
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
  const stats = await aggregateBdeStats(bdeIds);
  const team = bdeUsers.map((u) => mapBdeUserToTeamMember(u, stats));

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
  const user = await usersTable.findOne({ id: userId, role: "bde" }).lean();
  if (!user) notFound("BDE team member");

  const stats = await aggregateBdeStats([userId]);
  const member = mapBdeUserToTeamMember(user, stats);

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
      .select({ id: 1, title: 1, status: 1, totalAmount: 1, createdAt: 1 })
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

  res.json({
    member: formatUser(user, { withPresence: true, includeSensitive: true }),
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
    recentProposals: recentProposals.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      totalAmount: p.totalAmount ?? 0,
      createdAt: toIso(p.createdAt),
    })),
    followUps: followUps.map((f) => ({
      id: f.id,
      leadId: f.leadId,
      type: f.type,
      status: f.status,
      scheduledAt: toIso(f.scheduledAt),
      notes: f.notes ?? "",
    })),
  });
}

export { getSalesTeam, getSalesTeamMember };
