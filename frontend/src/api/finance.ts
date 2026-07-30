import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

// ─── Types ────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "software" | "hardware" | "travel" | "office" | "marketing" | "utilities" | "professional" | "loan" | "misc" | "security_deposit";
export type ExpenseStatus = "pending" | "approved" | "rejected";
export type ExpensePaymentStatus = "unpaid" | "partially_paid" | "paid";
export type FinancePaymentMode = "bank_transfer" | "upi" | "cash" | "cheque" | "card" | "neft";
export type IncomeStatus = "received" | "pending" | "partial";
export type FinanceInvoiceStatus = "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentDirection = "incoming" | "outgoing";
export type FinancePaymentStatus = "completed" | "pending" | "failed";
export type BudgetType = "annual" | "project";
export type BudgetStatus = "on_track" | "warning" | "exceeded";
export type LoanStatus = "active" | "closed";
export type LoanSource = "bank" | "market";
export type SubscriptionStatus = "active" | "cancelled";
export type SubscriptionBillingCycle = "monthly" | "yearly";
export type LedgerType = "client" | "vendor" | "expense" | "bank";
export type FinanceLedgerSource = "finance" | "sales";
export type TaxPeriodType = "monthly" | "quarterly" | "annual";
export type ChequePayeeType = "vendor" | "client" | "employee";
export type ChequePurpose = "normal" | "security_deposit";
export type ChequeStatus = "issued" | "cleared" | "cancelled" | "bounced";

export interface FinanceAttachment {
  name: string;
  url: string;
  key?: string;
  mimetype?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Expense {
  id: number;
  reference: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  /** Cash settled against the bill — this is what hits P&L / budgets. */
  paidAmount?: number;
  paymentStatus?: ExpensePaymentStatus | null;
  remainingDue?: number;
  recognizedAmount?: number;
  paymentMode: FinancePaymentMode;
  projectId: number | null;
  projectName?: string | null;
  employeeId: number | null;
  employeeName?: string | null;
  vendorId: number | null;
  vendorName?: string | null;
  vendorFields?: FinanceVendorField[];
  vendorSummary?: string | null;
  loanId: number | null;
  loanName?: string | null;
  loanReference?: string | null;
  subscriptionId: number | null;
  subscriptionName?: string | null;
  subscriptionReference?: string | null;
  chequeId?: number | null;
  chequeReference?: string | null;
  chequeNumber?: string | null;
  chequeStatus?: ChequeStatus | null;
  budgetId?: number | null;
  budgetName?: string | null;
  budgetFiscalYear?: string | null;
  clientId?: number | null;
  notes: string | null;
  status: ExpenseStatus;
  gstEnabled: boolean;
  gstAmount: number;
  attachments: FinanceAttachment[];
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface FinanceCheque {
  id: number;
  reference: string;
  payeeType: ChequePayeeType;
  vendorId: number | null;
  clientId: number | null;
  employeeId: number | null;
  payeeName: string;
  purpose: ChequePurpose;
  amount: number;
  chequeNumber: string;
  issueDate: string;
  clearanceDate: string;
  bankName: string | null;
  attachments: FinanceAttachment[];
  status: ChequeStatus;
  expenseId: number;
  expenseReference?: string | null;
  expensePaymentStatus?: ExpensePaymentStatus | null;
  expenseStatus?: ExpenseStatus | null;
  clearedAt?: string | null;
  clearedBy?: number | null;
  notes: string | null;
  bounceHistory?: ChequeBounceEvent[];
  createdBy?: number | null;
  createdAt?: string;
}

export interface ChequeBounceEvent {
  bouncedAt: string;
  bouncedBy: number;
  bouncedByName?: string;
  notes: string | null;
}

export interface Income {
  id: number;
  reference: string;
  date: string;
  clientId: number;
  clientName?: string | null;
  projectId: number | null;
  projectName?: string | null;
  amount: number;
  paymentMode: FinancePaymentMode;
  status: IncomeStatus;
  invoiceId: number | null;
  salesPaymentId?: number | null;
  salesInvoiceId?: number | null;
  gstEnabled?: boolean | null;
  gstAmount?: number;
  taxableAmount?: number;
  createdAt: string;
}

export interface FinanceInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxPercent: number;
}

export interface FinanceCreditNote {
  id: string;
  date: string;
  amount: number;
  reason: string;
}

export interface FinanceInvoice {
  id: number;
  source?: FinanceLedgerSource;
  number: string;
  clientId: number;
  clientName?: string | null;
  projectId: number | null;
  projectName?: string | null;
  issueDate: string;
  dueDate: string;
  status: FinanceInvoiceStatus;
  items?: FinanceInvoiceLineItem[];
  discount: number;
  gstEnabled: boolean;
  paidAmount: number;
  notes: string | null;
  creditNotes: FinanceCreditNote[];
  subtotal?: number;
  tax?: number;
  total?: number;
  detailHref?: string;
  createdAt: string;
}

export interface FinancePayment {
  id: number;
  source?: FinanceLedgerSource;
  date: string;
  amount: number;
  mode: FinancePaymentMode;
  direction: PaymentDirection;
  reference: string;
  receiptNumber: string;
  status: FinancePaymentStatus;
  partyType: "client" | "vendor" | "employee" | "other";
  partyName: string;
  clientId: number | null;
  vendorId: number | null;
  employeeId: number | null;
  invoiceId: number | null;
  salesInvoiceId?: number | null;
  incomeId?: number | null;
  expenseId: number | null;
  vendorInvoiceId?: number | null;
  freelancerInstallmentId?: number | null;
  taxDepositId?: number | null;
  payrollRunId?: number | null;
  bankAccountId: number | null;
  recordedByName?: string | null;
  salesPaymentId?: number | null;
  salesReceiptHref?: string | null;
  gstEnabled?: boolean | null;
  gstAmount?: number;
  taxableAmount?: number;
  createdAt: string;
}

export interface Budget {
  id: number;
  name: string;
  type: BudgetType;
  projectId: number | null;
  projectName?: string | null;
  fiscalYear: string;
  allocated: number;
  spent: number;
  status: BudgetStatus;
  department: string | null;
}

export interface LoanPayment {
  id: number;
  reference: string;
  date: string;
  amount: number;
  status: ExpenseStatus;
  notes: string | null;
  paymentMode: FinancePaymentMode;
  /** How this installment was allocated against the loan. */
  loanAllocation?: "both" | "interest" | "principal";
  principalPortion: number | null;
  interestPortion: number | null;
  outstandingAfter: number | null;
}

export interface Loan {
  id: number;
  reference: string;
  name: string;
  lender: string;
  /** Bank loan vs market (informal / private) loan. */
  source: LoanSource;
  principal: number;
  interestRate: number | null;
  startDate: string;
  endDate: string | null;
  tenureMonths: number | null;
  emiAmount: number | null;
  status: LoanStatus;
  notes: string | null;
  /** Principal repaid (from approved installments). */
  paidAmount: number;
  remainingAmount: number;
  totalCashPaid?: number;
  totalPrincipalPaid?: number;
  totalInterestPaid?: number;
  remainingPrincipal?: number;
  estimatedTotalInterest?: number | null;
  estimatedTotalPayable?: number | null;
  installmentsPaid?: number;
  installmentsPending?: number;
  createdAt?: string;
  payments?: LoanPayment[];
}

export interface SubscriptionAssignment {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  seatEmail: string | null;
  assignedAt: string;
  revokedAt: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface SoftwareSubscription {
  id: number;
  reference: string;
  name: string;
  vendorName: string | null;
  plan: string | null;
  billingCycle: SubscriptionBillingCycle;
  seatsPurchased: number;
  costAmount: number;
  purchaseEmail: string | null;
  renewalDate: string | null;
  status: SubscriptionStatus;
  notes: string | null;
  seatsUsed: number;
  seatsAvailable: number;
  assignments: SubscriptionAssignment[];
  createdAt?: string;
  expenses?: {
    id: number;
    reference: string;
    date: string;
    amount: number;
    status: ExpenseStatus;
    notes: string | null;
    paymentMode: FinancePaymentMode;
  }[];
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
  id: number | string;
  name: string;
  type: LedgerType;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export interface FinanceBankAccount {
  id: number;
  name: string;
  bankName: string | null;
  accountNumberMasked: string | null;
  ifsc: string | null;
  openingBalance: number;
}

export interface TaxSummary {
  period: string;
  periodKey: string;
  periodType: TaxPeriodType;
  gstCollected: number;
  gstPaid: number;
  /** Alias of gstPaid (input tax credit). */
  gstInputCredit?: number;
  netGst: number;
  gstDeposited?: number;
  /** Remaining GST liability after challans (0 if credit). */
  gstPayable?: number;
  tdsDeducted: number;
  tdsDeposited: number;
}

export interface FinanceVendorField {
  label: string;
  value: string;
}

export interface FinanceVendor {
  id: number;
  name: string;
  contactPerson?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  gstin: string | null;
  notes?: string | null;
  fields?: FinanceVendorField[];
  createdAt?: string;
  updatedAt?: string;
}

export type VendorInvoiceStatus = "unpaid" | "paid" | "cancelled";

export interface VendorInvoice {
  id: number;
  vendorId: number;
  vendorName?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  taxableAmount: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount?: number;
  paymentId?: number | null;
  status: VendorInvoiceStatus;
  notes?: string | null;
  attachments?: FinanceAttachment[];
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorInvoiceSummary {
  invoiceCount: number;
  totalBilled: number;
  inputGst: number;
  unpaidTotal: number;
}

export interface FinanceDashboardKpis {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  overdueAmount: number;
  /** Vendor bills still unpaid (cash not yet paid). */
  outstandingPayables?: number;
  /** Output GST on invoices / taxable income this period. */
  gstCollected?: number;
  /** Input GST credit (ITC) from purchases this period. */
  gstInputCredit?: number;
  /** Collected − input credit (positive = liability). */
  netGst?: number;
  /** GST challans already deposited for this period key. */
  gstDeposited?: number;
  /** Still to remit after deposits (floor 0). */
  gstPayable?: number;
  trends: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    pendingInvoices: number;
    overdueAmount: number;
    gstCollected?: number;
    gstInputCredit?: number;
    netGst?: number;
  };
}

export interface FinanceDashboardAgingBucket {
  bucket: string;
  count: number;
  amount: number;
}

export interface FinanceDashboardResult {
  kpis: FinanceDashboardKpis;
  expenseBreakdown: { name: string; count: number; value: number }[];
  monthlyTrend: { month: string; revenue: number; expense: number }[];
  cashFlowTrend?: { month: string; inflow: number; outflow: number }[];
  apAging?: FinanceDashboardAgingBucket[];
  arAging?: FinanceDashboardAgingBucket[];
  period: string;
}

export interface VendorAnalyticsKpis {
  totalSpend: number;
  periodExpenseCount: number;
  activeVendors: number;
  totalVendors: number;
  topVendorName: string | null;
  topVendorSpend: number;
  outstandingPayables: number;
  trends: { totalSpend: number };
}

export interface VendorAnalyticsResult {
  kpis: VendorAnalyticsKpis;
  monthlyTrend: { month: string; spend: number }[];
  topVendors: { vendorId: number; name: string; spend: number; count: number }[];
  categoryBreakdown: { name: string; count: number; value: number }[];
  period: string;
}

export interface FinanceNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  priority: "low" | "medium" | "high";
  href: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────

export const financeKeys = {
  dashboard: (period?: string) => ["finance-dashboard", period] as const,
  revenueTrend: (months?: number) => ["finance-revenue-trend", months] as const,
  expenses: (params?: object) => ["finance-expenses", params] as const,
  expense: (id: number) => ["finance-expense", id] as const,
  income: (params?: object) => ["finance-income", params] as const,
  invoices: (params?: object) => ["finance-invoices", params] as const,
  invoiceAging: () => ["finance-invoice-aging"] as const,
  invoice: (id: number) => ["finance-invoice", id] as const,
  payments: (params?: object) => ["finance-payments", params] as const,
  payment: (id: number) => ["finance-payment", id] as const,
  budgets: (params?: object) => ["finance-budgets", params] as const,
  loans: (params?: object) => ["finance-loans", params] as const,
  loan: (id: number) => ["finance-loan", id] as const,
  cheques: (params?: object) => ["finance-cheques", params] as const,
  cheque: (id: number) => ["finance-cheque", id] as const,
  subscriptions: (params?: object) => ["finance-subscriptions", params] as const,
  subscription: (id: number) => ["finance-subscription", id] as const,
  clientLedgers: (id?: number | null) => ["finance-client-ledgers", id] as const,
  vendorLedgers: (id?: number | null) => ["finance-vendor-ledgers", id] as const,
  expenseCategoryLedgers: () => ["finance-expense-category-ledgers"] as const,
  bankLedgers: (id?: number | null) => ["finance-bank-ledgers", id] as const,
  taxSummary: (periodType: string) => ["finance-tax-summary", periodType] as const,
  taxDeposits: (params?: object) => ["finance-tax-deposits", params] as const,
  pnl: () => ["finance-pnl"] as const,
  profitability: () => ["finance-profitability"] as const,
  departmentPayroll: (year?: number, month?: number) => ["finance-department-payroll", year, month] as const,
  vendors: (params?: object) => ["finance-vendors", params] as const,
  vendor: (id: number) => ["finance-vendor", id] as const,
  vendorInvoices: (vendorId: number) => ["finance-vendor-invoices", vendorId] as const,
  vendorAnalytics: (period?: string) => ["finance-vendor-analytics", period] as const,
  notifications: (params?: object) => ["finance-notifications", params] as const,
};

function toQueryString(params?: object) {
  if (!params) return "";
  const qs = new URLSearchParams(
    Object.entries(params as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `?${qs}` : "";
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export function useFinanceDashboard(period: "current" | "previous" = "current", enabled = true) {
  return useQuery<FinanceDashboardResult>({
    queryKey: financeKeys.dashboard(period),
    queryFn: () => customFetch(apiUrl(`/api/finance/dashboard?period=${period}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useFinanceRevenueTrend(months = 6, enabled = true) {
  return useQuery<{ trend: { month: string; revenue: number; growth: number }[] }>({
    queryKey: financeKeys.revenueTrend(months),
    queryFn: () => customFetch(apiUrl(`/api/finance/dashboard/revenue-trend?months=${months}`)),
    enabled,
    staleTime: 60_000,
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────

export interface ListExpensesParams {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  projectId?: number;
  loanId?: number;
  paymentStatus?: ExpensePaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export function useListExpenses(params?: ListExpensesParams, enabled = true) {
  return useQuery<{ expenses: Expense[]; total: number; page: number; limit: number }>({
    queryKey: financeKeys.expenses(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/expenses${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export interface ExpensePaymentHistoryItem {
  id: number;
  date: string;
  amount: number;
  mode: FinancePaymentMode;
  reference: string;
  receiptNumber: string;
  status: FinancePaymentStatus;
  partyName: string;
  vendorId: number | null;
  recordedBy: number | null;
  recordedByName?: string | null;
  createdAt?: string;
}

export type ExpenseDetail = Expense & {
  payments: ExpensePaymentHistoryItem[];
  paymentCount: number;
  paymentsTotal: number;
};

export function useGetExpense(id: number, enabled = true) {
  return useQuery<ExpenseDetail>({
    queryKey: financeKeys.expense(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/expenses/${id}`)),
    enabled: enabled && !!id,
    staleTime: 10_000,
  });
}

function invalidateExpenseLinkedFinance(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["finance-expenses"] });
  qc.invalidateQueries({ queryKey: ["finance-expense"] });
  qc.invalidateQueries({ queryKey: ["finance-loans"] });
  qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
  qc.invalidateQueries({ queryKey: ["finance-payments"] });
  qc.invalidateQueries({ queryKey: ["finance-payments-summary"] });
  qc.invalidateQueries({ queryKey: ["finance-budgets"] });
  qc.invalidateQueries({ queryKey: ["finance-pnl"] });
  qc.invalidateQueries({ queryKey: ["finance-vendor-analytics"] });
  qc.invalidateQueries({ queryKey: ["finance-tax-summary"] });
  qc.invalidateQueries({ queryKey: ["finance-expense-category-ledgers"] });
  qc.invalidateQueries({ queryKey: ["finance-vendor-ledgers"] });
  qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Expense>) =>
      customFetch<Expense>(apiUrl("/api/finance/expenses"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateExpenseLinkedFinance(qc),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Expense> & { id: number }) =>
      customFetch<Expense>(apiUrl(`/api/finance/expenses/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => invalidateExpenseLinkedFinance(qc),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      paidAmount?: number;
      paymentMode?: FinancePaymentMode;
      paymentDate?: string;
      paymentReference?: string;
    }) =>
      customFetch<Expense>(apiUrl(`/api/finance/expenses/${id}/approve`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateExpenseLinkedFinance(qc),
  });
}

export function usePayExpenseRemaining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      amount: number;
      paymentMode?: FinancePaymentMode;
      date?: string;
      reference?: string;
    }) =>
      customFetch<{ expense: Expense; payment: unknown }>(apiUrl(`/api/finance/expenses/${id}/payments`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateExpenseLinkedFinance(qc);
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
    },
  });
}

export function useRejectExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch<Expense>(apiUrl(`/api/finance/expenses/${id}/reject`), { method: "POST" }),
    onSuccess: () => invalidateExpenseLinkedFinance(qc),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/expenses/${id}`), { method: "DELETE" }),
    onSuccess: () => invalidateExpenseLinkedFinance(qc),
  });
}

// ─── Income ───────────────────────────────────────────────────────────────

export interface ListIncomeParams {
  status?: IncomeStatus;
  clientId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export function useListIncome(params?: ListIncomeParams, enabled = true) {
  return useQuery<{ income: Income[]; total: number; page: number; limit: number }>({
    queryKey: financeKeys.income(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/income${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export interface RecordIncomePayload {
  clientId: number;
  projectId?: number | null;
  invoiceId?: number | null;
  amount: number;
  paymentMode: FinancePaymentMode;
  date?: string;
}

export function useRecordIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordIncomePayload) =>
      customFetch<{ income: Income; payment: FinancePayment; invoiceStatus: FinanceInvoiceStatus | null }>(
        apiUrl("/api/finance/income"),
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-income"] });
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      if (vars.invoiceId) {
        qc.invalidateQueries({ queryKey: financeKeys.invoice(vars.invoiceId) });
        qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      }
    },
  });
}

export interface UpdateIncomePayload {
  date?: string;
  paymentMode?: FinancePaymentMode;
  projectId?: number | null;
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateIncomePayload & { id: number }) =>
      customFetch<Income>(apiUrl(`/api/finance/income/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-income"] });
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
    },
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/income/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-income"] });
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export interface ListInvoicesParams {
  status?: FinanceInvoiceStatus;
  clientId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export function useListInvoices(params?: ListInvoicesParams, enabled = true) {
  return useQuery<{ invoices: FinanceInvoice[]; total: number; page: number; limit: number }>({
    queryKey: financeKeys.invoices(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/invoices${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function useInvoicesSummary(enabled = true) {
  return useQuery<{
    counts: Record<string, number>;
    outstanding: number;
    gstCount: number;
    nonGstCount: number;
    gstTaxTotal: number;
  }>({
    queryKey: ["finance-invoices-summary"],
    queryFn: () => customFetch(apiUrl("/api/finance/invoices/summary")),
    enabled,
    staleTime: 30_000,
  });
}

export function useInvoiceAging(enabled = true) {
  return useQuery<{ buckets: { bucket: string; count: number; amount: number }[] }>({
    queryKey: financeKeys.invoiceAging(),
    queryFn: () => customFetch(apiUrl("/api/finance/invoices/aging")),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetInvoice(id: number, enabled = true) {
  return useQuery<FinanceInvoice>({
    queryKey: financeKeys.invoice(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/invoices/${id}`)),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export interface CreateInvoicePayload {
  clientId: number;
  projectId?: number | null;
  issueDate?: string;
  dueDate: string;
  items: { description: string; quantity: number; rate: number; taxPercent: number }[];
  discount?: number;
  gstEnabled?: boolean;
  notes?: string;
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoicePayload) =>
      customFetch<FinanceInvoice>(apiUrl("/api/finance/invoices"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.invoiceAging() });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

export interface UpdateInvoicePayload {
  projectId?: number | null;
  dueDate?: string;
  items?: { description: string; quantity: number; rate: number; taxPercent: number }[];
  discount?: number;
  gstEnabled?: boolean;
  notes?: string;
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateInvoicePayload & { id: number }) =>
      customFetch<FinanceInvoice>(apiUrl(`/api/finance/invoices/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.invoice(vars.id) });
      qc.invalidateQueries({ queryKey: financeKeys.invoiceAging() });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/invoices/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.invoiceAging() });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      customFetch<FinanceInvoice>(apiUrl(`/api/finance/invoices/${id}/cancel`), {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.invoice(vars.id) });
    },
  });
}

export function useAddCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: number; amount: number; reason?: string }) =>
      customFetch<FinanceInvoice>(apiUrl(`/api/finance/invoices/${id}/credit-note`), {
        method: "POST",
        body: JSON.stringify({ amount, reason }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: financeKeys.invoice(vars.id) });
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
  });
}

export function useRemindInvoice() {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(apiUrl(`/api/finance/invoices/${id}/remind`), { method: "POST" }),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────

export interface ListPaymentsParams {
  direction?: PaymentDirection;
  search?: string;
  page?: number;
  limit?: number;
}

export function useListPayments(params?: ListPaymentsParams, enabled = true) {
  return useQuery<{ payments: FinancePayment[]; total: number; page: number; limit: number }>({
    queryKey: financeKeys.payments(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/payments${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function usePaymentsSummary(enabled = true) {
  return useQuery<{
    incoming: number;
    outgoing: number;
    net: number;
    gstIncoming: number;
    nonGstIncoming: number;
    gstTaxCollected: number;
  }>({
    queryKey: ["finance-payments-summary"],
    queryFn: () => customFetch(apiUrl("/api/finance/payments/summary")),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetPayment(source: FinanceLedgerSource, id: number, enabled = true) {
  return useQuery<FinancePayment>({
    queryKey: ["finance-payment", source, id],
    queryFn: () => customFetch(apiUrl(`/api/finance/payments/${id}?source=${source}`)),
    enabled: enabled && id > 0,
  });
}

export function useSyncSalesPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { limit?: number }) =>
      customFetch<{ processed: number; mirrored: number; skipped: number; failed: number }>(
        apiUrl("/api/finance/sync/sales-payments"),
        { method: "POST", body: JSON.stringify(body ?? {}) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-payments-summary"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance-income"] });
    },
  });
}

export interface UpdatePaymentPayload {
  date?: string;
  amount?: number;
  mode?: FinancePaymentMode;
  reference?: string;
  partyName?: string;
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdatePaymentPayload & { id: number }) =>
      customFetch<FinancePayment>(apiUrl(`/api/finance/payments/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-payments-summary"] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/payments/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      invalidateExpenseLinkedFinance(qc);
      qc.invalidateQueries({ queryKey: ["finance-income"] });
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
  });
}

export interface RecordPaymentPayload {
  direction: PaymentDirection;
  amount: number;
  mode: FinancePaymentMode;
  date?: string;
  reference?: string;
  clientId?: number;
  projectId?: number | null;
  invoiceId?: number | null;
  partyName?: string;
  vendorId?: number | null;
  employeeId?: number | null;
  expenseId?: number | null;
  bankAccountId?: number | null;
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordPaymentPayload) =>
      customFetch<{ payment: FinancePayment; invoiceStatus: FinanceInvoiceStatus | null }>(
        apiUrl("/api/finance/payments"),
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      if (vars.invoiceId) {
        qc.invalidateQueries({ queryKey: financeKeys.invoice(vars.invoiceId) });
        qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      }
      if (vars.expenseId) qc.invalidateQueries({ queryKey: ["finance-expenses"] });
    },
  });
}

// ─── Budgets ──────────────────────────────────────────────────────────────

export interface ListBudgetsParams {
  type?: BudgetType;
  fiscalYear?: string;
}

export function useListBudgets(params?: ListBudgetsParams, enabled = true) {
  return useQuery<{ budgets: Budget[] }>({
    queryKey: financeKeys.budgets(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/budgets${toQueryString(params)}`)),
    enabled,
    staleTime: 30_000,
  });
}

export interface CreateBudgetPayload {
  name: string;
  type: BudgetType;
  projectId?: number | null;
  fiscalYear: string;
  allocated: number;
  department?: string;
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBudgetPayload) =>
      customFetch<Budget>(apiUrl("/api/finance/budgets"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-budgets"] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Budget> & { id: number }) =>
      customFetch<Budget>(apiUrl(`/api/finance/budgets/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-budgets"] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/budgets/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-budgets"] }),
  });
}

// ─── Loans ────────────────────────────────────────────────────────────────

export interface ListLoansParams {
  status?: LoanStatus;
  source?: LoanSource;
  search?: string;
}

export function useListLoans(params?: ListLoansParams, enabled = true) {
  return useQuery<{ loans: Loan[] }>({
    queryKey: financeKeys.loans(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/loans${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function useGetLoan(id: number, enabled = true) {
  return useQuery<Loan>({
    queryKey: financeKeys.loan(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/loans/${id}`)),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export interface CreateLoanPayload {
  name: string;
  lender: string;
  source: LoanSource;
  principal: number;
  interestRate?: number | null;
  startDate: string;
  endDate?: string | null;
  tenureMonths?: number | null;
  emiAmount?: number | null;
  notes?: string;
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLoanPayload) =>
      customFetch<Loan>(apiUrl("/api/finance/loans"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-loans"] }),
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateLoanPayload> & { id: number; status?: LoanStatus }) =>
      customFetch<Loan>(apiUrl(`/api/finance/loans/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-loans"] });
      qc.invalidateQueries({ queryKey: financeKeys.loan(vars.id) });
    },
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/loans/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-loans"] }),
  });
}

export interface RecordLoanInstallmentPayload {
  amount?: number;
  paymentMode?: FinancePaymentMode;
  date?: string;
  notes?: string;
  /** When true, expense is approved immediately and updates loan balances. */
  approve?: boolean;
  /** How to allocate the payment: both (EMI), interest only, or principal only. */
  loanAllocation?: "both" | "interest" | "principal";
}

export function useRecordLoanInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: RecordLoanInstallmentPayload & { id: number }) =>
      customFetch<{ expense: Expense; loan: Loan }>(apiUrl(`/api/finance/loans/${id}/installments`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-loans"] });
      qc.invalidateQueries({ queryKey: financeKeys.loan(vars.id) });
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

// ─── Cheques ──────────────────────────────────────────────────────────────

export interface ListChequesParams {
  status?: ChequeStatus;
  payeeType?: ChequePayeeType;
  purpose?: ChequePurpose;
  search?: string;
}

export interface ChequeClearanceForecast {
  _id: string; // date string
  totalAmount: number;
  count: number;
}

export function useChequeClearanceForecast() {
  return useQuery<ChequeClearanceForecast[], Error>({
    queryKey: ["cheque-clearance-forecast"],
    queryFn: () => customFetch<ChequeClearanceForecast[]>(apiUrl("/api/finance/cheques/forecast/clearance")),
  });
}

export function useListCheques(params?: ListChequesParams, enabled = true) {
  return useQuery<{ cheques: FinanceCheque[] }>({
    queryKey: financeKeys.cheques(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/cheques${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function useGetCheque(id: number, enabled = true) {
  return useQuery<FinanceCheque>({
    queryKey: financeKeys.cheque(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/cheques/${id}`)),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export interface CreateChequePayload {
  payeeType: ChequePayeeType;
  vendorId?: number | null;
  clientId?: number | null;
  employeeId?: number | null;
  purpose: ChequePurpose;
  amount: number;
  chequeNumber: string;
  issueDate: string;
  clearanceDate: string;
  bankName?: string;
  notes?: string;
  attachments?: FinanceAttachment[];
}

export function useCreateCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChequePayload) =>
      customFetch<FinanceCheque>(apiUrl("/api/finance/cheques"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-cheques"] });
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

export function useUpdateCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateChequePayload> & { id: number }) =>
      customFetch<FinanceCheque>(apiUrl(`/api/finance/cheques/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-cheques"] });
      qc.invalidateQueries({ queryKey: financeKeys.cheque(vars.id) });
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
    },
  });
}

function invalidateChequeMutations(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: ["finance-cheques"] });
  qc.invalidateQueries({ queryKey: financeKeys.cheque(id) });
  qc.invalidateQueries({ queryKey: ["finance-expenses"] });
  qc.invalidateQueries({ queryKey: ["finance-payments"] });
  qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
}

export function useClearCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: number; date?: string }) =>
      customFetch<FinanceCheque>(apiUrl(`/api/finance/cheques/${id}/clear`), {
        method: "POST",
        body: JSON.stringify(date ? { date } : {}),
      }),
    onSuccess: (_data, vars) => invalidateChequeMutations(qc, vars.id),
  });
}

export function useCancelCheque() {
  const qc = useQueryClient();
  return useMutation<FinanceCheque, Error, { id: number; notes?: string }>({
    mutationFn: ({ id, notes }) =>
      customFetch<FinanceCheque>(apiUrl(`/api/finance/cheques/${id}/cancel`), {
        method: "POST",
        body: JSON.stringify({ notes }),
      }),
    onSuccess: (_data, vars) => invalidateChequeMutations(qc, vars.id),
  });
}

export function useBounceCheque() {
  const qc = useQueryClient();
  return useMutation<FinanceCheque, Error, { id: number; notes?: string }>({
    mutationFn: ({ id, notes }) =>
      customFetch<FinanceCheque>(apiUrl(`/api/finance/cheques/${id}/bounce`), {
        method: "POST",
        body: JSON.stringify({ notes }),
      }),
    onSuccess: (_data, vars) => invalidateChequeMutations(qc, vars.id),
  });
}

export function useRePresentCheque() {
  const qc = useQueryClient();
  return useMutation<FinanceCheque, Error, number>({
    mutationFn: (id: number) =>
      customFetch<FinanceCheque>(apiUrl(`/api/finance/cheques/${id}/re-present`), { method: "POST", body: "{}" }),
    onSuccess: (_data, id) => invalidateChequeMutations(qc, id),
  });
}

// ─── Software subscriptions ───────────────────────────────────────────────

export interface ListSubscriptionsParams {
  status?: SubscriptionStatus;
  search?: string;
}

export function useListSubscriptions(params?: ListSubscriptionsParams, enabled = true) {
  return useQuery<{ subscriptions: SoftwareSubscription[] }>({
    queryKey: financeKeys.subscriptions(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/subscriptions${toQueryString(params)}`)),
    enabled,
    staleTime: 15_000,
  });
}

export function useGetSubscription(id: number, enabled = true) {
  return useQuery<SoftwareSubscription>({
    queryKey: financeKeys.subscription(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/subscriptions/${id}`)),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export interface CreateSubscriptionPayload {
  name: string;
  vendorName?: string;
  plan?: string;
  billingCycle?: SubscriptionBillingCycle;
  seatsPurchased: number;
  costAmount: number;
  purchaseEmail?: string | null;
  renewalDate?: string | null;
  notes?: string;
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubscriptionPayload) =>
      customFetch<SoftwareSubscription>(apiUrl("/api/finance/subscriptions"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-subscriptions"] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: Partial<CreateSubscriptionPayload> & { id: number; status?: SubscriptionStatus }) =>
      customFetch<SoftwareSubscription>(apiUrl(`/api/finance/subscriptions/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
      qc.invalidateQueries({ queryKey: financeKeys.subscription(vars.id) });
    },
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/finance/subscriptions/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-subscriptions"] }),
  });
}

export function useAssignSubscriptionSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: number; employeeId: number; seatEmail?: string; notes?: string }) =>
      customFetch<SoftwareSubscription>(apiUrl(`/api/finance/subscriptions/${id}/assign`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
      qc.invalidateQueries({ queryKey: financeKeys.subscription(vars.id) });
    },
  });
}

export function useRevokeSubscriptionSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignmentId }: { id: number; assignmentId: number }) =>
      customFetch<SoftwareSubscription>(
        apiUrl(`/api/finance/subscriptions/${id}/assignments/${assignmentId}/revoke`),
        { method: "POST" },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
      qc.invalidateQueries({ queryKey: financeKeys.subscription(vars.id) });
    },
  });
}

export interface RecordSubscriptionPaymentPayload {
  amount?: number;
  paymentMode?: FinancePaymentMode;
  date?: string;
  notes?: string;
  approve?: boolean;
  renewalDate?: string;
}

export function useRecordSubscriptionPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: RecordSubscriptionPaymentPayload & { id: number }) =>
      customFetch<{ expense: Expense; subscription: SoftwareSubscription }>(
        apiUrl(`/api/finance/subscriptions/${id}/payments`),
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-subscriptions"] });
      qc.invalidateQueries({ queryKey: financeKeys.subscription(vars.id) });
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
  });
}

// ─── Ledgers ──────────────────────────────────────────────────────────────

export function useClientLedgers(id?: number | null, enabled = true) {
  return useQuery<{ accounts: LedgerAccount[] }>({
    queryKey: financeKeys.clientLedgers(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/ledgers/clients${id ? `/${id}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useVendorLedgers(id?: number | null, enabled = true) {
  return useQuery<{ accounts: LedgerAccount[] }>({
    queryKey: financeKeys.vendorLedgers(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/ledgers/vendors${id ? `/${id}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useExpenseCategoryLedgers(enabled = true) {
  return useQuery<{ accounts: LedgerAccount[] }>({
    queryKey: financeKeys.expenseCategoryLedgers(),
    queryFn: () => customFetch(apiUrl("/api/finance/ledgers/expense-categories")),
    enabled,
    staleTime: 30_000,
  });
}

export function useBankLedgers(id?: number | null, enabled = true) {
  return useQuery<{ accounts: LedgerAccount[] }>({
    queryKey: financeKeys.bankLedgers(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/ledgers/bank-accounts${id ? `/${id}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export interface CreateBankAccountPayload {
  name: string;
  bankName?: string;
  accountNumberMasked?: string;
  ifsc?: string;
  openingBalance?: number;
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBankAccountPayload) =>
      customFetch<FinanceBankAccount>(apiUrl("/api/finance/ledgers/bank-accounts"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-bank-ledgers"] }),
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CreateBankAccountPayload & { id: number }) =>
      customFetch<FinanceBankAccount>(apiUrl(`/api/finance/ledgers/bank-accounts/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-bank-ledgers"] }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/finance/ledgers/bank-accounts/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-bank-ledgers"] }),
  });
}

// ─── Tax ──────────────────────────────────────────────────────────────────

export function useTaxSummary(periodType: TaxPeriodType, enabled = true) {
  return useQuery<{ summaries: TaxSummary[] }>({
    queryKey: financeKeys.taxSummary(periodType),
    queryFn: () => customFetch(apiUrl(`/api/finance/tax/summary?periodType=${periodType}`)),
    enabled,
    staleTime: 60_000,
  });
}

export interface TaxDeposit {
  id: number;
  type: "gst" | "tds";
  period: string;
  amount: number;
  challanNumber: string | null;
  depositedAt: string;
  createdAt: string;
}

export interface TaxDepositPayload {
  type: "gst" | "tds";
  period: string;
  amount: number;
  challanNumber?: string;
  depositedAt?: string;
}

export function useListTaxDeposits(params?: { type?: "gst" | "tds"; page?: number; limit?: number }, enabled = true) {
  return useQuery<{ deposits: TaxDeposit[]; total: number; page: number; limit: number }>({
    queryKey: financeKeys.taxDeposits(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/tax/deposits${toQueryString(params)}`)),
    enabled,
    staleTime: 30_000,
  });
}

function invalidateTax(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["finance-tax-summary"] });
  qc.invalidateQueries({ queryKey: ["finance-tax-deposits"] });
}

export function useCreateTaxDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TaxDepositPayload) =>
      customFetch<TaxDeposit>(apiUrl("/api/finance/tax/deposits"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateTax(qc),
  });
}

export function useUpdateTaxDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<TaxDepositPayload> & { id: number }) =>
      customFetch<TaxDeposit>(apiUrl(`/api/finance/tax/deposits/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => invalidateTax(qc),
  });
}

export function useDeleteTaxDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/tax/deposits/${id}`), { method: "DELETE" }),
    onSuccess: () => invalidateTax(qc),
  });
}

// ─── Reports ──────────────────────────────────────────────────────────────

export function useFinancePnl(enabled = true) {
  return useQuery<{
    monthly: { month: string; income: number; expenses: number; profit: number }[];
    yearly: { year: string; income: number; expenses: number; profit: number }[];
  }>({
    queryKey: financeKeys.pnl(),
    queryFn: () => customFetch(apiUrl("/api/finance/reports/pnl")),
    enabled,
    staleTime: 60_000,
  });
}

export function useFinanceProfitability(enabled = true) {
  return useQuery<{
    projects: { project: string; revenue: number; cost: number }[];
    departments: { department: string; revenue: number; cost: number }[];
  }>({
    queryKey: financeKeys.profitability(),
    queryFn: () => customFetch(apiUrl("/api/finance/reports/profitability")),
    enabled,
    staleTime: 60_000,
  });
}

export interface DepartmentPayrollRow {
  department: string;
  employees: number;
  net: number;
  cost: number;
}

export interface DepartmentPayrollResult {
  period: { year: number; month: number } | null;
  runStatus: "draft" | "reviewed" | "finalized" | "paid" | null;
  departments: DepartmentPayrollRow[];
  totals: { employees: number; net: number; cost: number };
}

export function useDepartmentPayroll(year: number, month: number, enabled = true) {
  return useQuery<DepartmentPayrollResult>({
    queryKey: financeKeys.departmentPayroll(year, month),
    queryFn: () => customFetch(apiUrl(`/api/finance/reports/department-payroll?year=${year}&month=${month}`)),
    enabled,
    staleTime: 60_000,
  });
}

// ─── Vendors ──────────────────────────────────────────────────────────────

export function useListVendors(params?: { search?: string }, enabled = true) {
  return useQuery<{ vendors: FinanceVendor[] }>({
    queryKey: financeKeys.vendors(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/vendors${toQueryString(params)}`)),
    enabled,
  });
}

export function useGetVendor(id: number, enabled = true) {
  return useQuery<FinanceVendor>({
    queryKey: financeKeys.vendor(id),
    queryFn: () => customFetch(apiUrl(`/api/finance/vendors/${id}`)),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export function useVendorAnalytics(
  period: "current" | "previous" = "current",
  enabled = true,
) {
  return useQuery<VendorAnalyticsResult>({
    queryKey: financeKeys.vendorAnalytics(period),
    queryFn: () => customFetch(apiUrl(`/api/finance/vendors/analytics?period=${period}`)),
    enabled,
    staleTime: 30_000,
  });
}

export interface CreateVendorPayload {
  name: string;
  email: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  website?: string;
  gstin?: string;
  notes?: string;
  fields?: FinanceVendorField[];
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVendorPayload) =>
      customFetch<FinanceVendor>(apiUrl("/api/finance/vendors"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-vendors"] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CreateVendorPayload & { id: number }) =>
      customFetch<FinanceVendor>(apiUrl(`/api/finance/vendors/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-vendors"] });
      qc.invalidateQueries({ queryKey: financeKeys.vendor(vars.id) });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/vendors/${id}`), { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["finance-vendors"] });
      qc.invalidateQueries({ queryKey: financeKeys.vendor(id) });
      qc.invalidateQueries({ queryKey: ["finance-vendor-ledgers"] });
    },
  });
}

// ─── Vendor invoices (purchase bills / input GST) ─────────────────────────

export function useListVendorInvoices(vendorId: number, enabled = true) {
  return useQuery<{ invoices: VendorInvoice[]; summary: VendorInvoiceSummary }>({
    queryKey: financeKeys.vendorInvoices(vendorId),
    queryFn: () => customFetch(apiUrl(`/api/finance/vendors/${vendorId}/invoices`)),
    enabled: enabled && Number.isFinite(vendorId) && vendorId > 0,
    staleTime: 10_000,
  });
}

export interface CreateVendorInvoicePayload {
  invoiceNumber: string;
  invoiceDate: string;
  taxableAmount: number;
  gstEnabled?: boolean;
  gstRate?: number;
  status?: VendorInvoiceStatus;
  notes?: string;
  attachments?: FinanceAttachment[];
}

export function useCreateVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, ...body }: CreateVendorInvoicePayload & { vendorId: number }) =>
      customFetch<VendorInvoice>(apiUrl(`/api/finance/vendors/${vendorId}/invoices`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: financeKeys.vendorInvoices(vars.vendorId) });
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("monthly") });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("quarterly") });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("annual") });
    },
  });
}

export function useUpdateVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vendorId: _vendorId, ...body }: Partial<CreateVendorInvoicePayload> & { id: number; vendorId: number }) =>
      customFetch<VendorInvoice>(apiUrl(`/api/finance/vendor-invoices/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: financeKeys.vendorInvoices(vars.vendorId) });
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("monthly") });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("quarterly") });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("annual") });
    },
  });
}

export function useDeleteVendorInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; vendorId: number }) =>
      customFetch(apiUrl(`/api/finance/vendor-invoices/${id}`), { method: "DELETE" }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: financeKeys.vendorInvoices(vars.vendorId) });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("monthly") });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("quarterly") });
      qc.invalidateQueries({ queryKey: financeKeys.taxSummary("annual") });
    },
  });
}

// ─── Notifications ────────────────────────────────────────────────────────

export function useFinanceNotifications(params?: { unreadOnly?: boolean; page?: number; limit?: number }, enabled = true) {
  return useQuery<{ notifications: FinanceNotification[]; unreadCount: number; total: number; page: number; limit: number }>({
    queryKey: financeKeys.notifications(params),
    queryFn: () => customFetch(apiUrl(`/api/finance/notifications${toQueryString(params)}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useMarkFinanceNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/notifications/${id}/read`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-notifications"] }),
  });
}

export function useMarkAllFinanceNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => customFetch(apiUrl("/api/finance/notifications/mark-all-read"), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-notifications"] }),
  });
}

// ─── Freelancer project engagements ───────────────────────────────────────

export type FreelancerPaymentStatus = "unpaid" | "partially_paid" | "paid";
export type FreelancerEngagementStatus = "active" | "completed" | "cancelled";
export type FreelancerEngagementPaymentMode = "lump_sum" | "installments";
export type FreelancerInstallmentStatus = "pending" | "paid" | "cancelled";

export type FreelancerInstallment = {
  id: number;
  engagementId: number;
  label: string;
  amount: number;
  dueDate: string | null;
  status: FreelancerInstallmentStatus;
  paidAt: string | null;
  paymentMode: string | null;
  reference: string | null;
  receiptNumber?: string | null;
  notes: string | null;
  proofImageUrl?: string | null;
  recordedBy: number | null;
  expenseId?: number | null;
  paymentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FreelancerInstallmentReceipt = {
  engagement: {
    id: number;
    agreedAmount: number;
    projectId: number;
    projectName: string | null;
    userId: number;
    freelancerName: string | null;
    freelancerEmail: string | null;
    paidAmount: number;
    remainingBalance: number;
  };
  installment: FreelancerInstallment;
  payment: {
    id: number;
    receiptNumber: string;
    reference: string;
    amount: number;
    mode: string;
    date: string;
    status: string;
  } | null;
};

export type FreelancerEngagement = {
  id: number;
  projectId: number;
  userId: number;
  agreedAmount: number;
  currency: string;
  paymentMode: FreelancerEngagementPaymentMode;
  status: FreelancerEngagementStatus;
  notes: string | null;
  createdBy: number;
  createdAt?: string;
  updatedAt?: string;
  paidAmount: number;
  pendingAmount: number;
  remainingAmount: number;
  paymentStatus: FreelancerPaymentStatus;
  freelancerName: string | null;
  projectName: string | null;
  projectType: string | null;
  installments: FreelancerInstallment[];
};

export type CreateFreelancerEngagementPayload = {
  projectId: number;
  userId: number;
  agreedAmount: number;
  paymentMode: FreelancerEngagementPaymentMode;
  notes?: string | null;
  dueDate?: string | null;
  installments?: Array<{
    label: string;
    amount: number;
    dueDate?: string | null;
  }>;
};

export function useListFreelancerEngagements(
  params?: { projectId?: number; userId?: number; status?: string },
  enabled = true,
) {
  return useQuery<{ engagements: FreelancerEngagement[] }>({
    queryKey: ["finance-freelancer-engagements", params],
    queryFn: () =>
      customFetch(apiUrl(`/api/finance/freelancer-engagements${toQueryString(params)}`)),
    enabled,
  });
}

export function useGetFreelancerEngagement(id: number, enabled = true) {
  return useQuery<FreelancerEngagement>({
    queryKey: ["finance-freelancer-engagement", id],
    queryFn: () => customFetch(apiUrl(`/api/finance/freelancer-engagements/${id}`)),
    enabled: enabled && id > 0,
  });
}

export function useCreateFreelancerEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFreelancerEngagementPayload) =>
      customFetch<FreelancerEngagement>(apiUrl("/api/finance/freelancer-engagements"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-freelancer-engagements"] }),
  });
}

export type UpdateFreelancerEngagementPayload = {
  id: number;
  agreedAmount?: number;
  paymentMode?: FreelancerEngagementPaymentMode;
  status?: FreelancerEngagementStatus;
  notes?: string | null;
  /** Replace unpaid schedule (rejected if any installment is already paid). */
  installments?: Array<{
    label: string;
    amount: number;
    dueDate?: string | null;
    notes?: string | null;
  }>;
};

export function useUpdateFreelancerEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateFreelancerEngagementPayload) =>
      customFetch<FreelancerEngagement>(apiUrl(`/api/finance/freelancer-engagements/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-freelancer-engagements"] });
      qc.invalidateQueries({ queryKey: ["finance-freelancer-engagement", vars.id] });
    },
  });
}

export function useDeleteFreelancerEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/finance/freelancer-engagements/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-freelancer-engagements"] }),
  });
}

export function useUpdateFreelancerInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      engagementId,
      installmentId,
      ...body
    }: {
      engagementId: number;
      installmentId: number;
      status?: FreelancerInstallmentStatus;
      label?: string;
      amount?: number;
      dueDate?: string | null;
      paymentMode?: string | null;
      reference?: string | null;
      notes?: string | null;
      proofImageUrl?: string | null;
      paidAt?: string | null;
    }) =>
      customFetch<FreelancerInstallment>(
        apiUrl(`/api/finance/freelancer-engagements/${engagementId}/installments/${installmentId}`),
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-freelancer-engagements"] });
      qc.invalidateQueries({ queryKey: ["finance-freelancer-engagement", vars.engagementId] });
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
    },
  });
}

export function useGetFreelancerInstallmentReceipt(
  engagementId: number,
  installmentId: number,
  enabled = true,
) {
  return useQuery<FreelancerInstallmentReceipt>({
    queryKey: ["finance-freelancer-receipt", engagementId, installmentId],
    queryFn: () =>
      customFetch(
        apiUrl(
          `/api/finance/freelancer-engagements/${engagementId}/installments/${installmentId}/receipt`,
        ),
      ),
    enabled: enabled && engagementId > 0 && installmentId > 0,
  });
}

export function useAddFreelancerInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      engagementId,
      ...body
    }: {
      engagementId: number;
      label: string;
      amount: number;
      dueDate?: string | null;
      notes?: string | null;
    }) =>
      customFetch<FreelancerInstallment>(
        apiUrl(`/api/finance/freelancer-engagements/${engagementId}/installments`),
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance-freelancer-engagements"] });
      qc.invalidateQueries({ queryKey: ["finance-freelancer-engagement", vars.engagementId] });
    },
  });
}
