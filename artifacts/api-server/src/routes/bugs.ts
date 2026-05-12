import { Router } from "express";
import { db } from "../lib/db";
import { bugsTable, usersTable, projectsTable } from "@workspace/db/schema";
import { eq, and, like, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function formatBug(bug: typeof bugsTable.$inferSelect) {
  const [reporter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, bug.reporterId));
  const [project] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, bug.projectId));
  let assigneeName: string | null = null;
  if (bug.assigneeId) {
    const [assignee] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, bug.assigneeId));
    assigneeName = assignee?.name ?? null;
  }
  return {
    id: bug.id,
    bugNumber: bug.bugNumber,
    projectId: bug.projectId,
    projectName: project?.name ?? "Unknown",
    reporterId: bug.reporterId,
    reporterName: reporter?.name ?? "Unknown",
    assigneeId: bug.assigneeId,
    assigneeName,
    title: bug.title,
    description: bug.description,
    stepsToReproduce: bug.stepsToReproduce,
    expectedBehavior: bug.expectedBehavior,
    actualBehavior: bug.actualBehavior,
    severity: bug.severity,
    priority: bug.priority,
    status: bug.status,
    buildVersion: bug.buildVersion,
    platform: bug.platform,
    createdAt: bug.createdAt.toISOString(),
    resolvedAt: bug.resolvedAt?.toISOString() ?? null,
  };
}

async function nextBugNumber(): Promise<string> {
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(bugsTable);
  const num = Number(result.count) + 1;
  return `BUG-${String(num).padStart(4, "0")}`;
}

// GET /api/bugs
router.get("/bugs", requireAuth, async (req, res) => {
  const { projectId, status, severity, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (projectId) conditions.push(eq(bugsTable.projectId, parseInt(projectId)));
  if (status) conditions.push(eq(bugsTable.status, status as "open" | "in_progress" | "fixed" | "verified" | "wont_fix" | "duplicate"));
  if (severity) conditions.push(eq(bugsTable.severity, severity as "critical" | "high" | "medium" | "low"));

  const [bugs, countResult] = await Promise.all([
    db.select().from(bugsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(bugsTable.createdAt)).limit(parseInt(limit)).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(bugsTable).where(conditions.length ? and(...conditions) : undefined),
  ]);

  const formatted = await Promise.all(bugs.map(formatBug));
  res.json({ bugs: formatted, total: Number(countResult[0].count), page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/bugs
router.post("/bugs", requireAuth, async (req, res) => {
  const { projectId, title, description, stepsToReproduce, expectedBehavior, actualBehavior, severity, priority, buildVersion, platform, assigneeId } = req.body;
  if (!projectId || !title || !severity || !priority || !platform) {
    res.status(400).json({ error: "projectId, title, severity, priority, platform required" });
    return;
  }
  const bugNumber = await nextBugNumber();
  const [bug] = await db
    .insert(bugsTable)
    .values({ bugNumber, projectId, reporterId: req.user!.id, title, description: description ?? null, stepsToReproduce: stepsToReproduce ?? null, expectedBehavior: expectedBehavior ?? null, actualBehavior: actualBehavior ?? null, severity, priority, platform, buildVersion: buildVersion ?? null, assigneeId: assigneeId ?? null })
    .returning();
  res.status(201).json(await formatBug(bug));
});

// GET /api/bugs/:id
router.get("/bugs/:id", requireAuth, async (req, res) => {
  const bug = await db.query.bugsTable.findFirst({ where: eq(bugsTable.id, parseInt(req.params['id'] as string)) });
  if (!bug) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }
  res.json(await formatBug(bug));
});

// PATCH /api/bugs/:id
router.patch("/bugs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string);
  const { title, description, stepsToReproduce, expectedBehavior, actualBehavior, severity, priority, status, buildVersion, platform, assigneeId } = req.body;
  
  const setObj: Record<string, unknown> = { title, description, stepsToReproduce, expectedBehavior, actualBehavior, severity, priority, status, buildVersion, platform, assigneeId, updatedAt: new Date() };
  if (status === "fixed" || status === "wont_fix" || status === "duplicate") {
    setObj.resolvedAt = new Date();
  }

  const [bug] = await db.update(bugsTable).set(setObj).where(eq(bugsTable.id, id)).returning();
  if (!bug) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }
  res.json(await formatBug(bug));
});

export default router;
