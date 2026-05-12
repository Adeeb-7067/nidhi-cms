import { Router } from "express";
import { db } from "../lib/db";
import { dailyLogsTable, usersTable, projectsTable, projectMembersTable } from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatLog(log: typeof dailyLogsTable.$inferSelect, developerName: string, developerEmployeeId: string | null, projectName: string) {
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
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

// GET /api/logs
router.get("/logs", requireAuth, async (req, res) => {
  const { projectId, month, year, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [eq(dailyLogsTable.developerId, req.user!.id)];
  if (projectId) conditions.push(eq(dailyLogsTable.projectId, parseInt(projectId)));

  const rows = await db
    .select({
      log: dailyLogsTable,
      developerName: usersTable.name,
      developerEmployeeId: usersTable.employeeId,
      projectName: projectsTable.name,
    })
    .from(dailyLogsTable)
    .innerJoin(usersTable, eq(usersTable.id, dailyLogsTable.developerId))
    .innerJoin(projectsTable, eq(projectsTable.id, dailyLogsTable.projectId))
    .where(and(...conditions))
    .orderBy(desc(dailyLogsTable.logDate))
    .limit(parseInt(limit))
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dailyLogsTable)
    .where(and(...conditions));

  res.json({
    logs: rows.map((r) => formatLog(r.log, r.developerName, r.developerEmployeeId, r.projectName)),
    total: Number(countResult.count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// POST /api/logs
router.post("/logs", requireAuth, async (req, res) => {
  const { projectId, logDate, workCategories, taskTitle, taskDescription, hoursSpent, completionPct, blockers, nextDayPlan } = req.body;
  if (!projectId || !logDate || !taskTitle || hoursSpent === undefined || completionPct === undefined) {
    res.status(400).json({ error: "projectId, logDate, taskTitle, hoursSpent, completionPct required" });
    return;
  }

  const [log] = await db
    .insert(dailyLogsTable)
    .values({
      developerId: req.user!.id,
      projectId,
      logDate,
      workCategories: workCategories ?? [],
      taskTitle,
      taskDescription: taskDescription ?? null,
      hoursSpent: String(hoursSpent),
      completionPct,
      blockers: blockers ?? null,
      nextDayPlan: nextDayPlan ?? null,
    })
    .returning();

  // Update member's completionPct in project_members
  await db
    .update(projectMembersTable)
    .set({ completionPct })
    .where(and(eq(projectMembersTable.projectId, projectId), eq(projectMembersTable.userId, req.user!.id)));

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.user!.id) });
  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });

  res.status(201).json(formatLog(log, user!.name, user!.employeeId, project!.name));
});

// GET /api/logs/:id
router.get("/logs/:id", requireAuth, async (req, res) => {
  const [row] = await db
    .select({
      log: dailyLogsTable,
      developerName: usersTable.name,
      developerEmployeeId: usersTable.employeeId,
      projectName: projectsTable.name,
    })
    .from(dailyLogsTable)
    .innerJoin(usersTable, eq(usersTable.id, dailyLogsTable.developerId))
    .innerJoin(projectsTable, eq(projectsTable.id, dailyLogsTable.projectId))
    .where(eq(dailyLogsTable.id, parseInt(req.params['id'] as string)));

  if (!row) {
    res.status(404).json({ error: "Log not found" });
    return;
  }
  res.json(formatLog(row.log, row.developerName, row.developerEmployeeId, row.projectName));
});

// PATCH /api/logs/:id
router.patch("/logs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const { workCategories, taskTitle, taskDescription, hoursSpent, completionPct, blockers, nextDayPlan } = req.body;

  const [log] = await db
    .update(dailyLogsTable)
    .set({ workCategories, taskTitle, taskDescription, hoursSpent: hoursSpent !== undefined ? String(hoursSpent) : undefined, completionPct, blockers, nextDayPlan, updatedAt: new Date() })
    .where(eq(dailyLogsTable.id, id))
    .returning();

  if (!log) {
    res.status(404).json({ error: "Log not found" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, log.developerId) });
  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, log.projectId) });
  res.json(formatLog(log, user!.name, user!.employeeId, project!.name));
});

export default router;
