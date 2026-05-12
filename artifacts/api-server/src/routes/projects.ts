import { Router } from "express";
import { db } from "../lib/db";
import {
  projectsTable, projectMembersTable, apkSchedulesTable, milestonesTable,
  usersTable, clientsTable, dailyLogsTable,
} from "@workspace/db/schema";
import { eq, and, like, sql, desc, or, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

async function computeCompletionPct(projectId: number): Promise<number> {
  const members = await db
    .select({ completionPct: projectMembersTable.completionPct, subType: projectMembersTable.subType })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, projectId));

  if (!members.length) return 0;

  let totalWeight = 0;
  let weightedSum = 0;
  for (const m of members) {
    const weight = m.subType === "Project Manager" ? 1.5 : 1;
    totalWeight += weight;
    weightedSum += m.completionPct * weight;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

async function formatProject(project: typeof projectsTable.$inferSelect) {
  const [client] = await db.select({ companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, project.clientId));
  let pmName: string | null = null;
  if (project.pmId) {
    const [pm] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, project.pmId));
    pmName = pm?.name ?? null;
  }
  const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(projectMembersTable).where(eq(projectMembersTable.projectId, project.id));
  const computedPct = await computeCompletionPct(project.id);

  return {
    id: project.id,
    name: project.name,
    clientId: project.clientId,
    clientName: client?.companyName ?? "Unknown",
    pmId: project.pmId,
    pmName,
    description: project.description,
    status: project.status,
    priority: project.priority,
    startDate: project.startDate.toISOString(),
    deadline: project.deadline.toISOString(),
    techStack: project.techStack,
    figmaUrl: project.figmaUrl,
    repoUrl: project.repoUrl,
    stagingUrl: project.stagingUrl,
    productionUrl: project.productionUrl,
    completionPct: project.completionOverride ?? computedPct,
    completionOverride: project.completionOverride,
    memberCount: Number(memberCount.count),
    createdAt: project.createdAt.toISOString(),
  };
}

// GET /api/projects
router.get("/projects", requireAuth, async (req, res) => {
  const { status, clientId, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (status) conditions.push(eq(projectsTable.status, status as "scoping" | "in_progress" | "on_hold" | "uat" | "completed"));
  if (clientId) conditions.push(eq(projectsTable.clientId, parseInt(clientId)));
  if (search) conditions.push(like(projectsTable.name, `%${search}%`));

  // Developers only see their assigned projects
  if (req.user!.role === "developer") {
    const memberRows = await db
      .select({ projectId: projectMembersTable.projectId })
      .from(projectMembersTable)
      .where(eq(projectMembersTable.userId, req.user!.id));
    const projectIds = memberRows.map((m) => m.projectId);
    if (!projectIds.length) {
      res.json({ projects: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
      return;
    }
    conditions.push(inArray(projectsTable.id, projectIds));
  }

  // Clients only see projects assigned to them
  if (req.user!.role === "client") {
    const clientRow = await db.query.clientsTable.findFirst({ where: eq(clientsTable.userId, req.user!.id) });
    if (clientRow) {
      conditions.push(eq(projectsTable.clientId, clientRow.id));
    }
  }

  const [projects, countResult] = await Promise.all([
    db.select().from(projectsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(projectsTable.createdAt)).limit(parseInt(limit)).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(projectsTable).where(conditions.length ? and(...conditions) : undefined),
  ]);

  const formatted = await Promise.all(projects.map(formatProject));
  res.json({ projects: formatted, total: Number(countResult[0].count), page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/projects
router.post("/projects", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { name, clientId, pmId, description, status, priority, startDate, deadline, techStack, figmaUrl, repoUrl, stagingUrl, productionUrl } = req.body;
  if (!name || !clientId || !priority || !startDate || !deadline) {
    res.status(400).json({ error: "name, clientId, priority, startDate, deadline required" });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({ name, clientId, pmId: pmId ?? null, description: description ?? null, status: status ?? "scoping", priority, startDate: new Date(startDate), deadline: new Date(deadline), techStack: techStack ?? [], figmaUrl: figmaUrl ?? null, repoUrl: repoUrl ?? null, stagingUrl: stagingUrl ?? null, productionUrl: productionUrl ?? null })
    .returning();
  res.status(201).json(await formatProject(project));
});

// GET /api/projects/:id
router.get("/projects/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, id) });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await formatProject(project));
});

// PATCH /api/projects/:id
router.patch("/projects/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const { name, pmId, description, status, priority, startDate, deadline, techStack, figmaUrl, repoUrl, stagingUrl, productionUrl, completionOverride } = req.body;
  const [project] = await db
    .update(projectsTable)
    .set({ name, pmId, description, status, priority, startDate: startDate ? new Date(startDate) : undefined, deadline: deadline ? new Date(deadline) : undefined, techStack, figmaUrl, repoUrl, stagingUrl, productionUrl, completionOverride, updatedAt: new Date() })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await formatProject(project));
});

// DELETE /api/projects/:id
router.delete("/projects/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  await db.delete(projectsTable).where(eq(projectsTable.id, parseInt(req.params['id'] as string)));
  res.json({ message: "Project deleted" });
});

// GET /api/projects/:id/members
router.get("/projects/:id/members", requireAuth, async (req, res) => {
  const projectId = parseInt(req.params['id'] as string);
  const members = await db
    .select({
      userId: projectMembersTable.userId,
      subType: projectMembersTable.subType,
      completionPct: projectMembersTable.completionPct,
      joinedAt: projectMembersTable.joinedAt,
      name: usersTable.name,
      employeeId: usersTable.employeeId,
      designation: usersTable.designation,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(projectMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, projectMembersTable.userId))
    .where(eq(projectMembersTable.projectId, projectId));

  const result = await Promise.all(
    members.map(async (m) => {
      const [lastLog] = await db
        .select({ logDate: dailyLogsTable.logDate })
        .from(dailyLogsTable)
        .where(and(eq(dailyLogsTable.developerId, m.userId), eq(dailyLogsTable.projectId, projectId)))
        .orderBy(desc(dailyLogsTable.logDate))
        .limit(1);
      return { ...m, joinedAt: m.joinedAt.toISOString(), lastLogDate: lastLog?.logDate ?? null };
    }),
  );

  res.json(result);
});

// POST /api/projects/:id/members
router.post("/projects/:id/members", requireAuth, requireRole("super_admin"), async (req, res) => {
  const projectId = parseInt(req.params['id'] as string);
  const { userId, subType } = req.body as { userId: number; subType?: string };
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const [member] = await db.insert(projectMembersTable).values({ projectId, userId, subType: subType ?? null }).returning();
  res.status(201).json(member);
});

// DELETE /api/projects/:id/members/:userId
router.delete("/projects/:id/members/:userId", requireAuth, requireRole("super_admin"), async (req, res) => {
  await db.delete(projectMembersTable).where(and(eq(projectMembersTable.projectId, parseInt(req.params['id'] as string)), eq(projectMembersTable.userId, parseInt(req.params['userId'] as string))));
  res.json({ message: "Member removed" });
});

// GET /api/projects/:id/apk-schedules
router.get("/projects/:id/apk-schedules", requireAuth, async (req, res) => {
  const schedules = await db.select().from(apkSchedulesTable).where(eq(apkSchedulesTable.projectId, parseInt(req.params['id'] as string))).orderBy(desc(apkSchedulesTable.scheduledDate));
  res.json(schedules.map((s) => ({ ...s, scheduledDate: s.scheduledDate.toISOString(), createdAt: s.createdAt.toISOString() })));
});

// POST /api/projects/:id/apk-schedules
router.post("/projects/:id/apk-schedules", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { scheduledDate, label, audience } = req.body as { scheduledDate: string; label: string; audience: "team_only" | "client_visible" };
  const [schedule] = await db.insert(apkSchedulesTable).values({ projectId: parseInt(req.params['id'] as string), scheduledDate: new Date(scheduledDate), label, audience }).returning();
  res.status(201).json({ ...schedule, scheduledDate: schedule.scheduledDate.toISOString(), createdAt: schedule.createdAt.toISOString() });
});

// GET /api/projects/:id/milestones
router.get("/projects/:id/milestones", requireAuth, async (req, res) => {
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.projectId, parseInt(req.params['id'] as string))).orderBy(milestonesTable.plannedDate);
  res.json(milestones.map((m) => ({ ...m, plannedDate: m.plannedDate.toISOString(), actualDate: m.actualDate?.toISOString() ?? null, createdAt: m.createdAt.toISOString() })));
});

// POST /api/projects/:id/milestones
router.post("/projects/:id/milestones", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { title, plannedDate, status } = req.body as { title: string; plannedDate: string; status?: "pending" | "completed" | "delayed" };
  const [milestone] = await db.insert(milestonesTable).values({ projectId: parseInt(req.params['id'] as string), title, plannedDate: new Date(plannedDate), status: status ?? "pending" }).returning();
  res.status(201).json({ ...milestone, plannedDate: milestone.plannedDate.toISOString(), actualDate: null, createdAt: milestone.createdAt.toISOString() });
});

// GET /api/projects/:id/logs
router.get("/projects/:id/logs", requireAuth, async (req, res) => {
  const projectId = parseInt(req.params['id'] as string);
  const logs = await db
    .select({
      id: dailyLogsTable.id,
      developerId: dailyLogsTable.developerId,
      projectId: dailyLogsTable.projectId,
      logDate: dailyLogsTable.logDate,
      workCategories: dailyLogsTable.workCategories,
      taskTitle: dailyLogsTable.taskTitle,
      taskDescription: dailyLogsTable.taskDescription,
      hoursSpent: dailyLogsTable.hoursSpent,
      completionPct: dailyLogsTable.completionPct,
      blockers: dailyLogsTable.blockers,
      nextDayPlan: dailyLogsTable.nextDayPlan,
      createdAt: dailyLogsTable.createdAt,
      updatedAt: dailyLogsTable.updatedAt,
      developerName: usersTable.name,
      developerEmployeeId: usersTable.employeeId,
    })
    .from(dailyLogsTable)
    .innerJoin(usersTable, eq(usersTable.id, dailyLogsTable.developerId))
    .where(eq(dailyLogsTable.projectId, projectId))
    .orderBy(desc(dailyLogsTable.logDate));

  res.json({
    logs: logs.map((l) => ({
      ...l,
      hoursSpent: Number(l.hoursSpent),
      projectName: "",
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
    total: logs.length,
    page: 1,
    limit: logs.length,
  });
});

// GET /api/projects/:id/bugs
router.get("/projects/:id/bugs", requireAuth, async (req, res) => {
  const { bugsTable, usersTable: ut } = await import("@workspace/db/schema");
  const projectId = parseInt(req.params['id'] as string);
  const bugs = await db
    .select()
    .from(bugsTable)
    .where(eq(bugsTable.projectId, projectId))
    .orderBy(desc(bugsTable.createdAt));
  res.json({ bugs, total: bugs.length, page: 1, limit: bugs.length });
});

// GET /api/projects/:id/apk-releases
router.get("/projects/:id/apk-releases", requireAuth, async (req, res) => {
  const { apkReleasesTable } = await import("@workspace/db/schema");
  const projectId = parseInt(req.params['id'] as string);
  const releases = await db.select().from(apkReleasesTable).where(eq(apkReleasesTable.projectId, projectId)).orderBy(desc(apkReleasesTable.createdAt));
  res.json(releases.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
