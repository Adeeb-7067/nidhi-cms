import puppeteer from "puppeteer";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs/promises";
import {
  projectsTable,
  usersTable,
  dailyLogsTable,
  bugsTable
} from "../models/schema/index.js";
import { logger } from "../lib/logger.js";
import { storeGeneratedFile } from "../lib/file-storage.js";
import {
  isVirtualLogProjectId,
  resolveLogProjectName,
} from "./daily-log-virtual-projects.js";

async function persistGeneratedFile(localPath, fileName, mimetype) {
  const { url } = await storeGeneratedFile(localPath, fileName, mimetype, "reports");
  return url;
}

function logDateFilter(month, year) {
  if (!month || !year) return null;
  const m = String(month).padStart(2, "0");
  const y = String(year);
  return { $regex: `^${y}-${m}-` };
}

async function loadProjectLogs(projectId, month, year) {
  const query = { projectId };
  const dateFilter = logDateFilter(month, year);
  if (dateFilter) query.logDate = dateFilter;
  return dailyLogsTable.find(query).sort({ logDate: 1 }).lean();
}

async function resolveReportProjectLabel(projectId) {
  if (isVirtualLogProjectId(projectId)) {
    return resolveLogProjectName(projectId, null);
  }
  const project = await projectsTable.findOne({ id: projectId }).lean();
  return project?.name ?? "Project";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const REPORT_PRINT_CSS = `
  @page { size: A4; margin: 15mm; }
  html, body { height: auto; margin: 0; padding: 0; }
  body { font-family: sans-serif; padding: 0; color: #1e293b; }
  h1 { color: #1e40af; font-size: 22px; margin: 0 0 8px; }
  h2 { font-size: 16px; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; table-layout: fixed; }
  th, td {
    border: 1px solid #e2e8f0;
    padding: 8px;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  th { background-color: #f1f5f9; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
`;

async function generatePdfReport(reportId, type, params) {
  const fileName = `report_${reportId}_${Date.now()}.pdf`;
  const filePath = path.join(process.cwd(), "uploads", fileName);
  await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();
    let htmlContent = "<h1>Report</h1>";
    const { projectId, month, year } = params;

    if (projectId && (type === "project_progress" || type === "developer_monthly")) {
      const project = isVirtualLogProjectId(projectId)
        ? null
        : await projectsTable.findOne({ id: projectId }).lean();
      const projectLabel = await resolveReportProjectLabel(projectId);
      const logs = await loadProjectLogs(projectId, month, year);
      const title =
        type === "developer_monthly"
          ? `Timesheet — ${projectLabel}`
          : `Project Progress — ${projectLabel}`;
      const period =
        month && year ? `<p><strong>Period:</strong> ${month}/${year}</p>` : "";
      const statusLine = project?.status
        ? `<p><strong>Status:</strong> ${escapeHtml(project.status)}</p>`
        : "";
      htmlContent = `
        <html>
          <head>
            <style>${REPORT_PRINT_CSS}</style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>
            ${statusLine}
            ${period}
            <h2>Daily logs</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Hours</th>
                  <th>Completion %</th>
                </tr>
              </thead>
              <tbody>
                ${
                  logs.length
                    ? logs
                        .map(
                          (l) => `
                  <tr>
                    <td>${escapeHtml(l.logDate)}</td>
                    <td>${escapeHtml(l.taskTitle)}</td>
                    <td>${escapeHtml(l.hoursSpent)}</td>
                    <td>${escapeHtml(l.completionPct)}%</td>
                  </tr>
                `,
                        )
                        .join("")
                    : `<tr><td colspan="4">No logs for this period.</td></tr>`
                }
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else if (type === "bug_report" && projectId) {
      const project = await projectsTable.findOne({ id: projectId }).lean();
      const bugs = await bugsTable.find({ projectId }).lean();
      htmlContent = `
        <html>
          <head>
            <style>${REPORT_PRINT_CSS}</style>
          </head>
          <body>
            <h1>Bug Report — ${escapeHtml(project?.name)}</h1>
            <table>
              <thead>
                <tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${
                  bugs.length
                    ? bugs
                        .map(
                          (b) =>
                            `<tr><td>${escapeHtml(b.bugNumber)}</td><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.severity)}</td><td>${escapeHtml(b.status)}</td></tr>`,
                        )
                        .join("")
                    : `<tr><td colspan="4">No bugs recorded.</td></tr>`
                }
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else {
      htmlContent = `<h1>${escapeHtml(type)} Report</h1><p>Project ${escapeHtml(projectId)} — ${escapeHtml(JSON.stringify({ month, year }))}</p>`;
    }
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "12mm", bottom: "15mm", left: "12mm" }
    });
    return persistGeneratedFile(filePath, fileName, "application/pdf");
  } catch (err) {
    logger.error({ err }, "Error generating PDF report");
    throw err;
  } finally {
    await browser.close();
  }
}

async function generateExcelReport(reportId, type, params) {
  const fileName = `report_${reportId}_${Date.now()}.xlsx`;
  const filePath = path.join(process.cwd(), "uploads", fileName);
  await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  const { projectId, month, year } = params;

  if (type === "raw_log_export" && projectId) {
    const logs = await loadProjectLogs(projectId, month, year);
    sheet.columns = [
      { header: "Date", key: "logDate", width: 15 },
      { header: "Developer", key: "developer", width: 20 },
      { header: "Task", key: "task", width: 30 },
      { header: "Hours", key: "hours", width: 10 },
      { header: "Completion %", key: "pct", width: 15 }
    ];
    for (const l of logs) {
      const dev = await usersTable.findOne({ id: l.developerId }).lean();
      sheet.addRow({
        logDate: l.logDate,
        developer: dev?.name ?? "Unknown",
        task: l.taskTitle,
        hours: l.hoursSpent,
        pct: l.completionPct
      });
    }
  } else {
    sheet.addRow(["Report", type]);
    sheet.addRow(["Params", JSON.stringify(params)]);
  }
  await workbook.xlsx.writeFile(filePath);
  return persistGeneratedFile(
    filePath,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export {
  generateExcelReport,
  generatePdfReport
};
