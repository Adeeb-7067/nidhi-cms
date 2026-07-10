import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

// ─── Types ────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "new" | "contacted" | "follow_up" | "interested"
  | "project_planning" | "proposal_sent" | "approved" | "converted" | "lost";
export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type ProposalStatus =
  | "draft" | "sent" | "seen" | "approved"
  | "declined" | "counter_offer" | "expired" | "revised";
export type CustomerStatus = "active" | "inactive" | "prospect" | "lost";
export type CustomerType = "corporate" | "sme" | "individual";
export type FollowUpType = "call" | "email" | "meeting" | "demo";
export type FollowUpStatus = "scheduled" | "completed" | "overdue" | "cancelled";
export type InstallmentStatus = "pending" | "partial" | "paid" | "overdue";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue" | "cancelled";
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

export interface PlanningDoc {
  name: string;
  url: string;
  uploadedAt: string;
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
  createdBy: number | null;
  createdByUser: SalesUser | null;
  expectedValue: number;
  description: string | null;
  reminder: { date: string; note: string } | null;
  tags: string[];
  planningDocs: PlanningDoc[];
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
  leadName?: string | null;
  leadCompany?: string | null;
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
  name: string;
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
  totalAdjustment?: number;
  adjustedTotal?: number | null;
  validUntil: string | null;
  clientNote: string;
  terms: string;
  internalNotes: string;
  revision: number;
  viewToken: string;
  sentAt: string | null;
  seenAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  declinedReason: string | null;
  counterOfferNote: string | null;
  approvalNote: string | null;
  clientSignature: string | null;
  projectId: number | null;
  emailSent?: boolean;
  sentToEmail?: string | null;
  lead?: ProposalLead | null;
  customer?: ProposalCustomer | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalCompanySettings {
  companyName: string;
  logoUrl: string | null;
  sealUrl: string | null;
  address: string | null;
}

export interface ProposalComment {
  id: number;
  proposalId: number;
  authorName: string;
  authorType: "client" | "staff";
  authorId: number | null;
  content: string;
  createdAt: string;
}

export type PublicProposal = Omit<Proposal, "internalNotes" | "viewToken"> & {
  companySettings: ProposalCompanySettings | null;
  documentBranding?: SalesDocumentBrandingFields;
};

export interface ProposalLog {
  id: number;
  proposalId: number;
  event: "viewed" | "approved" | "declined" | "counter_offer";
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  note: string | null;
  createdAt: string;
}

export interface ProposalLead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
}

export interface ProposalCustomer {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string | null;
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
  portalLogin?: boolean;
  directConversationId?: number | null;
  assignedAdminId?: number | null;
  assignedAdmin?: StaffUserSummary | null;
  createdBy?: number | null;
  createdByUser?: SalesUser | null;
  totalSales: number;
  totalCollected?: number;
  outstanding: number;
  hasPayments: boolean;
  createdAt: string;
}

export interface CustomersSummary {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  activeContacts: number;
  inactiveContacts: number;
  contactsLoggedInToday: number;
}

export type SalesClientTeamMemberStatus = "pending" | "active" | "inactive";

export interface SalesClientTeamMember {
  id: number;
  userId: number;
  clientCompanyId: number;
  companyName: string | null;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl?: string | null;
  title: string | null;
  status: SalesClientTeamMemberStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  lastInviteSentAt: string | null;
  inviteCount: number;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface StaffUserSummary {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: string;
  designation?: string | null;
  phoneNumber?: string | null;
  status?: string;
}

export interface CustomerHubProject {
  id: number;
  name: string;
  status: string;
  pmId?: number | null;
  pmName?: string | null;
  deadline?: string | null;
  type?: string | null;
}

export interface CustomerHubTeamMember {
  id: number;
  userId: number;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  title: string | null;
  role: string;
  status: string;
  avatarUrl?: string | null;
}

export interface CustomerHubTicket {
  id: number;
  subject: string;
  priority: string;
  status: string;
  assignedTo: number | null;
  assignedToName: string | null;
  projectId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerHubTask {
  id: number;
  taskNumber: string;
  title: string;
  projectId: number;
  projectName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  updatedAt: string | null;
}

export interface CustomerHubCredential {
  id: number;
  label?: string;
  name?: string;
  username?: string | null;
  url?: string | null;
  category?: string | null;
  projectId?: number;
  projectName?: string | null;
  setByLabel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CustomerHubData {
  assignedAdmin: StaffUserSummary | null;
  clientAdmin: StaffUserSummary | null;
  client: {
    id: number;
    companyName: string;
    status: string;
    tier: string;
    userId: number | null;
  } | null;
  projects: CustomerHubProject[];
  teamMembers: CustomerHubTeamMember[];
  tickets: CustomerHubTicket[];
  tasks: CustomerHubTask[];
  portalCredentials: CustomerHubCredential[];
  inventoryCredentials: CustomerHubCredential[];
  recentPayments: {
    id: number;
    amount: number;
    receiptNumber: string;
    invoiceId: number;
    paymentMethod: string;
    createdAt: string | null;
  }[];
}

export interface Installment {
  id: number;
  invoiceId: number | null;
  projectId: number | null;
  customerId: number;
  proposalId?: number | null;
  sequenceNumber?: number | null;
  sequenceTotal?: number | null;
  customerName?: string | null;
  name: string;
  dueAmount: number;
  calculatedAmount?: number | null;
  totalAdjustment?: number;
  adjustedTotal?: number | null;
  paidAmount: number;
  dueDate: string;
  status: InstallmentStatus;
  createdAt: string;
}

export interface SalesInvoice {
  id: number;
  number: string;
  title: string | null;
  customerId: number;
  customerName?: string | null;
  projectId: number | null;
  projectName?: string | null;
  installmentId: number | null;
  installmentName?: string | null;
  proposalId: number | null;
  lineItems: ProposalItem[];
  notes: string | null;
  terms: string | null;
  amount: number;
  calculatedAmount?: number | null;
  totalAdjustment?: number;
  adjustedTotal?: number | null;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  issueDate?: string | null;
  createdAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: number | null;
}

export interface SalesPayment {
  id: number;
  invoiceId: number;
  paymentInvoiceId?: number | null;
  invoiceNumber: string | null;
  installmentId: number | null;
  installmentName?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId: string | null;
  note: string | null;
  recordedBy: number;
  recordedByName?: string | null;
  recordedByAvatarUrl?: string | null;
  receiptNumber: string;
  paymentDate?: string | null;
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

export interface SalesOverdueCustomer {
  customerId: number;
  companyName: string;
  contactPerson: string | null;
  overdueAmount: number;
}

export interface SalesDashboard {
  leads: { total: number; today: number; thisWeek: number; thisMonth: number; closed?: number };
  totalLeadsClosed?: number;
  activeFollowUps: number;
  totalProposals: number;
  activeCustomers: number;
  totalRevenue: number;
  totalBilled: number;
  /** Sales = deals whose installment plan has been created. */
  totalSales: { count: number; value: number };
  /** Money actually collected via invoice payments, for the same window as totalSales. */
  totalCollected: number;
  /** Collected money from deals created within the window (see salesKpisPeriod). */
  newProjectMoney: number;
  /** Collected money from deals that predate the window — old-project collections. */
  oldProjectMoney: number;
  /** Effective window backing totalSales/totalCollected/new-old split (defaults to this month when no date filter is set). */
  salesKpisPeriod: { from: string | null; to: string | null };
  /** True when the caller supplied dateFrom/dateTo — the legacy metrics below (totalRevenue, outstanding, invoiceByStatus, pendingInvoices) are scoped to it when true, all-time when false. */
  isFiltered: boolean;
  overdueByCustomer: SalesOverdueCustomer[];
  /** True total across every overdue customer — overdueByCustomer is capped to the top 10 for display. */
  overdueTotal: number;
  outstanding: number;
  pendingInvoices: number;
  invoiceByStatus: Record<string, { count: number; amount: number }>;
  proposalByStatus?: Record<string, number>;
  leadsBySource?: { source: string; count: number }[];
}

export interface SalesDocumentCustomField {
  id: string;
  label: string;
  value: string;
  showOnInvoice: boolean;
  showOnReceipt: boolean;
  showOnProposal: boolean;
  showOnStatement: boolean;
}

export interface SalesDocumentBrandingFields {
  gstin: string;
  email: string;
  phone: string;
  pan: string | null;
  cin: string | null;
  website: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  customFields: SalesDocumentCustomField[];
}

export interface SalesAppSettings {
  proposalPrefix: string;
  proposalNextNumber: number;
  defaultTax: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderHours: number;
  overdueAlerts: boolean;
  documentBranding: SalesDocumentBrandingFields;
  updatedAt: string | null;
}

export interface SalesAlertNotification {
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

export const salesKeys = {
  config: (type: string) => ["sales-config", type] as const,
  leads: (params?: object) => ["sales-leads", params] as const,
  lead: (id: number) => ["sales-lead", id] as const,
  leadActivity: (id: number) => ["sales-lead-activity", id] as const,
  followUps: (params?: object) => ["sales-follow-ups", params] as const,
  proposals: (params?: object) => ["sales-proposals", params] as const,
  proposal: (id: number) => ["sales-proposal", id] as const,
  customers: (params?: object) => ["sales-customers", params] as const,
  customersSummary: () => ["sales-customers-summary"] as const,
  clientTeam: (params?: object) => ["sales-client-team", params] as const,
  customer: (id: number) => ["sales-customer", id] as const,
  customerStatement: (id: number) => ["sales-customer-statement", id] as const,
  installments: (params?: object) => ["sales-installments", params] as const,
  installment: (id: number) => ["sales-installment", id] as const,
  invoices: (params?: object) => ["sales-invoices", params] as const,
  invoice: (id: number) => ["sales-invoice", id] as const,
  payment: (id: number) => ["sales-payment", id] as const,
  products: (params?: object) => ["sales-products", params] as const,
  dashboard: (params?: object) => ["sales-dashboard", params] as const,
  pipeline: () => ["sales-pipeline"] as const,
  revenueTrend: (period?: string) => ["sales-revenue-trend", period] as const,
  reports: () => ["sales-reports"] as const,
  settings: () => ["sales-settings"] as const,
  notifications: (params?: object) => ["sales-notifications", params] as const,
  team: (params?: object) => ["sales-team", params] as const,
  teamMember: (id?: number | null, month?: number, year?: number) => ["sales-team-member", id, month, year] as const,
  bdeTargets: (userId?: number | null, year?: number) => ["sales-bde-targets", userId, year] as const,
  myTarget: (month?: number, year?: number) => ["sales-my-target", month, year] as const,
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

/** @alias useAddSalesConfig */
export const useCreateSalesConfig = useAddSalesConfig;

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

export function useSalesSettings(enabled = true) {
  return useQuery<SalesAppSettings>({
    queryKey: salesKeys.settings(),
    queryFn: () => customFetch(apiUrl("/api/sales/settings")),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateSalesSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SalesAppSettings>) =>
      customFetch<SalesAppSettings>(apiUrl("/api/sales/settings"), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesKeys.settings() }),
  });
}

export function useSalesNotifications(params?: { unreadOnly?: boolean; page?: number; limit?: number }, enabled = true) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  ).toString();
  return useQuery<{
    notifications: SalesAlertNotification[];
    unreadCount: number;
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: salesKeys.notifications(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/notifications${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useMarkSalesNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/sales/notifications/${id}/read`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-notifications"] }),
  });
}

export function useMarkAllSalesNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => customFetch(apiUrl("/api/sales/notifications/mark-all-read"), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-notifications"] }),
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

export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leads: Partial<Lead>[]) =>
      customFetch<{ created: number; errors: { row: number; message: string }[]; leads: Lead[] }>(
        apiUrl("/api/sales/leads/import"),
        { method: "POST", body: JSON.stringify({ leads }) },
      ),
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

export function useAddPlanningDoc(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: { name: string; url: string }) =>
      customFetch<Lead>(apiUrl(`/api/sales/leads/${leadId}`), {
        method: "PATCH",
        body: JSON.stringify({ addPlanningDoc: doc }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
      qc.invalidateQueries({ queryKey: salesKeys.lead(leadId) });
    },
  });
}

export function useRemovePlanningDoc(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      customFetch<Lead>(apiUrl(`/api/sales/leads/${leadId}`), {
        method: "PATCH",
        body: JSON.stringify({ removePlanningDoc: url }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
      qc.invalidateQueries({ queryKey: salesKeys.lead(leadId) });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean; id: number }>(apiUrl(`/api/sales/leads/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
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
      phone?: string;
      address?: string;
      industry?: string;
      website?: string;
      location?: string;
      gstin?: string;
      type?: CustomerType;
    }) =>
      customFetch<{ success: boolean; customerId: number; clientId: number; portalUserId: number }>(
        apiUrl(`/api/sales/leads/${id}/convert`),
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-leads"] });
      qc.invalidateQueries({ queryKey: salesKeys.lead(vars.id) });
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

export function useGetDueReminders(enabled = true) {
  return useQuery<{ leads: Array<{ id: number; name: string; reminder: { date: string; note: string } }> }>({
    queryKey: ["sales-due-reminders"],
    queryFn: () => customFetch(apiUrl("/api/sales/leads/due-reminders")),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Follow-ups ───────────────────────────────────────────────────────────

export function useListFollowUps(
  params?: { leadId?: number; status?: FollowUpStatus; executiveId?: number; search?: string; page?: number; limit?: number },
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-follow-ups"] });
      qc.invalidateQueries({ queryKey: salesKeys.lead(vars.leadId) });
      qc.invalidateQueries({ queryKey: salesKeys.leadActivity(vars.leadId) });
    },
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
  params?: { status?: ProposalStatus; assignedTo?: number; leadId?: number; customerId?: number; search?: string; page?: number; limit?: number },
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

export function useGetPublicProposal(token: string) {
  return useQuery<PublicProposal>({
    queryKey: ["public-proposal", token],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/sales/proposals/view/${token}`));
      if (!res.ok) throw new Error("Proposal not found");
      return res.json() as Promise<PublicProposal>;
    },
    enabled: !!token,
    staleTime: 0,
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
      assignedTo?: number;
      items?: ProposalItem[];
      discount?: number;
      totalAdjustment?: number;
      adjustedTotal?: number | null;
      validUntil?: string;
      clientNote?: string;
      terms?: string;
      internalNotes?: string;
      status?: ProposalStatus;
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

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ deleted: boolean; id: number }>(apiUrl(`/api/sales/proposals/${id}`), {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: salesKeys.proposal(id) });
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

export function useGetProposalLogs(id: number, enabled = true) {
  return useQuery<{ logs: ProposalLog[] }>({
    queryKey: ["proposal-logs", id],
    queryFn: () => customFetch(apiUrl(`/api/sales/proposals/${id}/logs`)),
    enabled: enabled && !!id,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

function publicProposalAction(token: string, action: "approve" | "decline" | "counter") {
  return useMutation({
    mutationFn: (body: { reason?: string; note?: string; signature?: string }) =>
      fetch(apiUrl(`/api/sales/proposals/public/${token}/${action}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message ?? "Action failed");
        }
        return res.json() as Promise<PublicProposal>;
      }),
  });
}

export const usePublicApproveProposal = (token: string) => publicProposalAction(token, "approve");
export const usePublicDeclineProposal = (token: string) => publicProposalAction(token, "decline");
export const usePublicCounterProposal = (token: string) => publicProposalAction(token, "counter");

export function usePublicProposalComments(token: string) {
  return useQuery<{ comments: ProposalComment[] }>({
    queryKey: ["proposal-comments-public", token],
    queryFn: () =>
      fetch(apiUrl(`/api/sales/proposals/public/${token}/comments`))
        .then((r) => r.json()),
    enabled: !!token,
    refetchInterval: 15_000,
  });
}

export function useAddPublicComment(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; authorName?: string }) =>
      fetch(apiUrl(`/api/sales/proposals/public/${token}/comments`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json() as Promise<ProposalComment>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal-comments-public", token] }),
  });
}

export function useProposalComments(id: number, enabled = true) {
  return useQuery<{ comments: ProposalComment[] }>({
    queryKey: ["proposal-comments", id],
    queryFn: () => customFetch(apiUrl(`/api/sales/proposals/${id}/comments`)),
    enabled: enabled && !!id,
    refetchInterval: 15_000,
  });
}

export function useAddStaffComment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string }) =>
      customFetch<ProposalComment>(apiUrl(`/api/sales/proposals/${id}/comments`), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal-comments", id] }),
  });
}

// ─── Customers ────────────────────────────────────────────────────────────

export function useListCustomers(
  params?: { status?: CustomerStatus; type?: CustomerType; search?: string; page?: number; limit?: number },
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

export function useCustomersSummary(enabled = true) {
  return useQuery<CustomersSummary>({
    queryKey: salesKeys.customersSummary(),
    queryFn: () => customFetch(apiUrl("/api/sales/customers/summary")),
    enabled,
    staleTime: 60_000,
  });
}

export function useListSalesClientTeam(
  params?: {
    status?: SalesClientTeamMemberStatus;
    search?: string;
    customerId?: number;
    page?: number;
    limit?: number;
  },
  enabled = true,
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  ).toString();
  return useQuery<{ members: SalesClientTeamMember[]; total: number }>({
    queryKey: salesKeys.clientTeam(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/client-team${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useDeactivateSalesClientTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(apiUrl(`/api/sales/client-team/${id}/deactivate`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-client-team"] });
      qc.invalidateQueries({ queryKey: salesKeys.customersSummary() });
    },
  });
}

export function useReactivateSalesClientTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ member: SalesClientTeamMember }>(apiUrl(`/api/sales/client-team/${id}/reactivate`), {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-client-team"] });
      qc.invalidateQueries({ queryKey: salesKeys.customersSummary() });
    },
  });
}

export function useResendSalesClientTeamInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ invitation: { sent: boolean; temporaryPassword?: string } }>(
        apiUrl(`/api/sales/client-team/${id}/resend-invitation`),
        { method: "POST" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-client-team"] }),
  });
}

export function useResetSalesClientTeamPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword?: string }) =>
      customFetch<{ message: string; temporaryPassword?: string }>(
        apiUrl(`/api/sales/client-team/${id}/reset-password`),
        { method: "POST", body: JSON.stringify(newPassword ? { newPassword } : {}) },
      ),
  });
}

export function useGetCustomer(id: number, enabled = true) {
  return useQuery<
    Customer & { installments: Installment[]; invoices: SalesInvoice[]; assignedAdmin?: StaffUserSummary | null }
  >({
    queryKey: salesKeys.customer(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/customers/${id}`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useGetCustomerHub(id: number, enabled = true) {
  return useQuery<CustomerHubData>({
    queryKey: [...salesKeys.customer(id), "hub"],
    queryFn: () => customFetch(apiUrl(`/api/sales/customers/${id}/hub`)),
    enabled: enabled && !!id,
    staleTime: 30_000,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Customer> & {
      companyName: string;
      contactPerson: string;
      email: string;
      enablePortal?: boolean;
      portalEmail?: string;
      password?: string;
      industry?: string | null;
    }) =>
      customFetch<Customer & { directConversationId?: number | null }>(
        apiUrl("/api/sales/customers"),
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      qc.invalidateQueries({ queryKey: salesKeys.customersSummary() });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Customer> & { id: number; assignedAdminId?: number | null }) =>
      customFetch<Customer>(apiUrl(`/api/sales/customers/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.customer(vars.id) });
      qc.invalidateQueries({ queryKey: [...salesKeys.customer(vars.id), "hub"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      qc.invalidateQueries({ queryKey: salesKeys.customersSummary() });
    },
  });
}

export function useAssignCustomerAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedAdminId }: { id: number; assignedAdminId: number | null }) =>
      customFetch<Customer>(apiUrl(`/api/sales/customers/${id}`), {
        method: "PATCH",
        body: JSON.stringify({ assignedAdminId }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.customer(vars.id) });
      qc.invalidateQueries({ queryKey: [...salesKeys.customer(vars.id), "hub"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(apiUrl(`/api/sales/customers/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      qc.invalidateQueries({ queryKey: salesKeys.dashboard() });
      qc.invalidateQueries({ queryKey: salesKeys.customersSummary() });
    },
  });
}

export function useProvisionCustomerPortal() {
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
      industry?: string;
    }) =>
      customFetch<{
        success: boolean;
        customerId: number;
        clientId: number;
        portalUserId: number;
        directConversationId: number | null;
        customer: Customer;
      }>(
        apiUrl(`/api/sales/customers/${id}/provision-portal`),
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.customer(vars.id) });
      qc.invalidateQueries({ queryKey: [...salesKeys.customer(vars.id), "hub"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
    },
  });
}

export function useBootstrapCustomerDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ directConversationId: number; customer: Customer }>(
        apiUrl(`/api/sales/customers/${id}/bootstrap-discussion`),
        { method: "POST" }
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: salesKeys.customer(id) });
      qc.invalidateQueries({ queryKey: [...salesKeys.customer(id), "hub"] });
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
      customFetch<{
        success: boolean;
        sentTo: string;
        message: string;
        outstanding: number;
        emailSent: boolean;
        emailReason?: string | null;
      }>(apiUrl(`/api/sales/customers/${id}/remind`), {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
  });
}

// ─── Installments ─────────────────────────────────────────────────────────

export function useListInstallments(
  params?: { customerId?: number; projectId?: number; invoiceId?: number; proposalId?: number; status?: InstallmentStatus; search?: string; page?: number; limit?: number },
  enabled = true
) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{
    installments: Installment[];
    total: number;
    summary: { total: number; pending: number; partial: number; paid: number; overdue: number; outstanding: number };
  }>({
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
      name: string;
      dueAmount: number;
      dueDate: string;
      invoiceId?: number;
      projectId?: number;
      customerId?: number;
      proposalId?: number;
      calculatedAmount?: number;
      totalAdjustment?: number;
      adjustedTotal?: number | null;
    }) =>
      customFetch<Installment>(apiUrl("/api/sales/installments"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      if (vars.invoiceId) {
        qc.invalidateQueries({ queryKey: salesKeys.invoice(vars.invoiceId) });
        qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      }
      const customerId = vars.customerId ?? data?.customerId;
      if (customerId) {
        qc.invalidateQueries({ queryKey: salesKeys.customer(customerId) });
      }
    },
  });
}

export function useCreateInstallmentsFromProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      proposalId,
      installments,
    }: {
      proposalId: number;
      installments: Array<{
        name: string;
        dueAmount: number;
        dueDate: string;
        calculatedAmount?: number;
        totalAdjustment?: number;
        adjustedTotal?: number | null;
      }>;
    }) =>
      customFetch<{ installments: Installment[] }>(
        apiUrl(`/api/sales/proposals/${proposalId}/installments`),
        { method: "POST", body: JSON.stringify({ installments }) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      qc.invalidateQueries({ queryKey: salesKeys.proposal(vars.proposalId) });
      qc.invalidateQueries({ queryKey: ["sales-proposals"] });
    },
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
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.installment(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      const customerId = data?.customerId ?? vars.customerId;
      if (customerId) {
        qc.invalidateQueries({ queryKey: salesKeys.customer(customerId) });
        qc.invalidateQueries({ queryKey: [...salesKeys.customer(customerId), "hub"] });
      }
    },
  });
}

export function useReceiveInstallmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      installmentId,
      amount,
      paymentMethod,
      paymentDate,
      transactionId,
      note,
    }: {
      installmentId: number;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentDate?: string;
      transactionId?: string;
      note?: string;
    }) =>
      customFetch<{
        payment: SalesPayment;
        invoice: SalesInvoice;
        invoiceCreated: boolean;
      }>(apiUrl(`/api/sales/installments/${installmentId}/receive-payment`), {
        method: "POST",
        body: JSON.stringify({ amount, paymentMethod, paymentDate, transactionId, note }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.installment(vars.installmentId) });
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-payments"] });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export function useListInvoices(
  params?: { status?: InvoiceStatus; customerId?: number; projectId?: number; search?: string; page?: number; limit?: number },
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

export type InvoiceFormBody = {
  customerId: number;
  dueDate: string;
  issueDate?: string;
  title?: string | null;
  notes?: string | null;
  terms?: string | null;
  projectId?: number | null;
  installmentId?: number | null;
  proposalId?: number | null;
  lineItems?: ProposalItem[];
  amount?: number;
  calculatedAmount?: number;
  totalAdjustment?: number;
  adjustedTotal?: number | null;
};

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InvoiceFormBody) =>
      customFetch<SalesInvoice>(apiUrl("/api/sales/invoices"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      if (data?.customerId) {
        qc.invalidateQueries({ queryKey: salesKeys.customer(data.customerId) });
        qc.invalidateQueries({ queryKey: salesKeys.customerStatement(data.customerId) });
      }
    },
  });
}

export type InvoiceUpdateBody = Partial<InvoiceFormBody> & {
  id: number;
  status?: InvoiceStatus;
  amount?: number;
};

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: InvoiceUpdateBody) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      qc.invalidateQueries({ queryKey: salesKeys.dashboard() });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/${id}/cancel`), {
        method: "POST",
        body: JSON.stringify({ reason: reason?.trim() || undefined }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      qc.invalidateQueries({ queryKey: salesKeys.dashboard() });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
    },
  });
}

export function useReassignInvoiceCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, customerId }: { id: number; customerId: number }) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/${id}/reassign-customer`), {
        method: "POST",
        body: JSON.stringify({ customerId }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.invoice(vars.id) });
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      qc.invalidateQueries({ queryKey: salesKeys.dashboard() });
    },
    meta: { errorMessage: "Could not reassign customer" },
  });
}

export function useCreateInvoiceFromInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      installmentId,
      dueDate,
    }: {
      installmentId: number;
      dueDate?: string;
    }) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/from-installment/${installmentId}`), {
        method: "POST",
        body: JSON.stringify({ dueDate }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: salesKeys.installment(vars.installmentId) });
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
    },
  });
}

export function useCreateInvoiceFromProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      proposalId,
      dueDate,
      totalAdjustment,
      adjustedTotal,
    }: {
      proposalId: number;
      dueDate?: string;
      totalAdjustment?: number;
      adjustedTotal?: number | null;
    }) =>
      customFetch<SalesInvoice>(apiUrl(`/api/sales/invoices/from-proposal/${proposalId}`), {
        method: "POST",
        body: JSON.stringify({ dueDate, totalAdjustment, adjustedTotal }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      qc.invalidateQueries({ queryKey: ["sales-proposals"] });
    },
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────

export function useListPayments(
  params?: { invoiceId?: number; installmentId?: number; customerId?: number; search?: string; page?: number; limit?: number },
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
      invoiceId?: number;
      installmentId?: number;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentDate?: string;
      transactionId?: string;
      note?: string;
    }) =>
      customFetch<SalesPayment>(apiUrl("/api/sales/payments"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales-invoices"] });
      const invoiceId = vars.invoiceId ?? data?.invoiceId;
      if (invoiceId) {
        qc.invalidateQueries({ queryKey: salesKeys.invoice(invoiceId) });
      }
      qc.invalidateQueries({ queryKey: ["sales-payments"] });
      qc.invalidateQueries({ queryKey: ["sales-installments"] });
      qc.invalidateQueries({ queryKey: salesKeys.dashboard() });
      qc.invalidateQueries({ queryKey: ["sales-customers"] });
      qc.invalidateQueries({ queryKey: ["sales-team"] });
      if (data?.recordedBy) {
        qc.invalidateQueries({ queryKey: salesKeys.teamMember(data.recordedBy) });
      }
      if (data?.customerId) {
        qc.invalidateQueries({ queryKey: salesKeys.customer(data.customerId) });
        qc.invalidateQueries({ queryKey: salesKeys.customerStatement(data.customerId) });
      }
    },
  });
}

export function useGetReceipt(id: number, enabled = true) {
  return useQuery<{ payment: SalesPayment; invoice: SalesInvoice; customer: Customer | null; installment: Installment | null }>({
    queryKey: salesKeys.payment(id),
    queryFn: () => customFetch(apiUrl(`/api/sales/payments/${id}`)),
    enabled: enabled && !!id,
    staleTime: 60_000,
  });
}

// ─── Products ─────────────────────────────────────────────────────────────

export function useListProducts(params?: { status?: "active" | "inactive" }, enabled = true) {
  const qs = new URLSearchParams({ limit: "1000" });
  if (params?.status) qs.set("status", params.status);
  return useQuery<{ products: SalesProduct[]; total: number }>({
    queryKey: salesKeys.products(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/products?${qs}`)),
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

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean; id: number }>(apiUrl(`/api/sales/products/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-products"] }),
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export function useSalesDashboard(dateRange?: { dateFrom?: string; dateTo?: string }, enabled = true) {
  const qs = new URLSearchParams(
    Object.entries(dateRange ?? {}).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<SalesDashboard>({
    queryKey: salesKeys.dashboard(dateRange),
    queryFn: () => customFetch(apiUrl(`/api/sales/dashboard${qs ? `?${qs}` : ""}`)),
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
  return useQuery<{ trend: { date: string; billed: number; collected: number; revenue: number }[] }>({
    queryKey: salesKeys.revenueTrend(p),
    queryFn: () => customFetch(apiUrl(`/api/sales/dashboard/revenue-trend?period=${p}`)),
    enabled,
    staleTime: 60_000,
  });
}

export interface SalesReports {
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  executivePerformance: { userId: number; name: string; revenue: number; payments: number }[];
  monthlyCollections: { month: string; collected: number; outstanding: number }[];
  outstandingVsPaid: { name: string; value: number }[];
}

export function useSalesReports(enabled = true) {
  return useQuery<SalesReports>({
    queryKey: salesKeys.reports(),
    queryFn: () => customFetch(apiUrl("/api/sales/reports")),
    enabled,
    staleTime: 60_000,
  });
}

export interface SalesTeamMember {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  employeeId: string | null;
  designation: string;
  role: "bde";
  status?: string;
  phoneNumber?: string | null;
  joiningDate?: string | null;
  department?: string | null;
  subType?: string | null;
  linkedinUrl?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  presenceStatus?: string | null;
  isActiveNow?: boolean;
  revenue: number;
  /** Sum of installment schedules created for deals this BDE closed (period-scoped when month/year set). */
  closedProjectValue: number;
  dealsClosed: number;
  leadCount: number;
  pendingFollowUps: number;
}

export interface SalesTeamListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  /** BDE dashboard leaderboard — returns stats-only rows (no roster/contact fields). */
  leaderboard?: boolean;
  /** When both are set, scopes each member's revenue/closedProjectValue/dealsClosed/leadCount to that month instead of all-time. */
  month?: number;
  year?: number;
}

export interface SalesTeamMemberDetail {
  member: Record<string, unknown> & SalesTeamMember;
  /** Present only when month/year were passed to useSalesTeamMember — scopes revenue/deals/leads to that period. */
  periodStats: {
    month: number;
    year: number;
    revenue: number;
    /** Closed project value this month (installment schedule totals for deals closed). */
    closedProjectValue: number;
    dealsClosed: number;
    leadCount: number;
    /** Deals whose installment plan was created within the period. */
    salesCount: number;
    salesValue: number;
    totalCollected: number;
    newProjectMoney: number;
    oldProjectMoney: number;
  } | null;
  /** Current overdue balance per customer this BDE owns, regardless of period. */
  overdueByCustomer: SalesOverdueCustomer[];
  /** True total across every overdue customer — overdueByCustomer is capped to the top 10 for display. */
  overdueTotal: number;
  stats: {
    revenue: number;
    dealsClosed: number;
    pendingFollowUps: number;
    leadCount: number;
    proposalCount: number;
  };
  leadsByStatus: { status: string; count: number }[];
  proposalsByStatus: { status: string; count: number }[];
  recentLeads: {
    id: number;
    name: string;
    company: string | null;
    status: string;
    priority: string;
    expectedValue: number;
    createdAt: string | null;
  }[];
  recentProposals: {
    id: number;
    title: string;
    status: string;
    totalAmount: number;
    createdAt: string | null;
  }[];
  followUps: {
    id: number;
    leadId: number;
    leadName?: string | null;
    type: string;
    status: string;
    scheduledAt: string | null;
    notes: string;
  }[];
}

export function useSalesTeam(params?: SalesTeamListParams, enabled = true) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])
  ).toString();
  return useQuery<{
    team: SalesTeamMember[];
    totals: { count: number; revenue: number; dealsClosed: number; pendingFollowUps: number };
    summary?: { total: number; active: number; inactive: number };
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: salesKeys.team(params),
    queryFn: () => customFetch(apiUrl(`/api/sales/team${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 60_000,
  });
}

export function useSalesTeamMember(userId: number | null, enabled = true, month?: number, year?: number) {
  const qs = month != null && year != null ? `?month=${month}&year=${year}` : "";
  return useQuery<SalesTeamMemberDetail>({
    queryKey: salesKeys.teamMember(userId, month, year),
    queryFn: () => customFetch(apiUrl(`/api/sales/team/${userId}${qs}`)),
    enabled: enabled && userId != null && userId > 0,
    staleTime: 30_000,
  });
}

// ─── BDE Targets ──────────────────────────────────────────────────────────

export interface BdeTarget {
  id: number;
  userId: number;
  month: number;
  year: number;
  /** Closed project value target (₹). Progress = installment schedule value for deals closed this month. */
  revenueTarget: number | null;
  dealsTarget: number | null;
  leadsTarget: number | null;
  setBy: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpsertBdeTargetBody = {
  userId: number;
  month: number;
  year: number;
  revenueTarget?: number | null;
  dealsTarget?: number | null;
  leadsTarget?: number | null;
  notes?: string | null;
};

export function useBdeTargets(userId: number | null, year?: number, enabled = true) {
  const y = year ?? new Date().getFullYear();
  return useQuery<{ targets: BdeTarget[] }>({
    queryKey: salesKeys.bdeTargets(userId, y),
    queryFn: () => customFetch(apiUrl(`/api/sales/team/${userId}/targets?year=${y}`)),
    enabled: enabled && userId != null && userId > 0,
    staleTime: 60_000,
  });
}

export function useMyBdeTarget(month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  return useQuery<{ target: BdeTarget | null }>({
    queryKey: salesKeys.myTarget(m, y),
    queryFn: () => customFetch(apiUrl(`/api/sales/targets/me?month=${m}&year=${y}`)),
    staleTime: 60_000,
  });
}

export function useAllBdeTargets(month?: number, year?: number, enabled = true) {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  return useQuery<{ targets: BdeTarget[]; month: number; year: number }>({
    queryKey: ["sales-all-bde-targets", m, y],
    queryFn: () => customFetch(apiUrl(`/api/sales/targets?month=${m}&year=${y}`)),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpsertBdeTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertBdeTargetBody) =>
      customFetch<BdeTarget>(apiUrl(`/api/sales/team/${body.userId}/targets`), {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: salesKeys.bdeTargets(vars.userId, vars.year) });
      qc.invalidateQueries({ queryKey: salesKeys.myTarget(vars.month, vars.year) });
      qc.invalidateQueries({ queryKey: ["sales-my-target"] });
    },
  });
}
