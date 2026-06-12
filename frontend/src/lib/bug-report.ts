import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Bug } from "@/api/generated/api.schemas";

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  "Bug #", "Type", "Issue Key", "Parent Bug #", "Project",
  "Title", "Description", "Steps to Reproduce", "Expected Behavior", "Actual Behavior",
  "Priority", "Severity", "Platform", "Build Version",
  "Status", "QA Status", "Dev Status", "Final Status",
  "Assignees", "Reporter", "Reporter Role",
  "Attachments", "Latest Comment",
  "Reported Date", "Last Updated", "Resolved Date",
];

export function buildBugsCSV(bugs: Bug[]): string {
  const lines: string[] = [CSV_HEADERS.map(csvCell).join(",")];

  for (const bug of bugs) {
    const children = bug.children ?? bug.issues ?? [];
    const hasIssues = children.length > 0;
    const assigneeNames = (bug.assignees ?? []).map((a) => a.name).join("; ");
    const attachmentCount = (bug.attachments ?? []).length;
    const reported = bug.createdAt ? new Date(bug.createdAt).toLocaleDateString() : "";
    const updated = bug.updatedAt ? new Date(bug.updatedAt).toLocaleDateString() : "";
    const resolved = bug.resolvedAt ? new Date(bug.resolvedAt).toLocaleDateString() : "";

    lines.push([
      bug.bugNumber ?? "",
      hasIssues ? "Report" : "Bug",
      bug.issueKey ?? "",
      "",
      bug.projectName ?? "",
      hasIssues ? `${bug.title} (${children.length} issues)` : (bug.title ?? ""),
      bug.description ?? "",
      bug.stepsToReproduce ?? "",
      bug.expectedBehavior ?? "",
      bug.actualBehavior ?? "",
      bug.priority ?? "",
      bug.severity ?? "",
      bug.platform ?? "",
      bug.buildVersion ?? "",
      bug.status ?? "",
      bug.qaStatus ?? "",
      bug.devStatus ?? "",
      bug.finalStatus ?? "",
      assigneeNames,
      bug.reporterName ?? "",
      bug.reporterRole ?? "",
      String(attachmentCount),
      bug.latestComment ?? "",
      reported,
      updated,
      resolved,
    ].map(csvCell).join(","));

    for (const issue of children) {
      const issueResolved = issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString() : "";
      lines.push([
        bug.bugNumber ?? "",
        "Issue",
        issue.issueKey ?? "",
        bug.bugNumber ?? "",
        bug.projectName ?? "",
        issue.title ?? "",
        issue.description ?? "",
        issue.stepsToReproduce ?? "",
        issue.expectedBehavior ?? "",
        issue.actualBehavior ?? "",
        bug.priority ?? "",
        bug.severity ?? "",
        bug.platform ?? "",
        bug.buildVersion ?? "",
        issue.status ?? "",
        issue.qaStatus ?? "",
        issue.devStatus ?? "",
        issue.finalStatus ?? "",
        assigneeNames,
        bug.reporterName ?? "",
        bug.reporterRole ?? "",
        "0",
        issue.latestComment ?? "",
        reported,
        updated,
        issueResolved,
      ].map(csvCell).join(","));
    }
  }

  return "﻿" + lines.join("\r\n");
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const M = 10; // page margin mm

function fmtDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function trackCell(q?: string | null, d?: string | null, f?: string | null): string {
  const s = (v?: string | null) => {
    if (v === "fixed") return "Fix";
    if (v === "resolved") return "Res";
    if (v === "open") return "Open";
    return "—";
  };
  return `QA:${s(q)} Dev:${s(d)} Fin:${s(f)}`;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function generateBugPDF(bugs: Bug[], projectName: string, fileName?: string): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - M * 2;

  // Header banner
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 38, pageWidth, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CMS ENTERPRISE", M, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("Quality Assurance & Bug Audit Report", M, 23);
  doc.setFontSize(7.5);
  doc.text(`Generated: ${new Date().toLocaleString()}`, M, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const label = `Project: ${projectName}`;
  doc.text(label, pageWidth - M - doc.getTextWidth(label), 16);

  // Stats strip
  const totalBugs = bugs.length;
  const openCount = bugs.filter((b) => b.qaStatus === "open" || b.devStatus === "open" || b.finalStatus === "open").length;
  const devFixed = bugs.filter((b) => b.devStatus === "fixed").length;
  const resolved = bugs.filter((b) => b.finalStatus === "resolved").length;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(M, 43, usableWidth, 16, 2, 2, "F");

  const stats = [
    { label: "Total Bugs", value: String(totalBugs), rgb: [31, 41, 55] as [number, number, number] },
    { label: "Open", value: String(openCount), rgb: [220, 38, 38] as [number, number, number] },
    { label: "Dev Fixed", value: String(devFixed), rgb: [2, 132, 199] as [number, number, number] },
    { label: "Resolved", value: String(resolved), rgb: [22, 163, 74] as [number, number, number] },
  ];
  const sw = usableWidth / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const st = stats[i];
    const x = M + i * sw + sw / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...st.rgb);
    doc.text(st.value, x, 50, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(st.label, x, 56, { align: "center" });
  }

  // Summary table
  const rows = bugs.map((bug) => {
    const children = bug.children ?? bug.issues ?? [];
    const assignees =
      (bug.assignees ?? []).map((a) => a.name).join(", ") || bug.assigneeName || "Unassigned";
    return [
      bug.bugNumber ?? "",
      children.length > 0 ? `${bug.title} (${children.length} issues)` : (bug.title ?? ""),
      (bug.priority ?? "").toUpperCase(),
      (bug.severity ?? "").toUpperCase(),
      (bug.platform ?? "").toUpperCase(),
      (bug.status ?? "").replace(/_/g, " ").toUpperCase(),
      trackCell(bug.qaStatus, bug.devStatus, bug.finalStatus),
      assignees,
      bug.reporterName ?? "—",
      fmtDate(bug.createdAt),
    ];
  });

  autoTable(doc, {
    startY: 63,
    margin: { left: M, right: M },
    head: [["Bug #", "Title", "Priority", "Severity", "Platform", "Status", "QA · Dev · Final", "Assignees", "Reporter", "Reported"]],
    body: rows,
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { textColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 52 },
      2: { cellWidth: 14 },
      3: { cellWidth: 18 },
      4: { cellWidth: 16 },
      5: { cellWidth: 28 },
      6: { cellWidth: 30 },
      7: { cellWidth: 42 },
      8: { cellWidth: 30 },
      9: { cellWidth: 22 },
    },
    showHead: "everyPage",
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 2) {
        const v = String(data.cell.raw);
        if (v === "URGENT" || v === "HIGH") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        } else if (v === "MEDIUM") {
          data.cell.styles.textColor = [161, 98, 7];
        }
      }
      if (data.column.index === 3) {
        const v = String(data.cell.raw);
        if (v === "CRITICAL") {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        } else if (v === "HIGH") {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
  });

  // Detail blocks for bugs with text content
  const detailBugs = bugs.filter(
    (b) => b.description || b.stepsToReproduce || b.expectedBehavior || b.actualBehavior || b.buildVersion || b.latestComment,
  );
  if (detailBugs.length > 0) {
    renderBugDetailSection(doc, detailBugs, projectName);
  }

  const safe = (fileName ?? projectName).replace(/[^a-zA-Z0-9\-_. ]/g, "-").trim();
  doc.save(`${safe}-bug-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function renderBugDetailSection(doc: jsPDF, bugs: Bug[], projectName: string): void {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - M * 2;
  const LABEL_W = 40;
  const TEXT_X = M + LABEL_W;
  const textMaxW = usableWidth - LABEL_W - 2;
  const LINE_H = 4.4;
  let y = M;
  let pageNum = 1;

  const addSectionBanner = () => {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, y, pageWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DETAILED BUG ANALYSIS" + (pageNum > 1 ? ` (cont'd)` : ""), M, y + 6.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(200, 200, 200);
    doc.text(projectName, pageWidth - M, y + 6.5, { align: "right" });
    y += 13;
    pageNum++;
  };

  const ensureY = (needed: number) => {
    if (y + needed > pageHeight - M) {
      doc.addPage();
      y = M;
      addSectionBanner();
    }
  };

  addSectionBanner();

  for (const bug of bugs) {
    const fields: Array<[string, string]> = [];
    if (bug.description) fields.push(["Description", bug.description]);
    if (bug.stepsToReproduce) fields.push(["Steps to Reproduce", bug.stepsToReproduce]);
    if (bug.expectedBehavior) fields.push(["Expected Behavior", bug.expectedBehavior]);
    if (bug.actualBehavior) fields.push(["Actual Behavior", bug.actualBehavior]);
    if (bug.buildVersion) fields.push(["Build Version", bug.buildVersion]);
    if (bug.latestComment) fields.push(["Latest Comment", bug.latestComment]);
    if (fields.length === 0) continue;

    ensureY(12);

    // Bug header bar
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y, usableWidth, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(M, y, usableWidth, 8, "D");
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(bug.bugNumber ?? "", M + 2, y + 5.2);
    const titleText = doc.splitTextToSize(bug.title ?? "", usableWidth - 80)[0] ?? "";
    doc.setFont("helvetica", "normal");
    doc.text(titleText, M + 22, y + 5.2);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    const meta = [bug.priority, bug.severity, bug.platform]
      .filter(Boolean)
      .map((s) => (s ?? "").toUpperCase())
      .join(" · ");
    doc.text(meta, pageWidth - M - 2, y + 5.2, { align: "right" });
    y += 10;

    for (const [label, rawValue] of fields) {
      const value = String(rawValue);
      const lines = doc.splitTextToSize(value, textMaxW);
      const fieldH = Math.max(7, lines.length * LINE_H + 3);
      ensureY(fieldH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(label + ":", M + 2, y + 3.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      doc.text(lines, TEXT_X, y + 3.5);
      y += fieldH;
    }

    y += 5;
  }
}
