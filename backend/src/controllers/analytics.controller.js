import {
  projectsTable,
  clientsTable,
  usersTable,
  bugsTable,
  dailyLogsTable,
  apkSchedulesTable,
  resourceRequestsTable,
  projectMembersTable,
  auditLogsTable,
  milestonesTable,
  ticketsTable
} from "../models/schema/index.js";
import { resolveListStatusFilter } from "../services/bugs/bug-workflow.js";
import {
  buildWorkspaceDashboard,
  buildClientHubDashboard,
} from "../services/workspace-dashboard.js";

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
    recentLogs,
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
    auditLogsTable.find({}, { action: 1, entityType: 1, userId: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10).lean(),
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
  const recentActivity = await Promise.all(
    recentLogs.map(async (log) => {
      let actorName = "System";
      let actorAvatarUrl = null;
      if (log.actorId) {
        const user = await usersTable.findOne({ id: log.actorId });
        if (user) {
          actorName = user.name;
          actorAvatarUrl = user.avatarUrl;
        }
      }
      return {
        id: log.id,
        actorName,
        actorAvatarUrl,
        action: log.action,
        entityType: log.entityType,
        entityName: `${log.entityType} #${log.entityId}`,
        timestamp: log.createdAt.toISOString()
      };
    })
  );
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const teamMembersOnline = await usersTable.countDocuments({
    role: "developer",
    lastLoginAt: { $gte: todayStart }
  });
  res.json({
    activeProjects,
    totalClients,
    teamMembersOnline,
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
  const projectId = parseInt(req.params["id"]);
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
  const developerContributions = await Promise.all(
    members.map(async (m) => {
      const user = await usersTable.findOne({ id: m.userId });
      return {
        developerId: m.userId,
        developerName: user?.name ?? "Unknown",
        completionPct: m.completionPct,
        hoursLogged: devHoursMap.get(m.userId) ?? 0
      };
    })
  );
  const totalHoursLogged = logs.reduce((sum, l) => sum + Number(l.hoursSpent), 0);
  const averageCompletionPct = members.length ? Math.round(members.reduce((sum, m) => sum + m.completionPct, 0) / members.length) : 0;
  res.json({ projectId, completionOverTime, developerContributions, workCategoryBreakdown, hoursPerWeek, totalHoursLogged, averageCompletionPct });
}
async function getAnalyticsTeam(req, res) {
  const now = /* @__PURE__ */ new Date();
  const month = parseInt(req.query.month ?? String(now.getMonth() + 1));
  const year = parseInt(req.query.year ?? String(now.getFullYear()));
  const monthPattern = `${year}-${String(month).padStart(2, "0")}`;
  const developers = await usersTable.find({ role: "developer" });
  const statsPromises = developers.map(async (dev) => {
    const activeProjects = await projectMembersTable.countDocuments({ userId: dev.id });
    const logs = await dailyLogsTable.find({
      developerId: dev.id,
      logDate: { $regex: `^${monthPattern}` }
    });
    const totalHoursThisMonth = logs.reduce((sum, l) => sum + Number(l.hoursSpent), 0);
    const workingDays = 22;
    const utilisationPct = Math.min(100, Math.round(totalHoursThisMonth / (workingDays * 8) * 100));
    const lastLog = await dailyLogsTable.findOne({ developerId: dev.id }).sort({ logDate: -1 });
    return {
      userId: dev.id,
      name: dev.name,
      employeeId: dev.employeeId,
      avatarUrl: dev.avatarUrl,
      subType: dev.subType,
      activeProjects,
      totalHoursThisMonth,
      utilisationPct,
      lastLogDate: lastLog?.logDate ?? null
    };
  });
  const stats = await Promise.all(statsPromises);
  const allLogs = await dailyLogsTable.find({
    logDate: { $regex: `^${monthPattern}` }
  });
  const heatMap = /* @__PURE__ */ new Map();
  for (const log of allLogs) {
    heatMap.set(log.logDate, (heatMap.get(log.logDate) ?? 0) + 1);
  }
  const heatmapData = Array.from(heatMap.entries()).map(([date, count]) => ({ date, count }));
  res.json({ developers: stats, heatmapData });
}
async function getAnalyticsBugs(req, res) {
  const { projectId } = req.query;
  const query = {};
  if (projectId) query.projectId = parseInt(projectId);
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
  const companies = await clientsTable.find({ status: "active" }).sort({ companyName: 1 }).limit(100);
  const now = /* @__PURE__ */ new Date();
  const cards = await Promise.all(
    companies.map(async (c) => {
      const companyId = c.id;
      const projectFilter = { $or: [{ companyId }, { clientId: companyId }] };
      const projects = await projectsTable.find(projectFilter).select("id status deadline").lean();
      const projectIds = projects.map((p) => p.id);
      const [openTickets, pendingRequests, developerCount] = await Promise.all([
        ticketsTable.countDocuments({
          status: { $in: ["open", "pending"] },
          $or: [{ companyId }, ...projectIds.length ? [{ projectId: { $in: projectIds } }] : []]
        }),
        resourceRequestsTable.countDocuments({
          status: "pending",
          ...projectIds.length ? { projectId: { $in: projectIds } } : { projectId: -1 }
        }),
        projectIds.length ? projectMembersTable.distinct("userId", { projectId: { $in: projectIds } }).then((ids) => ids.length) : Promise.resolve(0)
      ]);
      const delayed = projects.filter(
        (p) => p.deadline && new Date(p.deadline) < now && p.status !== "completed"
      ).length;
      return {
        companyId,
        companyName: c.companyName,
        clientId: companyId,
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "in_progress").length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        delayedProjects: delayed,
        openTickets,
        pendingRequests,
        developerCount
      };
    })
  );
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
