import type { CaDashboardKpis, CaAlert, ComplianceStatusRow } from "../types";

export const caDashboardKpis: CaDashboardKpis = {
  totalRevenue: 42875000,
  totalExpenses: 28640000,
  gstLiability: 1842500,
  pendingGstFilings: 2,
  pendingRocFilings: 1,
  suspenseAmount: 342500,
  auditStatus: "fieldwork",
  overallComplianceScore: 87,
};

export const caDashboardAlerts: CaAlert[] = [
  {
    id: 1,
    title: "GST Due in 3 Days",
    body: "GSTR-3B for May 2026 is due on 20 Jun 2026. Net liability ₹18.42L pending payment.",
    severity: "critical",
    href: "/ca/gst",
    daysRemaining: 3,
  },
  {
    id: 2,
    title: "TDS Due in 5 Days",
    body: "TDS return 26Q for Q4 FY25–26 due on 31 Jul 2026. ₹2.85L payable to CPC.",
    severity: "warning",
    href: "/ca/tds",
    daysRemaining: 5,
  },
  {
    id: 3,
    title: "ROC Annual Return Pending",
    body: "MGT-7 for FY 2024–25 not yet filed. Due date was 28 Nov 2025 — overdue.",
    severity: "critical",
    href: "/ca/roc",
  },
  {
    id: 4,
    title: "Director DIN Renewal Pending",
    body: "DIR-3 KYC for Priya Mehta (DIN 08452196) pending before 30 Sep 2026.",
    severity: "warning",
    href: "/ca/din-dsc",
  },
  {
    id: 5,
    title: "MCA Notice Received",
    body: "Notice ref SRN AB1234567 — additional information requested for AOC-4 filing.",
    severity: "critical",
    href: "/ca/notices",
  },
];

export const complianceStatusTable: ComplianceStatusRow[] = [
  { id: 1, area: "GST", item: "GSTR-1 May 2026", dueDate: "2026-06-11", status: "completed", owner: "CA Team" },
  { id: 2, area: "GST", item: "GSTR-3B May 2026", dueDate: "2026-06-20", status: "upcoming", owner: "CA Team" },
  { id: 3, area: "TDS", item: "26Q Q4 FY25–26", dueDate: "2026-07-31", status: "upcoming", owner: "Accountant" },
  { id: 4, area: "ROC", item: "MGT-7 FY 2024–25", dueDate: "2025-11-28", status: "overdue", owner: "Company Sec." },
  { id: 5, area: "ROC", item: "AOC-4 FY 2024–25", dueDate: "2025-10-29", status: "overdue", owner: "CA Team" },
  { id: 6, area: "ITR", item: "Company ITR FY 2024–25", dueDate: "2025-10-31", status: "completed", owner: "CA Team" },
  { id: 7, area: "Audit", item: "Statutory audit FY 2024–25", dueDate: "2025-09-30", status: "completed", owner: "Auditor" },
  { id: 8, area: "GST", item: "GSTR-1 Apr 2026", dueDate: "2026-05-11", status: "completed", owner: "CA Team" },
  { id: 9, area: "TDS", item: "24Q Q4 FY25–26", dueDate: "2026-05-31", status: "completed", owner: "Accountant" },
  { id: 10, area: "ROC", item: "DIR-3 KYC — Rajesh Sharma", dueDate: "2026-09-30", status: "upcoming", owner: "Company Sec." },
];
