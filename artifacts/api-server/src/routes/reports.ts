import { Router } from "express";
import { reportsTable, getNextSequence } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";
import { resolvePublicFileUrl } from "../lib/file-storage";

const router = Router();

// GET /api/reports
router.get("/reports", requireAuth, async (req, res) => {
  const reports = await reportsTable.find({ requestedBy: req.user!.id }).sort({ createdAt: -1 });
  res.json(
    reports.map((r: any) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      requestedBy: r.requestedBy,
      projectId: r.projectId,
      month: r.month,
      year: r.year,
      includeDescriptions: r.includeDescriptions,
      fileUrl: r.fileUrl,
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
  
  const nextId = await getNextSequence("reports");
  const report = await reportsTable.create({
    id: nextId,
    type,
    requestedBy: req.user!.id,
    projectId: projectId ?? null,
    month: month ?? null,
    year: year ?? null,
    includeDescriptions: includeDescriptions ?? false,
    status: "queued"
  });

  // Start actual generation
  const isExcel = type === "raw_log_export";
  
  (async () => {
    try {
      let fileUrl = "";
      if (isExcel) {
        fileUrl = await (await import("../lib/reporting")).generateExcelReport(report.id, type, { projectId, month, year });
      } else {
        fileUrl = await (await import("../lib/reporting")).generatePdfReport(report.id, type, { projectId, month, year });
      }

      await reportsTable.updateOne(
        { id: report.id },
        { $set: { status: "ready", fileUrl, completedAt: new Date() } }
      );
    } catch (err) {
      console.error("Report generation failed", err);
      await reportsTable.updateOne(
        { id: report.id },
        { $set: { status: "failed" } }
      );
    }
  })();

  res.status(202).json({
    id: report.id,
    type: report.type,
    status: report.status,
    requestedBy: report.requestedBy,
    projectId: report.projectId,
    month: report.month,
    year: report.year,
    includeDescriptions: report.includeDescriptions,
    fileUrl: null,
    createdAt: report.createdAt.toISOString(),
    completedAt: null
  });
});

// GET /api/reports/:id/download
router.get("/reports/:id/download", requireAuth, async (req, res) => {
  const report = await reportsTable.findOne({ id: parseInt(req.params['id'] as string) });
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  const url = resolvePublicFileUrl(report.fileUrl, req) ?? report.fileUrl ?? "#";
  res.json({ url, expiresAt });
});

export default router;
