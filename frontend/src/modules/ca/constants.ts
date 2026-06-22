import type { UserRole } from "@/lib/user-roles";
import type {
  ComplianceTimingStatus,
  ExpenseCategory,
  NoticeDepartment,
  NoticeWorkflowStatus,
  FilingStatus,
  AuditPhase,
  DocumentCategory,
  CaTaskStatus,
  RocFormType,
  ReconciliationStatus,
  PaymentMode,
  BankTxnDirection,
} from "./types";

/** Roles allowed to access CA module (super_admin + ca). */
export const CA_ACCESS_ROLES = ["super_admin", "ca"] as UserRole[];

export const COMPLIANCE_TIMING_LABELS: Record<ComplianceTimingStatus, string> = {
  completed: "Completed",
  upcoming: "Upcoming",
  overdue: "Overdue",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  salary: "Salary & wages",
  software: "Software & SaaS",
  hosting: "Hosting & cloud",
  marketing: "Marketing",
  travel: "Travel",
  utilities: "Utilities",
  misc: "Miscellaneous",
};

export const NOTICE_DEPARTMENT_LABELS: Record<NoticeDepartment, string> = {
  gst: "GST Dept",
  income_tax: "Income Tax",
  mca: "MCA",
  pf: "PF",
  esic: "ESIC",
};

export const NOTICE_WORKFLOW_LABELS: Record<NoticeWorkflowStatus, string> = {
  received: "Received",
  assigned: "Assigned",
  replied: "Replied",
  closed: "Closed",
};

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  filed: "Filed",
  pending: "Pending",
  overdue: "Overdue",
  draft: "Draft",
};

export const AUDIT_PHASE_LABELS: Record<AuditPhase, string> = {
  planning: "Planning",
  fieldwork: "Fieldwork",
  review: "Review",
  completed: "Completed",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  gst_certificate: "GST Certificate",
  pan: "PAN",
  moa: "MOA",
  aoa: "AOA",
  audit_report: "Audit Report",
  itr: "ITR",
  other: "Other",
};

export const TASK_STATUS_LABELS: Record<CaTaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

export const ROC_FORM_LABELS: Record<RocFormType, string> = {
  "AOC-4": "AOC-4 (Financials)",
  "MGT-7": "MGT-7 (Annual Return)",
  "ADT-1": "ADT-1 (Auditor)",
  "DIR-3 KYC": "DIR-3 KYC",
};

export const RECONCILIATION_LABELS: Record<ReconciliationStatus, string> = {
  matched: "Matched",
  unmatched: "Unmatched",
  partial: "Partial",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  neft: "NEFT",
  rtgs: "RTGS",
  upi: "UPI",
  cheque: "Cheque",
  imps: "IMPS",
};

export const BANK_DIRECTION_LABELS: Record<BankTxnDirection, string> = {
  incoming: "Incoming",
  outgoing: "Outgoing",
};

export const PERIOD_FILTER_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
} as const;

export const COMPANY_GSTIN = "09AAECS7421K1Z8";
export const COMPANY_PAN = "AAECS7421K";
export const COMPANY_TAN = "DELS12345A";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}
