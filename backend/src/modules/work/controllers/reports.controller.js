import { reportsTable, reportTypes, getNextSequence } from "../../../models/schema/index.js";
import { resolvePublicFileUrl } from "../../../lib/file-storage.js";
import { badRequest, forbidden, notFound } from "../../../utils/route-errors.js";
import { assertValidLogProjectId, isVirtualLogProjectId } from "../services/daily-log-virtual-projects.js";
import { assertProjectAccess } from "../../access/services/access-helpers.js";

const LOG_REPORT_TYPES = new Set(["developer_monthly", "project_progress", "raw_log_export"]);

function formatReportRow(r, req) {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    requestedBy: r.requestedBy,
    projectId: r.projectId,
    month: r.month,
    year: r.year,
    includeDescriptions: r.includeDescriptions,
    fileUrl: resolvePublicFileUrl(r.fileUrl, req) ?? r.fileUrl ?? null,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null
  };
}

async function getReports(req, res) {
  const reports = await reportsTable.find({ requestedBy: req.user.id }).sort({ createdAt: -1 });
  res.json(reports.map((r) => formatReportRow(r, req)));
}
async function postReports(req, res) {
  const { type, projectId, month, year, includeDescriptions } = req.body;
  if (!type) badRequest("type is required.", "type");
  if (!reportTypes.includes(type)) {
    badRequest(
      `Invalid report type. Allowed: ${reportTypes.join(", ")}`,
      "type",
    );
  }
  if (projectId == null || projectId === "") badRequest("projectId is required.", "projectId");
  const projectIdNum = Number(projectId);
  if (LOG_REPORT_TYPES.has(type)) {
    if (!assertValidLogProjectId(projectIdNum)) {
      badRequest("Invalid project or activity selection.", "projectId");
    }
  } else if (!Number.isFinite(projectIdNum) || projectIdNum <= 0) {
    badRequest("A valid project is required.", "projectId");
  }
  if (!isVirtualLogProjectId(projectIdNum)) {
    await assertProjectAccess(req, projectIdNum);
  }
  const nextId = await getNextSequence("reports");
  const report = await reportsTable.create({
    id: nextId,
    type,
    requestedBy: req.user.id,
    projectId: projectId ?? null,
    month: month ?? null,
    year: year ?? null,
    includeDescriptions: includeDescriptions ?? false,
    status: "generating"
  });
  const isExcel = type === "raw_log_export";
  (async () => {
    try {
      let fileUrl = "";
      const reporting = await import("../services/reporting.js");
      if (isExcel) {
        fileUrl = await reporting.generateExcelReport(report.id, type, {
          projectId,
          month,
          year,
          includeDescriptions: includeDescriptions ?? false,
        });
      } else {
        fileUrl = await reporting.generatePdfReport(report.id, type, {
          projectId,
          month,
          year,
          includeDescriptions: includeDescriptions ?? false,
        });
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
  res.status(202).json(formatReportRow(report, req));
}
async function getReportsByIdDownload(req, res) {
  const report = await reportsTable.findOne({ id: parseInt(req.params["id"], 10) });
  if (!report) notFound("Report");
  if (report.requestedBy !== req.user.id && req.user.role !== "super_admin") {
    forbidden("You can only download your own reports.");
  }
  const expiresAt = new Date(Date.now() + 3600 * 1e3).toISOString();
  const url = resolvePublicFileUrl(report.fileUrl, req) ?? report.fileUrl ?? "#";
  res.json({ url, expiresAt });
}
export {
  getReports,
  getReportsByIdDownload,
  postReports
};
