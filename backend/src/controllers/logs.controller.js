import { dailyLogsTable, usersTable, projectsTable, projectMembersTable, getNextSequence, notificationsTable } from "../models/schema/index.js";
import { notifyUser } from "../lib/realtime.js";
import { projectCompanyId } from "../services/access/company-access.js";
import { buildDailyLogSummary, buildComplianceCalendar } from "../services/daily-log-compliance.js";
import { parsePagination, badRequest, forbidden, notFound } from "../utils/route-errors.js";
import { paginateModel, toIso } from "../utils/mongo-list.js";
import { IdLookupCache } from "../lib/lookup-cache.js";
function formatLog(log, developerName, developerEmployeeId, projectName) {
  return {
    id: log.id,
    developerId: log.developerId,
    developerName,
    developerEmployeeId,
    projectId: log.projectId,
    projectName,
    logDate: log.logDate,
    workCategories: log.workCategories,
    taskTitle: log.taskTitle,
    taskDescription: log.taskDescription,
    hoursSpent: Number(log.hoursSpent),
    completionPct: log.completionPct,
    blockers: log.blockers,
    nextDayPlan: log.nextDayPlan,
    createdAt: toIso(log.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: toIso(log.updatedAt) ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function buildLogsListQuery(role, userId, queryParams) {
  const query = {};
  const { projectId, developerId, month, year } = queryParams;
  if (role === "super_admin") {
    if (developerId) {
      const id = Number.parseInt(developerId, 10);
      if (Number.isFinite(id)) query.developerId = id;
    }
  } else {
    query.developerId = userId;
  }
  if (projectId) {
    const id = Number.parseInt(projectId, 10);
    if (Number.isFinite(id)) query.projectId = id;
  }
  if (month && year) {
    const m = Number.parseInt(month, 10);
    const y = Number.parseInt(year, 10);
    if (Number.isFinite(m) && Number.isFinite(y) && m >= 1 && m <= 12) {
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      query.logDate = { $gte: start, $lte: end };
    }
  }
  return query;
}
async function getLogs(req, res) {
  const queryParams = req.query;
  const pagination = parsePagination(queryParams);
  const query = buildLogsListQuery(req.user.role, req.user.id, queryParams);
  const { items, total, page, limit } = await paginateModel(dailyLogsTable, query, pagination, {
    sort: { logDate: -1 }
  });
  const logs = items;
  const users = new IdLookupCache(async (ids) => {
    const rows = await usersTable.find({ id: { $in: ids } }, { id: 1, name: 1, employeeId: 1 }).lean().exec();
    return rows;
  });
  const projects = new IdLookupCache(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows;
  });
  await Promise.all([
    users.preload(logs.map((l) => l.developerId)),
    projects.preload(logs.map((l) => l.projectId))
  ]);
  const formattedLogs = logs.map((log) => {
    const developer = users.get(log.developerId);
    const project = projects.get(log.projectId);
    return formatLog(
      log,
      developer?.name ?? "Unknown",
      developer?.employeeId ?? null,
      project?.name ?? "Unknown"
    );
  });
  res.json({ logs: formattedLogs, total, page, limit });
}
async function getLogsComplianceCalendar(req, res) {
  const month = Number.parseInt(String(req.query.month ?? ""), 10);
  const year = Number.parseInt(String(req.query.year ?? ""), 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    badRequest("Valid month (1-12) is required.", "month");
  }
  if (!Number.isFinite(year) || year < 2000) {
    badRequest("Valid year is required.", "year");
  }

  let developerId = req.user.id;
  if (req.user.role === "super_admin") {
    const parsed = Number.parseInt(String(req.query.developerId ?? ""), 10);
    if (!Number.isFinite(parsed)) {
      badRequest("developerId is required for admin.", "developerId");
    }
    developerId = parsed;
  } else if (req.query.developerId) {
    forbidden("You can only view your own compliance calendar.");
  }

  const calendar = await buildComplianceCalendar(developerId, month, year);
  res.json(calendar);
}

async function getLogsDailySummary(req, res) {
  const logDate =
    typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : new Date().toISOString().slice(0, 10);
  let userId = req.user.id;
  if (req.user.role === "super_admin" && req.query.developerId) {
    const parsed = Number.parseInt(String(req.query.developerId), 10);
    if (Number.isFinite(parsed)) userId = parsed;
  }
  const summary = await buildDailyLogSummary(userId, logDate);
  res.json(summary);
}
async function postLogs(req, res) {
  if (req.user.role === "super_admin" || req.user.role === "client") {
    forbidden("Only developers and testers can submit daily logs.");
  }
  const { projectId, logDate, workCategories, taskTitle, taskDescription, hoursSpent, completionPct, blockers, nextDayPlan } = req.body;
  if (!projectId || !logDate || !taskTitle || hoursSpent === void 0 || completionPct === void 0) {
    badRequest("projectId, logDate, taskTitle, hoursSpent, and completionPct are required.");
  }
  const projectForLog = await projectsTable.findOne({ id: projectId });
  const companyId = projectForLog ? projectCompanyId(projectForLog) : null;
  const nextId = await getNextSequence("daily_logs");
  const log = await dailyLogsTable.create({
    id: nextId,
    developerId: req.user.id,
    companyId,
    projectId,
    logDate,
    workCategories: workCategories ?? [],
    taskTitle,
    taskDescription: taskDescription ?? null,
    hoursSpent: Number(hoursSpent),
    completionPct,
    blockers: blockers ?? null,
    nextDayPlan: nextDayPlan ?? null
  });
  await projectMembersTable.updateOne(
    { projectId, userId: req.user.id },
    { $set: { completionPct } }
  );
  const user = await usersTable.findOne({ id: req.user.id });
  const project = await projectsTable.findOne({ id: projectId });
  try {
    const pmId = project?.pmId;
    const targetIds = pmId ? [pmId] : (await usersTable.find({ role: "super_admin" })).map((u) => u.id);
    for (const targetId of targetIds) {
      if (targetId === req.user.id) continue;
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId: targetId,
        title: "New Daily Log",
        body: `${user?.name || "A developer"} submitted a log for project: ${project?.name || "Unknown"}`,
        type: "log",
        companyId: project ? projectCompanyId(project) : null,
        projectId,
        entityType: "log",
        entityId: log.id,
        relatedId: log.id
      });
      notifyUser(targetId, "notification", {
        id: notifId,
        title: "New Daily Log",
        body: `${user?.name || "A developer"} submitted a log for project: ${project?.name || "Unknown"}`,
        type: "log",
        companyId: project ? projectCompanyId(project) : null,
        projectId
      });
    }
  } catch (err) {
    console.error("Failed to send log notification:", err);
  }
  const dailySummary = await buildDailyLogSummary(req.user.id, logDate);
  res.status(201).json({
    ...formatLog(log, user.name, user.employeeId, project.name),
    dailySummary
  });
}
function canAccessLog(role, userId, logDeveloperId) {
  if (role === "super_admin") return true;
  return userId === logDeveloperId;
}
async function getLogsById(req, res) {
  const log = await dailyLogsTable.findOne({ id: parseInt(req.params["id"], 10) });
  if (!log) notFound("Log");
  if (!canAccessLog(req.user.role, req.user.id, log.developerId)) forbidden();
  const user = await usersTable.findOne({ id: log.developerId });
  const project = await projectsTable.findOne({ id: log.projectId });
  res.json(formatLog(log, user?.name ?? "Unknown", user?.employeeId ?? null, project?.name ?? "Unknown"));
}
async function patchLogsById(req, res) {
  const id = parseInt(req.params["id"], 10);
  const { workCategories, taskTitle, taskDescription, hoursSpent, completionPct, blockers, nextDayPlan } = req.body;
  const existing = await dailyLogsTable.findOne({ id });
  if (!existing) notFound("Log");
  if (!canAccessLog(req.user.role, req.user.id, existing.developerId)) forbidden();
  const log = await dailyLogsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        ...workCategories !== void 0 && { workCategories },
        ...taskTitle !== void 0 && { taskTitle },
        ...taskDescription !== void 0 && { taskDescription },
        ...hoursSpent !== void 0 && { hoursSpent: Number(hoursSpent) },
        ...completionPct !== void 0 && { completionPct },
        ...blockers !== void 0 && { blockers },
        ...nextDayPlan !== void 0 && { nextDayPlan }
      }
    },
    { new: true }
  );
  if (!log) notFound("Log");
  const user = await usersTable.findOne({ id: log.developerId });
  const project = await projectsTable.findOne({ id: log.projectId });
  const dailySummary = await buildDailyLogSummary(log.developerId, log.logDate);
  res.json({
    ...formatLog(log, user?.name ?? "Unknown", user?.employeeId ?? null, project?.name ?? "Unknown"),
    dailySummary
  });
}
export {
  getLogs,
  getLogsComplianceCalendar,
  getLogsDailySummary,
  getLogsById,
  patchLogsById,
  postLogs
};
