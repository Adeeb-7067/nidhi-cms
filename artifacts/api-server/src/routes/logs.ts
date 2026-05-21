import { Router } from "express";
import { dailyLogsTable, usersTable, projectsTable, projectMembersTable, getNextSequence, notificationsTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { notifyUser } from "../lib/realtime";
import { projectCompanyId } from "../lib/company-access";
import { parsePagination } from "../lib/route-errors";
import { paginateModel, toIso } from "../lib/mongo-list";
import { IdLookupCache } from "../lib/lookup-cache";

const router = Router();

function formatLog(log: any, developerName: string, developerEmployeeId: string | null, projectName: string) {
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
    createdAt: toIso(log.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(log.updatedAt) ?? new Date().toISOString(),
  };
}

function buildLogsListQuery(
  role: string,
  userId: number,
  queryParams: Record<string, string>,
): Record<string, unknown> {
  const query: Record<string, unknown> = {};
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

// GET /api/logs — own logs for dev/QA; all team logs for super admin
router.get("/logs", requireAuth, async (req, res) => {
  const queryParams = req.query as Record<string, string>;
  const pagination = parsePagination(queryParams);
  const query = buildLogsListQuery(req.user!.role, req.user!.id, queryParams);

  const { items, total, page, limit } = await paginateModel(dailyLogsTable, query, pagination, {
    sort: { logDate: -1 },
  });

  const logs = items as Array<{ developerId: number; projectId: number } & Record<string, unknown>>;
  const users = new IdLookupCache<{ id: number; name: string; employeeId?: string | null }>(async (ids) => {
    const rows = await usersTable
      .find({ id: { $in: ids } }, { id: 1, name: 1, employeeId: 1 })
      .lean()
      .exec();
    return rows as unknown as { id: number; name: string; employeeId?: string | null }[];
  });
  const projects = new IdLookupCache<{ id: number; name: string }>(async (ids) => {
    const rows = await projectsTable.find({ id: { $in: ids } }, { id: 1, name: 1 }).lean().exec();
    return rows as unknown as { id: number; name: string }[];
  });
  await Promise.all([
    users.preload(logs.map((l) => l.developerId)),
    projects.preload(logs.map((l) => l.projectId)),
  ]);

  const formattedLogs = logs.map((log) => {
    const developer = users.get(log.developerId);
    const project = projects.get(log.projectId);
    return formatLog(
      log,
      developer?.name ?? "Unknown",
      developer?.employeeId ?? null,
      project?.name ?? "Unknown",
    );
  });

  res.json({ logs: formattedLogs, total, page, limit });
});

// POST /api/logs — developers and testers only
router.post("/logs", requireAuth, async (req, res) => {
  if (req.user!.role === "super_admin" || req.user!.role === "client") {
    res.status(403).json({ error: "Only developers and testers can submit daily logs" });
    return;
  }
  const { projectId, logDate, workCategories, taskTitle, taskDescription, hoursSpent, completionPct, blockers, nextDayPlan } = req.body;
  if (!projectId || !logDate || !taskTitle || hoursSpent === undefined || completionPct === undefined) {
    res.status(400).json({ error: "projectId, logDate, taskTitle, hoursSpent, completionPct required" });
    return;
  }

  const projectForLog = await projectsTable.findOne({ id: projectId });
  const companyId = projectForLog ? projectCompanyId(projectForLog) : null;

  const nextId = await getNextSequence("daily_logs");
  const log = await dailyLogsTable.create({
    id: nextId,
    developerId: req.user!.id,
    companyId,
    projectId,
    logDate,
    workCategories: workCategories ?? [],
    taskTitle,
    taskDescription: taskDescription ?? null,
    hoursSpent: Number(hoursSpent),
    completionPct,
    blockers: blockers ?? null,
    nextDayPlan: nextDayPlan ?? null,
  });

  // Update member's completionPct in project_members
  await projectMembersTable.updateOne(
    { projectId, userId: req.user!.id },
    { $set: { completionPct } }
  );

  const user = await usersTable.findOne({ id: req.user!.id });
  const project = await projectsTable.findOne({ id: projectId });

  // ── Notify PM or Admins about the log ──
  try {
    const pmId = project?.pmId;
    const targetIds = pmId ? [pmId] : (await usersTable.find({ role: "super_admin" })).map(u => u.id);
    
    for (const targetId of targetIds) {
      if (targetId === req.user!.id) continue;
      
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
        relatedId: log.id,
      });
      
      notifyUser(targetId, "notification", {
        id: notifId,
        title: "New Daily Log",
        body: `${user?.name || "A developer"} submitted a log for project: ${project?.name || "Unknown"}`,
        type: "log",
        companyId: project ? projectCompanyId(project) : null,
        projectId,
      });
    }
  } catch (err) {
    console.error("Failed to send log notification:", err);
  }

  res.status(201).json(formatLog(log, user!.name, user!.employeeId, project!.name));
});

function canAccessLog(role: string, userId: number, logDeveloperId: number): boolean {
  if (role === "super_admin") return true;
  return userId === logDeveloperId;
}

// GET /api/logs/:id
router.get("/logs/:id", requireAuth, async (req, res) => {
  const log = await dailyLogsTable.findOne({ id: parseInt(req.params["id"] as string, 10) });
  if (!log) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  if (!canAccessLog(req.user!.role, req.user!.id, log.developerId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const user = await usersTable.findOne({ id: log.developerId });
  const project = await projectsTable.findOne({ id: log.projectId });

  res.json(formatLog(log, user?.name ?? "Unknown", user?.employeeId ?? null, project?.name ?? "Unknown"));
});

// PATCH /api/logs/:id
router.patch("/logs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  const { workCategories, taskTitle, taskDescription, hoursSpent, completionPct, blockers, nextDayPlan } = req.body;

  const existing = await dailyLogsTable.findOne({ id });
  if (!existing) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  if (!canAccessLog(req.user!.role, req.user!.id, existing.developerId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const log = await dailyLogsTable.findOneAndUpdate(
    { id },
    { $set: {
        ...(workCategories !== undefined && { workCategories }),
        ...(taskTitle !== undefined && { taskTitle }),
        ...(taskDescription !== undefined && { taskDescription }),
        ...(hoursSpent !== undefined && { hoursSpent: Number(hoursSpent) }),
        ...(completionPct !== undefined && { completionPct }),
        ...(blockers !== undefined && { blockers }),
        ...(nextDayPlan !== undefined && { nextDayPlan })
      }
    },
    { new: true }
  );

  if (!log) {
    res.status(404).json({ error: "Log not found" });
    return;
  }

  const user = await usersTable.findOne({ id: log.developerId });
  const project = await projectsTable.findOne({ id: log.projectId });
  res.json(formatLog(log, user?.name ?? "Unknown", user?.employeeId ?? null, project?.name ?? "Unknown"));
});

export default router;
