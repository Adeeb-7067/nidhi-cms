import { reportsTable, getNextSequence } from "@/models/schema";
import { resolvePublicFileUrl } from "@/lib/file-storage";
import { badRequest, notFound } from "@/utils/route-errors";
async function getReports(req, res) {
  const reports = await reportsTable.find({ requestedBy: req.user.id }).sort({ createdAt: -1 });
  res.json(
    reports.map((r) => ({
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
      completedAt: r.completedAt?.toISOString() ?? null
    }))
  );
}
async function postReports(req, res) {
  const { type, projectId, month, year, includeDescriptions } = req.body;
  if (!type) badRequest("type is required.", "type");
  const nextId = await getNextSequence("reports");
  const report = await reportsTable.create({
    id: nextId,
    type,
    requestedBy: req.user.id,
    projectId: projectId ?? null,
    month: month ?? null,
    year: year ?? null,
    includeDescriptions: includeDescriptions ?? false,
    status: "queued"
  });
  const isExcel = type === "raw_log_export";
  (async () => {
    try {
      let fileUrl = "";
      if (isExcel) {
        fileUrl = await (await import("@/services/reporting")).generateExcelReport(report.id, type, { projectId, month, year });
      } else {
        fileUrl = await (await import("@/services/reporting")).generatePdfReport(report.id, type, { projectId, month, year });
      }
      await reportsTable.updateOne(
        { id: report.id },
        { $set: { status: "ready", fileUrl, completedAt: /* @__PURE__ */ new Date() } }
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
}
async function getReportsByIdDownload(req, res) {
  const report = await reportsTable.findOne({ id: parseInt(req.params["id"]) });
  if (!report) notFound("Report");
  const expiresAt = new Date(Date.now() + 3600 * 1e3).toISOString();
  const url = resolvePublicFileUrl(report.fileUrl, req) ?? report.fileUrl ?? "#";
  res.json({ url, expiresAt });
}
export {
  getReports,
  getReportsByIdDownload,
  postReports
};
