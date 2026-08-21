import type {
  CustomerProject,
  FinancialTimelineEvent,
  Installment,
  PartialPayment,
  PaymentReceipt,
  SalesInvoice,
} from "./types";

/** Demo project: Bright Solutions CRM — ₹1,00,000 with 3 installments */
export const DEMO_PROJECT_ID = 101;
export const DEMO_CUSTOMER_ID = 2;

export const mockCustomerProjects: CustomerProject[] = [
  {
    id: DEMO_PROJECT_ID,
    name: "Bright Solutions CRM Integration",
    customerId: DEMO_CUSTOMER_ID,
    customerName: "Bright Solutions",
    proposalId: 244,
    totalAmount: 100000,
    paidAmount: 55000,
    status: "active",
    createdAt: "2026-05-19T00:00:00Z",
  },
  {
    id: 102,
    name: "Agrolink ERP & Mobile Suite",
    customerId: 1,
    customerName: "Agrolink Manufacturing Pvt. Ltd.",
    proposalId: 245,
    totalAmount: 2450000,
    paidAmount: 2000000,
    status: "active",
    createdAt: "2026-05-21T00:00:00Z",
  },
  {
    id: 103,
    name: "Nidhi Info Tech Internal CMS",
    customerId: 3,
    customerName: "Nidhi Info Tech",
    totalAmount: 450000,
    paidAmount: 325000,
    status: "active",
    createdAt: "2026-04-01T00:00:00Z",
  },
];

export const mockInstallments: Installment[] = [
  {
    id: 1,
    projectId: DEMO_PROJECT_ID,
    customerId: DEMO_CUSTOMER_ID,
    customerName: "Bright Solutions",
    projectName: "Bright Solutions CRM Integration",
    name: "Advance",
    dueAmount: 30000,
    paidAmount: 30000,
    dueDate: "2026-05-20",
    status: "paid",
    invoiceId: 325,
    invoiceNumber: "INV-2026-0325",
    sortOrder: 1,
  },
  {
    id: 2,
    projectId: DEMO_PROJECT_ID,
    customerId: DEMO_CUSTOMER_ID,
    customerName: "Bright Solutions",
    projectName: "Bright Solutions CRM Integration",
    name: "Development",
    dueAmount: 40000,
    paidAmount: 25000,
    dueDate: "2026-06-15",
    status: "partial",
    invoiceId: 327,
    invoiceNumber: "INV-2026-0327",
    sortOrder: 2,
  },
  {
    id: 3,
    projectId: DEMO_PROJECT_ID,
    customerId: DEMO_CUSTOMER_ID,
    customerName: "Bright Solutions",
    projectName: "Bright Solutions CRM Integration",
    name: "Final Delivery",
    dueAmount: 30000,
    paidAmount: 0,
    dueDate: "2026-07-30",
    status: "pending",
    invoiceId: 328,
    invoiceNumber: "INV-2026-0328",
    sortOrder: 3,
  },
  {
    id: 4,
    projectId: 102,
    customerId: 1,
    customerName: "Agrolink Manufacturing Pvt. Ltd.",
    projectName: "Agrolink ERP & Mobile Suite",
    name: "Advance (40%)",
    dueAmount: 980000,
    paidAmount: 980000,
    dueDate: "2026-05-10",
    status: "paid",
    invoiceId: 326,
    invoiceNumber: "INV-2026-0326",
    sortOrder: 1,
  },
  {
    id: 5,
    projectId: 102,
    customerId: 1,
    customerName: "Agrolink Manufacturing Pvt. Ltd.",
    projectName: "Agrolink ERP & Mobile Suite",
    name: "UAT Sign-off (30%)",
    dueAmount: 735000,
    paidAmount: 735000,
    dueDate: "2026-06-01",
    status: "paid",
    sortOrder: 2,
  },
  {
    id: 6,
    projectId: 102,
    customerId: 1,
    customerName: "Agrolink Manufacturing Pvt. Ltd.",
    projectName: "Agrolink ERP & Mobile Suite",
    name: "Go-live (30%)",
    dueAmount: 735000,
    paidAmount: 285000,
    dueDate: "2026-05-10",
    status: "overdue",
    sortOrder: 3,
  },
];

export const mockPartialPayments: PartialPayment[] = [
  { id: 1, installmentId: 1, amount: 30000, mode: "Bank transfer", transactionId: "NEFT-BS-001", paymentDate: "2026-05-20", status: "verified", receiptId: 1, receiptNumber: "RCT-2026-0041" },
  { id: 2, installmentId: 2, amount: 10000, mode: "UPI", transactionId: "UPI-BS-8821", paymentDate: "2026-05-28", status: "verified", receiptId: 2, receiptNumber: "RCT-2026-0042" },
  { id: 3, installmentId: 2, amount: 15000, mode: "Bank transfer", transactionId: "NEFT-BS-002", paymentDate: "2026-06-02", status: "verified", receiptId: 3, receiptNumber: "RCT-2026-0043" },
];

export const mockReceipts: PaymentReceipt[] = [
  {
    id: 1,
    number: "RCT-2026-0041",
    invoiceNumber: "INV-2026-0325",
    installmentName: "Advance",
    customerName: "Bright Solutions",
    projectName: "Bright Solutions CRM Integration",
    amountPaid: 30000,
    remainingBalance: 70000,
    paymentMethod: "Bank transfer",
    transactionId: "NEFT-BS-001",
    generatedAt: "2026-05-20T14:30:00Z",
    companyName: "Nidhi Info Tech Pvt. Ltd.",
    companyAddress: "Bhopal, Madhya Pradesh, India",
    companyGstin: "23AABCS1234F1Z5",
  },
  {
    id: 2,
    number: "RCT-2026-0042",
    invoiceNumber: "INV-2026-0327",
    installmentName: "Development",
    customerName: "Bright Solutions",
    projectName: "Bright Solutions CRM Integration",
    amountPaid: 10000,
    remainingBalance: 60000,
    paymentMethod: "UPI",
    transactionId: "UPI-BS-8821",
    generatedAt: "2026-05-28T11:00:00Z",
    companyName: "Nidhi Info Tech Pvt. Ltd.",
    companyAddress: "Bhopal, Madhya Pradesh, India",
    companyGstin: "23AABCS1234F1Z5",
  },
  {
    id: 3,
    number: "RCT-2026-0043",
    invoiceNumber: "INV-2026-0327",
    installmentName: "Development",
    customerName: "Bright Solutions",
    projectName: "Bright Solutions CRM Integration",
    amountPaid: 15000,
    remainingBalance: 45000,
    paymentMethod: "Bank transfer",
    transactionId: "NEFT-BS-002",
    generatedAt: "2026-06-02T16:45:00Z",
    companyName: "Nidhi Info Tech Pvt. Ltd.",
    companyAddress: "Bhopal, Madhya Pradesh, India",
    companyGstin: "23AABCS1234F1Z5",
  },
];

export const mockSalesInvoices: SalesInvoice[] = [
  { id: 326, number: "INV-2026-0326", customer: "Agrolink Manufacturing Pvt. Ltd.", customerId: 1, projectId: 102, projectName: "Agrolink ERP & Mobile Suite", installmentId: 4, installmentName: "Advance (40%)", amount: 980000, paidAmount: 980000, status: "paid", dueDate: "2026-06-15", createdAt: "2026-05-28" },
  { id: 325, number: "INV-2026-0325", customer: "Bright Solutions", customerId: 2, projectId: DEMO_PROJECT_ID, projectName: "Bright Solutions CRM Integration", installmentId: 1, installmentName: "Advance", amount: 30000, paidAmount: 30000, status: "paid", dueDate: "2026-05-15", createdAt: "2026-05-18" },
  { id: 327, number: "INV-2026-0327", customer: "Bright Solutions", customerId: 2, projectId: DEMO_PROJECT_ID, projectName: "Bright Solutions CRM Integration", installmentId: 2, installmentName: "Development", amount: 40000, paidAmount: 25000, status: "partial", dueDate: "2026-06-15", createdAt: "2026-06-01" },
  { id: 328, number: "INV-2026-0328", customer: "Bright Solutions", customerId: 2, projectId: DEMO_PROJECT_ID, projectName: "Bright Solutions CRM Integration", installmentId: 3, installmentName: "Final Delivery", amount: 30000, paidAmount: 0, status: "unpaid", dueDate: "2026-07-30", createdAt: "2026-06-01" },
  { id: 324, number: "INV-2026-0324", customer: "Nidhi Info Tech", customerId: 3, projectId: 103, projectName: "Nidhi Info Tech Internal CMS", amount: 125000, paidAmount: 62500, status: "partial", dueDate: "2026-05-28", createdAt: "2026-05-12" },
  { id: 323, number: "INV-2026-0323", customer: "Metro Retail Group", customerId: 4, amount: 320000, paidAmount: 0, status: "overdue", dueDate: "2026-06-01", createdAt: "2026-05-10" },
];

export const mockFinancialTimeline: FinancialTimelineEvent[] = [
  { id: 1, type: "proposal_sent", title: "Proposal sent", description: "PROP-2026-0244 sent to Bright Solutions", customerId: 2, createdAt: "2026-05-16T10:00:00Z", href: "/sales/proposals/244" },
  { id: 2, type: "proposal_approved", title: "Proposal approved", description: "Bright Solutions CRM Integration — ₹5,30,000", amount: 530000, customerId: 2, createdAt: "2026-05-19T11:30:00Z", href: "/sales/proposals/244" },
  { id: 3, type: "customer_converted", title: "Lead converted to customer", description: "Bright Solutions added to CRM", customerId: 2, createdAt: "2026-05-19T12:00:00Z", href: "/sales/customers/2" },
  { id: 4, type: "project_created", title: "Project created", description: "Bright Solutions CRM Integration — ₹1,00,000", amount: 100000, customerId: 2, projectId: DEMO_PROJECT_ID, createdAt: "2026-05-19T12:30:00Z", href: "/sales/installments/2" },
  { id: 5, type: "installment_created", title: "Installment plan created", description: "3 installments: Advance, Development, Final Delivery", customerId: 2, projectId: DEMO_PROJECT_ID, createdAt: "2026-05-19T13:00:00Z", href: "/sales/installments" },
  { id: 6, type: "invoice_generated", title: "Invoice generated", description: "INV-2026-0325 — Advance installment", amount: 30000, customerId: 2, createdAt: "2026-05-18T09:00:00Z", href: "/sales/invoices/325" },
  { id: 7, type: "payment_received", title: "Payment received", description: "₹30,000 via Bank transfer — Advance", amount: 30000, customerId: 2, createdAt: "2026-05-20T14:30:00Z", href: "/sales/receipts/1" },
  { id: 8, type: "receipt_generated", title: "Receipt generated", description: "RCT-2026-0041 for Bright Solutions", customerId: 2, createdAt: "2026-05-20T14:31:00Z", href: "/sales/receipts/1" },
  { id: 9, type: "payment_received", title: "Partial payment received", description: "₹10,000 — Development installment (1 of 3)", amount: 10000, customerId: 2, createdAt: "2026-05-28T11:00:00Z", href: "/sales/receipts/2" },
  { id: 10, type: "overdue_reminder", title: "Overdue reminder sent", description: "Agrolink Go-live installment — ₹4,50,000 overdue", amount: 450000, customerId: 1, createdAt: "2026-05-22T09:00:00Z", href: "/sales/installments/6" },
];

export function getInstallmentById(id: number): Installment | undefined {
  return mockInstallments.find((i) => i.id === id);
}

export function getInvoiceById(id: number): SalesInvoice | undefined {
  return mockSalesInvoices.find((i) => i.id === id);
}

export function getReceiptById(id: number): PaymentReceipt | undefined {
  return mockReceipts.find((r) => r.id === id);
}

export function getProjectById(id: number): CustomerProject | undefined {
  return mockCustomerProjects.find((p) => p.id === id);
}

export function getInstallmentsByProject(projectId: number): Installment[] {
  return mockInstallments.filter((i) => i.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPartialPaymentsByInstallment(installmentId: number): PartialPayment[] {
  return mockPartialPayments.filter((p) => p.installmentId === installmentId);
}

export function getInstallmentsByCustomer(customerId: number): Installment[] {
  return mockInstallments.filter((i) => i.customerId === customerId);
}

export function getInvoicesByCustomer(customerId: number): SalesInvoice[] {
  return mockSalesInvoices.filter((i) => i.customerId === customerId);
}

export function getTimelineByCustomer(customerId: number): FinancialTimelineEvent[] {
  return mockFinancialTimeline.filter((e) => e.customerId === customerId);
}
