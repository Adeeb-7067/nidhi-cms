import type { ComplianceCalendarItem } from "../types";

export const mockComplianceCalendar: ComplianceCalendarItem[] = [
  { id: 1, title: "GSTR-1 — Jun 2026", category: "GST", dueDate: "2026-07-11", status: "upcoming" },
  { id: 2, title: "GSTR-3B — May 2026", category: "GST", dueDate: "2026-06-20", status: "upcoming" },
  { id: 3, title: "GSTR-1 — May 2026", category: "GST", dueDate: "2026-06-11", status: "completed" },
  { id: 4, title: "TDS 26Q — Q4 FY25–26", category: "TDS", dueDate: "2026-07-31", status: "upcoming" },
  { id: 5, title: "TDS 24Q — Q4 FY25–26", category: "TDS", dueDate: "2026-05-31", status: "completed" },
  { id: 6, title: "MGT-7 — FY 2024–25", category: "ROC", dueDate: "2025-11-28", status: "overdue" },
  { id: 7, title: "AOC-4 — FY 2024–25", category: "ROC", dueDate: "2025-10-29", status: "overdue" },
  { id: 8, title: "DIR-3 KYC — All directors", category: "ROC", dueDate: "2026-09-30", status: "upcoming" },
  { id: 9, title: "Company ITR — FY 2025–26", category: "ITR", dueDate: "2026-10-31", status: "upcoming" },
  { id: 10, title: "Director ITR — FY 2025–26", category: "ITR", dueDate: "2026-07-31", status: "upcoming" },
  { id: 11, title: "Statutory audit sign-off FY 2025–26", category: "Audit", dueDate: "2026-09-30", status: "upcoming" },
  { id: 12, title: "Internal audit Q1 FY26", category: "Audit", dueDate: "2026-06-30", status: "upcoming" },
];
