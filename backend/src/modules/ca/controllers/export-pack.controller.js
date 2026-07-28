import {
  caTasksTable,
  caCalendarEventsTable,
  caNoticesTable,
  caGstFilingsTable,
  caRocFilingsTable,
  caSuspenseEntriesTable,
  caAuditsTable,
  caDinDscTable,
  caTdsReturnsTable,
  caCompanyItrTable,
  caDirectorItrTable,
  caDocumentsTable,
  caScoreHistoryTable,
} from "../../../models/schema/index.js";
import { computeDashboardKpis } from "../../finance/services/finance-kpis.service.js";
import { dateOnly } from "../services/helpers.js";
import { buildWorkQueue, computeScoreBreakdown } from "./dashboard.controller.js";

/**
 * CEO / admin compliance pack — score, queue, overdue items, liability snapshot.
 * Downloadable JSON (not a second money ledger).
 */
export async function getExportPack(req, res) {
  const soft = { isDeleted: false };
  const [
    kpis,
    score,
    workQueue,
    scoreHistory,
    gstFilings,
    tdsReturns,
    rocFilings,
    notices,
    calendar,
    tasks,
    dsc,
    suspense,
    audits,
    companyItr,
    directorItr,
    documents,
  ] = await Promise.all([
    computeDashboardKpis("current").catch(() => ({})),
    computeScoreBreakdown(),
    buildWorkQueue(),
    caScoreHistoryTable.find({}).sort({ monthKey: -1 }).limit(12).lean().catch(() => []),
    caGstFilingsTable.find({ ...soft, status: { $in: ["pending", "overdue", "draft"] } }).lean(),
    caTdsReturnsTable.find({ ...soft, status: { $in: ["pending", "overdue", "draft"] } }).lean(),
    caRocFilingsTable.find({ ...soft, status: { $in: ["pending", "overdue", "draft"] } }).lean(),
    caNoticesTable
      .find({ ...soft, workflowStatus: { $in: ["received", "assigned", "replied"] } })
      .lean(),
    caCalendarEventsTable.find({ ...soft, status: { $in: ["upcoming", "overdue"] } }).lean(),
    caTasksTable.find({ ...soft, status: { $ne: "completed" } }).lean(),
    caDinDscTable.find({ ...soft }).lean(),
    caSuspenseEntriesTable.find({ ...soft, resolvedAt: null }).lean(),
    caAuditsTable.find({ ...soft, phase: { $ne: "completed" } }).lean(),
    caCompanyItrTable.find({ ...soft }).sort({ financialYear: -1 }).limit(3).lean(),
    caDirectorItrTable.find({ ...soft, filingStatus: { $ne: "filed" } }).lean(),
    caDocumentsTable.find(soft).sort({ uploadedAt: -1 }).limit(50).lean(),
  ]);

  const pack = {
    generatedAt: new Date().toISOString(),
    generatedBy: req.user?.id ?? null,
    overallComplianceScore: score.overall ?? kpis.overallComplianceScore ?? null,
    scoreBreakdown: score,
    scoreHistory: scoreHistory.map((h) => ({
      month: h.monthLabel || h.monthKey,
      score: h.overall,
      breakdown: {
        gst: h.gst,
        tax: h.tax,
        roc: h.roc,
        audit: h.audit,
        overall: h.overall,
      },
    })),
    moneySnapshot: {
      totalRevenue: Number(kpis.totalIncome ?? kpis.totalRevenue ?? 0),
      totalExpenses: Number(kpis.totalExpenses ?? 0),
      gstLiability: Number(kpis.gstPayable ?? kpis.netGst ?? 0),
      suspenseAmount: suspense.reduce((s, e) => s + Number(e.amount ?? 0), 0),
    },
    workQueue,
    overdue: {
      gstFilings: gstFilings.map(summarizeFiling),
      tdsReturns: tdsReturns.map((r) => ({
        id: r.id,
        returnType: r.returnType,
        quarter: r.quarter,
        dueDate: dateOnly(r.dueDate),
        status: r.status,
      })),
      rocFilings: rocFilings.map((r) => ({
        id: r.id,
        form: r.form,
        financialYear: r.financialYear,
        dueDate: dateOnly(r.dueDate),
        status: r.status,
      })),
      notices: notices.map((n) => ({
        id: n.id,
        department: n.department,
        reference: n.reference,
        subject: n.subject,
        dueDate: dateOnly(n.dueDate),
        workflowStatus: n.workflowStatus,
      })),
      calendar: calendar.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        dueDate: dateOnly(e.dueDate),
        status: e.status,
        sourceKey: e.sourceKey ?? null,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: dateOnly(t.dueDate),
        priority: t.priority,
        status: t.status,
      })),
      dsc: dsc
        .filter((d) => d.dscStatus === "overdue" || (d.dscExpiry && new Date(d.dscExpiry) < new Date()))
        .map((d) => ({
          id: d.id,
          directorName: d.directorName,
          din: d.din,
          dscExpiry: dateOnly(d.dscExpiry),
          dscStatus: d.dscStatus,
        })),
      suspense: suspense.map((s) => ({
        id: s.id,
        amount: Number(s.amount ?? 0),
        bankRef: s.bankRef,
        receivedAt: dateOnly(s.receivedAt),
      })),
      audits: audits.map((a) => ({
        id: a.id,
        type: a.type,
        phase: a.phase,
        financialYear: a.financialYear,
        observations: a.observations,
      })),
      companyItr: companyItr.map((r) => ({
        id: r.id,
        financialYear: r.financialYear,
        filingStatus: r.filingStatus,
        dueDate: dateOnly(r.dueDate),
        taxLiability: Number(r.taxLiability ?? 0),
      })),
      directorItr: directorItr.map((r) => ({
        id: r.id,
        directorName: r.directorName,
        financialYear: r.financialYear,
        filingStatus: r.filingStatus,
        dueDate: dateOnly(r.dueDate),
      })),
    },
    recentDocuments: documents.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      linkedEntityType: d.linkedEntityType ?? null,
      linkedEntityId: d.linkedEntityId ?? null,
      uploadedAt: dateOnly(d.uploadedAt),
      fileUrl: d.fileUrl ?? null,
    })),
  };

  res.setHeader("Content-Disposition", `attachment; filename="ca-compliance-pack-${dateOnly(new Date())}.json"`);
  res.json(pack);
}

function summarizeFiling(f) {
  return {
    id: f.id,
    returnType: f.returnType,
    period: f.period,
    dueDate: dateOnly(f.dueDate),
    status: f.status,
    lateFee: Number(f.lateFee ?? 0),
    interest: Number(f.interest ?? 0),
  };
}
