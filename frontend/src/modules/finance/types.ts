export type ExpenseStatus = "pending" | "approved" | "rejected";
export type ExpenseCategory =
  | "salary"
  | "software"
  | "hardware"
  | "travel"
  | "office"
  | "marketing"
  | "utilities"
  | "professional"
  | "misc";

export type PaymentMode = "bank_transfer" | "upi" | "cash" | "cheque" | "card" | "neft";

export type IncomeStatus = "received" | "pending" | "partial";

export type FinanceInvoiceStatus = "paid" | "partially_paid" | "unpaid" | "overdue";

export type PayrollStatus = "draft" | "processed" | "paid";

export type BudgetType = "annual" | "project";

export type BudgetStatus = "on_track" | "warning" | "exceeded";

export type LedgerType = "client" | "vendor" | "expense" | "bank";

export type PaymentDirection = "incoming" | "outgoing";

export type TaxPeriod = "monthly" | "quarterly" | "annual";

export interface FinanceClient {
  id: number;
  name: string;
  gstin?: string;
  city: string;
}

export interface FinanceVendor {
  id: number;
  name: string;
  gstin?: string;
  category: string;
}

export interface FinanceEmployee {
  id: number;
  name: string;
  employeeId: string;
  department: string;
}

export interface FinanceProject {
  id: number;
  name: string;
  clientId: number;
  clientName: string;
}

export interface Expense {
  id: number;
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMode: PaymentMode;
  projectId?: number;
  projectName?: string;
  employeeId?: number;
  employeeName?: string;
  vendorId?: number;
  vendorName?: string;
  notes?: string;
  status: ExpenseStatus;
  hasAttachment: boolean;
  reference: string;
}

export interface Income {
  id: number;
  date: string;
  clientId: number;
  clientName: string;
  projectId?: number;
  projectName?: string;
  amount: number;
  paymentMode: PaymentMode;
  status: IncomeStatus;
  reference: string;
  invoiceId?: number;
}

export interface FinanceInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxPercent: number;
}

export interface FinanceInvoice {
  id: number;
  number: string;
  clientId: number;
  clientName: string;
  projectId?: number;
  projectName?: string;
  issueDate: string;
  dueDate: string;
  status: FinanceInvoiceStatus;
  items: FinanceInvoiceLineItem[];
  discount: number;
  gstEnabled: boolean;
  paidAmount: number;
  notes?: string;
  paymentHistory: FinancePaymentRecord[];
  creditNotes: { id: string; date: string; amount: number; reason: string }[];
}

export interface FinancePaymentRecord {
  id: number;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  direction: PaymentDirection;
  partyName: string;
  invoiceNumber?: string;
  status: "completed" | "pending" | "failed";
}

export interface SalaryStructure {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  basic: number;
  hra: number;
  specialAllowance: number;
  pf: number;
  professionalTax: number;
  gross: number;
  net: number;
}

export interface PayrollRun {
  id: number;
  month: string;
  year: number;
  status: PayrollStatus;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  bonusTotal: number;
  processedAt?: string;
}

export interface PayrollSlip {
  id: number;
  payrollRunId: number;
  employeeId: number;
  employeeName: string;
  month: string;
  year: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  pf: number;
  professionalTax: number;
  tds: number;
  gross: number;
  net: number;
}

export interface Budget {
  id: number;
  name: string;
  type: BudgetType;
  projectId?: number;
  projectName?: string;
  fiscalYear: string;
  allocated: number;
  spent: number;
  status: BudgetStatus;
  department?: string;
}

export interface LedgerEntry {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  referenceHref?: string;
}

export interface LedgerAccount {
  id: number;
  name: string;
  type: LedgerType;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export interface TaxSummary {
  period: string;
  periodType: TaxPeriod;
  gstCollected: number;
  gstPaid: number;
  netGst: number;
  tdsDeducted: number;
  tdsDeposited: number;
}

export interface FinanceTransaction {
  id: number;
  date: string;
  type: "income" | "expense" | "payment";
  description: string;
  amount: number;
  party: string;
  reference: string;
  href?: string;
}
