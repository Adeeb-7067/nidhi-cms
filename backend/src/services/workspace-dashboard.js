import {
  projectsTable,
  projectMembersTable,
  bugsTable,
  ticketsTable,
  dailyLogsTable,
  notificationsTable,
  clientsTable,
  milestonesTable,
  apkReleasesTable,
  resourceRequestsTable,
} from "../models/schema/index.js";
import { formatProjectList } from "../mappers/project-format.js";
import { buildOpenTicketCountFilter } from "../services/ticket-support.js";

const OPEN_BUG_FILTER = {
  $or: [
    { finalStatus: "open" },
    { finalStatus: { $exists: false }, status: { $nin: ["closed", "verified", "wont_fix", "duplicate"] } },
  ],
};

const LISTABLE_BUG = {
  $or: [{ parentBugId: null }, { parentBugId: { $exists: false } }],
};

async function getScopedProjectIds(user) {
  const role = user.role;
  const memberships = await projectMembersTable.find({ userId: user.id }, { projectId: 1 }).lean().exec();
  let projectIds = memberships.map((m) => m.projectId);

  if (role === "qa" || role === "tester") {
    const reported = await projectsTable.distinct("id", { reporterId: user.id });
    projectIds = [...new Set([...projectIds, ...reported])];
  }

  return projectIds;
}

function pipelineFromProjects(projects) {
  const map = {
    scoping: 0,
    inProgress: 0,
    uat: 0,
    onHold: 0,
    completed: 0,
    maintenance: 0,
  };
  for (const p of projects) {
    const s = p.status;
    if (s === "scoping") map.scoping += 1;
    else if (s === "in_progress") map.inProgress += 1;
    else if (s === "uat") map.uat += 1;
    else if (s === "on_hold") map.onHold += 1;
    else if (s === "completed") map.completed += 1;
    else if (s === "maintenance" || p.type === "maintenance") map.maintenance += 1;
  }
  return map;
}

function isoWeekKey(date) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function buildWorkspaceDashboard(user) {
  const role = user.role;
  const projectIds = await getScopedProjectIds(user);
  const projectFilter = projectIds.length ? { id: { $in: projectIds } } : { id: -1 };
  const bugProjectFilter = projectIds.length ? { projectId: { $in: projectIds } } : { projectId: -1 };

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const isDev = role === "developer";
  const isQa = role === "qa" || role === "tester";
  const [
    projects,
    openBugs,
    openTickets,
    unreadNotifications,
    bugSeverityAgg,
    recentBugDocs,
  ] = await Promise.all([
    projectsTable.find(projectFilter).sort({ updatedAt: -1 }).limit(24).lean().exec(),
    bugsTable.countDocuments({ ...bugProjectFilter, ...LISTABLE_BUG, ...OPEN_BUG_FILTER }),
    ticketsTable.countDocuments(buildOpenTicketCountFilter(user)),
    notificationsTable.countDocuments({ userId: user.id, isRead: false }),
    bugsTable.aggregate([
      { $match: { ...bugProjectFilter, ...LISTABLE_BUG, ...OPEN_BUG_FILTER } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]),
    bugsTable
      .find({ ...bugProjectFilter, ...LISTABLE_BUG })
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean()
      .exec(),
  ]);

  let hoursThisWeek = 0;
  let bugsAssigned = 0;
  let bugsReported = 0;
  let logHoursTrend = [];
  let bugsTrend = [];
  let recentLogs = [];

  if (isDev) {
    const weekLogs = await dailyLogsTable
      .find({ developerId: user.id, createdAt: { $gte: weekAgo } })
      .lean()
      .exec();
    hoursThisWeek = weekLogs.reduce((s, l) => s + Number(l.hoursSpent || 0), 0);
    bugsAssigned = await bugsTable.countDocuments({
      ...bugProjectFilter,
      ...LISTABLE_BUG,
      ...OPEN_BUG_FILTER,
      $or: [{ assigneeId: user.id }, { assigneeIds: user.id }],
    });

    const logTrendRows = await dailyLogsTable.aggregate([
      { $match: { developerId: user.id, logDate: { $gte: sixMonthsAgo.toISOString().slice(0, 10) } } },
      { $group: { _id: "$logDate", hours: { $sum: "$hoursSpent" } } },
      { $sort: { _id: 1 } },
    ]);
    const weekMap = new Map();
    for (const row of logTrendRows) {
      const wk = isoWeekKey(row._id);
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + Number(row.hours || 0));
    }
    logHoursTrend = [...weekMap.entries()].slice(-8).map(([week, hours]) => ({ week, hours }));

    recentLogs = await dailyLogsTable
      .find({ developerId: user.id })
      .sort({ logDate: -1, createdAt: -1 })
      .limit(5)
      .lean()
      .exec();
  }

  if (isQa) {
    bugsReported = await bugsTable.countDocuments({
      ...bugProjectFilter,
      ...LISTABLE_BUG,
      reporterId: user.id,
      ...OPEN_BUG_FILTER,
    });
    const bugTrendRows = await bugsTable.aggregate([
      {
        $match: {
          ...bugProjectFilter,
          ...LISTABLE_BUG,
          reporterId: user.id,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    bugsTrend = bugTrendRows.map((r) => ({ month: r._id, count: r.count }));
  }

  const severityMap = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of bugSeverityAgg) {
    if (row._id && severityMap[row._id] !== undefined) severityMap[row._id] = row.count;
  }

  const formattedProjects = await formatProjectList(projects.slice(0, 8));
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const recentBugs = recentBugDocs.map((b) => ({
    id: b.id,
    title: b.title,
    bugNumber: b.bugNumber,
    severity: b.severity,
    status: b.status,
    projectName: projectNameById.get(b.projectId) ?? "Project",
    projectId: b.projectId,
  }));

  const maintenanceCount = projects.filter(
    (p) => p.type === "maintenance" || p.status === "maintenance",
  ).length;
  const activeDevCount = projects.length - maintenanceCount;

  const attentionCount =
    openBugs +
    openTickets +
    unreadNotifications +
    (isDev ? bugsAssigned : 0) +
    (isQa ? bugsReported : 0);

  return {
    role,
    kpis: {
      projects: projects.length,
      openBugs,
      openTickets,
      unreadNotifications,
      hoursThisWeek: isDev ? Math.round(hoursThisWeek * 10) / 10 : undefined,
      bugsAssigned: isDev ? bugsAssigned : undefined,
      bugsReported: isQa ? bugsReported : undefined,
      maintenanceProjects: maintenanceCount,
      activeDevProjects: activeDevCount,
    },
    attentionCount,
    projectPipeline: pipelineFromProjects(projects),
    bugSeverityBreakdown: severityMap,
    trends: {
      logHours: logHoursTrend,
      bugs: bugsTrend,
    },
    recentProjects: formattedProjects.map((p) => ({
      id: p.id,
      name: p.name,
      companyName: p.companyName,
      status: p.status,
      type: p.type,
      completionPct: p.completionPct,
      deadline: p.deadline,
      memberCount: p.memberCount,
    })),
    recentBugs,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      taskTitle: l.taskTitle,
      hoursSpent: l.hoursSpent,
      projectName: projectNameById.get(l.projectId) ?? "Project",
      logDate: l.logDate,
      projectId: l.projectId,
    })),
  };
}

export async function buildClientHubDashboard(user) {
  const company = await clientsTable.findOne({ userId: user.id }).lean();
  if (!company) {
    return {
      projectCount: 0,
      avgCompletionPct: 0,
      milestones: { completed: 0, total: 0 },
      pendingRequests: 0,
      releaseCount: 0,
      projects: [],
    };
  }

  const projectFilter = { $or: [{ companyId: company.id }, { clientId: company.id }] };
  const projects = await projectsTable.find(projectFilter).sort({ updatedAt: -1 }).lean().exec();
  const projectIds = projects.map((p) => p.id);

  const [milestones, releases, pendingRequests, formatted] = await Promise.all([
    projectIds.length
      ? milestonesTable.find({ projectId: { $in: projectIds } }, { status: 1 }).lean().exec()
      : [],
    projectIds.length
      ? apkReleasesTable.countDocuments({ projectId: { $in: projectIds } })
      : 0,
    projectIds.length
      ? resourceRequestsTable.countDocuments({ projectId: { $in: projectIds }, status: "pending" })
      : 0,
    formatProjectList(projects),
  ]);

  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const avgCompletionPct = formatted.length
    ? Math.round(formatted.reduce((s, p) => s + (p.completionPct || 0), 0) / formatted.length)
    : 0;

  return {
    projectCount: formatted.length,
    avgCompletionPct,
    milestones: { completed: completedMilestones, total: milestones.length },
    pendingRequests,
    releaseCount: releases,
    projects: formatted.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      completionPct: p.completionPct,
      deadline: p.deadline,
      companyName: p.companyName,
    })),
  };
}
