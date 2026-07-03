export type LeadStatus =
  | "new"
  | "contacted"
  | "follow_up"
  | "interested"
  | "project_planning"
  | "proposal_sent"
  | "approved"
  | "converted"
  | "lost";

export type LeadPriority = "low" | "medium" | "high" | "urgent";

export type LeadSource =
  | "website"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "referral"
  | "linkedin"
  | "cold_call"
  | "other";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "seen"
  | "revised"
  | "approved"
  | "declined"
  | "counter_offer"
  | "expired";

export type FollowUpStatus = "scheduled" | "completed" | "overdue" | "cancelled";

export type CustomerStatus = "active" | "inactive" | "prospect" | "lost";

export type InstallmentStatus = "pending" | "partial" | "paid" | "overdue";

export type PartialPaymentStatus = "received" | "verified" | "failed" | "refunded";

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue";

export type FinancialEventType =
  | "proposal_sent"
  | "proposal_approved"
  | "customer_converted"
  | "project_created"
  | "installment_created"
  | "invoice_generated"
  | "payment_received"
  | "receipt_generated"
  | "overdue_reminder";

export type SalesNotificationType =
  | "lead_assigned"
  | "proposal_approved"
  | "follow_up_reminder"
  | "payment_received"
  | "overdue_payment"
  | "installment_due"
  | "receipt_generated"
  | "outstanding_reminder";

export interface SalesExecutive {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "sales_executive" | "sales_manager" | "super_admin";
  dealsClosed: number;
  revenue: number;
  target: number;
  pendingFollowUps: number;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo: SalesExecutive;
  expectedValue: number;
  nextFollowUp: string | null;
  createdAt: string;
  notes?: string;
  tags?: string[];
  customerId?: number;
  proposalId?: number;
}

export interface FollowUp {
  id: number;
  leadId: number;
  leadName: string;
  company: string;
  executive: SalesExecutive;
  scheduledAt: string;
  notes: string;
  status: FollowUpStatus;
  type: "call" | "email" | "meeting" | "demo";
}

export interface ProposalLineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface ProposalMilestone {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  description?: string;
}

export interface Proposal {
  id: number;
  number: string;
  title: string;
  leadId?: number;
  customerId?: number;
  customerName: string;
  status: ProposalStatus;
  items: ProposalLineItem[];
  discount: number;
  validUntil: string;
  terms: string;
  notes: string;
  createdAt: string;
  sentAt?: string;
  revision: number;
  assignedTo: SalesExecutive;
  milestones?: ProposalMilestone[];
  approvedAt?: string;
  projectId?: number;
}

export interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  type: "corporate" | "sme" | "individual";
  location: string;
  totalSales: number;
  outstanding: number;
  createdAt: string;
  gstin?: string;
  website?: string;
  leadId?: number;
  totalPaid?: number;
  projectValue?: number;
}

export interface CustomerProject {
  id: number;
  name: string;
  customerId: number;
  customerName: string;
  proposalId?: number;
  totalAmount: number;
  paidAmount: number;
  status: "active" | "completed" | "on_hold";
  createdAt: string;
}

export interface Installment {
  id: number;
  projectId: number;
  customerId: number;
  customerName: string;
  projectName: string;
  name: string;
  dueAmount: number;
  paidAmount: number;
  dueDate: string;
  status: InstallmentStatus;
  invoiceId?: number;
  invoiceNumber?: string;
  sortOrder: number;
}

export interface PartialPayment {
  id: number;
  installmentId: number;
  amount: number;
  mode: string;
  transactionId: string;
  paymentDate: string;
  status: PartialPaymentStatus;
  notes?: string;
  receiptId?: number;
  receiptNumber?: string;
}

export interface PaymentReceipt {
  id: number;
  number: string;
  invoiceNumber: string;
  installmentName: string;
  customerName: string;
  projectName: string;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: string;
  transactionId: string;
  generatedAt: string;
  companyName: string;
  companyAddress: string;
  companyGstin: string;
  logoUrl?: string | null;
  sealUrl?: string | null;
}

export interface InvoiceLineItem {
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface SalesInvoice {
  id: number;
  number: string;
  customer: string;
  customerId: number;
  projectId?: number;
  projectName?: string;
  installmentId?: number;
  installmentName?: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  lineItems?: InvoiceLineItem[];
}

export interface SalesActivity {
  id: number;
  type: "lead" | "proposal" | "payment" | "follow_up" | "note" | "installment" | "receipt";
  title: string;
  description: string;
  actor: string;
  createdAt: string;
  entityId?: number;
}

export interface FinancialTimelineEvent {
  id: number;
  type: FinancialEventType;
  title: string;
  description: string;
  amount?: number;
  customerId?: number;
  projectId?: number;
  createdAt: string;
  href?: string;
}

export interface SalesNotification {
  id: number;
  type: SalesNotificationType;
  title: string;
  body: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
  href?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  taxPercent: number;
  status: "active" | "inactive";
  description?: string;
}

export interface PaymentRecord {
  id: number;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: "paid" | "unpaid" | "partial" | "overdue";
}

export interface PaymentRecordRow {
  id: number;
  invoice: string;
  customer: string;
  amount: number;
  mode: string;
  date: string;
  status: "completed" | "partial" | "pending" | "failed";
  installmentName?: string;
  receiptId?: number;
  receiptNumber?: string;
}
