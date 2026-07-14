import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

// ─── Types ────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "software" | "hardware" | "travel" | "office" | "marketing" | "utilities" | "professional" | "misc";
export type ExpenseStatus = "pending" | "approved" | "rejected";
export type FinancePaymentMode = "bank_transfer" | "upi" | "cash" | "cheque" | "card" | "neft";
export type IncomeStatus = "received" | "pending" | "partial";
export type FinanceInvoiceStatus = "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentDirection = "incoming" | "outgoing";
export type FinancePaymentStatus = "completed" | "pending" | "failed";
export type BudgetType = "annual" | "project";
export type BudgetStatus = "on_track" | "warning" | "exceeded";
export type LedgerType = "client" | "vendor" | "expense" | "bank";
export type FinanceLedgerSource = "finance" | "sales";
export type TaxPeriodType = "monthly" | "quarterly" | "annual";

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
  paymentMode: FinancePaymentMode;
  projectId: number | null;
  projectName?: string | null;
  employeeId: number | null;
  employeeName?: string | null;
  vendorId: number | null;
  vendorName?: string | null;
  vendorFields?: FinanceVendorField[];
  vendorSummary?: string | null;
  notes: string | null;
  status: ExpenseStatus;
  gstEnabled: boolean;
  gstAmount: number;
  attachments: FinanceAttachment[];
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
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
  expenseId: number | null;
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
  netGst: number;
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

export interface FinanceDashboardKpis {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  overdueAmount: number;
  trends: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    pendingInvoices: number;
    overdueAmount: number;
  };
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
  return useQuery<{ kpis: FinanceDashboardKpis; expenseBreakdown: { name: string; count: number; value: number }[]; monthlyTrend: { month: string; revenue: number; expense: number }[]; period: string }>({
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

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Expense>) =>
      customFetch<Expense>(apiUrl("/api/finance/expenses"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Expense> & { id: number }) =>
      customFetch<Expense>(apiUrl(`/api/finance/expenses/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
    },
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch<Expense>(apiUrl(`/api/finance/expenses/${id}/approve`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-expenses"] });
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
    },
  });
}

export function useRejectExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch<Expense>(apiUrl(`/api/finance/expenses/${id}/reject`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/expenses/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-expenses"] }),
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
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
      qc.invalidateQueries({ queryKey: ["finance-payments"] });
      qc.invalidateQueries({ queryKey: ["finance-payments-summary"] });
      qc.invalidateQueries({ queryKey: ["finance-income"] });
      qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
      qc.invalidateQueries({ queryKey: financeKeys.dashboard() });
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
    staleTime: 30_000,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-vendors"] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/finance/vendors/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-vendors"] }),
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
