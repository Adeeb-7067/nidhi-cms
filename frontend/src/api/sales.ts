import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

// ─── Types ────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new" | "contacted" | "follow_up" | "interested"
  | "proposal_sent" | "approved" | "converted" | "lost";
export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type ProposalStatus =
  | "draft" | "sent" | "seen" | "approved"
  | "declined" | "counter_offer" | "expired" | "revised";
export type CustomerStatus = "active" | "inactive" | "prospect" | "lost";
export type CustomerType = "corporate" | "sme" | "individual";
export type FollowUpType = "call" | "email" | "meeting" | "demo";
export type FollowUpStatus = "scheduled" | "completed" | "overdue" | "cancelled";
export type InstallmentStatus = "pending" | "partial" | "paid" | "overdue";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue";
export type PaymentMethod = "bank_transfer" | "upi" | "cheque" | "cash" | "card";

export interface SalesConfigItem {
  id: number;
  type: string;
  value: string;
  label: string;
  order: number;
  createdAt: string;
}

export interface SalesUser {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  position: string | null;
  source: string | null;
  contactChannel: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo: number | null;
  assignedToUser: SalesUser | null;
  expectedValue: number;
  description: string | null;
  reminder: { date: string; note: string } | null;
  tags: string[];
  customerId: number | null;
  clientId: number | null;
  proposalId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: number;
  leadId: number;
  type: string;
  description: string;
  actorId: number | null;
  actor: SalesUser | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface FollowUp {
  id: number;
  leadId: number;
  type: FollowUpType;
  status: FollowUpStatus;
  scheduledAt: string;
  completedAt: string | null;
  notes: string;
  executiveId: number | null;
  createdAt: string;
}

export interface ProposalItem {
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface Proposal {
  id: number;
  number: string;
  title: string;
  leadId: number | null;
  customerId: number | null;
  assignedTo: number | null;
  assignedToUser: SalesUser | null;
  status: ProposalStatus;
  items: ProposalItem[];
  discount: number;
  validUntil: string | null;
  clientNote: string;
  terms: string;
  internalNotes: string;
  revision: number;
  sentAt: string | null;
  seenAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  declinedReason: string | null;
  counterOfferNote: string | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  type: CustomerType;
  location: string | null;
  gstin: string | null;
  website: string | null;
  leadId: number | null;
  clientId: number | null;
  portalUserId: number | null;
  totalSales: number;
  outstanding: number;
  createdAt: string;
}

export interface Installment {
  id: number;
  projectId: number;
  customerId: number;
  name: string;
  dueAmount: number;
  paidAmount: number;
  dueDate: string;
  status: InstallmentStatus;
  invoiceId: number | null;
  createdAt: string;
}

export interface SalesInvoice {
  id: number;
  number: string;
  customerId: number;
  projectId: number | null;
  installmentId: number | null;
  proposalId: number | null;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface SalesPayment {
  id: number;
  invoiceId: number;
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId: string | null;
  recordedBy: number;
  receiptNumber: string;
  invoiceStatus: InvoiceStatus;
  createdAt: string;
}

export interface SalesProduct {
  id: number;
  name: string;
  category: string | null;
  price: number;
  taxPercent: number;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface SalesDashboard {
  leads: { total: number; today: number; thisWeek: number; thisMonth: number };
  activeFollowUps: number;
  totalProposals: number;
  activeCustomers: number;
  totalRevenue: number;
  totalBilled: number;
  outstanding: number;
  pendingInvoices: number;
  invoiceByStatus: Record<string, { count: number; amount: number }>;
}

// ─── Query Keys ───────────────────────────────────────────────────────────

export const salesKeys = {
  config: (type: string) => ["sales-config", type] as const,
  leads: (params?: object) => ["sales-leads", params] as const,
  lead: (id: number) => ["sales-lead", id] as const,
  leadActivity: (id: number) => ["sales-lead-activity", id] as const,
  followUps: (params?: object) => ["sales-follow-ups", params] as const,
  proposals: (params?: object) => ["sales-proposals", params] as const,
  proposal: (id: number) => ["sales-proposal", id] as const,
  customers: (params?: object) => ["sales-customers", params] as const,
  customer: (id: number) => ["sales-customer", id] as const,
  customerStatement: (id: number) => ["sales-customer-statement", id] as const,
  installments: (params?: object) => ["sales-installments", params] as const,
  installment: (id: number) => ["sales-installment", id] as const,
  invoices: (params?: object) => ["sales-invoices", params] as const,
  invoice: (id: number) => ["sales-invoice", id] as const,
  payment: (id: number) => ["sales-payment", id] as const,
  products: (params?: object) => ["sales-products", params] as const,
  dashboard: () => ["sales-dashboard"] as const,
  pipeline: () => ["sales-pipeline"] as const,
  revenueTrend: (period?: string) => ["sales-revenue-trend", period] as const,
};

// ─── Config ───────────────────────────────────────────────────────────────

export function useListSalesConfig(type: string, enabled = true) {
  return useQuery<{ items: SalesConfigItem[] }>({
    queryKey: salesKeys.config(type),
    queryFn: () => customFetch(apiUrl(`/api/sales/config?type=${type}`)),
    enabled: enabled && !!type,
    staleTime: 5 * 60_000,
  });
}

export function useAddSalesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: string; value: string; label: string }) =>
      customFetch(apiUrl("/api/sales/config"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.config(vars.type) });
    },
  });
}

export function useDeleteSalesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: number; type: string }) =>
      customFetch(apiUrl(`/api/sales/config/${id}`), { method: "DELETE" }).then(() => ({ type })),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: salesKeys.config((data as { type: string }).type) });
    },
  });
}

// ─── Leads ────────────────────────────────────────────────────────────────

export interface ListLeadsParams {
  status?: LeadStatus;
  assignedTo?: number;
  priority?: LeadPriority;
  source?: string;
  channel?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useListLeads(params?: ListLeadsParams, enabled = true) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ leads: Lead[]; total: number; page: number; limit: number }>({
    queryKey: salesKeys.leads(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/leads${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetLead(id: number, enabled = true) {
  return useQuery<Lead & { activities: LeadActivity[]; followUps: FollowUp[] }>({
    queryKey: salesKeys.lead(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/leads/${id}`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Lead> & { name: string }) =>
      customFetch<Lead>(apiUrl("/api/sales/leads"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-leads"] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Lead> & { id: number }) =>
      customFetch<Lead>(apiUrl(`/api/sales/leads/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
      qc.invalidateQueries({ queryKey: salesKeys.lead(vars.id) });
    },
  });
}

export function useBulkUpdateLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: number[]; status?: LeadStatus; assignedTo?: number | null }) =>
      customFetch(apiUrl("/api/sales/leads/bulk"), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-leads"] }),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      portalEmail: string;
      password: string;
      companyName?: string;
      gstin?: string;
      type?: CustomerType;
    }) =>
      customFetch<{ success: boolean; customerId: number; clientId: number; portalUserId: number }>(
        apiUrl(`/api/sales/leads/${id}/convert`),
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
    },
  });
}

export function useGetLeadActivity(id: number, enabled = true) {
  return useQuery<{ activities: LeadActivity[]; total: number }>({
    queryKey: salesKeys.leadActivity(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/leads/${id}/activity`)),
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

export function useSetLeadReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, note }: { id: number; date: string; note?: string }) =>
      customFetch(apiUrl(`/api/sales/leads/${id}/reminder`), {
        method: "POST",
        body: JSON.stringify({ date, note }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.lead(vars.id) });
    },
  });
}

// ─── Follow-ups ───────────────────────────────────────────────────────────

export function useListFollowUps(
  params?: { leadId?: number; status?: FollowUpStatus; executiveId?: number },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ followUps: FollowUp[]; total: number }>({
    queryKey: salesKeys.followUps(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/follow-ups${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      leadId: number;
      type: FollowUpType;
      scheduledAt: string;
      notes?: string;
      executiveId?: number;
    }) =>
      customFetch<FollowUp>(apiUrl("/api/sales/follow-ups"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-follow-ups"] }),
  });
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<FollowUp> & { id: number }) =>
      customFetch<FollowUp>(apiUrl(`/api/sales/follow-ups/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-follow-ups"] }),
  });
}

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/sales/follow-ups/${id}/complete`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-follow-ups"] }),
  });
}

// ─── Proposals ────────────────────────────────────────────────────────────

export function useListProposals(
  params?: { status?: ProposalStatus; assignedTo?: number; leadId?: number; customerId?: number },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ proposals: Proposal[]; total: number }>({
    queryKey: salesKeys.proposals(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/proposals${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetProposal(id: number, enabled = true) {
  return useQuery<Proposal>({
    queryKey: salesKeys.proposal(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/proposals/${id}`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      leadId?: number;
      customerId?: number;
      items?: ProposalItem[];
      discount?: number;
      validUntil?: string;
      clientNote?: string;
      terms?: string;
    }) =>
      customFetch<Proposal>(apiUrl("/api/sales/proposals"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-proposals"] }),
  });
}

export function useUpdateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Proposal> & { id: number }) =>
      customFetch<Proposal>(apiUrl(`/api/sales/proposals/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.proposal(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-proposals"] });
    },
  });
}

function proposalAction(action: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; [key: string]: unknown }) =>
      customFetch<Proposal>(apiUrl(`/api/sales/proposals/${id}/${action}`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.proposal(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-proposals"] });
    },
  });
}

export const useSendProposal = () => proposalAction("send");
export const useApproveProposal = () => proposalAction("approve");
export const useDeclineProposal = () => proposalAction("decline");
export const useCounterProposal = () => proposalAction("counter");
export const useReviseProposal = () => proposalAction("revise");

// ─── Customers ────────────────────────────────────────────────────────────

export function useListCustomers(
  params?: { status?: CustomerStatus; type?: CustomerType; search?: string; page?: number },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ customers: Customer[]; total: number }>({
    queryKey: salesKeys.customers(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/customers${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetCustomer(id: number, enabled = true) {
  return useQuery<Customer & { installments: Installment[]; invoices: SalesInvoice[] }>({
    queryKey: salesKeys.customer(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/customers/${id}`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Customer> & { companyName: string; contactPerson: string; email: string }) =>
      customFetch<Customer>(apiUrl("/api/sales/customers"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Customer> & { id: number }) =>
      customFetch<Customer>(apiUrl(`/api/sales/customers/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.customer(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
    },
  });
}

export function useGetCustomerStatement(id: number, enabled = true) {
  return useQuery<{
    customer: Customer;
    invoices: SalesInvoice[];
    payments: SalesPayment[];
    summary: { totalBilled: number; totalPaid: number; outstanding: number };
  }>({
    queryKey: salesKeys.customerStatement(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/customers/${id}/statement`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useRemindCustomer() {
  return useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) =>
      customFetch(apiUrl(`/api/sales/customers/${id}/remind`), {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
  });
}

// ─── Installments ─────────────────────────────────────────────────────────

export function useListInstallments(
  params?: { customerId?: number; projectId?: number; status?: InstallmentStatus },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ installments: Installment[]; total: number }>({
    queryKey: salesKeys.installments(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/installments${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetInstallment(id: number, enabled = true) {
  return useQuery<Installment>({
    queryKey: salesKeys.installment(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/installments/${id}`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      projectId: number;
      customerId: number;
      name: string;
      dueAmount: number;
      dueDate: string;
    }) =>
      customFetch<Installment>(apiUrl("/api/sales/installments"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-installments"] }),
  });
}

export function useUpdateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Installment> & { id: number }) =>
      customFetch<Installment>(apiUrl(`/api/sales/installments/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-installments"] }),
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export function useListInvoices(
  params?: { status?: InvoiceStatus; customerId?: number; projectId?: number; page?: number },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ invoices: SalesInvoice[]; total: number }>({
    queryKey: salesKeys.invoices(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/invoices${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useGetInvoice(id: number, enabled = true) {
  return useQuery<SalesInvoice>({
    queryKey: salesKeys.invoice(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/invoices/${id}`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      customerId: number;
      amount: number;
      dueDate: string;
      projectId?: number;
      installmentId?: number;
      proposalId?: number;
    }) =>
      customFetch<SalesInvoice>(apiUrl("/api/sales/invoices"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; amount?: number; dueDate?: string; status?: InvoiceStatus }) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
    },
  });
}

export function useCreateInvoiceFromProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, dueDate }: { proposalId: number; dueDate?: string }) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/from-proposal/${proposalId}`), {
        method: "POST",
        body: JSON.stringify({ dueDate }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-proposals"] });
    },
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────

export function useListPayments(
  params?: { invoiceId?: number; customerId?: number; page?: number },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{ payments: (SalesPayment & { invoiceStatus: string; invoiceNumber: string | null })[]; total: number; page: number; limit: number }>({
    queryKey: ["sales-payments", params],
    queryFn: () => customFetch(apiUrl(`/api/sales/payments${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      invoiceId: number;
      amount: number;
      paymentMethod: PaymentMethod;
      transactionId?: string;
    }) =>
      customFetch<SalesPayment>(apiUrl("/api/sales/payments"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-payments"] });
    },
  });
}

export function useGetReceipt(id: number, enabled = true) {
  return useQuery<{ payment: SalesPayment; invoice: SalesInvoice; customer: Customer }>({
    queryKey: salesKeys.payment(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/payments/${id}`)),
    enabled: enabled && !!id,
    staleTime: 60_000,
  });
}

// ─── Products ─────────────────────────────────────────────────────────────

export function useListProducts(params?: { status?: "active" | "inactive" }, enabled = true) {
  const qs = params?.status ? `?status=${params.status}` : "";
  return useQuery<{ products: SalesProduct[]; total: number }>({
    queryKey: salesKeys.products(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/products${qs}`)),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; price: number; category?: string; taxPercent?: number; description?: string }) =>
      customFetch<SalesProduct>(apiUrl("/api/sales/products"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<SalesProduct> & { id: number }) =>
      customFetch<SalesProduct>(apiUrl(`/api/sales/products/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-products"] }),
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export function useSalesDashboard(enabled = true) {
  return useQuery<SalesDashboard>({
    queryKey: salesKeys.dashboard(),
    queryFn: () => customFetch(apiUrl("/api/sales/dashboard")),
    enabled,
    staleTime: 60_000,
  });
}

export function useSalesPipeline(enabled = true) {
  return useQuery<{ pipeline: Record<string, number> }>({
    queryKey: salesKeys.pipeline(),
    queryFn: () => customFetch(apiUrl("/api/sales/dashboard/pipeline")),
    enabled,
    staleTime: 60_000,
  });
}

export function useSalesRevenueTrend(period?: "week" | "month" | "year", enabled = true) {
  const p = period ?? "month";
  return useQuery<{ trend: { date: string; revenue: number }[] }>({
    queryKey: salesKeys.revenueTrend(p),
    queryFn: () => customFetch(apiUrl(`/api/sales/dashboard/revenue-trend?period=${p}`)),
    enabled,
    staleTime: 60_000,
  });
}
