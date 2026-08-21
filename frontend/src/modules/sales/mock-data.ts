import type {
  Customer,
  FollowUp,
  Lead,
  PaymentRecord,
  Proposal,
  SalesActivity,
  SalesExecutive,
  SalesNotification,
} from "./types";

export const salesExecutives: SalesExecutive[] = [
  {
    id: 1,
    name: "Malik Naushad",
    email: "malik@nidhiinfotech.com",
    role: "sales_manager",
    dealsClosed: 89,
    revenue: 2450000,
    target: 3000000,
    pendingFollowUps: 12,
  },
  {
    id: 2,
    name: "Sana Khan",
    email: "sana@nidhiinfotech.com",
    role: "sales_executive",
    dealsClosed: 62,
    revenue: 1580000,
    target: 2000000,
    pendingFollowUps: 8,
  },
  {
    id: 3,
    name: "Rahul Verma",
    email: "rahul@nidhiinfotech.com",
    role: "sales_executive",
    dealsClosed: 45,
    revenue: 980000,
    target: 1500000,
    pendingFollowUps: 5,
  },
  {
    id: 4,
    name: "Priya Sharma",
    email: "priya@nidhiinfotech.com",
    role: "sales_executive",
    dealsClosed: 38,
    revenue: 720000,
    target: 1200000,
    pendingFollowUps: 7,
  },
];

const exec = (id: number) => salesExecutives.find((e) => e.id === id)!;

export const mockLeads: Lead[] = [
  {
    id: 6691,
    name: "Home7emirates",
    email: "contact@home7emirates.com",
    phone: "+971 50 123 4567",
    company: "Home7emirates LLC",
    source: "instagram",
    status: "new",
    priority: "high",
    assignedTo: exec(1),
    expectedValue: 450000,
    nextFollowUp: "2026-05-25T10:00:00Z",
    createdAt: "2026-05-24T08:30:00Z",
    notes: "Interested in mobile app + admin panel",
  },
  {
    id: 6688,
    name: "Agrolink Manufacturing",
    email: "sales@agrolink.in",
    phone: "+91 98765 43210",
    company: "Agrolink Manufacturing Pvt. Ltd.",
    source: "website",
    status: "proposal_sent",
    priority: "urgent",
    assignedTo: exec(2),
    expectedValue: 2450000,
    nextFollowUp: "2026-05-26T14:00:00Z",
    createdAt: "2026-05-20T11:00:00Z",
  },
  {
    id: 6685,
    name: "Bright Solutions",
    email: "hello@brightsolutions.co",
    phone: "+91 91234 56789",
    company: "Bright Solutions",
    source: "referral",
    status: "interested",
    priority: "medium",
    assignedTo: exec(1),
    expectedValue: 680000,
    nextFollowUp: "2026-05-25T16:30:00Z",
    createdAt: "2026-05-18T09:15:00Z",
  },
  {
    id: 6680,
    name: "Nidhi Info Tech",
    email: "info@nidhiinfotech.com",
    phone: "+91 75555 12345",
    company: "Nidhi Info Tech",
    source: "linkedin",
    status: "converted",
    priority: "high",
    assignedTo: exec(3),
    expectedValue: 1200000,
    nextFollowUp: null,
    createdAt: "2026-05-10T10:00:00Z",
  },
  {
    id: 6675,
    name: "Metro Retail Group",
    email: "procurement@metroretail.in",
    phone: "+91 99887 76655",
    company: "Metro Retail Group",
    source: "facebook",
    status: "contacted",
    priority: "medium",
    assignedTo: exec(4),
    expectedValue: 320000,
    nextFollowUp: "2026-05-27T11:00:00Z",
    createdAt: "2026-05-15T14:20:00Z",
  },
  {
    id: 6670,
    name: "CloudNine Hospitality",
    email: "it@cloudnine.com",
    phone: "+91 88776 65544",
    company: "CloudNine Hospitality",
    source: "website",
    status: "follow_up",
    priority: "low",
    assignedTo: exec(2),
    expectedValue: 180000,
    nextFollowUp: "2026-05-24T09:00:00Z",
    createdAt: "2026-05-12T16:45:00Z",
  },
  {
    id: 6665,
    name: "FinEdge Capital",
    email: "ops@finedge.in",
    phone: "+91 77665 54433",
    company: "FinEdge Capital",
    source: "cold_call",
    status: "lost",
    priority: "medium",
    assignedTo: exec(3),
    expectedValue: 950000,
    nextFollowUp: null,
    createdAt: "2026-05-01T08:00:00Z",
    notes: "Budget constraints — revisit Q3",
  },
  {
    id: 6660,
    name: "EduSpark Academy",
    email: "admin@eduspark.in",
    phone: "+91 66554 43322",
    company: "EduSpark Academy",
    source: "referral",
    status: "interested",
    priority: "high",
    assignedTo: exec(4),
    expectedValue: 540000,
    nextFollowUp: "2026-05-28T15:00:00Z",
    createdAt: "2026-05-08T12:30:00Z",
  },
];

export const mockFollowUps: FollowUp[] = [
  {
    id: 1,
    leadId: 6691,
    leadName: "Home7emirates",
    company: "Home7emirates LLC",
    executive: exec(1),
    scheduledAt: "2026-05-25T10:00:00Z",
    notes: "Initial discovery call — demo product catalog",
    status: "scheduled",
    type: "call",
  },
  {
    id: 2,
    leadId: 6688,
    leadName: "Agrolink Manufacturing",
    company: "Agrolink Manufacturing Pvt. Ltd.",
    executive: exec(2),
    scheduledAt: "2026-05-24T08:00:00Z",
    notes: "Follow up on proposal revision",
    status: "overdue",
    type: "email",
  },
  {
    id: 3,
    leadId: 6685,
    leadName: "Bright Solutions",
    company: "Bright Solutions",
    executive: exec(1),
    scheduledAt: "2026-05-25T16:30:00Z",
    notes: "Technical requirements workshop",
    status: "scheduled",
    type: "meeting",
  },
  {
    id: 4,
    leadId: 6670,
    leadName: "CloudNine Hospitality",
    company: "CloudNine Hospitality",
    executive: exec(2),
    scheduledAt: "2026-05-23T14:00:00Z",
    notes: "Sent pricing breakdown",
    status: "completed",
    type: "email",
  },
  {
    id: 5,
    leadId: 6660,
    leadName: "EduSpark Academy",
    company: "EduSpark Academy",
    executive: exec(4),
    scheduledAt: "2026-05-22T11:00:00Z",
    notes: "Missed call — reschedule",
    status: "overdue",
    type: "call",
  },
];

export const mockProposals: Proposal[] = [
  {
    id: 245,
    number: "PROP-2026-0245",
    title: "Agrolink ERP & Mobile Suite",
    leadId: 6688,
    customerName: "Agrolink Manufacturing Pvt. Ltd.",
    status: "sent",
    items: [
      { id: "1", name: "ERP Module", description: "Custom ERP Module Development", quantity: 1, unitPrice: 1200000, taxPercent: 18 },
      { id: "2", name: "Mobile App", description: "Mobile App (iOS + Android)", quantity: 1, unitPrice: 850000, taxPercent: 18 },
      { id: "3", name: "AMC Support", description: "12 Months Support & AMC", quantity: 1, unitPrice: 200000, taxPercent: 18 },
    ],
    discount: 5,
    validUntil: "2026-06-30",
    terms: "Net 30. 40% advance, 30% on UAT, 30% on go-live.",
    notes: "Includes 2 revision rounds",
    createdAt: "2026-05-20T11:00:00Z",
    sentAt: "2026-05-21T09:00:00Z",
    revision: 1,
    assignedTo: exec(2),
  },
  {
    id: 244,
    number: "PROP-2026-0244",
    title: "Bright Solutions CRM Integration",
    customerId: 2,
    customerName: "Bright Solutions",
    status: "approved",
    items: [
      { id: "1", name: "CRM Integration", description: "CRM Integration & API Development", quantity: 1, unitPrice: 450000, taxPercent: 18 },
      { id: "2", name: "Data Migration", description: "Data Migration", quantity: 1, unitPrice: 80000, taxPercent: 18 },
    ],
    discount: 0,
    validUntil: "2026-06-15",
    terms: "Net 15.",
    notes: "",
    createdAt: "2026-05-15T10:00:00Z",
    sentAt: "2026-05-16T10:00:00Z",
    revision: 2,
    assignedTo: exec(1),
    milestones: [
      { id: "m1", name: "Advance", amount: 30000, dueDate: "2026-05-20", description: "Project kick-off & discovery" },
      { id: "m2", name: "Development", amount: 40000, dueDate: "2026-06-15", description: "CRM integration & API build" },
      { id: "m3", name: "Final Delivery", amount: 30000, dueDate: "2026-07-30", description: "UAT, training & go-live" },
    ],
    approvedAt: "2026-05-19T11:30:00Z",
    projectId: 101,
  },
  {
    id: 243,
    number: "PROP-2026-0243",
    title: "Home7emirates Mobile App MVP",
    leadId: 6691,
    customerName: "Home7emirates LLC",
    status: "draft",
    items: [
      { id: "1", name: "Mobile App MVP", description: "Mobile App MVP", quantity: 1, unitPrice: 350000, taxPercent: 18 },
    ],
    discount: 0,
    validUntil: "2026-07-01",
    terms: "Standard terms apply.",
    notes: "Draft — pending requirements",
    createdAt: "2026-05-24T08:00:00Z",
    revision: 1,
    assignedTo: exec(1),
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 1,
    companyName: "Agrolink Manufacturing Pvt. Ltd.",
    contactPerson: "Rajesh Mehta",
    email: "rajesh@agrolink.in",
    phone: "+91 98765 43210",
    status: "active",
    type: "corporate",
    location: "Mumbai",
    totalSales: 2450000,
    outstanding: 450000,
    createdAt: "2025-08-12T00:00:00Z",
    gstin: "27AABCU9603R1ZM",
    website: "https://agrolink.in",
  },
  {
    id: 2,
    companyName: "Bright Solutions",
    contactPerson: "Anita Desai",
    email: "anita@brightsolutions.co",
    phone: "+91 91234 56789",
    status: "active",
    type: "sme",
    location: "Bhopal",
    totalSales: 680000,
    outstanding: 0,
    createdAt: "2025-11-03T00:00:00Z",
  },
  {
    id: 3,
    companyName: "Nidhi Info Tech",
    contactPerson: "Malik Naushad",
    email: "info@nidhiinfotech.com",
    phone: "+91 75555 12345",
    status: "active",
    type: "corporate",
    location: "Bhopal",
    totalSales: 1200000,
    outstanding: 125000,
    createdAt: "2025-06-01T00:00:00Z",
    gstin: "23AABCS1234F1Z5",
  },
  {
    id: 4,
    companyName: "Metro Retail Group",
    contactPerson: "Vikram Singh",
    email: "vikram@metroretail.in",
    phone: "+91 99887 76655",
    status: "prospect",
    type: "corporate",
    location: "Delhi",
    totalSales: 0,
    outstanding: 0,
    createdAt: "2026-05-15T00:00:00Z",
  },
  {
    id: 5,
    companyName: "EduSpark Academy",
    contactPerson: "Dr. Meera Joshi",
    email: "meera@eduspark.in",
    phone: "+91 66554 43322",
    status: "prospect",
    type: "sme",
    location: "Pune",
    totalSales: 0,
    outstanding: 0,
    createdAt: "2026-05-08T00:00:00Z",
  },
];

export const mockActivities: SalesActivity[] = [
  { id: 1, type: "lead", title: "New lead created", description: "Home7emirates — Instagram", actor: "System", createdAt: "2026-05-24T08:30:00Z", entityId: 6691 },
  { id: 2, type: "proposal", title: "Proposal sent", description: "Agrolink Manufacturing — PROP-2026-0245", actor: "Sana Khan", createdAt: "2026-05-21T09:00:00Z", entityId: 245 },
  { id: 3, type: "payment", title: "Payment received", description: "Bright Solutions — ₹ 5,30,000", actor: "Accounts", createdAt: "2026-05-20T14:00:00Z" },
  { id: 4, type: "follow_up", title: "Follow-up completed", description: "CloudNine Hospitality — pricing sent", actor: "Sana Khan", createdAt: "2026-05-23T14:00:00Z" },
  { id: 5, type: "proposal", title: "Proposal approved", description: "Bright Solutions CRM Integration", actor: "Anita Desai", createdAt: "2026-05-19T11:30:00Z", entityId: 244 },
  { id: 6, type: "lead", title: "Lead assigned", description: "EduSpark Academy → Priya Sharma", actor: "Malik Naushad", createdAt: "2026-05-08T12:35:00Z", entityId: 6660 },
];

export const mockNotifications: SalesNotification[] = [
  { id: 1, type: "lead_assigned", title: "New lead assigned", body: "Home7emirates has been assigned to you", isRead: false, priority: "high", createdAt: "2026-05-24T08:31:00Z", href: "/sales/leads/6691" },
  { id: 2, type: "follow_up_reminder", title: "Follow-up overdue", body: "Agrolink Manufacturing — proposal revision", isRead: false, priority: "high", createdAt: "2026-05-24T08:00:00Z", href: "/sales/follow-ups" },
  { id: 3, type: "proposal_approved", title: "Proposal approved", body: "Bright Solutions CRM Integration", isRead: true, priority: "medium", createdAt: "2026-05-19T11:30:00Z", href: "/sales/proposals/244" },
  { id: 4, type: "payment_received", title: "Partial payment received", body: "₹15,000 from Bright Solutions — Development", isRead: false, priority: "medium", createdAt: "2026-06-02T16:45:00Z", href: "/sales/receipts/3" },
  { id: 5, type: "installment_due", title: "Installment due soon", body: "Bright Solutions — Development ₹15,000 remaining", isRead: false, priority: "high", createdAt: "2026-06-10T09:00:00Z", href: "/sales/installments/2" },
  { id: 6, type: "receipt_generated", title: "Receipt generated", body: "RCT-2026-0043 for Bright Solutions", isRead: true, priority: "low", createdAt: "2026-06-02T16:46:00Z", href: "/sales/receipts/3" },
  { id: 7, type: "outstanding_reminder", title: "Outstanding reminder", body: "Agrolink Go-live — ₹4,50,000 overdue", isRead: false, priority: "high", createdAt: "2026-05-22T09:00:00Z", href: "/sales/installments/6" },
];

export const mockPayments: PaymentRecord[] = [
  { id: 1, invoiceNumber: "INV-2026-0126", customerName: "Agrolink Manufacturing", amount: 450000, dueDate: "2026-05-10", status: "overdue" },
  { id: 2, invoiceNumber: "INV-2026-0125", customerName: "Nidhi Info Tech", amount: 125000, dueDate: "2026-05-28", status: "unpaid" },
  { id: 3, invoiceNumber: "INV-2026-0120", customerName: "Bright Solutions", amount: 530000, dueDate: "2026-05-15", status: "paid" },
];

export const dashboardKpis = {
  totalLeads: 6686,
  customers: 568,
  proposals: 245,
  invoices: 326,
  payments: 1265000,
  dueAmount: 238500,
  interestedLeads: 1250,
  proposalsSent: 245,
  dealsWon: 568,
  revenueGenerated: 1265000,
  pendingPayments: 238500,
  activeFollowUps: 28,
  pendingInvoices: 200,
  proposalAcceptanceRate: 36.3,
  proposalRejectionRate: 14.2,
  leadPeriods: { today: 42, week: 312, month: 6686 },
  trends: {
    totalLeads: 12.5,
    customers: 8.2,
    proposals: 15.7,
    invoices: 10.3,
    payments: 18.6,
    dueAmount: -6.1,
    interested: 8.2,
    dealsWon: 10.3,
    revenue: 18.6,
    pending: -6.1,
    activeFollowUps: 8.4,
    pendingInvoices: -4.2,
  },
};

export const mockProducts = [
  { id: 1, name: "CRM Implementation", category: "Services", price: 450000, taxPercent: 18, status: "active" as const, description: "End-to-end CRM setup and onboarding" },
  { id: 2, name: "Website Development", category: "Services", price: 280000, taxPercent: 18, status: "active" as const, description: "Responsive corporate website" },
  { id: 3, name: "Annual Support Plan", category: "Support", price: 120000, taxPercent: 18, status: "active" as const, description: "12-month priority support" },
  { id: 4, name: "SEO Package", category: "Marketing", price: 85000, taxPercent: 18, status: "active" as const },
  { id: 5, name: "Legacy Migration", category: "Services", price: 650000, taxPercent: 18, status: "inactive" as const },
];

export const leadsDashboardKpis = {
  total: 6686,
  new: 1245,
  contacted: 2156,
  qualified: 1250,
  converted: 568,
  conversionRate: 8.5,
  trends: { total: 12.5, new: 18.7, contacted: 10.3, qualified: 14.2, converted: 16.8, conversion: 1.2 },
};

export const customerDashboardKpis = {
  total: 568,
  new: 48,
  active: 412,
  inactive: 76,
  totalSalesMtd: 2475600,
  outstanding: 836450,
  trends: { total: 8.2, new: 12.7, active: 72.5, inactive: -5.4, sales: 18.9, outstanding: -6.3 },
};

export const salesOverviewMay = [
  { day: "1 May", invoices: 420000, payments: 380000 },
  { day: "5 May", invoices: 510000, payments: 445000 },
  { day: "10 May", invoices: 480000, payments: 520000 },
  { day: "15 May", invoices: 620000, payments: 580000 },
  { day: "20 May", invoices: 550000, payments: 610000 },
  { day: "25 May", invoices: 680000, payments: 640000 },
  { day: "31 May", invoices: 720000, payments: 690000 },
];

export const invoiceStatusBreakdown = [
  { name: "Paid", count: 345, value: 105.8 },
  { name: "Overdue", count: 24, value: 7.36 },
  { name: "Unpaid", count: 145, value: 44.48 },
  { name: "Partial", count: 55, value: 16.87 },
];

export const topCustomersBySales = [
  { rank: 1, name: "Agrolink Manufacturing Pvt. Ltd.", amount: 2450000 },
  { rank: 2, name: "Nidhi Info Tech", amount: 1200000 },
  { rank: 3, name: "Bright Solutions", amount: 680000 },
  { rank: 4, name: "Metro Retail Group", amount: 320000 },
  { rank: 5, name: "CloudNine Hospitality", amount: 180000 },
];

export const leadsByAssignedTo = salesExecutives.map((e) => ({
  executive: e,
  count: Math.round(6686 * (e.id === 1 ? 0.367 : e.id === 2 ? 0.237 : e.id === 3 ? 0.198 : 0.198)),
  pct: e.id === 1 ? 36.7 : e.id === 2 ? 23.7 : e.id === 3 ? 19.8 : 19.8,
}));

export const leadsTrendDaily = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1),
  count: 180 + Math.round(Math.sin(i / 4) * 40) + (i % 7) * 8,
}));

export const customersByStatus = [
  { name: "Active", count: 412, value: 72.5 },
  { name: "Inactive", count: 76, value: 13.4 },
  { name: "Prospect", count: 48, value: 8.5 },
  { name: "Lost", count: 32, value: 5.6 },
];

export const customersByType = [
  { name: "Corporate", count: 231, value: 40.7 },
  { name: "SME", count: 218, value: 38.4 },
  { name: "Individual", count: 84, value: 14.8 },
  { name: "Other", count: 35, value: 6.1 },
];

export const newCustomersTrend = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1),
  count: 28 + Math.round(Math.cos(i / 5) * 12) + (i > 20 ? 6 : 0),
}));

export { mockSalesInvoices as mockInvoices } from "./billing-mock-data";
export {
  mockInstallments,
  mockPartialPayments,
  mockReceipts,
  mockCustomerProjects,
  mockFinancialTimeline,
  getInstallmentById,
  getInvoiceById,
  getReceiptById,
  getProjectById,
  getInstallmentsByProject,
  getPartialPaymentsByInstallment,
  getInstallmentsByCustomer,
  getInvoicesByCustomer,
  getTimelineByCustomer,
} from "./billing-mock-data";

export const mockPaymentRecords = [
  { id: 1, invoice: "INV-2026-0325", customer: "Bright Solutions", amount: 30000, mode: "Bank transfer", date: "2026-05-20", status: "completed" as const, installmentName: "Advance", receiptId: 1, receiptNumber: "RCT-2026-0041" },
  { id: 2, invoice: "INV-2026-0327", customer: "Bright Solutions", amount: 10000, mode: "UPI", date: "2026-05-28", status: "partial" as const, installmentName: "Development", receiptId: 2, receiptNumber: "RCT-2026-0042" },
  { id: 3, invoice: "INV-2026-0327", customer: "Bright Solutions", amount: 15000, mode: "Bank transfer", date: "2026-06-02", status: "partial" as const, installmentName: "Development", receiptId: 3, receiptNumber: "RCT-2026-0043" },
  { id: 4, invoice: "INV-2026-0324", customer: "Nidhi Info Tech", amount: 62500, mode: "UPI", date: "2026-05-22", status: "partial" as const },
  { id: 5, invoice: "INV-2026-0120", customer: "Agrolink Manufacturing", amount: 450000, mode: "NEFT", date: "2026-05-08", status: "completed" as const, installmentName: "Advance (40%)" },
];

export const revenueTrend = [
  { month: "Jan", revenue: 820000, invoices: 18 },
  { month: "Feb", revenue: 950000, invoices: 22 },
  { month: "Mar", revenue: 1100000, invoices: 26 },
  { month: "Apr", revenue: 980000, invoices: 24 },
  { month: "May", revenue: 1265000, invoices: 32 },
];

export const leadFunnel = [
  { stage: "Leads", count: 6686 },
  { stage: "Qualified", count: 1250 },
  { stage: "Proposal Sent", count: 245 },
  { stage: "Invoice Generated", count: 126 },
  { stage: "Payment Received", count: 89 },
];

export const leadsBySource = [
  { name: "Website", value: 33.8, count: 2260 },
  { name: "Instagram", value: 23.5, count: 1571 },
  { name: "Referral", value: 16.9, count: 1130 },
  { name: "Facebook", value: 12.8, count: 856 },
  { name: "Others", value: 13.0, count: 869 },
];

export const leadsByStatus = [
  { name: "New", value: 18.6, count: 1244 },
  { name: "Contacted", value: 32.3, count: 2160 },
  { name: "Qualified", value: 18.7, count: 1250 },
  { name: "Proposal Sent", value: 16.4, count: 1096 },
  { name: "Converted", value: 8.5, count: 568 },
  { name: "Lost", value: 5.5, count: 368 },
];

export function getLeadById(id: number): Lead | undefined {
  return mockLeads.find((l) => l.id === id);
}

export function getProposalById(id: number): Proposal | undefined {
  return mockProposals.find((p) => p.id === id);
}

export function getCustomerById(id: number): Customer | undefined {
  return mockCustomers.find((c) => c.id === id);
}

export function calcProposalTotal(proposal: Proposal): { subtotal: number; tax: number; total: number } {
  let subtotal = 0;
  let tax = 0;
  for (const item of proposal.items) {
    const line = item.quantity * item.unitPrice;
    subtotal += line;
    tax += line * (item.taxPercent / 100);
  }
  const discountAmt = subtotal * (proposal.discount / 100);
  subtotal -= discountAmt;
  tax = tax * (1 - proposal.discount / 100);
  return { subtotal, tax, total: subtotal + tax };
}
