import puppeteer from "puppeteer";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs/promises";
import {
  projectsTable,
  usersTable,
  dailyLogsTable,
  bugsTable
} from "@/models/schema";
import { logger } from "@/lib/logger";
import { storeGeneratedFile } from "@/lib/file-storage";
async function persistGeneratedFile(localPath, fileName, mimetype) {
  const { url } = await storeGeneratedFile(localPath, fileName, mimetype, "reports");
  return url;
}
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
    if (type === "project_progress" && params.projectId) {
      const project = await projectsTable.findOne({ id: params.projectId });
      const logs = await dailyLogsTable.find({ projectId: params.projectId });
      htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 40px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Project Progress Report: ${project?.name}</h1>
            <p><strong>Status:</strong> ${project?.status}</p>
            <p><strong>Deadline:</strong> ${project?.deadline?.toLocaleDateString()}</p>
            <h2>Daily Updates</h2>
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
                ${logs.map(
        (l) => `
                  <tr>
                    <td>${l.logDate}</td>
                    <td>${l.taskTitle}</td>
                    <td>${l.hoursSpent}</td>
                    <td>${l.completionPct}%</td>
                  </tr>
                `
      ).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else if (type === "bug_report" && params.projectId) {
      const bugs = await bugsTable.find({ projectId: params.projectId });
      htmlContent = `
        <h1>Bug Report</h1>
        <table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${bugs.map((b) => `<tr><td>${b.bugNumber}</td><td>${b.title}</td><td>${b.severity}</td><td>${b.status}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    } else {
      htmlContent = `<h1>${type} Report</h1><p>Data export for ${JSON.stringify(params)}</p>`;
    }
    await page.setContent(htmlContent);
    await page.pdf({ path: filePath, format: "A4", printBackground: true });
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
  if (type === "raw_log_export" && params.projectId) {
    const logs = await dailyLogsTable.find({ projectId: params.projectId });
    sheet.columns = [
      { header: "Date", key: "logDate", width: 15 },
      { header: "Developer", key: "developer", width: 20 },
      { header: "Task", key: "task", width: 30 },
      { header: "Hours", key: "hours", width: 10 },
      { header: "Completion %", key: "pct", width: 15 }
    ];
    for (const l of logs) {
      const dev = await usersTable.findOne({ id: l.developerId });
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
