import type { GstSummary, GstReturnFiling, GstNotice } from "../types";

export const gstSummaryMay2026: GstSummary = {
  outputTax: 2845000,
  inputTax: 1002500,
  netLiability: 1842500,
  period: "May 2026",
};

export const mockGstFilings: GstReturnFiling[] = [
  { id: 1, returnType: "GSTR-1", period: "May 2026", dueDate: "2026-06-11", status: "filed", filedAt: "2026-06-09" },
  { id: 2, returnType: "GSTR-3B", period: "May 2026", dueDate: "2026-06-20", status: "pending" },
  { id: 3, returnType: "GSTR-1", period: "Apr 2026", dueDate: "2026-05-11", status: "filed", filedAt: "2026-05-10" },
  { id: 4, returnType: "GSTR-3B", period: "Apr 2026", dueDate: "2026-05-20", status: "filed", filedAt: "2026-05-18" },
  { id: 5, returnType: "GSTR-1", period: "Mar 2026", dueDate: "2026-04-11", status: "filed", filedAt: "2026-04-08" },
  { id: 6, returnType: "GSTR-3B", period: "Mar 2026", dueDate: "2026-04-20", status: "filed", filedAt: "2026-04-19" },
];

export const mockGstNotices: GstNotice[] = [
  { id: 1, reference: "DRC-01/09/2026/001234", subject: "Show cause — ITC mismatch Q3 FY25", amount: 145000, receivedAt: "2026-04-15", status: "assigned" },
  { id: 2, reference: "ASMT-10/09/2026/005678", subject: "Assessment — turnover discrepancy", amount: 0, receivedAt: "2026-02-20", status: "replied" },
];

export const gstPenaltyMonitor = {
  lateFeesAccrued: 0,
  interestOnDelay: 12500,
  noticesOpen: 1,
};
