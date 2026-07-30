/** Legal panel enums — keep aligned with frontend/src/modules/legal/types.ts */

export const LEGAL_RISK_LEVELS = ["low", "medium", "high"];

export const LEGAL_COUNSEL_ROLES = ["legal_head", "associate", "external_counsel"];

export const LEGAL_EMPLOYEE_CASE_STATUSES = [
  "open",
  "under_review",
  "mediation",
  "resolved",
  "closed",
  "escalated",
];

export const LEGAL_EMPLOYEE_CASE_TYPES = [
  "harassment",
  "contract_breach",
  "termination",
  "ip_misuse",
  "policy_violation",
  "other",
];

export const LEGAL_VENDOR_DISPUTE_STATUSES = [
  "open",
  "negotiation",
  "arbitration",
  "resolved",
  "litigation",
];

export const LEGAL_CLIENT_MATTER_STATUSES = ["active", "pending", "on_hold", "closed"];

export const LEGAL_NDA_STATUSES = ["active", "expiring_soon", "expired", "draft"];

export const LEGAL_NDA_PARTY_TYPES = ["employee", "vendor", "client", "partner"];

export const LEGAL_AGREEMENT_STATUSES = ["active", "renewal_due", "expired", "draft", "terminated"];

export const LEGAL_AGREEMENT_TYPES = ["msa", "sla", "employment", "vendor", "license"];

export const LEGAL_NOTICE_DIRECTIONS = ["incoming", "outgoing"];

export const LEGAL_NOTICE_STATUSES = ["draft", "sent", "received", "responded", "closed"];

export const LEGAL_COURT_CASE_STATUSES = [
  "filed",
  "listed",
  "hearing",
  "adjourned",
  "judgment",
  "closed",
];

export const LEGAL_COMPLIANCE_STATUSES = [
  "compliant",
  "partial",
  "non_compliant",
  "review_pending",
];

export const LEGAL_EXPENSE_CATEGORIES = [
  "court_fees",
  "counsel_fees",
  "notary",
  "arbitration",
  "travel",
  "misc",
];

/** Days before NDA expiry to surface as expiring_soon / dashboard alert. */
export const LEGAL_NDA_ALERT_DAYS = 45;

/** Days before agreement renewal to surface as renewal_due / dashboard reminder. */
export const LEGAL_AGREEMENT_RENEWAL_DAYS = 60;
