import { Router } from "express";
import { db } from "../lib/db";
import { bugsTable, usersTable, projectsTable } from "@workspace/db/schema";
import { eq, and, like, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

type BugRow = {
  bug: typeof bugsTable.$inferSelect;
  projectName: string;
  reporterName: string;
  assigneeName: string | null;
};

function formatBugRow(row: BugRow) {
  const { bug, projectName, reporterName, assigneeName } = row;
  return {
    id: bug.id,
    bugNumber: bug.bugNumber,
    projectId: bug.projectId,
    projectName,
    reporterId: bug.reporterId,
    reporterName,
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

const reporterAlias = db.$with("reporter").as(
  db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
);

async function fetchBugById(id: number) {
  const assigneeTable = usersTable;
  const rows = await db
    .select({
      bug: bugsTable,
      projectName: projectsTable.name,
      reporterName: sql<string>`reporter.name`,
      assigneeName: sql<string | null>`assignee.name`,
    })
    .from(bugsTable)
    .innerJoin(projectsTable, eq(projectsTable.id, bugsTable.projectId))
    .innerJoin(
      sql`users reporter`,
      sql`reporter.id = ${bugsTable.reporterId}`
    )
    .leftJoin(
      sql`users assignee`,
      sql`assignee.id = ${bugsTable.assigneeId}`
    )
    .where(eq(bugsTable.id, id))
    .limit(1);

  return rows[0] ?? null;
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

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        bug: bugsTable,
        projectName: projectsTable.name,
        reporterName: sql<string>`reporter.name`,
        assigneeName: sql<string | null>`assignee.name`,
      })
      .from(bugsTable)
      .innerJoin(projectsTable, eq(projectsTable.id, bugsTable.projectId))
      .innerJoin(sql`users reporter`, sql`reporter.id = ${bugsTable.reporterId}`)
      .leftJoin(sql`users assignee`, sql`assignee.id = ${bugsTable.assigneeId}`)
      .where(whereClause)
      .orderBy(desc(bugsTable.createdAt))
      .limit(parseInt(limit))
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(bugsTable)
      .where(whereClause),
  ]);

  res.json({
    bugs: rows.map(formatBugRow),
    total: Number(countResult[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// POST /api/bugs
router.post("/bugs", requireAuth, async (req, res) => {
  const { projectId, title, description, stepsToReproduce, expectedBehavior, actualBehavior, severity, priority, buildVersion, platform, assigneeId } = req.body;
  if (!projectId || !title || !severity || !priority || !platform) {
    res.status(400).json({ error: "projectId, title, severity, priority, platform required" });
    return;
  }
  const bugNumber = await nextBugNumber();
  const [inserted] = await db
    .insert(bugsTable)
    .values({
      bugNumber,
      projectId,
      reporterId: req.user!.id,
      title,
      description: description ?? null,
      stepsToReproduce: stepsToReproduce ?? null,
      expectedBehavior: expectedBehavior ?? null,
      actualBehavior: actualBehavior ?? null,
      severity,
      priority,
      platform,
      buildVersion: buildVersion ?? null,
      assigneeId: assigneeId ?? null,
    })
    .returning();

  const row = await fetchBugById(inserted.id);
  if (!row) {
    res.status(500).json({ error: "Failed to retrieve created bug" });
    return;
  }
  res.status(201).json(formatBugRow(row));
});

// GET /api/bugs/:id
router.get("/bugs/:id", requireAuth, async (req, res) => {
  const row = await fetchBugById(parseInt(req.params["id"] as string));
  if (!row) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }
  res.json(formatBugRow(row));
});

// PATCH /api/bugs/:id
router.patch("/bugs/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  const { title, description, stepsToReproduce, expectedBehavior, actualBehavior, severity, priority, status, buildVersion, platform, assigneeId } = req.body;

  const setObj: Record<string, unknown> = {
    title,
    description,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    severity,
    priority,
    status,
    buildVersion,
    platform,
    assigneeId,
    updatedAt: new Date(),
  };
  if (status === "fixed" || status === "wont_fix" || status === "duplicate") {
    setObj.resolvedAt = new Date();
  }

  const [updated] = await db.update(bugsTable).set(setObj).where(eq(bugsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Bug not found" });
    return;
  }

  const row = await fetchBugById(updated.id);
  if (!row) {
    res.status(500).json({ error: "Failed to retrieve updated bug" });
    return;
  }
  res.json(formatBugRow(row));
});

export default router;
