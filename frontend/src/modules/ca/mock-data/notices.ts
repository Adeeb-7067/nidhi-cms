import type { CaNotice } from "../types";

export const mockCaNotices: CaNotice[] = [
  { id: 1, department: "mca", reference: "SRN AB1234567", subject: "Additional info for AOC-4 filing", receivedAt: "2026-05-20", dueDate: "2026-06-20", workflowStatus: "assigned", assignedTo: "Company Secretary" },
  { id: 2, department: "gst", reference: "DRC-01/09/2026/001234", subject: "Show cause — ITC mismatch", receivedAt: "2026-04-15", dueDate: "2026-05-15", workflowStatus: "replied", assignedTo: "CA Team" },
  { id: 3, department: "income_tax", reference: "143(2)/DEL/2026/789012", subject: "Scrutiny notice — AY 2023–24", receivedAt: "2026-03-10", dueDate: "2026-04-10", workflowStatus: "closed", assignedTo: "CA Team" },
  { id: 4, department: "pf", reference: "EPFO/Noida/2026/456", subject: "EPF contribution shortfall — Mar 2026", receivedAt: "2026-04-25", dueDate: "2026-05-25", workflowStatus: "assigned", assignedTo: "HR & Accounts" },
  { id: 5, department: "esic", reference: "ESIC/UP/2026/123", subject: "ESI return discrepancy", receivedAt: "2026-05-01", dueDate: "2026-06-01", workflowStatus: "received", assignedTo: "Unassigned" },
  { id: 6, department: "gst", reference: "REG-17/09/2026/345678", subject: "Registration cancellation show cause", receivedAt: "2026-02-01", dueDate: "2026-03-01", workflowStatus: "closed", assignedTo: "CA Team" },
];
