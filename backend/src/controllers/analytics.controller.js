import {
  projectsTable,
  clientsTable,
  usersTable,
  staffEmployeeRoles,
  bugsTable,
  dailyLogsTable,
  apkSchedulesTable,
  resourceRequestsTable,
  projectMembersTable,
  milestonesTable,
  ticketsTable
} from "../models/schema/index.js";
import { CLOSED_BUG_STATUSES, resolveListStatusFilter } from "../services/bugs/bug-workflow.js";
import {
  buildWorkspaceDashboard,
  buildClientHubDashboard,
} from "../services/workspace-dashboard.js";
import { buildRecentActivity } from "../services/dashboard-activity.js";
import { assertProjectAccess } from "../services/access/access-helpers.js";
import { applyIdScope, getAccessibleProjectIds } from "../services/access/list-scope.js";
import { forbidden } from "../utils/route-errors.js";

async function getAnalyticsDashboard(req, res) {
  const now = /* @__PURE__ */ new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const [
    activeProjects,
    totalClients,
    overdueProjects,
    openBugs,
    openRequests,
    apksDueToday,
    pipeline,
    bugSeverity,
    milestoneStatus,
    openTickets
  ] = await Promise.all([
    projectsTable.countDocuments({ status: "in_progress" }),
    clientsTable.countDocuments({ status: "active" }),
    projectsTable.countDocuments({ deadline: { $lt: now }, status: { $ne: "completed" } }),
    bugsTable.countDocuments({ status: { $nin: ["closed", "verified", "wont_fix", "duplicate"] } }),
    resourceRequestsTable.countDocuments({ status: "pending" }),
    apkSchedulesTable.countDocuments({ scheduledDate: { $gte: startOfToday, $lt: endOfToday } }),
    projectsTable.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    bugsTable.aggregate([
      { $match: { status: { $nin: ["closed", "verified", "wont_fix", "duplicate"] } } },
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]),
    milestonesTable.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    ticketsTable.countDocuments({ status: { $in: ["open", "pending"] } })
  ]);
  const sixMonthsAgo = /* @__PURE__ */ new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const [projectsTrend, bugsTrend] = await Promise.all([
    projectsTable.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    bugsTable.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  const pipelineMap = {};
  pipeline.forEach((row) => {
    if (row._id) pipelineMap[row._id] = row.count;
  });
  const severityMap = {};
  bugSeverity.forEach((row) => {
    if (row._id) severityMap[row._id] = row.count;
  });
  const recentActivity = await buildRecentActivity(12);
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const teamStaffFilter = { role: { $in: staffEmployeeRoles } };
  const { countOnlineByRoles } = await import("../services/presence.js"); // lazy: keeps analytics bundle path light when unused
  const [teamMembersActive, teamMembersOnlineToday, teamMembersOnlineNow] = await Promise.all([
    usersTable.countDocuments({ ...teamStaffFilter, status: "active" }),
    usersTable.countDocuments({
      ...teamStaffFilter,
      status: "active",
      lastLoginAt: { $gte: todayStart },
    }),
    Promise.resolve(countOnlineByRoles(staffEmployeeRoles)),
  ]);
  res.json({
    activeProjects,
    totalClients,
    teamMembersActive,
    teamMembersOnlineToday,
    teamMembersOnlineNow,
    /** @deprecated Use teamMembersActive — kept for older clients */
    teamMembersOnline: teamMembersActive,
    overdueProjects,
    apksDueToday,
    openBugs,
    openRequests,
    openTickets,
    recentActivity,
    projectPipeline: {
      scoping: pipelineMap["scoping"] ?? 0,
      inProgress: pipelineMap["in_progress"] ?? 0,
      uat: pipelineMap["uat"] ?? 0,
      onHold: pipelineMap["on_hold"] ?? 0,
      completed: pipelineMap["completed"] ?? 0,
      maintenance: pipelineMap["maintenance"] ?? 0
    },
    bugSeverityBreakdown: {
      critical: severityMap["critical"] ?? 0,
      high: severityMap["high"] ?? 0,
      medium: severityMap["medium"] ?? 0,
      low: severityMap["low"] ?? 0
    },
    milestonesStatus: milestoneStatus.map((m) => ({ status: m._id, count: m.count })),
    trends: {
      projects: projectsTrend.map((t) => ({ month: t._id, count: t.count })),
      bugs: bugsTrend.map((t) => ({ month: t._id, count: t.count }))
    }
  });
}
async function getAnalyticsProjectsById(req, res) {
  const projectId = parseInt(req.params["id"], 10);
  await assertProjectAccess(req, projectId);
  const members = await projectMembersTable.find({ projectId });
  const logs = await dailyLogsTable.find({ projectId }).sort({ logDate: 1 });
  const completionMap = /* @__PURE__ */ new Map();
  for (const log of logs) {
    completionMap.set(log.logDate, log.completionPct);
  }
  const completionOverTime = Array.from(completionMap.entries()).map(([date, value]) => ({ date, value }));
  const hoursMap = /* @__PURE__ */ new Map();
  for (const log of logs) {
    const month = log.logDate.slice(0, 7);
    hoursMap.set(month, (hoursMap.get(month) ?? 0) + Number(log.hoursSpent));
  }
  const hoursPerWeek = Array.from(hoursMap.entries()).map(([date, value]) => ({ date, value }));
  const catMap = /* @__PURE__ */ new Map();
  for (const log of logs) {
    for (const cat of log.workCategories) {
      catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
    }
  }
  const workCategoryBreakdown = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));
  const devHoursMap = /* @__PURE__ */ new Map();
  for (const log of logs) {
    devHoursMap.set(log.developerId, (devHoursMap.get(log.developerId) ?? 0) + Number(log.hoursSpent));
  }
  const memberUserIds = members.map((m) => m.userId);
  const memberUsers = memberUserIds.length
    ? await usersTable.find({ id: { $in: memberUserIds } }).select("id name").lean()
    : [];
  const memberUserById = new Map(memberUsers.map((u) => [u.id, u]));
  const developerContributions = members.map((m) => ({
    developerId: m.userId,
    developerName: memberUserById.get(m.userId)?.name ?? "Unknown",
    completionPct: m.completionPct,
    hoursLogged: devHoursMap.get(m.userId) ?? 0,
  }));
  const totalHoursLogged = logs.reduce((sum, l) => sum + Number(l.hoursSpent), 0);
  const averageCompletionPct = members.length ? Math.round(members.reduce((sum, m) => sum + m.completionPct, 0) / members.length) : 0;
  res.json({ projectId, completionOverTime, developerContributions, workCategoryBreakdown, hoursPerWeek, totalHoursLogged, averageCompletionPct });
}
async function getAnalyticsTeam(req, res) {
  const now = /* @__PURE__ */ new Date();
  const month = parseInt(req.query.month ?? String(now.getMonth() + 1), 10);
  const year = parseInt(req.query.year ?? String(now.getFullYear()), 10);
  const monthPattern = `${year}-${String(month).padStart(2, "0")}`;
  const monthStartDate = `${monthPattern}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEndDate = `${monthPattern}-${String(lastDay).padStart(2, "0")}`;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const workingDays = 22;

  const staff = await usersTable
    .find({ role: { $in: staffEmployeeRoles }, status: "active" })
    .sort({ name: 1 })
    .lean();
  const staffIds = staff.map((d) => d.id);

  if (!staffIds.length) {
    return res.json({ developers: [], heatmapData: [] });
  }

  const [memberCounts, logAgg, lastLogs, bugResolvedAgg, heatmapAgg] = await Promise.all([
    projectMembersTable.aggregate([
      { $match: { userId: { $in: staffIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    dailyLogsTable.aggregate([
      {
        $match: {
          developerId: { $in: staffIds },
          logDate: { $gte: monthStartDate, $lte: monthEndDate },
        },
      },
      {
        $group: {
          _id: "$developerId",
          totalHours: { $sum: "$hoursSpent" },
          logEntries: { $sum: 1 },
          avgCompletion: { $avg: "$completionPct" },
        },
      },
    ]),
    dailyLogsTable.aggregate([
      { $match: { developerId: { $in: staffIds } } },
      { $sort: { logDate: -1 } },
      { $group: { _id: "$developerId", lastLogDate: { $first: "$logDate" } } },
    ]),
    bugsTable.aggregate([
      {
        $match: {
          status: { $in: CLOSED_BUG_STATUSES },
          updatedAt: { $gte: monthStart, $lt: monthEnd },
          $or: [{ assigneeId: { $in: staffIds } }, { assigneeIds: { $in: staffIds } }],
        },
      },
      {
        $project: {
          assignees: {
            $setUnion: [
              { $cond: [{ $ne: ["$assigneeId", null] }, ["$assigneeId"], []] },
              { $ifNull: ["$assigneeIds", []] },
            ],
          },
        },
      },
      { $unwind: "$assignees" },
      { $match: { assignees: { $in: staffIds } } },
      { $group: { _id: "$assignees", count: { $sum: 1 } } },
    ]),
    dailyLogsTable.aggregate([
      { $match: { logDate: { $gte: monthStartDate, $lte: monthEndDate } } },
      { $group: { _id: "$logDate", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const activeProjectsByUser = new Map(memberCounts.map((r) => [r._id, r.count]));
  const logStatsByUser = new Map(
    logAgg.map((r) => [
      r._id,
      {
        totalHours: Number(r.totalHours) || 0,
        logEntries: r.logEntries,
        avgCompletion: Math.round(Number(r.avgCompletion) || 0),
      },
    ]),
  );
  const lastLogByUser = new Map(lastLogs.map((r) => [r._id, r.lastLogDate]));
  const bugsResolvedByUser = new Map(bugResolvedAgg.map((r) => [r._id, r.count]));

  const stats = staff
    .map((dev) => {
      const logStats = logStatsByUser.get(dev.id);
      const totalHoursThisMonth = logStats?.totalHours ?? 0;
      const logEntriesCount = logStats?.logEntries ?? 0;
      return {
        userId: dev.id,
        name: dev.name,
        employeeId: dev.employeeId ?? null,
        avatarUrl: dev.avatarUrl ?? null,
        subType: dev.subType ?? null,
        activeProjects: activeProjectsByUser.get(dev.id) ?? 0,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
        utilisationPct: Math.min(
          100,
          Math.round((totalHoursThisMonth / (workingDays * 8)) * 100),
        ),
        lastLogDate: lastLogByUser.get(dev.id) ?? null,
        logEntriesCount,
        avgCompletionPct: logStats?.avgCompletion ?? 0,
        bugsResolvedCount: bugsResolvedByUser.get(dev.id) ?? 0,
      };
    })
    .sort((a, b) => b.totalHoursThisMonth - a.totalHoursThisMonth);

  const heatmapData = heatmapAgg.map((r) => ({
    date: String(r._id).slice(0, 10),
    count: r.count,
  }));

  res.json({ developers: stats, heatmapData });
}
async function getAnalyticsBugs(req, res) {
  const { projectId } = req.query;
  const query = {};
  if (projectId) {
    const pid = parseInt(projectId, 10);
    await assertProjectAccess(req, pid);
    query.projectId = pid;
  } else {
    const projectIds = await getAccessibleProjectIds(req.user);
    if (projectIds === null) {
      if (req.user.role !== "super_admin") {
        forbidden("Organization-wide bug analytics requires super admin access.");
      }
    } else if (!applyIdScope(query, "projectId", projectIds)) {
      res.json({
        totalOpen: 0,
        totalFixed: 0,
        severityDistribution: [],
        statusDistribution: [],
        platformDistribution: [],
      });
      return;
    }
  }
  const listableRoots = { $or: [{ parentBugId: null }, { parentBugId: { $exists: false } }] };
  const openFilter = resolveListStatusFilter("open");
  const closedFilter = resolveListStatusFilter("closed");
  const [totalOpen, totalFixed, severityDist, statusDist, platformDist] = await Promise.all([
    bugsTable.countDocuments({
      ...query,
      $and: [openFilter, listableRoots].filter(Boolean),
    }),
    bugsTable.countDocuments({
      ...query,
      $and: [closedFilter, listableRoots].filter(Boolean),
    }),
    bugsTable.aggregate([
      { $match: query },
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]),
    bugsTable.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    bugsTable.aggregate([
      { $match: query },
      { $group: { _id: "$platform", count: { $sum: 1 } } }
    ])
  ]);
  res.json({
    totalOpen,
    totalFixed,
    severityDistribution: severityDist.map((r) => ({ name: r._id, count: r.count })),
    statusDistribution: statusDist.map((r) => ({ name: r._id, count: r.count })),
    platformDistribution: platformDist.map((r) => ({ name: r._id, count: r.count }))
  });
}
async function getAnalyticsCompanies(req, res) {
  const companies = await clientsTable
    .find({ status: "active" })
    .sort({ companyName: 1 })
    .limit(100)
    .lean();
  const companyIds = companies.map((c) => c.id);

  if (!companyIds.length) {
    return res.json({ companies: [] });
  }

  const now = /* @__PURE__ */ new Date();
  const projects = await projectsTable
    .find({
      $or: [{ companyId: { $in: companyIds } }, { clientId: { $in: companyIds } }],
    })
    .select("id status deadline companyId clientId")
    .lean();

  const projectsByCompany = new Map(companyIds.map((id) => [id, []]));
  const projectToCompany = new Map();
  const allProjectIds = [];

  for (const p of projects) {
    const cid = p.companyId ?? p.clientId;
    if (!projectsByCompany.has(cid)) continue;
    projectsByCompany.get(cid).push(p);
    projectToCompany.set(p.id, cid);
    allProjectIds.push(p.id);
  }

  const [openTicketRows, pendingRequestRows, memberRows] = await Promise.all([
    ticketsTable
      .find({
        status: { $in: ["open", "pending"] },
        $or: [
          { companyId: { $in: companyIds } },
          ...(allProjectIds.length ? [{ projectId: { $in: allProjectIds } }] : []),
        ],
      })
      .select("companyId projectId")
      .lean(),
    allProjectIds.length
      ? resourceRequestsTable
          .find({ status: "pending", projectId: { $in: allProjectIds } })
          .select("projectId")
          .lean()
      : Promise.resolve([]),
    allProjectIds.length
      ? projectMembersTable
          .find({ projectId: { $in: allProjectIds } })
          .select("projectId userId")
          .lean()
      : Promise.resolve([]),
  ]);

  const openTicketsByCompany = new Map(companyIds.map((id) => [id, 0]));
  for (const t of openTicketRows) {
    const cid = t.companyId ?? projectToCompany.get(t.projectId);
    if (cid != null) {
      openTicketsByCompany.set(cid, (openTicketsByCompany.get(cid) ?? 0) + 1);
    }
  }

  const pendingByCompany = new Map(companyIds.map((id) => [id, 0]));
  for (const r of pendingRequestRows) {
    const cid = projectToCompany.get(r.projectId);
    if (cid != null) {
      pendingByCompany.set(cid, (pendingByCompany.get(cid) ?? 0) + 1);
    }
  }

  const devsByCompany = new Map(companyIds.map((id) => [id, new Set()]));
  for (const m of memberRows) {
    const cid = projectToCompany.get(m.projectId);
    if (cid != null) devsByCompany.get(cid)?.add(m.userId);
  }

  const cards = companies.map((c) => {
    const projs = projectsByCompany.get(c.id) ?? [];
    const delayed = projs.filter(
      (p) => p.deadline && new Date(p.deadline) < now && p.status !== "completed",
    ).length;
    return {
      companyId: c.id,
      companyName: c.companyName,
      clientId: c.id,
      totalProjects: projs.length,
      activeProjects: projs.filter((p) => p.status === "in_progress").length,
      completedProjects: projs.filter((p) => p.status === "completed").length,
      delayedProjects: delayed,
      openTickets: openTicketsByCompany.get(c.id) ?? 0,
      pendingRequests: pendingByCompany.get(c.id) ?? 0,
      developerCount: devsByCompany.get(c.id)?.size ?? 0,
    };
  });

  res.json({ companies: cards });
}
async function getAnalyticsWorkspace(req, res) {
  const data = await buildWorkspaceDashboard(req.user);
  res.json(data);
}

async function getAnalyticsClientHub(req, res) {
  const data = await buildClientHubDashboard(req.user);
  res.json(data);
}

export {
  getAnalyticsBugs,
  getAnalyticsClientHub,
  getAnalyticsCompanies,
  getAnalyticsDashboard,
  getAnalyticsProjectsById,
  getAnalyticsTeam,
  getAnalyticsWorkspace,
};
