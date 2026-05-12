import { Router } from "express";
import { db } from "../lib/db";
import { resourceRequestsTable, usersTable, projectsTable } from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

async function formatRequest(r: typeof resourceRequestsTable.$inferSelect) {
  const [dev] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.developerId));
  const [proj] = await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, r.projectId));
  return {
    id: r.id,
    developerId: r.developerId,
    developerName: dev?.name ?? "Unknown",
    projectId: r.projectId,
    projectName: proj?.name ?? "Unknown",
    type: r.type,
    title: r.title,
    description: r.description,
    urgency: r.urgency,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// GET /api/requests
router.get("/requests", requireAuth, async (req, res) => {
  const { status, projectId, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  if (req.user!.role === "developer") conditions.push(eq(resourceRequestsTable.developerId, req.user!.id));
  if (status) conditions.push(eq(resourceRequestsTable.status, status as "pending" | "approved" | "rejected"));
  if (projectId) conditions.push(eq(resourceRequestsTable.projectId, parseInt(projectId)));

  const [requests, countResult] = await Promise.all([
    db.select().from(resourceRequestsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(resourceRequestsTable.createdAt)).limit(parseInt(limit)).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(resourceRequestsTable).where(conditions.length ? and(...conditions) : undefined),
  ]);

  const formatted = await Promise.all(requests.map(formatRequest));
  res.json({ requests: formatted, total: Number(countResult[0].count), page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/requests
router.post("/requests", requireAuth, async (req, res) => {
  const { projectId, type, title, description, urgency } = req.body;
  if (!projectId || !type || !title || !description || !urgency) {
    res.status(400).json({ error: "projectId, type, title, description, urgency required" });
    return;
  }
  const [request] = await db.insert(resourceRequestsTable).values({ developerId: req.user!.id, projectId, type, title, description, urgency }).returning();
  res.status(201).json(await formatRequest(request));
});

// GET /api/requests/:id
router.get("/requests/:id", requireAuth, async (req, res) => {
  const r = await db.query.resourceRequestsTable.findFirst({ where: eq(resourceRequestsTable.id, parseInt(req.params['id'] as string)) });
  if (!r) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  res.json(await formatRequest(r));
});

// PATCH /api/requests/:id
router.patch("/requests/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { status, adminNote } = req.body;
  const [r] = await db
    .update(resourceRequestsTable)
    .set({ status, adminNote, updatedAt: new Date() })
    .where(eq(resourceRequestsTable.id, parseInt(req.params['id'] as string)))
    .returning();
  if (!r) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  res.json(await formatRequest(r));
});

export default router;
