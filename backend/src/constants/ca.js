/** CA domain enums — keep aligned with frontend/src/modules/ca/types.ts */

export const CA_TASK_STATUSES = ["pending", "in_progress", "completed"];
export const CA_TASK_PRIORITIES = ["low", "medium", "high"];

export const CA_DOCUMENT_CATEGORIES = [
  "gst_certificate",
  "pan",
  "moa",
  "aoa",
  "audit_report",
  "itr",
  "other",
];

export const CA_CALENDAR_CATEGORIES = ["GST", "TDS", "ROC", "ITR", "Audit"];
export const CA_COMPLIANCE_TIMING = ["completed", "upcoming", "overdue"];

export const CA_NOTICE_DEPARTMENTS = ["gst", "income_tax", "mca", "pf", "esic"];
export const CA_NOTICE_WORKFLOW = ["received", "assigned", "replied", "closed"];

export const CA_FILING_STATUSES = ["filed", "pending", "overdue", "draft"];
export const CA_GST_RETURN_TYPES = ["GSTR-1", "GSTR-3B"];
export const CA_TDS_RETURN_TYPES = ["24Q", "26Q", "27Q"];
export const CA_TDS_CERTIFICATE_FORMS = ["16", "16A"];
export const CA_ROC_FORMS = ["AOC-4", "MGT-7", "ADT-1", "DIR-3 KYC"];
export const CA_AUDIT_TYPES = ["internal", "statutory"];
export const CA_AUDIT_PHASES = ["planning", "fieldwork", "review", "completed"];
export const CA_PAYMENT_MODES = ["neft", "rtgs", "upi", "cheque", "imps"];
