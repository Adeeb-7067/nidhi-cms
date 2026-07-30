import { toIso } from "../../../utils/mongo-list.js";
import { LEGAL_NDA_ALERT_DAYS } from "../../../constants/legal.js";
import {
  LegalEmployeeCases,
  LegalVendorDisputes,
  LegalClientMatters,
  LegalNdaRecords,
  LegalAgreements,
  LegalNotices,
  LegalCourtCases,
  LegalComplianceItems,
  LegalExpenses,
  LegalCounsel,
} from "../schema/index.js";
import { formatCounsel } from "../services/helpers.js";
import {
  ACTIVE_EMPLOYEE_CASE_STATUSES,
  buildLegalDashboardKpis,
  buildCasesByStatus,
  buildRiskDistribution,
  buildUpcomingHearings,
  buildNdaExpiryAlerts,
  buildAgreementRenewalReminders,
  expensesByCategory,
  computeComplianceScore,
  sumExpensesYtd,
  deriveNdaStatus,
} from "../services/dashboard.service.js";

const active = { isDeleted: false };
const PROJECTION_MATTER = {
  id: 1,
  status: 1,
  risk: 1,
  openedAt: 1,
  nextHearing: 1,
  caseNumber: 1,
  employeeName: 1,
  title: 1,
  expiresAt: 1,
  renewalDate: 1,
  partyName: 1,
  partyType: 1,
  signedAt: 1,
  assignedTo: 1,
  owner: 1,
  framework: 1,
  requirement: 1,
  counterparty: 1,
  type: 1,
  effectiveFrom: 1,
  date: 1,
  amount: 1,
  category: 1,
};

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function mapNdaAlert(n) {
  return {
    id: n.id,
    partyName: n.partyName,
    partyType: n.partyType,
    status: n.status,
    signedAt: toIso(n.signedAt),
    expiresAt: toIso(n.expiresAt),
    risk: n.risk,
    assignedTo: formatCounsel(n.assignedTo),
  };
}

function mapAgreementReminder(a) {
  return {
    id: a.id,
    title: a.title,
    counterparty: a.counterparty,
    type: a.type,
    status: a.status,
    effectiveFrom: toIso(a.effectiveFrom),
    renewalDate: toIso(a.renewalDate),
    risk: a.risk,
    assignedTo: formatCounsel(a.assignedTo),
  };
}

function mapHearing(h) {
  return { ...h, date: toIso(h.date) ?? h.date };
}

async function countOpenedBetween(Model, from, to) {
  return Model.countDocuments({
    ...active,
    openedAt: { $gte: from, $lt: to },
  });
}

export async function getDashboard(_req, res) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = addMonths(now, -1);
  const priorYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const priorYearSameDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const priorNdaCutoff = addDays(monthStart, LEGAL_NDA_ALERT_DAYS);

  const [
    employeeCases,
    vendorDisputes,
    clientMatters,
    ndas,
    agreements,
    notices,
    courtCases,
    complianceItems,
    expenses,
    counsel,
    openedCasesThisMonth,
    openedCasesLastMonth,
    openedCourtThisMonth,
    openedCourtLastMonth,
    expensesPriorRows,
    ndaAlertsPrior,
    complianceGaps,
  ] = await Promise.all([
    LegalEmployeeCases.find(active, PROJECTION_MATTER).lean(),
    LegalVendorDisputes.find(active, { id: 1, risk: 1, status: 1 }).lean(),
    LegalClientMatters.find(active, { id: 1, risk: 1, status: 1 }).lean(),
    LegalNdaRecords.find(active, PROJECTION_MATTER).lean(),
    LegalAgreements.find(active, PROJECTION_MATTER).lean(),
    LegalNotices.find(active, { id: 1, risk: 1, status: 1 }).lean(),
    LegalCourtCases.find(active, PROJECTION_MATTER).lean(),
    LegalComplianceItems.find(active, PROJECTION_MATTER).lean(),
    LegalExpenses.find(active, { id: 1, date: 1, amount: 1, category: 1 }).lean(),
    LegalCounsel.find(active, { id: 1, name: 1, email: 1, role: 1 }).sort({ name: 1 }).lean(),
    countOpenedBetween(LegalEmployeeCases, monthStart, addMonths(now, 1)),
    countOpenedBetween(LegalEmployeeCases, prevMonthStart, monthStart),
    countOpenedBetween(LegalCourtCases, monthStart, addMonths(now, 1)),
    countOpenedBetween(LegalCourtCases, prevMonthStart, monthStart),
    LegalExpenses.find(
      { ...active, date: { $gte: priorYearStart, $lt: priorYearSameDay } },
      { amount: 1, date: 1 },
    ).lean(),
    LegalNdaRecords.countDocuments({
      ...active,
      status: { $ne: "draft" },
      expiresAt: { $lte: priorNdaCutoff },
    }),
    LegalComplianceItems.find(
      { ...active, status: { $in: ["partial", "non_compliant"] } },
      PROJECTION_MATTER,
    )
      .sort({ nextReview: 1 })
      .limit(8)
      .lean(),
  ]);

  // Prefer raw prior-year sum for same calendar window
  const expensesPriorYtdRaw = expensesPriorRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const kpis = buildLegalDashboardKpis({
    employeeCases,
    ndas,
    courtCases,
    complianceItems,
    expenses,
    vendorDisputes,
    clientMatters,
    notices,
    now,
    openedCasesThisMonth,
    openedCasesLastMonth,
    openedCourtThisMonth,
    openedCourtLastMonth,
    expensesPriorYtd: expensesPriorYtdRaw,
    ndaAlertsPrior,
  });

  const riskPool = [
    ...employeeCases,
    ...vendorDisputes,
    ...clientMatters,
    ...notices,
    ...courtCases,
    ...ndas,
  ];

  res.json({
    kpis,
    counsel: counsel.map(formatCounsel),
    casesByStatus: buildCasesByStatus(employeeCases),
    riskDistribution: buildRiskDistribution(riskPool),
    upcomingHearings: buildUpcomingHearings({ employeeCases, courtCases }).map(mapHearing),
    ndaExpiryAlerts: buildNdaExpiryAlerts(ndas, { now }).map(mapNdaAlert),
    agreementRenewalReminders: buildAgreementRenewalReminders(agreements, { now }).map(
      mapAgreementReminder,
    ),
    expensesByCategory: expensesByCategory(expenses),
    complianceScore: computeComplianceScore(complianceItems),
    expensesYtd: sumExpensesYtd(expenses, now),
    complianceGaps: complianceGaps.map((item) => ({
      id: item.id,
      framework: item.framework,
      requirement: item.requirement,
      status: item.status,
      risk: item.risk,
      owner: formatCounsel(item.owner),
    })),
  });
}

export async function getComplianceScore(_req, res) {
  const items = await LegalComplianceItems.find(active, { status: 1 }).lean();
  res.json({
    score: computeComplianceScore(items),
    total: items.length,
    byStatus: {
      compliant: items.filter((i) => i.status === "compliant").length,
      partial: items.filter((i) => i.status === "partial").length,
      non_compliant: items.filter((i) => i.status === "non_compliant").length,
      review_pending: items.filter((i) => i.status === "review_pending").length,
    },
  });
}

export async function getNdaAlerts(_req, res) {
  const ndas = await LegalNdaRecords.find(active, PROJECTION_MATTER).lean();
  res.json({
    alerts: buildNdaExpiryAlerts(ndas).map((n) => ({
      ...mapNdaAlert(n),
      status: deriveNdaStatus(n.status, n.expiresAt),
    })),
  });
}
