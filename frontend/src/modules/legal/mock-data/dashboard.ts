import type { LegalDashboardKpis } from "../types";
import { mockEmployeeCases } from "./cases";
import { ndaExpiryAlerts } from "./nda";
import { mockCourtCases } from "./court-cases";
import { complianceScore } from "./compliance";
import { legalExpensesYtd } from "./expenses";
import { mockVendorDisputes } from "./vendor-disputes";
import { mockClientMatters } from "./client-matters";
import { mockNotices } from "./notices";

export const legalDashboardKpis: LegalDashboardKpis = {
  activeCases: mockEmployeeCases.filter((c) => !["closed", "resolved"].includes(c.status)).length,
  ndaAlerts: ndaExpiryAlerts.length,
  courtCases: mockCourtCases.filter((c) => c.status !== "closed").length,
  complianceScore,
  expensesYtd: legalExpensesYtd,
  highRiskItems: [
    ...mockEmployeeCases,
    ...mockVendorDisputes,
    ...mockClientMatters,
    ...mockNotices,
  ].filter((i) => i.risk === "high").length,
  trends: {
    activeCases: 8,
    ndaAlerts: 12,
    courtCases: -5,
    expensesYtd: 15,
  },
};

export const casesByStatus = [
  { name: "Open", count: mockEmployeeCases.filter((c) => c.status === "open").length },
  { name: "Under review", count: mockEmployeeCases.filter((c) => c.status === "under_review").length },
  { name: "Mediation", count: mockEmployeeCases.filter((c) => c.status === "mediation").length },
  { name: "Escalated", count: mockEmployeeCases.filter((c) => c.status === "escalated").length },
  { name: "Resolved", count: mockEmployeeCases.filter((c) => c.status === "resolved").length },
];

export const riskDistribution = [
  { name: "Low", count: 12, value: 40 },
  { name: "Medium", count: 14, value: 35 },
  { name: "High", count: 8, value: 25 },
];

export const upcomingHearings = [
  ...mockEmployeeCases.filter((c) => c.nextHearing).map((c) => ({
    id: c.id,
    type: "Employee case" as const,
    title: c.caseNumber,
    subtitle: c.employeeName,
    date: c.nextHearing!,
    risk: c.risk,
    href: `/legal/cases/${c.id}`,
  })),
  ...mockCourtCases.filter((c) => c.nextHearing).map((c) => ({
    id: c.id,
    type: "Court case" as const,
    title: c.caseNumber,
    subtitle: c.title,
    date: c.nextHearing!,
    risk: c.risk,
    href: "/legal/court-cases",
  })),
].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
