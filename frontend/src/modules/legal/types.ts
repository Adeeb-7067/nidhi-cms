export type RiskLevel = "low" | "medium" | "high";

export type LegalCounsel = {
  id: number;
  name: string;
  email: string;
  role: "legal_head" | "associate" | "external_counsel";
};

export type EmployeeCaseStatus = "open" | "under_review" | "mediation" | "resolved" | "closed" | "escalated";
export type EmployeeCaseType = "harassment" | "contract_breach" | "termination" | "ip_misuse" | "policy_violation" | "other";

export type EmployeeLegalCase = {
  id: number;
  caseNumber: string;
  employeeName: string;
  department: string;
  type: EmployeeCaseType;
  status: EmployeeCaseStatus;
  risk: RiskLevel;
  assignedTo: LegalCounsel;
  openedAt: string;
  updatedAt: string;
  summary: string;
  nextHearing?: string;
};

export type VendorDisputeStatus = "open" | "negotiation" | "arbitration" | "resolved" | "litigation";
export type VendorDispute = {
  id: number;
  vendorName: string;
  contractRef: string;
  status: VendorDisputeStatus;
  risk: RiskLevel;
  amountInDispute: number;
  assignedTo: LegalCounsel;
  openedAt: string;
  summary: string;
};

export type ClientMatterStatus = "active" | "pending" | "on_hold" | "closed";
export type ClientMatter = {
  id: number;
  clientName: string;
  matterTitle: string;
  status: ClientMatterStatus;
  risk: RiskLevel;
  assignedTo: LegalCounsel;
  openedAt: string;
  contractValue: number;
};

export type NdaStatus = "active" | "expiring_soon" | "expired" | "draft";
export type NdaRecord = {
  id: number;
  partyName: string;
  partyType: "employee" | "vendor" | "client" | "partner";
  status: NdaStatus;
  signedAt: string;
  expiresAt: string;
  risk: RiskLevel;
  assignedTo: LegalCounsel;
};

export type AgreementStatus = "active" | "renewal_due" | "expired" | "draft" | "terminated";
export type AgreementRecord = {
  id: number;
  title: string;
  counterparty: string;
  type: "msa" | "sla" | "employment" | "vendor" | "license";
  status: AgreementStatus;
  effectiveFrom: string;
  renewalDate: string;
  risk: RiskLevel;
  assignedTo: LegalCounsel;
};

export type NoticeDirection = "incoming" | "outgoing";
export type NoticeStatus = "draft" | "sent" | "received" | "responded" | "closed";
export type LegalNotice = {
  id: number;
  reference: string;
  direction: NoticeDirection;
  subject: string;
  counterparty: string;
  status: NoticeStatus;
  risk: RiskLevel;
  dueDate: string;
  assignedTo: LegalCounsel;
};

export type CourtCaseStatus = "filed" | "listed" | "hearing" | "adjourned" | "judgment" | "closed";
export type CourtCase = {
  id: number;
  caseNumber: string;
  court: string;
  title: string;
  status: CourtCaseStatus;
  risk: RiskLevel;
  nextHearing?: string;
  assignedTo: LegalCounsel;
  openedAt: string;
};

export type ComplianceStatus = "compliant" | "partial" | "non_compliant" | "review_pending";
export type ComplianceItem = {
  id: number;
  framework: string;
  requirement: string;
  status: ComplianceStatus;
  risk: RiskLevel;
  lastReview: string;
  nextReview: string;
  owner: LegalCounsel;
};

export type LegalExpenseCategory = "court_fees" | "counsel_fees" | "notary" | "arbitration" | "travel" | "misc";
export type LegalExpense = {
  id: number;
  date: string;
  category: LegalExpenseCategory;
  description: string;
  amount: number;
  matterRef: string;
  approvedBy: string;
  receiptAttached: boolean;
};

export type LegalDashboardKpis = {
  activeCases: number;
  ndaAlerts: number;
  courtCases: number;
  complianceScore: number;
  expensesYtd: number;
  highRiskItems: number;
  trends: {
    activeCases: number;
    ndaAlerts: number;
    courtCases: number;
    expensesYtd: number;
  };
};
