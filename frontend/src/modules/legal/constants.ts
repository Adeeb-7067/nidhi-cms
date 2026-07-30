import type {
  AgreementStatus,
  ComplianceStatus,
  CourtCaseStatus,
  EmployeeCaseStatus,
  EmployeeCaseType,
  LegalExpenseCategory,
  NdaStatus,
  NoticeStatus,
  RiskLevel,
  VendorDisputeStatus,
  ClientMatterStatus,
} from "./types";

export const LEGAL_ACCESS_ROLES = ["super_admin"] as const;

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const COUNSEL_ROLE_LABELS: Record<"legal_head" | "associate" | "external_counsel", string> = {
  legal_head: "Legal head",
  associate: "Associate",
  external_counsel: "External counsel",
};

export const CASE_STATUS_LABELS: Record<EmployeeCaseStatus, string> = {
  open: "Open",
  under_review: "Under review",
  mediation: "Mediation",
  resolved: "Resolved",
  closed: "Closed",
  escalated: "Escalated",
};

export const CASE_STATUS_ORDER: EmployeeCaseStatus[] = [
  "open",
  "under_review",
  "mediation",
  "escalated",
  "resolved",
  "closed",
];

export const CASE_TYPE_LABELS: Record<EmployeeCaseType, string> = {
  harassment: "Harassment",
  contract_breach: "Contract breach",
  termination: "Termination",
  ip_misuse: "IP misuse",
  policy_violation: "Policy violation",
  other: "Other",
};

export const VENDOR_DISPUTE_STATUS_LABELS: Record<VendorDisputeStatus, string> = {
  open: "Open",
  negotiation: "Negotiation",
  arbitration: "Arbitration",
  resolved: "Resolved",
  litigation: "Litigation",
};

export const CLIENT_MATTER_STATUS_LABELS: Record<ClientMatterStatus, string> = {
  active: "Active",
  pending: "Pending",
  on_hold: "On hold",
  closed: "Closed",
};

export const NDA_STATUS_LABELS: Record<NdaStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  draft: "Draft",
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  active: "Active",
  renewal_due: "Renewal due",
  expired: "Expired",
  draft: "Draft",
  terminated: "Terminated",
};

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  responded: "Responded",
  closed: "Closed",
};

export const COURT_CASE_STATUS_LABELS: Record<CourtCaseStatus, string> = {
  filed: "Filed",
  listed: "Listed",
  hearing: "Hearing",
  adjourned: "Adjourned",
  judgment: "Judgment",
  closed: "Closed",
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  partial: "Partial",
  non_compliant: "Non-compliant",
  review_pending: "Review pending",
};

export const EXPENSE_CATEGORY_LABELS: Record<LegalExpenseCategory, string> = {
  court_fees: "Court fees",
  counsel_fees: "Counsel fees",
  notary: "Notary",
  arbitration: "Arbitration",
  travel: "Travel",
  misc: "Miscellaneous",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}
