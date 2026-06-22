import type { CaTask } from "../types";

export const mockCaTasks: CaTask[] = [
  { id: 1, title: "File GSTR-3B for May 2026", assignedBy: "CEO", assignedTo: "CA Team", status: "in_progress", priority: "high", dueDate: "2026-06-20", category: "GST" },
  { id: 2, title: "Reconcile suspense UPI credit ₹1.25L", assignedBy: "CEO", assignedTo: "Accountant", status: "pending", priority: "high", dueDate: "2026-06-15", category: "Banking" },
  { id: 3, title: "Prepare TDS 26Q for Q4", assignedBy: "CA Team", assignedTo: "Accountant", status: "pending", priority: "medium", dueDate: "2026-07-25", category: "TDS" },
  { id: 4, title: "Respond to MCA notice SRN AB1234567", assignedBy: "CEO", assignedTo: "Company Secretary", status: "in_progress", priority: "high", dueDate: "2026-06-20", category: "ROC" },
  { id: 5, title: "Upload audited financials for AOC-4", assignedBy: "CA Team", assignedTo: "Accountant", status: "pending", priority: "high", dueDate: "2026-06-18", category: "ROC" },
  { id: 6, title: "Issue Form 16A — Deloitte", assignedBy: "CA Team", assignedTo: "Accountant", status: "pending", priority: "low", dueDate: "2026-06-30", category: "TDS" },
  { id: 7, title: "Review vendor GST reconciliation", assignedBy: "CEO", assignedTo: "CA Team", status: "completed", priority: "medium", dueDate: "2026-06-08", category: "GST" },
  { id: 8, title: "Director DSC renewal — Priya Mehta", assignedBy: "CEO", assignedTo: "Company Secretary", status: "in_progress", priority: "medium", dueDate: "2026-07-15", category: "Compliance" },
];
