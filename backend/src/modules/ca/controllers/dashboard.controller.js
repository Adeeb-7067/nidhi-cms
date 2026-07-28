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
  caDirectorItrTable,
  caScoreHistoryTable,
  getNextSequence,
  FinancePayments,
} from "../../../models/schema/index.js";
import { computeDashboardKpis } from "../../finance/services/finance-kpis.service.js";
import { dateOnly } from "../services/helpers.js";

const MS_DAY = 86_400_000;
const DUE_SOON_DAYS = 7;
const QUEUE_LIMIT = 40;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

/**
 * @param {Date|string|null|undefined} due
 * @param {"overdue"|"pending"|"draft"|"upcoming"|"open"|string} [forced]
 */
function resolveUrgency(due, forced) {
  if (forced === "overdue") return "overdue";
  if (forced === "blocked") return "blocked";
  const dueDate = due ? new Date(due) : null;
  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const today = startOfToday();
    if (dueDate < today) return "overdue";
    if (dueDate <= addDays(today, DUE_SOON_DAYS)) return "due_soon";
  }
  return "open";
}

function urgencyRank(u) {
  switch (u) {
    case "overdue":
      return 0;
    case "due_soon":
      return 1;
    case "blocked":
      return 2;
    default:
      return 3;
  }
}

function areaHref(category) {
  switch (String(category || "").toUpperCase()) {
    case "GST":
      return "/ca/gst";
    case "TDS":
      return "/ca/tds";
    case "ROC":
      return "/ca/roc";
    case "ITR":
      return "/ca/company-itr";
    case "AUDIT":
      return "/ca/audit";
    default:
      return "/ca/compliance-calendar";
  }
}

/**
 * Unified morning work queue — overdue / due-soon / blocked / open items.
 * Finance remains SoT for money; queue only links into Finance/CA pages.
 */
export async function buildWorkQueue() {
  const today = startOfToday();
  const soon = addDays(today, DUE_SOON_DAYS);

  const [
    calendarRows,
    gstRows,
    tdsRows,
    rocRows,
    noticeRows,
    taskRows,
    dscRows,
    suspenseRows,
    unmatchedPayments,
  ] = await Promise.all([
    caCalendarEventsTable
      .find({ isDeleted: false, status: { $in: ["upcoming", "overdue"] } })
      .sort({ dueDate: 1 })
      .limit(20)
      .lean(),
    caGstFilingsTable
      .find({ isDeleted: false, status: { $in: ["pending", "overdue", "draft"] } })
      .sort({ dueDate: 1 })
      .limit(15)
      .lean(),
    caTdsReturnsTable
      .find({ isDeleted: false, status: { $in: ["pending", "overdue", "draft"] } })
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
    caRocFilingsTable
      .find({ isDeleted: false, status: { $in: ["pending", "overdue", "draft"] } })
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
    caNoticesTable
      .find({
        isDeleted: false,
        workflowStatus: { $in: ["received", "assigned", "replied"] },
      })
      .sort({ dueDate: 1 })
      .limit(15)
      .lean(),
    caTasksTable
      .find({ isDeleted: false, status: { $ne: "completed" } })
      .sort({ dueDate: 1 })
      .limit(15)
      .lean(),
    caDinDscTable
      .find({
        isDeleted: false,
        $or: [
          { dscStatus: "overdue" },
          { dscExpiry: { $lte: soon } },
        ],
      })
      .sort({ dscExpiry: 1 })
      .limit(10)
      .lean(),
    caSuspenseEntriesTable
      .find({ isDeleted: false, resolvedAt: null })
      .sort({ receivedAt: 1 })
      .limit(10)
      .lean(),
    FinancePayments.find({
      invoiceId: null,
      salesInvoiceId: null,
      expenseId: null,
      clientId: null,
      vendorId: null,
      employeeId: null,
      partyType: "other",
    })
      .sort({ date: -1 })
      .limit(10)
      .lean()
      .catch(() => []),
  ]);

  /** @type {Array<{
   *   id: string;
   *   kind: string;
   *   title: string;
   *   subtitle: string;
   *   dueDate: string|null;
   *   owner: string;
   *   urgency: string;
   *   href: string;
   * }>} */
  const items = [];

  for (const e of calendarRows) {
    // Synced from GST/TDS/ROC/ITR — filing row is canonical in the queue.
    if (e.sourceKey) continue;
    const urgency = e.status === "overdue" ? "overdue" : resolveUrgency(e.dueDate);
    items.push({
      id: `calendar-${e.id}`,
      kind: "calendar",
      title: e.title,
      subtitle: `${e.category || "Compliance"} · calendar`,
      dueDate: dateOnly(e.dueDate),
      owner: e.ownerName ?? "CA Team",
      urgency,
      href: areaHref(e.category),
    });
  }

  for (const f of gstRows) {
    const urgency = f.status === "overdue" ? "overdue" : resolveUrgency(f.dueDate);
    items.push({
      id: `gst-${f.id}`,
      kind: "gst",
      title: `${f.returnType} — ${f.period}`,
      subtitle: "GST filing",
      dueDate: dateOnly(f.dueDate),
      owner: "CA Team",
      urgency,
      href: "/ca/gst",
    });
  }

  for (const f of tdsRows) {
    const urgency = f.status === "overdue" ? "overdue" : resolveUrgency(f.dueDate);
    items.push({
      id: `tds-${f.id}`,
      kind: "tds",
      title: `TDS ${f.returnType} — ${f.quarter}`,
      subtitle: "TDS return",
      dueDate: dateOnly(f.dueDate),
      owner: "CA Team",
      urgency,
      href: "/ca/tds",
    });
  }

  for (const f of rocRows) {
    const urgency = f.status === "overdue" ? "overdue" : resolveUrgency(f.dueDate);
    items.push({
      id: `roc-${f.id}`,
      kind: "roc",
      title: `${f.form} — ${f.financialYear || "ROC"}`,
      subtitle: "ROC filing",
      dueDate: dateOnly(f.dueDate),
      owner: "CA Team",
      urgency,
      href: "/ca/roc",
    });
  }

  for (const n of noticeRows) {
    const urgency = resolveUrgency(n.dueDate);
    items.push({
      id: `notice-${n.id}`,
      kind: "notice",
      title: n.subject || n.reference,
      subtitle: `Notice · ${n.reference}`,
      dueDate: dateOnly(n.dueDate),
      owner: n.assignedToName || n.assignedTo || "Unassigned",
      urgency,
      href: n.reference
        ? `/ca/notices?search=${encodeURIComponent(n.reference)}`
        : "/ca/notices",
    });
  }

  for (const t of taskRows) {
    const urgency =
      t.priority === "high" && resolveUrgency(t.dueDate) === "open"
        ? "due_soon"
        : resolveUrgency(t.dueDate);
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      title: t.title,
      subtitle: `Task · ${t.priority || "medium"} priority`,
      dueDate: dateOnly(t.dueDate),
      owner: t.assignedToName || t.assignedTo || "CA Team",
      urgency,
      href: "/ca/tasks",
    });
  }

  for (const d of dscRows) {
    const urgency =
      d.dscStatus === "overdue" ? "overdue" : resolveUrgency(d.dscExpiry);
    items.push({
      id: `dsc-${d.id}`,
      kind: "dsc",
      title: `DSC — ${d.directorName || "Director"}`,
      subtitle: "DIN / DSC renewal",
      dueDate: dateOnly(d.dscExpiry),
      owner: d.directorName || "Company Sec.",
      urgency,
      href: "/ca/din-dsc",
    });
  }

  for (const s of suspenseRows) {
    items.push({
      id: `suspense-${s.id}`,
      kind: "suspense",
      title: `Suspense ₹ ${Math.round(Number(s.amount || 0)).toLocaleString("en-IN")}`,
      subtitle: s.bankRef ? `Bank ref ${s.bankRef}` : "Unidentified receipt",
      dueDate: dateOnly(s.receivedAt),
      owner: "Accountant",
      urgency: "blocked",
      href: "/ca/suspense",
    });
  }

  for (const p of unmatchedPayments) {
    items.push({
      id: `bank-${p.id}`,
      kind: "bank",
      title: `Unmatched payment — ${p.partyName || "Unknown"}`,
      subtitle: p.reference || p.receiptNumber || `PMT-${p.id}`,
      dueDate: dateOnly(p.date),
      owner: "CA Team",
      urgency: "blocked",
      href: `/finance/payments/finance/${p.id}`,
    });
  }

  items.sort((a, b) => {
    const ur = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (ur !== 0) return ur;
    const ad = a.dueDate || "9999-99-99";
    const bd = b.dueDate || "9999-99-99";
    return ad.localeCompare(bd);
  });

  const trimmed = items.slice(0, QUEUE_LIMIT);
  const counts = {
    overdue: trimmed.filter((i) => i.urgency === "overdue").length,
    dueSoon: trimmed.filter((i) => i.urgency === "due_soon").length,
    blocked: trimmed.filter((i) => i.urgency === "blocked").length,
    open: trimmed.filter((i) => i.urgency === "open").length,
    total: trimmed.length,
  };

  return { items: trimmed, counts };
}

export async function computeScoreBreakdown() {
  const [
    overdueGst,
    pendingGst,
    overdueTds,
    overdueRoc,
    openNotices,
    overdueDsc,
    openAudits,
    overdueCalendar,
  ] = await Promise.all([
    caGstFilingsTable.countDocuments({ isDeleted: false, status: "overdue" }),
    caGstFilingsTable.countDocuments({ isDeleted: false, status: { $in: ["pending", "draft"] } }),
    caTdsReturnsTable.countDocuments({ isDeleted: false, status: { $in: ["overdue", "pending"] } }),
    caRocFilingsTable.countDocuments({ isDeleted: false, status: { $in: ["overdue", "pending"] } }),
    caNoticesTable.countDocuments({
      isDeleted: false,
      workflowStatus: { $in: ["received", "assigned", "replied"] },
    }),
    caDinDscTable.countDocuments({ isDeleted: false, dscStatus: "overdue" }),
    caAuditsTable.countDocuments({
      isDeleted: false,
      phase: { $ne: "completed" },
    }),
    caCalendarEventsTable.countDocuments({ isDeleted: false, status: "overdue" }),
  ]);

  const gst = Math.max(0, 100 - overdueGst * 15 - pendingGst * 5);
  const tax = Math.max(0, 100 - overdueTds * 10 - openNotices * 4);
  const roc = Math.max(0, 100 - overdueRoc * 12 - overdueDsc * 8);
  const audit = Math.max(0, 100 - openAudits * 10);
  const overall = Math.round((gst + tax + roc + audit) / 4 - overdueCalendar * 2);

  return {
    gst,
    tax,
    roc,
    audit,
    overall: Math.max(0, Math.min(100, overall)),
    counts: {
      overdueGst,
      pendingGst,
      overdueTds,
      overdueRoc,
      openNotices,
      overdueDsc,
      openAudits,
      overdueCalendar,
    },
  };
}

/**
 * Hybrid CA dashboard: Finance money KPIs + CA-owned compliance workload.
 * Does not duplicate GST/ledgers — Finance remains source of truth for money.
 */
export async function getDashboard(req, res) {
  const period = req.query.period === "previous" ? "previous" : "current";

  const [
    financeKpis,
    openTasks,
    openNotices,
    upcomingEvents,
    pendingGstFilings,
    pendingRocFilings,
    suspenseAgg,
    latestAudit,
    score,
    workQueue,
  ] = await Promise.all([
    computeDashboardKpis(period),
    caTasksTable.countDocuments({ isDeleted: false, status: { $ne: "completed" } }),
    caNoticesTable.countDocuments({
      isDeleted: false,
      workflowStatus: { $in: ["received", "assigned", "replied"] },
    }),
    caCalendarEventsTable
      .find({ isDeleted: false, status: { $in: ["upcoming", "overdue"] } })
      .sort({ dueDate: 1 })
      .limit(8)
      .lean(),
    caGstFilingsTable.countDocuments({
      isDeleted: false,
      status: { $in: ["pending", "overdue", "draft"] },
    }),
    caRocFilingsTable.countDocuments({
      isDeleted: false,
      status: { $in: ["pending", "overdue", "draft"] },
    }),
    caSuspenseEntriesTable.aggregate([
      { $match: { isDeleted: false, resolvedAt: null } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    caAuditsTable.findOne({ isDeleted: false }).sort({ updatedAt: -1 }).lean(),
    computeScoreBreakdown(),
    buildWorkQueue(),
  ]);

  const suspenseAmount = suspenseAgg[0]?.total ?? 0;
  const overdueEvents = score.counts.overdueCalendar;

  const alerts = [];
  if ((financeKpis.gstPayable ?? financeKpis.netGst ?? 0) > 0) {
    alerts.push({
      id: 1,
      title: "GST payable",
      body: `Net GST liability this period: ₹ ${Math.round(financeKpis.gstPayable ?? financeKpis.netGst ?? 0).toLocaleString("en-IN")}`,
      severity: "warning",
      href: "/ca/gst",
    });
  }
  if (pendingGstFilings > 0) {
    alerts.push({
      id: 2,
      title: "GST filings due",
      body: `${pendingGstFilings} GST return(s) pending or overdue`,
      severity: "critical",
      href: "/ca/gst",
    });
  }
  if (overdueEvents > 0) {
    alerts.push({
      id: 3,
      title: "Overdue compliance items",
      body: `${overdueEvents} calendar item(s) are overdue`,
      severity: "critical",
      href: "/ca/compliance-calendar",
    });
  }
  if (openNotices > 0) {
    alerts.push({
      id: 4,
      title: "Open notices",
      body: `${openNotices} notice(s) still in progress`,
      severity: "info",
      href: "/ca/notices",
    });
  }
  if (score.counts.overdueDsc > 0) {
    alerts.push({
      id: 5,
      title: "DSC expired",
      body: `${score.counts.overdueDsc} director DSC record(s) overdue`,
      severity: "warning",
      href: "/ca/din-dsc",
    });
  }
  if (workQueue.counts.blocked > 0) {
    alerts.push({
      id: 6,
      title: "Blocked items",
      body: `${workQueue.counts.blocked} item(s) need assignment or bank match`,
      severity: "warning",
      href: "/ca/suspense",
    });
  }

  const complianceStatus = upcomingEvents.map((e) => ({
    id: e.id,
    area: e.category,
    item: e.title,
    dueDate: dateOnly(e.dueDate),
    status: e.status,
    owner: e.ownerName ?? "CA Team",
  }));

  res.json({
    period,
    kpis: {
      totalRevenue: financeKpis.totalIncome ?? 0,
      totalExpenses: financeKpis.totalExpenses ?? 0,
      gstLiability: financeKpis.gstPayable ?? financeKpis.netGst ?? 0,
      pendingGstFilings,
      pendingRocFilings,
      suspenseAmount,
      auditStatus: latestAudit?.phase ?? "planning",
      overallComplianceScore: score.overall,
      openTasks,
      openNotices,
      overdueComplianceItems: workQueue.counts.overdue || overdueEvents,
      outstandingPayables: financeKpis.outstandingPayables ?? 0,
      pendingInvoices: financeKpis.pendingInvoices ?? 0,
      queueTotal: workQueue.counts.total,
      queueBlocked: workQueue.counts.blocked,
      queueDueSoon: workQueue.counts.dueSoon,
    },
    alerts,
    complianceStatus,
    workQueue,
    scoreBreakdown: {
      gst: score.gst,
      tax: score.tax,
      roc: score.roc,
      audit: score.audit,
      overall: score.overall,
    },
  });
}

/** Dedicated compliance score payload for the CEO score page. */
export async function getComplianceScore(_req, res) {
  const [score, directorPending] = await Promise.all([
    computeScoreBreakdown(),
    caDirectorItrTable.countDocuments({
      isDeleted: false,
      filingStatus: { $in: ["pending", "overdue", "draft"] },
    }),
  ]);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleString("en-IN", { month: "short" });

  const existing = await caScoreHistoryTable.findOne({ monthKey }).lean();
  if (existing) {
    await caScoreHistoryTable.updateOne(
      { monthKey },
      {
        $set: {
          monthLabel,
          gst: score.gst,
          tax: score.tax,
          roc: score.roc,
          audit: score.audit,
          overall: score.overall,
        },
      },
    );
  } else {
    const id = await getNextSequence("ca_score_history");
    await caScoreHistoryTable.create({
      id,
      monthKey,
      monthLabel,
      gst: score.gst,
      tax: score.tax,
      roc: score.roc,
      audit: score.audit,
      overall: score.overall,
    });
  }

  const historyRows = await caScoreHistoryTable.find({}).sort({ monthKey: 1 }).limit(12).lean();
  const history = historyRows.slice(-6).map((h) => ({
    month: h.monthLabel,
    score: h.overall,
  }));

  if (history.length === 0) {
    history.push({ month: monthLabel, score: score.overall });
  }

  res.json({
    breakdown: {
      gst: score.gst,
      tax: score.tax,
      roc: score.roc,
      audit: score.audit,
      overall: score.overall,
    },
    history,
    drivers: {
      ...score.counts,
      directorPending,
    },
  });
}
