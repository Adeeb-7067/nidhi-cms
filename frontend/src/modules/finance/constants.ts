import type {
  ExpenseCategory,
  ExpenseStatus,
  FinanceInvoiceStatus,
  IncomeStatus,
  PaymentMode,
  BudgetStatus,
  LoanStatus,
  LoanSource,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  PayrollStatus,
  ChequeStatus,
  ChequePurpose,
  ChequePayeeType,
} from "./types";

export const FINANCE_ACCESS_ROLES = ["super_admin", "finance"] as const;

export const COMPANY_FINANCE = {
  name: "Satyakabir Technologies Pvt. Ltd.",
  address: "Indore, Madhya Pradesh, India — 452001",
  gstin: "23AABCS1234F1Z5",
  email: "finance@satyakabir.com",
  phone: "+91 75555 12345",
  pan: "AABCS1234F",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  software: "Software & Subscriptions",
  hardware: "Hardware & Equipment",
  travel: "Travel & Conveyance",
  office: "Office & Admin",
  marketing: "Marketing & Ads",
  utilities: "Utilities & Internet",
  professional: "Professional Services",
  loan: "Loan EMI / Repayment",
  misc: "Miscellaneous",
  security_deposit: "Security Deposit",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const EXPENSE_PAYMENT_STATUS_LABELS: Record<"unpaid" | "partially_paid" | "paid", string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
};

export const INCOME_STATUS_LABELS: Record<IncomeStatus, string> = {
  received: "Received",
  pending: "Pending",
  partial: "Partial",
};

export const FINANCE_INVOICE_STATUS_LABELS: Record<FinanceInvoiceStatus, string> = {
  paid: "Paid",
  partially_paid: "Partially Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  neft: "NEFT/RTGS",
};

export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  issued: "Issued",
  cleared: "Cleared",
  cancelled: "Cancelled",
  bounced: "Bounced",
};

export const CHEQUE_PURPOSE_LABELS: Record<ChequePurpose, string> = {
  normal: "Normal payout",
  security_deposit: "Security deposit",
};

export const CHEQUE_PAYEE_TYPE_LABELS: Record<ChequePayeeType, string> = {
  vendor: "Vendor",
  client: "Client",
  employee: "Employee",
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  on_track: "On Track",
  warning: "Near Limit",
  exceeded: "Exceeded",
};

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  active: "Active",
  closed: "Closed",
};

export const LOAN_SOURCE_LABELS: Record<LoanSource, string> = {
  bank: "Bank",
  market: "Market",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  cancelled: "Cancelled",
};

export const SUBSCRIPTION_BILLING_LABELS: Record<SubscriptionBillingCycle, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  finalized: "Finalized",
  paid: "Paid",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calcBudgetConsumption(spent: number, allocated: number): number {
  if (allocated <= 0) return 0;
  return Math.min(100, Math.round((spent / allocated) * 100));
}

export function calcInvoiceTotal(
  items: { quantity: number; rate: number; taxPercent: number }[],
  discount: number,
  gstEnabled: boolean,
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = gstEnabled
    ? items.reduce((s, i) => s + (i.quantity * i.rate * i.taxPercent) / 100, 0)
    : 0;
  return { subtotal, tax, total: afterDiscount + tax };
}

export function calcVendorInvoiceAmounts(
  taxableAmount: number,
  gstRate: number,
  gstEnabled: boolean,
): { taxableAmount: number; gstAmount: number; totalAmount: number } {
  const base = Math.round(Number(taxableAmount) || 0);
  const rate = gstEnabled ? Math.min(100, Math.max(0, Number(gstRate) || 0)) : 0;
  const gstAmount = gstEnabled && base > 0 ? Math.round((base * rate) / 100) : 0;
  return { taxableAmount: base, gstAmount, totalAmount: base + gstAmount };
}

