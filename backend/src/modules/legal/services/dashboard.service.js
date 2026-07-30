import {
  LEGAL_AGREEMENT_RENEWAL_DAYS,
  LEGAL_NDA_ALERT_DAYS,
} from "../../../constants/legal.js";
import { daysUntil, pctChange } from "./helpers.js";

const ACTIVE_EMPLOYEE_CASE_STATUSES = new Set(["open", "under_review", "mediation", "escalated"]);
const CLOSED_COURT_STATUS = "closed";

export function deriveNdaStatus(status, expiresAt, { alertDays = LEGAL_NDA_ALERT_DAYS, now } = {}) {
  if (status === "draft") return "draft";
  if (status === "expired") return "expired";
  const days = daysUntil(expiresAt, now);
  if (days == null) return status || "active";
  if (days < 0) return "expired";
  if (days <= alertDays) return "expiring_soon";
  return status === "expiring_soon" ? "active" : status || "active";
}

export function deriveAgreementStatus(
  status,
  renewalDate,
  { renewalDays = LEGAL_AGREEMENT_RENEWAL_DAYS, now } = {},
) {
  if (status === "draft" || status === "terminated" || status === "expired") return status;
  const days = daysUntil(renewalDate, now);
  if (days == null) return status || "active";
  if (days < 0) return "expired";
  if (days <= renewalDays) return "renewal_due";
  return status === "renewal_due" ? "active" : status || "active";
}

export function computeComplianceScore(items) {
  if (!items?.length) return 100;
  let points = 0;
  for (const item of items) {
    if (item.status === "compliant") points += 1;
    else if (item.status === "partial") points += 0.5;
  }
  return Math.round((points / items.length) * 100);
}

export function sumExpensesYtd(expenses, now = new Date()) {
  const year = now.getFullYear();
  let total = 0;
  for (const e of expenses || []) {
    const d = e.date ? new Date(e.date) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() === year) total += Number(e.amount) || 0;
  }
  return total;
}

export function buildLegalDashboardKpis({
  employeeCases = [],
  ndas = [],
  courtCases = [],
  complianceItems = [],
  expenses = [],
  vendorDisputes = [],
  clientMatters = [],
  notices = [],
  now = new Date(),
  alertDays = LEGAL_NDA_ALERT_DAYS,
  openedCasesThisMonth = 0,
  openedCasesLastMonth = 0,
  openedCourtThisMonth = 0,
  openedCourtLastMonth = 0,
  expensesPriorYtd = 0,
  ndaAlertsPrior = 0,
} = {}) {
  const activeCases = employeeCases.filter((c) => ACTIVE_EMPLOYEE_CASE_STATUSES.has(c.status)).length;

  const ndaAlerts = ndas.filter((n) => {
    const status = deriveNdaStatus(n.status, n.expiresAt, { alertDays, now });
    return status === "expiring_soon" || status === "expired";
  }).length;

  const openCourtCases = courtCases.filter((c) => c.status !== CLOSED_COURT_STATUS).length;
  const complianceScore = computeComplianceScore(complianceItems);
  const expensesYtd = sumExpensesYtd(expenses, now);

  const highRiskPool = [
    ...employeeCases,
    ...vendorDisputes,
    ...clientMatters,
    ...notices,
    ...courtCases,
    ...ndas,
    ...complianceItems,
  ];
  const highRiskItems = highRiskPool.filter((i) => i.risk === "high").length;

  return {
    activeCases,
    ndaAlerts,
    courtCases: openCourtCases,
    complianceScore,
    expensesYtd,
    highRiskItems,
    trends: {
      activeCases: pctChange(openedCasesThisMonth, openedCasesLastMonth),
      ndaAlerts: pctChange(ndaAlerts, ndaAlertsPrior),
      courtCases: pctChange(openedCourtThisMonth, openedCourtLastMonth),
      expensesYtd: pctChange(expensesYtd, expensesPriorYtd),
    },
  };
}

export function buildCasesByStatus(employeeCases = []) {
  const labels = {
    open: "Open",
    under_review: "Under review",
    mediation: "Mediation",
    escalated: "Escalated",
    resolved: "Resolved",
    closed: "Closed",
  };
  const order = ["open", "under_review", "mediation", "escalated", "resolved", "closed"];
  return order.map((status) => ({
    name: labels[status],
    status,
    count: employeeCases.filter((c) => c.status === status).length,
  }));
}

export function buildRiskDistribution(items = []) {
  const counts = { low: 0, medium: 0, high: 0 };
  for (const item of items) {
    if (counts[item.risk] != null) counts[item.risk] += 1;
  }
  const total = counts.low + counts.medium + counts.high || 1;
  return [
    { name: "Low", risk: "low", count: counts.low, value: Math.round((counts.low / total) * 100) },
    {
      name: "Medium",
      risk: "medium",
      count: counts.medium,
      value: Math.round((counts.medium / total) * 100),
    },
    { name: "High", risk: "high", count: counts.high, value: Math.round((counts.high / total) * 100) },
  ];
}

export function buildUpcomingHearings({ employeeCases = [], courtCases = [] } = {}) {
  const fromCases = employeeCases
    .filter((c) => c.nextHearing)
    .map((c) => ({
      id: c.id,
      type: "Employee case",
      title: c.caseNumber,
      subtitle: c.employeeName,
      date: c.nextHearing,
      risk: c.risk,
      href: `/legal/cases/${c.id}`,
      assignedToId: c.assignedTo?.id ?? null,
    }));
  const fromCourt = courtCases
    .filter((c) => c.nextHearing)
    .map((c) => ({
      id: c.id,
      type: "Court case",
      title: c.caseNumber,
      subtitle: c.title,
      date: c.nextHearing,
      risk: c.risk,
      href: "/legal/court-cases",
      assignedToId: c.assignedTo?.id ?? null,
    }));
  return [...fromCases, ...fromCourt].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function buildNdaExpiryAlerts(ndas = [], { alertDays = LEGAL_NDA_ALERT_DAYS, now } = {}) {
  return ndas
    .map((n) => {
      const status = deriveNdaStatus(n.status, n.expiresAt, { alertDays, now });
      return { ...n, status };
    })
    .filter((n) => n.status === "expiring_soon" || n.status === "expired")
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

export function buildAgreementRenewalReminders(
  agreements = [],
  { renewalDays = LEGAL_AGREEMENT_RENEWAL_DAYS, now } = {},
) {
  return agreements
    .map((a) => {
      const status = deriveAgreementStatus(a.status, a.renewalDate, { renewalDays, now });
      return { ...a, status };
    })
    .filter((a) => a.status === "renewal_due" || a.status === "expired")
    .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());
}

export function expensesByCategory(expenses = []) {
  const map = new Map();
  for (const e of expenses) {
    const key = e.category || "misc";
    map.set(key, (map.get(key) || 0) + (Number(e.amount) || 0));
  }
  return [...map.entries()].map(([category, amount]) => ({ category, amount }));
}

export { ACTIVE_EMPLOYEE_CASE_STATUSES };
