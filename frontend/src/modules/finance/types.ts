// Re-exported from the API client so the whole finance module shares one
// source of truth for these unions — see src/api/finance.ts.
export type {
  ExpenseCategory,
  ExpenseStatus,
  ExpensePaymentStatus,
  FinancePaymentMode as PaymentMode,
  IncomeStatus,
  FinanceInvoiceStatus,
  BudgetType,
  BudgetStatus,
  LoanStatus,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  LedgerType,
  PaymentDirection,
  TaxPeriodType as TaxPeriod,
} from "@/api/finance";

/** HRM payroll run status — finance only reads this, never writes it. */
export type PayrollStatus = "draft" | "reviewed" | "finalized" | "paid";
