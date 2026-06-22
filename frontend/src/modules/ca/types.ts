import type { UserRole } from "@/lib/user-roles";

export type ComplianceTimingStatus = "completed" | "upcoming" | "overdue";

export type PeriodFilter = "monthly" | "quarterly" | "yearly";

export type GstClassification = "gst" | "non_gst";

export type ReconciliationStatus = "matched" | "unmatched" | "partial";

export type BankTxnDirection = "incoming" | "outgoing";

export type PaymentMode = "neft" | "rtgs" | "upi" | "cheque" | "imps";

export type NoticeDepartment = "gst" | "income_tax" | "mca" | "pf" | "esic";

export type NoticeWorkflowStatus = "received" | "assigned" | "replied" | "closed";

export type CaTaskStatus = "pending" | "in_progress" | "completed";

export type CaTaskPriority = "low" | "medium" | "high";

export type FilingStatus = "filed" | "pending" | "overdue" | "draft";

export type AuditPhase = "planning" | "fieldwork" | "review" | "completed";

export type DocumentCategory =
  | "gst_certificate"
  | "pan"
  | "moa"
  | "aoa"
  | "audit_report"
  | "itr"
  | "other";

export type ExpenseCategory =
  | "rent"
  | "salary"
  | "software"
  | "hosting"
  | "marketing"
  | "travel"
  | "utilities"
  | "misc";

export type RocFormType = "AOC-4" | "MGT-7" | "ADT-1" | "DIR-3 KYC";

export type GstReturnType = "GSTR-1" | "GSTR-3B";

export type TdsReturnType = "24Q" | "26Q" | "27Q";

export interface CaPerson {
  id: number;
  name: string;
  designation?: string;
}

export interface CaDashboardKpis {
  totalRevenue: number;
  totalExpenses: number;
  gstLiability: number;
  pendingGstFilings: number;
  pendingRocFilings: number;
  suspenseAmount: number;
  auditStatus: AuditPhase;
  overallComplianceScore: number;
}

export interface CaAlert {
  id: number;
  title: string;
  body: string;
  severity: "warning" | "critical" | "info";
  href?: string;
  daysRemaining?: number;
}

export interface ComplianceStatusRow {
  id: number;
  area: string;
  item: string;
  dueDate: string;
  status: ComplianceTimingStatus;
  owner: string;
}

export interface ClientPayment {
  id: number;
  clientName: string;
  invoiceRef: string;
  amount: number;
  gstClassification: GstClassification;
  gstAmount: number;
  receivedAt: string;
  mode: PaymentMode;
}

export interface CaVendor {
  id: number;
  name: string;
  gstin: string;
  pan: string;
  ledgerBalance: number;
  inputCreditAvailable: number;
  reconciliationStatus: ReconciliationStatus;
  lastPaymentAt: string;
}

export interface CaExpense {
  id: number;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  gstEligible: boolean;
}

export interface BankTransaction {
  id: number;
  date: string;
  direction: BankTxnDirection;
  mode: PaymentMode;
  reference: string;
  party: string;
  amount: number;
  reconciliationStatus: ReconciliationStatus;
  bankRef: string;
}

export interface SuspenseEntry {
  id: number;
  receivedAt: string;
  amount: number;
  bankRef: string;
  mode: PaymentMode;
  remarks: string;
  ageDays: number;
}

export interface GstSummary {
  outputTax: number;
  inputTax: number;
  netLiability: number;
  period: string;
}

export interface GstReturnFiling {
  id: number;
  returnType: GstReturnType;
  period: string;
  dueDate: string;
  status: FilingStatus;
  filedAt?: string;
}

export interface GstNotice {
  id: number;
  reference: string;
  subject: string;
  amount: number;
  receivedAt: string;
  status: NoticeWorkflowStatus;
}

export interface TdsSummary {
  deducted: number;
  receivable: number;
  payable: number;
  quarter: string;
}

export interface TdsReturn {
  id: number;
  returnType: TdsReturnType;
  quarter: string;
  dueDate: string;
  status: FilingStatus;
}

export interface TdsCertificate {
  id: number;
  form: "16" | "16A";
  party: string;
  pan: string;
  amount: number;
  issued: boolean;
}

export interface CompanyItr {
  financialYear: string;
  revenue: number;
  expenses: number;
  profitBeforeTax: number;
  taxLiability: number;
  filingStatus: FilingStatus;
  dueDate: string;
  filedAt?: string;
}

export interface DirectorItr {
  id: number;
  directorName: string;
  pan: string;
  financialYear: string;
  filingStatus: FilingStatus;
  dueDate: string;
  taxLiability: number;
}

export interface RocFiling {
  id: number;
  form: RocFormType;
  financialYear: string;
  dueDate: string;
  status: FilingStatus;
  filedAt?: string;
}

export interface DinDscRecord {
  id: number;
  directorName: string;
  din: string;
  dscExpiry: string;
  dscStatus: ComplianceTimingStatus;
  daysToExpiry: number;
}

export interface CaDocument {
  id: number;
  title: string;
  category: DocumentCategory;
  version: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AuditRecord {
  id: number;
  type: "internal" | "statutory";
  auditor: string;
  financialYear: string;
  phase: AuditPhase;
  observations: number;
  status: ComplianceTimingStatus;
}

export interface CaNotice {
  id: number;
  department: NoticeDepartment;
  reference: string;
  subject: string;
  receivedAt: string;
  dueDate: string;
  workflowStatus: NoticeWorkflowStatus;
  assignedTo: string;
}

export interface ComplianceCalendarItem {
  id: number;
  title: string;
  category: "GST" | "TDS" | "ROC" | "ITR" | "Audit";
  dueDate: string;
  status: ComplianceTimingStatus;
}

export interface CaTask {
  id: number;
  title: string;
  assignedBy: string;
  assignedTo: string;
  status: CaTaskStatus;
  priority: CaTaskPriority;
  dueDate: string;
  category: string;
}

export interface ComplianceScoreBreakdown {
  gst: number;
  tax: number;
  roc: number;
  audit: number;
  overall: number;
}

export type CaAccessRole = UserRole | "ca";
