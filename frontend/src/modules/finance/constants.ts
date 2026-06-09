import type {
  ExpenseCategory,
  ExpenseStatus,
  FinanceInvoiceStatus,
  IncomeStatus,
  PaymentMode,
  BudgetStatus,
  PayrollStatus,
} from "./types";

export const FINANCE_ACCESS_ROLES = ["super_admin"] as const;

export const COMPANY_FINANCE = {
  name: "Satyakabir Technologies Pvt. Ltd.",
  address: "Indore, Madhya Pradesh, India — 452001",
  gstin: "23AABCS1234F1Z5",
  email: "finance@satyakabir.com",
  phone: "+91 75555 12345",
  pan: "AABCS1234F",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salary: "Salary & Wages",
  software: "Software & Subscriptions",
  hardware: "Hardware & Equipment",
  travel: "Travel & Conveyance",
  office: "Office & Admin",
  marketing: "Marketing & Ads",
  utilities: "Utilities & Internet",
  professional: "Professional Services",
  misc: "Miscellaneous",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
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
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  neft: "NEFT/RTGS",
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  on_track: "On Track",
  warning: "Near Limit",
  exceeded: "Exceeded",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  processed: "Processed",
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

export const financeDashboardKpis = {
  totalIncome: 2847500,
  totalExpenses: 1923400,
  netProfit: 924100,
  pendingInvoices: 7,
  overdueAmount: 485000,
  trends: {
    totalIncome: 14.2,
    totalExpenses: 8.6,
    netProfit: 22.4,
    pendingInvoices: -2,
    overdueAmount: -5.1,
  },
};

export const monthlyRevenueVsExpense = [
  { month: "Jan", revenue: 420000, expense: 310000 },
  { month: "Feb", revenue: 485000, expense: 335000 },
  { month: "Mar", revenue: 520000, expense: 358000 },
  { month: "Apr", revenue: 610000, expense: 402000 },
  { month: "May", revenue: 584500, expense: 389400 },
  { month: "Jun", revenue: 228000, expense: 129000 },
];

export const expenseCategoryBreakdown = [
  { name: "Salary & Wages", count: 42, value: 45 },
  { name: "Software", count: 18, value: 12 },
  { name: "Office & Admin", count: 14, value: 10 },
  { name: "Travel", count: 9, value: 8 },
  { name: "Marketing", count: 7, value: 9 },
  { name: "Hardware", count: 6, value: 7 },
  { name: "Utilities", count: 5, value: 5 },
  { name: "Other", count: 8, value: 4 },
];
