import { Router } from "express";
import { db } from "../lib/db";
import { reportsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/reports
router.get("/reports", requireAuth, async (req, res) => {
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.requestedBy, req.user!.id)).orderBy(desc(reportsTable.createdAt));
  res.json(
    reports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    })),
  );
});

// POST /api/reports
router.post("/reports", requireAuth, async (req, res) => {
  const { type, projectId, month, year, includeDescriptions } = req.body;
  if (!type) {
    res.status(400).json({ error: "type required" });
    return;
  }
  const [report] = await db
    .insert(reportsTable)
    .values({ type, requestedBy: req.user!.id, projectId: projectId ?? null, month: month ?? null, year: year ?? null, includeDescriptions: includeDescriptions ?? false, status: "queued" })
    .returning();

  // Simulate async generation: mark as ready immediately with placeholder URL
  setTimeout(async () => {
    await db.update(reportsTable).set({ status: "ready", fileUrl: `/api/reports/${report.id}/file`, completedAt: new Date() }).where(eq(reportsTable.id, report.id));
  }, 2000);

  res.status(202).json({ ...report, createdAt: report.createdAt.toISOString(), completedAt: null });
});

// GET /api/reports/:id/download
router.get("/reports/:id/download", requireAuth, async (req, res) => {
  const report = await db.query.reportsTable.findFirst({ where: eq(reportsTable.id, parseInt(req.params['id'] as string)) });
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  res.json({ url: report.fileUrl ?? "#", expiresAt });
});

export default router;
