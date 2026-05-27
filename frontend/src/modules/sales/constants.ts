import type {
  LeadStatus,
  LeadSource,
  ProposalStatus,
  CustomerStatus,
  InstallmentStatus,
  PartialPaymentStatus,
  InvoiceStatus,
  FinancialEventType,
} from "./types";

/** Roles allowed to access sales module (MVP: super_admin; expand when backend adds roles). */
export const SALES_ACCESS_ROLES = ["super_admin"] as const;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  interested: "Interested",
  proposal_sent: "Proposal Sent",
  approved: "Approved",
  converted: "Converted",
  lost: "Lost",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "follow_up",
  "interested",
  "proposal_sent",
  "approved",
  "converted",
  "lost",
];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  referral: "Referral",
  linkedin: "LinkedIn",
  cold_call: "Cold Call",
  other: "Other",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  revised: "Revised",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  prospect: "Prospect",
  lost: "Lost",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
};

export const PARTIAL_PAYMENT_STATUS_LABELS: Record<PartialPaymentStatus, string> = {
  received: "Received",
  verified: "Verified",
  failed: "Failed",
  refunded: "Refunded",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
};

export const FINANCIAL_EVENT_LABELS: Record<FinancialEventType, string> = {
  proposal_sent: "Proposal sent",
  proposal_approved: "Proposal approved",
  customer_converted: "Customer converted",
  project_created: "Project created",
  installment_created: "Installment created",
  invoice_generated: "Invoice generated",
  payment_received: "Payment received",
  receipt_generated: "Receipt generated",
  overdue_reminder: "Overdue reminder",
};

export const COMPANY_BILLING = {
  name: "Satyakabir Technologies Pvt. Ltd.",
  address: "Indore, Madhya Pradesh, India — 452001",
  gstin: "23AABCS1234F1Z5",
  email: "accounts@satyakabir.com",
  phone: "+91 75555 12345",
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

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calcRemaining(due: number, paid: number): number {
  return Math.max(0, due - paid);
}

export function calcProgress(paid: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((paid / total) * 100));
}

/** End-to-end pipeline including billing lifecycle */
export const SALES_PIPELINE_STAGES = [
  { key: "new", label: "New Lead", color: "bg-blue-500/10 text-blue-700 border-blue-500/25" },
  { key: "follow_up", label: "Follow-up", color: "bg-amber-500/10 text-amber-700 border-amber-500/25" },
  { key: "interested", label: "Interested", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-violet-500/10 text-violet-700 border-violet-500/25" },
  { key: "approved", label: "Approved", color: "bg-teal-500/10 text-teal-700 border-teal-500/25" },
  { key: "converted", label: "Customer", color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/25" },
  { key: "installment", label: "Installments", color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/25" },
  { key: "invoice", label: "Invoice", color: "bg-sky-500/10 text-sky-700 border-sky-500/25" },
  { key: "payment", label: "Payment", color: "bg-green-500/10 text-green-700 border-green-500/25" },
  { key: "closed_won", label: "Closed Won", color: "bg-emerald-600/10 text-emerald-800 border-emerald-600/25" },
] as const;

export const SALES_FEATURE_COVERAGE = [
  { id: "1a", stage: "1. Lead Entry & Assignment", feature: "Manual lead entry form", inUi: true, route: "/sales/leads" },
  { id: "1b", stage: "1. Lead Entry & Assignment", feature: "Lead approval & conversion flow", inUi: true, route: "/sales/leads/:id" },
  { id: "2a", stage: "2. Lead Qualification", feature: "Extended status pipeline", inUi: true, route: "/sales/leads" },
  { id: "2b", stage: "2. Lead Qualification", feature: "Activity / interaction timeline", inUi: true, route: "Lead detail → Activity" },
  { id: "3a", stage: "3. Proposal Creation", feature: "Estimate & milestone breakdown", inUi: true, route: "/sales/proposals/:id" },
  { id: "3b", stage: "3. Proposal Creation", feature: "Installment planning UI", inUi: true, route: "/sales/proposals/:id" },
  { id: "4a", stage: "4. Customer Conversion", feature: "Lead → customer conversion wizard", inUi: true, route: "/sales/leads/:id" },
  { id: "5a", stage: "5. Installment Management", feature: "Installment list & timeline", inUi: true, route: "/sales/installments" },
  { id: "5b", stage: "5. Installment Management", feature: "Partial payment tracking", inUi: true, route: "/sales/installments/:id" },
  { id: "6a", stage: "6. Invoice & Billing", feature: "Installment-linked invoices", inUi: true, route: "/sales/invoices/:id" },
  { id: "6b", stage: "6. Invoice & Billing", feature: "Payment progress & balance", inUi: true, route: "/sales/invoices" },
  { id: "7a", stage: "7. Payments & Receipts", feature: "Partial payment entry", inUi: true, route: "/sales/payments" },
  { id: "7b", stage: "7. Payments & Receipts", feature: "Print-ready receipt preview", inUi: true, route: "/sales/receipts/:id" },
  { id: "8a", stage: "8. Analytics & Reports", feature: "Revenue & outstanding KPIs", inUi: true, route: "/sales" },
  { id: "8b", stage: "8. Analytics & Reports", feature: "Financial reports & exports", inUi: true, route: "/sales/reports" },
  { id: "8c", stage: "8. Analytics & Reports", feature: "Customer financial dashboard", inUi: true, route: "/sales/customers/:id" },
] as const;

export const ADMIN_DASHBOARD_MODULES = [
  { id: "home", label: "Admin dashboard overview", route: "/sales", inUi: true },
  { id: "leads", label: "Lead management", route: "/sales/leads", inUi: true },
  { id: "followups", label: "Follow-up & activity management", route: "/sales/follow-ups", inUi: true },
  { id: "proposals", label: "Proposal / estimate management", route: "/sales/proposals", inUi: true },
  { id: "customers", label: "Customer management (CRM)", route: "/sales/customers", inUi: true },
  { id: "installments", label: "Installment management", route: "/sales/installments", inUi: true },
  { id: "invoices", label: "Invoice & billing management", route: "/sales/invoices", inUi: true },
  { id: "payments", label: "Payment & receipt management", route: "/sales/payments", inUi: true },
  { id: "reports", label: "Financial analytics & reports", route: "/sales/reports", inUi: true },
  { id: "team", label: "Sales team management", route: "/sales/team", inUi: true },
  { id: "settings", label: "Automation & system settings", route: "/sales/settings", inUi: true },
  { id: "notifications", label: "Financial notifications & alerts", route: "/sales/notifications", inUi: true },
] as const;

export const financialDashboardKpis = {
  totalRevenue: 1265000,
  outstandingPayments: 575000,
  installmentsPending: 8,
  paymentsReceived: 42,
  overdueInvoices: 3,
  proposalValue: 4850000,
  trends: {
    totalRevenue: 18.6,
    outstandingPayments: -4.2,
    installmentsPending: 2.1,
    paymentsReceived: 12.4,
    overdueInvoices: -8.0,
    proposalValue: 15.7,
  },
};

export const monthlyCollections = [
  { month: "Jan", collected: 620000, outstanding: 180000 },
  { month: "Feb", collected: 710000, outstanding: 210000 },
  { month: "Mar", collected: 890000, outstanding: 195000 },
  { month: "Apr", collected: 780000, outstanding: 240000 },
  { month: "May", collected: 1265000, outstanding: 575000 },
];

export const outstandingVsPaid = [
  { name: "Paid", value: 69, amount: 1265000 },
  { name: "Outstanding", value: 31, amount: 575000 },
];

export const installmentCollectionTrend = [
  { month: "Jan", advance: 420000, development: 0, final: 0 },
  { month: "Feb", advance: 380000, development: 120000, final: 0 },
  { month: "Mar", advance: 290000, development: 280000, final: 0 },
  { month: "Apr", advance: 310000, development: 320000, final: 80000 },
  { month: "May", advance: 450000, development: 400000, final: 150000 },
];
