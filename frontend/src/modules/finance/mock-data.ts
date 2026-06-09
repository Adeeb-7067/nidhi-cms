import type {
  Budget,
  Expense,
  FinanceClient,
  FinanceEmployee,
  FinanceInvoice,
  FinancePaymentRecord,
  FinanceProject,
  FinanceTransaction,
  FinanceVendor,
  Income,
  LedgerAccount,
  LedgerEntry,
  PayrollRun,
  PayrollSlip,
  SalaryStructure,
  TaxSummary,
} from "./types";

export const financeClients: FinanceClient[] = [
  { id: 1, name: "Zomato Ltd.", gstin: "07AAACZ4322M1Z5", city: "Gurugram" },
  { id: 2, name: "Paytm Payments Bank", gstin: "09AABCP1234A1Z2", city: "Noida" },
  { id: 3, name: "Nykaa E-Retail Pvt. Ltd.", gstin: "27AAACN1234B1Z3", city: "Mumbai" },
  { id: 4, name: "Swiggy (Bundl Technologies)", gstin: "29AABCB5678C1Z4", city: "Bengaluru" },
  { id: 5, name: "Razorpay Software Pvt. Ltd.", gstin: "29AABCR9012D1Z5", city: "Bengaluru" },
  { id: 6, name: "Freshworks Inc. (India)", gstin: "33AABCF3456E1Z6", city: "Chennai" },
  { id: 7, name: "Meesho (Fashnear Technologies)", gstin: "29AABCM7890F1Z7", city: "Bengaluru" },
  { id: 8, name: "Ola Electric Mobility", gstin: "29AABCO2345G1Z8", city: "Bengaluru" },
];

export const financeVendors: FinanceVendor[] = [
  { id: 1, name: "Amazon Web Services India", gstin: "29AAACA1234A1Z1", category: "Cloud" },
  { id: 2, name: "GoDaddy India", gstin: "27AABCG5678B1Z2", category: "Domains" },
  { id: 3, name: "Tally Solutions Pvt. Ltd.", gstin: "29AABCT9012C1Z3", category: "Software" },
  { id: 4, name: "WeWork India", gstin: "27AABCW3456D1Z4", category: "Office" },
  { id: 5, name: "Google India Pvt. Ltd.", gstin: "29AABCG7890E1Z5", category: "Software" },
  { id: 6, name: "Reliance Jio Infocomm", gstin: "27AABCR2345F1Z6", category: "Telecom" },
  { id: 7, name: "HP India Sales Pvt. Ltd.", gstin: "27AABCH6789G1Z7", category: "Hardware" },
  { id: 8, name: "Cleartax (Defmacro Software)", gstin: "29AABCD0123H1Z8", category: "Professional" },
];

export const financeEmployees: FinanceEmployee[] = [
  { id: 1, name: "Alice Developer", employeeId: "AL001", department: "Engineering" },
  { id: 2, name: "Bob Developer", employeeId: "BO002", department: "Engineering" },
  { id: 3, name: "David Tester", employeeId: "DA003", department: "QA" },
  { id: 4, name: "Priya Sharma", employeeId: "PR004", department: "Design" },
  { id: 5, name: "Rahul Mehta", employeeId: "RA005", department: "Engineering" },
  { id: 6, name: "Sneha Patel", employeeId: "SN006", department: "HR" },
  { id: 7, name: "Vikram Singh", employeeId: "VI007", department: "Sales" },
  { id: 8, name: "Ananya Reddy", employeeId: "AN008", department: "Finance" },
];

export const financeProjects: FinanceProject[] = [
  { id: 1, name: "Zomato Partner App v3", clientId: 1, clientName: "Zomato Ltd." },
  { id: 2, name: "Paytm Merchant Dashboard", clientId: 2, clientName: "Paytm Payments Bank" },
  { id: 3, name: "Nykaa Beauty AR Module", clientId: 3, clientName: "Nykaa E-Retail Pvt. Ltd." },
  { id: 4, name: "Swiggy Instamart Analytics", clientId: 4, clientName: "Swiggy (Bundl Technologies)" },
  { id: 5, name: "Razorpay Checkout SDK", clientId: 5, clientName: "Razorpay Software Pvt. Ltd." },
  { id: 6, name: "Freshworks CRM Integration", clientId: 6, clientName: "Freshworks Inc. (India)" },
  { id: 7, name: "Meesho Seller Portal", clientId: 7, clientName: "Meesho (Fashnear Technologies)" },
  { id: 8, name: "Ola EV Fleet Tracker", clientId: 8, clientName: "Ola Electric Mobility" },
];

export const mockExpenses: Expense[] = [
  { id: 1, date: "2026-06-01", category: "software", amount: 42500, paymentMode: "card", projectId: 1, projectName: "Zomato Partner App v3", vendorId: 1, vendorName: "Amazon Web Services India", notes: "AWS monthly bill — production", status: "approved", hasAttachment: true, reference: "EXP-2026-0601" },
  { id: 2, date: "2026-06-02", category: "travel", amount: 12800, paymentMode: "upi", projectId: 2, projectName: "Paytm Merchant Dashboard", employeeId: 1, employeeName: "Alice Developer", notes: "Client site visit — Noida", status: "approved", hasAttachment: true, reference: "EXP-2026-0602" },
  { id: 3, date: "2026-06-03", category: "office", amount: 8500, paymentMode: "bank_transfer", vendorId: 4, vendorName: "WeWork India", notes: "Co-working space — June", status: "approved", hasAttachment: false, reference: "EXP-2026-0603" },
  { id: 4, date: "2026-06-04", category: "hardware", amount: 68900, paymentMode: "neft", projectId: 5, projectName: "Razorpay Checkout SDK", vendorId: 7, vendorName: "HP India Sales Pvt. Ltd.", notes: "MacBook for new developer", status: "pending", hasAttachment: true, reference: "EXP-2026-0604" },
  { id: 5, date: "2026-06-04", category: "marketing", amount: 25000, paymentMode: "upi", notes: "LinkedIn ads — Q2 campaign", status: "pending", hasAttachment: false, reference: "EXP-2026-0605" },
  { id: 6, date: "2026-05-28", category: "software", amount: 18900, paymentMode: "card", vendorId: 5, vendorName: "Google India Pvt. Ltd.", notes: "Google Workspace — 15 seats", status: "approved", hasAttachment: true, reference: "EXP-2026-0528" },
  { id: 7, date: "2026-05-27", category: "utilities", amount: 4200, paymentMode: "upi", vendorId: 6, vendorName: "Reliance Jio Infocomm", notes: "Office internet — May", status: "approved", hasAttachment: false, reference: "EXP-2026-0527" },
  { id: 8, date: "2026-05-25", category: "professional", amount: 15000, paymentMode: "bank_transfer", vendorId: 8, vendorName: "Cleartax (Defmacro Software)", notes: "GST filing — May", status: "approved", hasAttachment: true, reference: "EXP-2026-0525" },
  { id: 9, date: "2026-05-22", category: "travel", amount: 18500, paymentMode: "cash", projectId: 3, projectName: "Nykaa Beauty AR Module", employeeId: 4, employeeName: "Priya Sharma", notes: "Mumbai client workshop", status: "approved", hasAttachment: true, reference: "EXP-2026-0522" },
  { id: 10, date: "2026-05-20", category: "software", amount: 3200, paymentMode: "card", vendorId: 2, vendorName: "GoDaddy India", notes: "Domain renewals — 8 domains", status: "approved", hasAttachment: false, reference: "EXP-2026-0520" },
  { id: 11, date: "2026-05-18", category: "office", amount: 5600, paymentMode: "cash", notes: "Office supplies & pantry", status: "rejected", hasAttachment: false, reference: "EXP-2026-0518" },
  { id: 12, date: "2026-05-15", category: "hardware", amount: 24500, paymentMode: "neft", projectId: 7, projectName: "Meesho Seller Portal", vendorId: 7, vendorName: "HP India Sales Pvt. Ltd.", notes: "Test devices — Android fleet", status: "approved", hasAttachment: true, reference: "EXP-2026-0515" },
  { id: 13, date: "2026-05-12", category: "marketing", amount: 35000, paymentMode: "bank_transfer", notes: "Tech conference sponsorship", status: "approved", hasAttachment: true, reference: "EXP-2026-0512" },
  { id: 14, date: "2026-05-10", category: "travel", amount: 9200, paymentMode: "upi", employeeId: 2, employeeName: "Bob Developer", notes: "Bengaluru client meeting", status: "pending", hasAttachment: true, reference: "EXP-2026-0510" },
  { id: 15, date: "2026-05-08", category: "software", amount: 56000, paymentMode: "neft", vendorId: 3, vendorName: "Tally Solutions Pvt. Ltd.", notes: "Tally Prime — annual license", status: "approved", hasAttachment: true, reference: "EXP-2026-0508" },
  { id: 16, date: "2026-05-05", category: "misc", amount: 3500, paymentMode: "cash", notes: "Courier & logistics", status: "approved", hasAttachment: false, reference: "EXP-2026-0505" },
  { id: 17, date: "2026-05-03", category: "professional", amount: 45000, paymentMode: "bank_transfer", notes: "Legal retainer — contract review", status: "approved", hasAttachment: true, reference: "EXP-2026-0503" },
  { id: 18, date: "2026-05-01", category: "salary", amount: 485000, paymentMode: "neft", notes: "May payroll — 8 employees", status: "approved", hasAttachment: false, reference: "EXP-2026-0501" },
  { id: 19, date: "2026-04-28", category: "office", amount: 12000, paymentMode: "bank_transfer", vendorId: 4, vendorName: "WeWork India", notes: "Meeting room credits", status: "approved", hasAttachment: false, reference: "EXP-2026-0428" },
  { id: 20, date: "2026-04-25", category: "software", amount: 78000, paymentMode: "card", vendorId: 1, vendorName: "Amazon Web Services India", notes: "AWS — April production", status: "approved", hasAttachment: true, reference: "EXP-2026-0425" },
  { id: 21, date: "2026-04-22", category: "travel", amount: 15600, paymentMode: "upi", projectId: 8, projectName: "Ola EV Fleet Tracker", employeeId: 5, employeeName: "Rahul Mehta", notes: "Ola HQ visit — Bengaluru", status: "approved", hasAttachment: true, reference: "EXP-2026-0422" },
  { id: 22, date: "2026-04-20", category: "marketing", amount: 18000, paymentMode: "card", notes: "Google Ads — lead gen", status: "pending", hasAttachment: false, reference: "EXP-2026-0420" },
  { id: 23, date: "2026-04-18", category: "utilities", amount: 3800, paymentMode: "upi", vendorId: 6, vendorName: "Reliance Jio Infocomm", notes: "Office internet — April", status: "approved", hasAttachment: false, reference: "EXP-2026-0418" },
  { id: 24, date: "2026-04-15", category: "hardware", amount: 52000, paymentMode: "neft", notes: "Server upgrade — staging", status: "rejected", hasAttachment: true, reference: "EXP-2026-0415" },
  { id: 25, date: "2026-04-10", category: "professional", amount: 22000, paymentMode: "bank_transfer", vendorId: 8, vendorName: "Cleartax (Defmacro Software)", notes: "Annual audit prep", status: "approved", hasAttachment: true, reference: "EXP-2026-0410" },
];

export const mockIncome: Income[] = [
  { id: 1, date: "2026-06-03", clientId: 1, clientName: "Zomato Ltd.", projectId: 1, projectName: "Zomato Partner App v3", amount: 350000, paymentMode: "neft", status: "received", reference: "INC-2026-0601", invoiceId: 1 },
  { id: 2, date: "2026-06-01", clientId: 5, clientName: "Razorpay Software Pvt. Ltd.", projectId: 5, projectName: "Razorpay Checkout SDK", amount: 280000, paymentMode: "bank_transfer", status: "received", reference: "INC-2026-0602", invoiceId: 5 },
  { id: 3, date: "2026-05-28", clientId: 3, clientName: "Nykaa E-Retail Pvt. Ltd.", projectId: 3, projectName: "Nykaa Beauty AR Module", amount: 420000, paymentMode: "neft", status: "received", reference: "INC-2026-0528", invoiceId: 3 },
  { id: 4, date: "2026-05-25", clientId: 2, clientName: "Paytm Payments Bank", projectId: 2, projectName: "Paytm Merchant Dashboard", amount: 150000, paymentMode: "upi", status: "partial", reference: "INC-2026-0525", invoiceId: 2 },
  { id: 5, date: "2026-05-20", clientId: 4, clientName: "Swiggy (Bundl Technologies)", projectId: 4, projectName: "Swiggy Instamart Analytics", amount: 310000, paymentMode: "neft", status: "received", reference: "INC-2026-0520", invoiceId: 4 },
  { id: 6, date: "2026-05-15", clientId: 6, clientName: "Freshworks Inc. (India)", projectId: 6, projectName: "Freshworks CRM Integration", amount: 195000, paymentMode: "bank_transfer", status: "received", reference: "INC-2026-0515", invoiceId: 6 },
  { id: 7, date: "2026-05-10", clientId: 7, clientName: "Meesho (Fashnear Technologies)", projectId: 7, projectName: "Meesho Seller Portal", amount: 225000, paymentMode: "neft", status: "pending", reference: "INC-2026-0510", invoiceId: 7 },
  { id: 8, date: "2026-05-05", clientId: 8, clientName: "Ola Electric Mobility", projectId: 8, projectName: "Ola EV Fleet Tracker", amount: 380000, paymentMode: "neft", status: "received", reference: "INC-2026-0505", invoiceId: 8 },
  { id: 9, date: "2026-04-28", clientId: 1, clientName: "Zomato Ltd.", projectId: 1, projectName: "Zomato Partner App v3", amount: 350000, paymentMode: "neft", status: "received", reference: "INC-2026-0428" },
  { id: 10, date: "2026-04-22", clientId: 5, clientName: "Razorpay Software Pvt. Ltd.", amount: 140000, paymentMode: "bank_transfer", status: "received", reference: "INC-2026-0422" },
  { id: 11, date: "2026-04-18", clientId: 3, clientName: "Nykaa E-Retail Pvt. Ltd.", amount: 210000, paymentMode: "neft", status: "received", reference: "INC-2026-0418" },
  { id: 12, date: "2026-04-12", clientId: 2, clientName: "Paytm Payments Bank", amount: 200000, paymentMode: "neft", status: "received", reference: "INC-2026-0412" },
  { id: 13, date: "2026-04-08", clientId: 4, clientName: "Swiggy (Bundl Technologies)", amount: 155000, paymentMode: "upi", status: "partial", reference: "INC-2026-0408" },
  { id: 14, date: "2026-04-05", clientId: 6, clientName: "Freshworks Inc. (India)", amount: 98000, paymentMode: "bank_transfer", status: "received", reference: "INC-2026-0405" },
  { id: 15, date: "2026-04-01", clientId: 7, clientName: "Meesho (Fashnear Technologies)", amount: 112500, paymentMode: "neft", status: "pending", reference: "INC-2026-0401" },
];

const defaultItems = (desc: string, qty: number, rate: number) => [
  { id: "1", description: desc, quantity: qty, rate, taxPercent: 18 },
];

export const mockFinanceInvoices: FinanceInvoice[] = [
  { id: 1, number: "FIN-INV-2026-0142", clientId: 1, clientName: "Zomato Ltd.", projectId: 1, projectName: "Zomato Partner App v3", issueDate: "2026-05-01", dueDate: "2026-06-01", status: "paid", items: defaultItems("Milestone 2 — Partner onboarding module", 1, 350000), discount: 0, gstEnabled: true, paidAmount: 413000, notes: "Includes 18% GST", paymentHistory: [{ id: 101, date: "2026-06-03", amount: 413000, mode: "neft", reference: "NEFT-ZOM-8834", direction: "incoming", partyName: "Zomato Ltd.", invoiceNumber: "FIN-INV-2026-0142", status: "completed" }], creditNotes: [] },
  { id: 2, number: "FIN-INV-2026-0138", clientId: 2, clientName: "Paytm Payments Bank", projectId: 2, projectName: "Paytm Merchant Dashboard", issueDate: "2026-05-10", dueDate: "2026-06-10", status: "partially_paid", items: defaultItems("Sprint 4 — Dashboard analytics", 1, 450000), discount: 10000, gstEnabled: true, paidAmount: 150000, notes: "Partial advance received", paymentHistory: [{ id: 102, date: "2026-05-25", amount: 150000, mode: "upi", reference: "UPI-PTM-4421", direction: "incoming", partyName: "Paytm Payments Bank", invoiceNumber: "FIN-INV-2026-0138", status: "completed" }], creditNotes: [] },
  { id: 3, number: "FIN-INV-2026-0135", clientId: 3, clientName: "Nykaa E-Retail Pvt. Ltd.", projectId: 3, projectName: "Nykaa Beauty AR Module", issueDate: "2026-05-05", dueDate: "2026-06-05", status: "paid", items: defaultItems("AR try-on MVP delivery", 1, 420000), discount: 0, gstEnabled: true, paidAmount: 495600, paymentHistory: [{ id: 103, date: "2026-05-28", amount: 495600, mode: "neft", reference: "NEFT-NYK-7721", direction: "incoming", partyName: "Nykaa E-Retail Pvt. Ltd.", invoiceNumber: "FIN-INV-2026-0135", status: "completed" }], creditNotes: [] },
  { id: 4, number: "FIN-INV-2026-0131", clientId: 4, clientName: "Swiggy (Bundl Technologies)", projectId: 4, projectName: "Swiggy Instamart Analytics", issueDate: "2026-04-20", dueDate: "2026-05-20", status: "paid", items: defaultItems("Analytics dashboard — Phase 1", 1, 310000), discount: 0, gstEnabled: true, paidAmount: 365800, paymentHistory: [{ id: 104, date: "2026-05-20", amount: 365800, mode: "neft", reference: "NEFT-SWG-3312", direction: "incoming", partyName: "Swiggy (Bundl Technologies)", invoiceNumber: "FIN-INV-2026-0131", status: "completed" }], creditNotes: [] },
  { id: 5, number: "FIN-INV-2026-0128", clientId: 5, clientName: "Razorpay Software Pvt. Ltd.", projectId: 5, projectName: "Razorpay Checkout SDK", issueDate: "2026-05-15", dueDate: "2026-06-15", status: "paid", items: defaultItems("SDK integration — iOS & Android", 1, 280000), discount: 5000, gstEnabled: true, paidAmount: 324500, paymentHistory: [{ id: 105, date: "2026-06-01", amount: 324500, mode: "bank_transfer", reference: "TXN-RZP-9901", direction: "incoming", partyName: "Razorpay Software Pvt. Ltd.", invoiceNumber: "FIN-INV-2026-0128", status: "completed" }], creditNotes: [] },
  { id: 6, number: "FIN-INV-2026-0124", clientId: 6, clientName: "Freshworks Inc. (India)", projectId: 6, projectName: "Freshworks CRM Integration", issueDate: "2026-05-01", dueDate: "2026-06-01", status: "paid", items: defaultItems("CRM sync module", 1, 195000), discount: 0, gstEnabled: true, paidAmount: 230100, paymentHistory: [{ id: 106, date: "2026-05-15", amount: 230100, mode: "bank_transfer", reference: "TXN-FRW-5512", direction: "incoming", partyName: "Freshworks Inc. (India)", invoiceNumber: "FIN-INV-2026-0124", status: "completed" }], creditNotes: [] },
  { id: 7, number: "FIN-INV-2026-0120", clientId: 7, clientName: "Meesho (Fashnear Technologies)", projectId: 7, projectName: "Meesho Seller Portal", issueDate: "2026-05-08", dueDate: "2026-06-08", status: "unpaid", items: defaultItems("Seller portal — Sprint 3", 1, 225000), discount: 0, gstEnabled: true, paidAmount: 0, notes: "Awaiting client approval", paymentHistory: [], creditNotes: [] },
  { id: 8, number: "FIN-INV-2026-0116", clientId: 8, clientName: "Ola Electric Mobility", projectId: 8, projectName: "Ola EV Fleet Tracker", issueDate: "2026-04-25", dueDate: "2026-05-25", status: "paid", items: defaultItems("Fleet tracker MVP", 1, 380000), discount: 0, gstEnabled: true, paidAmount: 448400, paymentHistory: [{ id: 107, date: "2026-05-05", amount: 448400, mode: "neft", reference: "NEFT-OLA-2201", direction: "incoming", partyName: "Ola Electric Mobility", invoiceNumber: "FIN-INV-2026-0116", status: "completed" }], creditNotes: [] },
  { id: 9, number: "FIN-INV-2026-0112", clientId: 1, clientName: "Zomato Ltd.", projectId: 1, projectName: "Zomato Partner App v3", issueDate: "2026-04-01", dueDate: "2026-05-01", status: "overdue", items: defaultItems("Milestone 1 — Core app shell", 1, 350000), discount: 0, gstEnabled: true, paidAmount: 0, notes: "Follow up with accounts team", paymentHistory: [], creditNotes: [{ id: "CN-001", date: "2026-05-15", amount: 25000, reason: "Scope reduction credit" }] },
  { id: 10, number: "FIN-INV-2026-0108", clientId: 4, clientName: "Swiggy (Bundl Technologies)", issueDate: "2026-03-15", dueDate: "2026-04-15", status: "overdue", items: defaultItems("Discovery phase retainer", 1, 180000), discount: 0, gstEnabled: true, paidAmount: 90000, paymentHistory: [{ id: 108, date: "2026-04-08", amount: 90000, mode: "upi", reference: "UPI-SWG-1102", direction: "incoming", partyName: "Swiggy (Bundl Technologies)", invoiceNumber: "FIN-INV-2026-0108", status: "completed" }], creditNotes: [] },
  { id: 11, number: "FIN-INV-2026-0104", clientId: 2, clientName: "Paytm Payments Bank", issueDate: "2026-03-01", dueDate: "2026-04-01", status: "overdue", items: defaultItems("Q1 maintenance retainer", 1, 120000), discount: 0, gstEnabled: false, paidAmount: 0, paymentHistory: [], creditNotes: [] },
  { id: 12, number: "FIN-INV-2026-0100", clientId: 6, clientName: "Freshworks Inc. (India)", issueDate: "2026-02-20", dueDate: "2026-03-20", status: "partially_paid", items: defaultItems("API integration support", 1, 98000), discount: 0, gstEnabled: true, paidAmount: 49000, paymentHistory: [{ id: 109, date: "2026-04-05", amount: 49000, mode: "bank_transfer", reference: "TXN-FRW-3301", direction: "incoming", partyName: "Freshworks Inc. (India)", invoiceNumber: "FIN-INV-2026-0100", status: "completed" }], creditNotes: [] },
];

export const mockSalaryStructures: SalaryStructure[] = financeEmployees.map((e, i) => {
  const basic = 35000 + i * 8000;
  const hra = Math.round(basic * 0.4);
  const specialAllowance = 12000 + i * 2000;
  const pf = Math.round(basic * 0.12);
  const professionalTax = 200;
  const gross = basic + hra + specialAllowance;
  const net = gross - pf - professionalTax;
  return { id: i + 1, employeeId: e.id, employeeName: e.name, department: e.department, basic, hra, specialAllowance, pf, professionalTax, gross, net };
});

export const mockPayrollRuns: PayrollRun[] = [
  { id: 1, month: "May", year: 2026, status: "paid", employeeCount: 8, totalGross: 624000, totalDeductions: 62400, totalNet: 561600, bonusTotal: 40000, processedAt: "2026-05-01T10:00:00Z" },
  { id: 2, month: "April", year: 2026, status: "paid", employeeCount: 8, totalGross: 624000, totalDeductions: 62400, totalNet: 561600, bonusTotal: 0, processedAt: "2026-04-01T10:00:00Z" },
  { id: 3, month: "June", year: 2026, status: "draft", employeeCount: 8, totalGross: 624000, totalDeductions: 62400, totalNet: 561600, bonusTotal: 25000 },
];

export const mockPayrollSlips: PayrollSlip[] = mockSalaryStructures.map((s, i) => ({
  id: i + 1,
  payrollRunId: 1,
  employeeId: s.employeeId,
  employeeName: s.employeeName,
  month: "May",
  year: 2026,
  basic: s.basic,
  hra: s.hra,
  specialAllowance: s.specialAllowance,
  bonus: i === 0 ? 15000 : i === 4 ? 10000 : i === 7 ? 15000 : 0,
  pf: s.pf,
  professionalTax: s.professionalTax,
  tds: i > 4 ? 5000 : 0,
  gross: s.gross + (i === 0 ? 15000 : i === 4 ? 10000 : i === 7 ? 15000 : 0),
  net: s.net + (i === 0 ? 15000 : i === 4 ? 10000 : i === 7 ? 15000 : 0) - (i > 4 ? 5000 : 0),
}));

export const mockBudgets: Budget[] = [
  { id: 1, name: "FY 2026-27 — Operations", type: "annual", fiscalYear: "2026-27", allocated: 2400000, spent: 1923400, status: "warning", department: "Operations" },
  { id: 2, name: "FY 2026-27 — Engineering", type: "annual", fiscalYear: "2026-27", allocated: 1800000, spent: 1245000, status: "on_track", department: "Engineering" },
  { id: 3, name: "FY 2026-27 — Marketing", type: "annual", fiscalYear: "2026-27", allocated: 600000, spent: 485000, status: "warning", department: "Marketing" },
  { id: 4, name: "Zomato Partner App v3", type: "project", projectId: 1, projectName: "Zomato Partner App v3", fiscalYear: "2026-27", allocated: 450000, spent: 312000, status: "on_track" },
  { id: 5, name: "Paytm Merchant Dashboard", type: "project", projectId: 2, projectName: "Paytm Merchant Dashboard", fiscalYear: "2026-27", allocated: 380000, spent: 298000, status: "warning" },
  { id: 6, name: "Nykaa Beauty AR Module", type: "project", projectId: 3, projectName: "Nykaa Beauty AR Module", fiscalYear: "2026-27", allocated: 520000, spent: 534000, status: "exceeded" },
  { id: 7, name: "Razorpay Checkout SDK", type: "project", projectId: 5, projectName: "Razorpay Checkout SDK", fiscalYear: "2026-27", allocated: 320000, spent: 189000, status: "on_track" },
  { id: 8, name: "FY 2026-27 — HR & Admin", type: "annual", fiscalYear: "2026-27", allocated: 400000, spent: 156000, status: "on_track", department: "HR" },
];

export const mockPayments: FinancePaymentRecord[] = [
  ...mockFinanceInvoices.flatMap((inv) => inv.paymentHistory),
  { id: 201, date: "2026-06-02", amount: 42500, mode: "card", reference: "AWS-JUN-2026", direction: "outgoing", partyName: "Amazon Web Services India", status: "completed" },
  { id: 202, date: "2026-06-01", amount: 561600, mode: "neft", reference: "PAYROLL-MAY-2026", direction: "outgoing", partyName: "Employee Payroll", status: "completed" },
  { id: 203, date: "2026-05-28", amount: 8500, mode: "bank_transfer", reference: "WEWORK-JUN", direction: "outgoing", partyName: "WeWork India", status: "completed" },
  { id: 204, date: "2026-05-25", amount: 15000, mode: "bank_transfer", reference: "CLEARTAX-MAY", direction: "outgoing", partyName: "Cleartax (Defmacro Software)", status: "completed" },
];

export const mockTaxSummaries: TaxSummary[] = [
  { period: "June 2026", periodType: "monthly", gstCollected: 84240, gstPaid: 32400, netGst: 51840, tdsDeducted: 12000, tdsDeposited: 12000 },
  { period: "May 2026", periodType: "monthly", gstCollected: 156800, gstPaid: 48900, netGst: 107900, tdsDeducted: 28000, tdsDeposited: 28000 },
  { period: "Apr–Jun 2026", periodType: "quarterly", gstCollected: 412500, gstPaid: 128400, netGst: 284100, tdsDeducted: 72000, tdsDeposited: 68000 },
  { period: "FY 2025-26", periodType: "annual", gstCollected: 1485000, gstPaid: 462000, netGst: 1023000, tdsDeducted: 285000, tdsDeposited: 280000 },
];

export const mockRecentTransactions: FinanceTransaction[] = [
  { id: 1, date: "2026-06-03", type: "income", description: "Zomato — Milestone 2 payment", amount: 413000, party: "Zomato Ltd.", reference: "NEFT-ZOM-8834", href: "/finance/income" },
  { id: 2, date: "2026-06-02", type: "expense", description: "AWS production bill", amount: 42500, party: "Amazon Web Services India", reference: "EXP-2026-0601", href: "/finance/expenses" },
  { id: 3, date: "2026-06-01", type: "payment", description: "Razorpay SDK invoice payment", amount: 324500, party: "Razorpay Software Pvt. Ltd.", reference: "TXN-RZP-9901", href: "/finance/invoices/5" },
  { id: 4, date: "2026-06-01", type: "expense", description: "May payroll disbursement", amount: 561600, party: "Employee Payroll", reference: "PAYROLL-MAY-2026", href: "/finance/payroll" },
  { id: 5, date: "2026-05-28", type: "income", description: "Nykaa AR module payment", amount: 495600, party: "Nykaa E-Retail Pvt. Ltd.", reference: "NEFT-NYK-7721", href: "/finance/income" },
  { id: 6, date: "2026-05-25", type: "income", description: "Paytm partial advance", amount: 150000, party: "Paytm Payments Bank", reference: "UPI-PTM-4421", href: "/finance/income" },
  { id: 7, date: "2026-05-20", type: "expense", description: "Google Ads campaign", amount: 18000, party: "Google India Pvt. Ltd.", reference: "EXP-2026-0420", href: "/finance/expenses" },
  { id: 8, date: "2026-05-15", type: "expense", description: "GST filing — Cleartax", amount: 15000, party: "Cleartax", reference: "EXP-2026-0525", href: "/finance/expenses" },
];

function buildLedgerEntries(base: LedgerEntry[]): LedgerAccount["entries"] {
  let balance = base[0]?.balance ?? 0;
  return base.map((e, i) => {
    if (i === 0) return e;
    balance = e.balance;
    return e;
  });
}

export const mockLedgers: LedgerAccount[] = [
  {
    id: 1, name: "Zomato Ltd.", type: "client", openingBalance: 0, closingBalance: 438400,
    entries: buildLedgerEntries([
      { id: 1, date: "2026-04-01", description: "Invoice FIN-INV-2026-0112", debit: 413000, credit: 0, balance: 413000, reference: "FIN-INV-2026-0112", referenceHref: "/finance/invoices/9" },
      { id: 2, date: "2026-05-01", description: "Invoice FIN-INV-2026-0142", debit: 413000, credit: 0, balance: 826000, reference: "FIN-INV-2026-0142", referenceHref: "/finance/invoices/1" },
      { id: 3, date: "2026-06-03", description: "Payment received", debit: 0, credit: 413000, balance: 413000, reference: "NEFT-ZOM-8834" },
      { id: 4, date: "2026-06-05", description: "Credit note CN-001", debit: 0, credit: 25000, balance: 388000, reference: "CN-001" },
    ]),
  },
  {
    id: 2, name: "Amazon Web Services India", type: "vendor", openingBalance: 0, closingBalance: 120500,
    entries: buildLedgerEntries([
      { id: 5, date: "2026-04-25", description: "AWS April bill", debit: 0, credit: 78000, balance: 78000, reference: "EXP-2026-0425", referenceHref: "/finance/expenses/20" },
      { id: 6, date: "2026-06-01", description: "AWS June bill", debit: 0, credit: 42500, balance: 120500, reference: "EXP-2026-0601", referenceHref: "/finance/expenses/1" },
    ]),
  },
  {
    id: 3, name: "Operating Expenses", type: "expense", openingBalance: 0, closingBalance: 1923400,
    entries: buildLedgerEntries([
      { id: 7, date: "2026-05-01", description: "May payroll", debit: 485000, credit: 0, balance: 485000, reference: "EXP-2026-0501" },
      { id: 8, date: "2026-05-15", description: "Marketing spend", debit: 35000, credit: 0, balance: 520000, reference: "EXP-2026-0512" },
      { id: 9, date: "2026-06-01", description: "Misc June expenses", debit: 1403400, credit: 0, balance: 1923400, reference: "Various" },
    ]),
  },
  {
    id: 4, name: "HDFC Current A/C — 4521", type: "bank", openingBalance: 850000, closingBalance: 1245600,
    entries: buildLedgerEntries([
      { id: 10, date: "2026-06-01", description: "Opening balance", debit: 850000, credit: 0, balance: 850000, reference: "OB" },
      { id: 11, date: "2026-06-01", description: "Razorpay payment in", debit: 324500, credit: 0, balance: 1174500, reference: "TXN-RZP-9901" },
      { id: 12, date: "2026-06-02", description: "AWS payment out", debit: 0, credit: 42500, balance: 1132000, reference: "AWS-JUN-2026" },
      { id: 13, date: "2026-06-03", description: "Zomato payment in", debit: 413000, credit: 0, balance: 1545000, reference: "NEFT-ZOM-8834" },
      { id: 14, date: "2026-06-04", description: "Payroll out", debit: 0, credit: 299400, balance: 1245600, reference: "PAYROLL-JUN" },
    ]),
  },
];

export const invoiceAgingBuckets = [
  { bucket: "Current", count: 3, amount: 665500 },
  { bucket: "1–30 days", count: 2, amount: 318200 },
  { bucket: "31–60 days", count: 1, amount: 413000 },
  { bucket: "61–90 days", count: 1, amount: 122400 },
  { bucket: "90+ days", count: 1, amount: 120000 },
];

export function getFinanceInvoiceById(id: number): FinanceInvoice | undefined {
  return mockFinanceInvoices.find((i) => i.id === id);
}

export function getExpenseById(id: number): Expense | undefined {
  return mockExpenses.find((e) => e.id === id);
}

export function getLedgerById(id: number): LedgerAccount | undefined {
  return mockLedgers.find((l) => l.id === id);
}

export function getPayrollSlipByEmployee(employeeId: number): PayrollSlip | undefined {
  return mockPayrollSlips.find((s) => s.employeeId === employeeId);
}

export const upcomingPayments = [
  { id: 1, party: "WeWork India", amount: 8500, dueDate: "2026-06-08", type: "outgoing" as const },
  { id: 2, party: "Meesho — Invoice FIN-INV-2026-0120", amount: 265500, dueDate: "2026-06-08", type: "incoming" as const },
  { id: 3, party: "Paytm — Balance due", amount: 369000, dueDate: "2026-06-10", type: "incoming" as const },
  { id: 4, party: "Reliance Jio", amount: 4200, dueDate: "2026-06-12", type: "outgoing" as const },
  { id: 5, party: "Zomato — Overdue invoice", amount: 413000, dueDate: "2026-05-01", type: "incoming" as const },
];

export const incomeVsExpenseTrend = [
  { month: "Jan", income: 890000, expense: 620000 },
  { month: "Feb", income: 920000, expense: 645000 },
  { month: "Mar", income: 1050000, expense: 710000 },
  { month: "Apr", income: 1185000, expense: 798000 },
  { month: "May", income: 1325000, expense: 856000 },
  { month: "Jun", income: 737500, expense: 129000 },
];

export const revenueTrend = [
  { month: "Jan", revenue: 890000, growth: 8 },
  { month: "Feb", revenue: 920000, growth: 3.4 },
  { month: "Mar", revenue: 1050000, growth: 14.1 },
  { month: "Apr", revenue: 1185000, growth: 12.9 },
  { month: "May", revenue: 1325000, growth: 11.8 },
  { month: "Jun", revenue: 737500, growth: -44.3 },
];

export const projectProfitability = financeProjects.map((p, i) => ({
  project: p.name,
  revenue: [850000, 720000, 920000, 680000, 560000, 420000, 450000, 780000][i] ?? 500000,
  cost: [312000, 298000, 534000, 245000, 189000, 156000, 178000, 312000][i] ?? 200000,
}));

export const departmentProfitability = [
  { department: "Engineering", revenue: 3200000, cost: 2100000 },
  { department: "Design", revenue: 680000, cost: 420000 },
  { department: "QA", revenue: 450000, cost: 280000 },
  { department: "Sales", revenue: 890000, cost: 320000 },
];

export const pnlMonthly = [
  { month: "Jan", income: 890000, expenses: 620000, profit: 270000 },
  { month: "Feb", income: 920000, expenses: 645000, profit: 275000 },
  { month: "Mar", income: 1050000, expenses: 710000, profit: 340000 },
  { month: "Apr", income: 1185000, expenses: 798000, profit: 387000 },
  { month: "May", income: 1325000, expenses: 856000, profit: 469000 },
  { month: "Jun", income: 737500, expenses: 129000, profit: 608500 },
];

export const pnlYearly = [
  { year: "2023-24", income: 8200000, expenses: 6100000, profit: 2100000 },
  { year: "2024-25", income: 10500000, expenses: 7800000, profit: 2700000 },
  { year: "2025-26", income: 12800000, expenses: 9200000, profit: 3600000 },
  { year: "2026-27 YTD", income: 6105000, expenses: 3758000, profit: 2347000 },
];
