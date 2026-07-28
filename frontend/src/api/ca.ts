import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import type {
  CaTask,
  CaTaskStatus,
  CaTaskPriority,
  CaDocument,
  DocumentCategory,
  ComplianceCalendarItem,
  ComplianceTimingStatus,
  CaNotice,
  NoticeDepartment,
  NoticeWorkflowStatus,
  CaAlert,
  ComplianceStatusRow,
  ComplianceScoreBreakdown,
  AuditPhase,
  GstReturnFiling,
  TdsReturn,
  TdsCertificate,
  CompanyItr,
  DirectorItr,
  RocFiling,
  DinDscRecord,
  AuditRecord,
  SuspenseEntry,
} from "@/modules/ca/types";

function toQueryString(params?: object) {
  if (!params) return "";
  const qs = new URLSearchParams(
    Object.entries(params as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `?${qs}` : "";
}

export const caKeys = {
  dashboard: (period?: string) => ["ca", "dashboard", period] as const,
  tasks: (params?: object) => ["ca", "tasks", params] as const,
  task: (id: number) => ["ca", "task", id] as const,
  documents: (params?: object) => ["ca", "documents", params] as const,
  calendar: (params?: object) => ["ca", "calendar", params] as const,
  notices: (params?: object) => ["ca", "notices", params] as const,
};

export interface CaDashboardKpisDto {
  totalRevenue: number;
  totalExpenses: number;
  gstLiability: number;
  pendingGstFilings: number;
  pendingRocFilings: number;
  suspenseAmount: number;
  auditStatus: AuditPhase;
  overallComplianceScore: number;
  openTasks: number;
  openNotices: number;
  overdueComplianceItems: number;
  outstandingPayables: number;
  pendingInvoices: number;
  queueTotal?: number;
  queueBlocked?: number;
  queueDueSoon?: number;
}

export type CaWorkQueueUrgency = "overdue" | "due_soon" | "blocked" | "open";

export type CaWorkQueueKind =
  | "calendar"
  | "gst"
  | "tds"
  | "roc"
  | "notice"
  | "task"
  | "dsc"
  | "suspense"
  | "bank";

export interface CaWorkQueueItem {
  id: string;
  kind: CaWorkQueueKind;
  title: string;
  subtitle: string;
  dueDate: string | null;
  owner: string;
  urgency: CaWorkQueueUrgency;
  href: string;
}

export interface CaWorkQueueDto {
  items: CaWorkQueueItem[];
  counts: {
    overdue: number;
    dueSoon: number;
    blocked: number;
    open: number;
    total: number;
  };
}

export interface CaDashboardDto {
  period: string;
  kpis: CaDashboardKpisDto;
  alerts: CaAlert[];
  complianceStatus: ComplianceStatusRow[];
  workQueue?: CaWorkQueueDto;
  scoreBreakdown: ComplianceScoreBreakdown;
}

export function useCaDashboard(period: "current" | "previous" = "current", enabled = true) {
  return useQuery<CaDashboardDto>({
    queryKey: caKeys.dashboard(period),
    queryFn: () => customFetch(apiUrl(`/api/ca/dashboard${toQueryString({ period })}`)),
    enabled,
    staleTime: 30_000,
  });
}

// ─── Tasks ───────────────────────────────────────────────────────────────

export type CaTaskDto = CaTask & {
  assignedById?: number | null;
  assignedToId?: number | null;
  description?: string | null;
};

export function useCaTasks(
  params?: { status?: string; priority?: string; category?: string; search?: string; page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  return useQuery<{ tasks: CaTaskDto[]; total: number; page: number; limit: number }>({
    queryKey: caKeys.tasks(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/ca/tasks${toQueryString(params)}`)),
  });
}

export function useCreateCaTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      category: string;
      status?: CaTaskStatus;
      priority?: CaTaskPriority;
      dueDate?: string | null;
      assignedById?: number | null;
      assignedToId?: number | null;
      assignedByName?: string | null;
      assignedToName?: string | null;
      description?: string | null;
    }) => customFetch<CaTaskDto>(apiUrl("/api/ca/tasks"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

export function useUpdateCaTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CaTaskDto> & { id: number }) =>
      customFetch<CaTaskDto>(apiUrl(`/api/ca/tasks/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

export function useDeleteCaTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/ca/tasks/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "tasks"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

// ─── Documents ───────────────────────────────────────────────────────────

export type CaDocumentDto = CaDocument & {
  fileUrl?: string | null;
  uploadedById?: number | null;
  linkedEntityType?: string | null;
  linkedEntityId?: number | null;
};

export function useCaDocuments(
  params?: { category?: string; search?: string; page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  return useQuery<{ documents: CaDocumentDto[]; total: number; page: number; limit: number }>({
    queryKey: caKeys.documents(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/ca/documents${toQueryString(params)}`)),
  });
}

export function useCreateCaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      category: DocumentCategory;
      version?: string;
      fileUrl?: string | null;
      uploadedAt?: string;
      linkedEntityType?: string | null;
      linkedEntityId?: number | null;
    }) =>
      customFetch<CaDocumentDto>(apiUrl("/api/ca/documents"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ca", "documents"] }),
  });
}

export function useUpdateCaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CaDocumentDto> & { id: number }) =>
      customFetch<CaDocumentDto>(apiUrl(`/api/ca/documents/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ca", "documents"] }),
  });
}

export function useDeleteCaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/ca/documents/${id}`), { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ca", "documents"] }),
  });
}

// ─── Calendar ────────────────────────────────────────────────────────────

export type CaCalendarEventDto = ComplianceCalendarItem & {
  ownerName?: string | null;
  notes?: string | null;
};

export function useCaCalendarEvents(
  params?: { status?: string; category?: string; search?: string; page?: number; limit?: number },
  options?: { enabled?: boolean },
) {
  return useQuery<{ events: CaCalendarEventDto[]; total: number; page: number; limit: number }>({
    queryKey: caKeys.calendar(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/ca/calendar-events${toQueryString(params)}`)),
  });
}

export function useCreateCaCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      category: ComplianceCalendarItem["category"];
      dueDate: string;
      status?: ComplianceTimingStatus;
      ownerName?: string | null;
      notes?: string | null;
    }) =>
      customFetch<CaCalendarEventDto>(apiUrl("/api/ca/calendar-events"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "calendar"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

export function useUpdateCaCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CaCalendarEventDto> & { id: number }) =>
      customFetch<CaCalendarEventDto>(apiUrl(`/api/ca/calendar-events/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "calendar"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

export function useDeleteCaCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/ca/calendar-events/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "calendar"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

// ─── Notices ─────────────────────────────────────────────────────────────

export type CaNoticeDto = CaNotice & { assignedToId?: number | null; replyNotes?: string | null };

export function useCaNotices(
  params?: {
    workflowStatus?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  return useQuery<{ notices: CaNoticeDto[]; total: number; page: number; limit: number }>({
    queryKey: caKeys.notices(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/ca/notices${toQueryString(params)}`)),
  });
}

export function useCreateCaNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      department: NoticeDepartment;
      reference: string;
      subject: string;
      receivedAt: string;
      dueDate: string;
      workflowStatus?: NoticeWorkflowStatus;
      assignedToId?: number | null;
      assignedToName?: string | null;
      replyNotes?: string | null;
    }) =>
      customFetch<CaNoticeDto>(apiUrl("/api/ca/notices"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "notices"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

export function useUpdateCaNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CaNoticeDto> & { id: number }) =>
      customFetch<CaNoticeDto>(apiUrl(`/api/ca/notices/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "notices"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

export function useDeleteCaNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/ca/notices/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "notices"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
    },
  });
}

// ─── Phase 2 helpers ─────────────────────────────────────────────────────

function makeListHook<T>(key: string, path: string, _resultKey: string) {
  return function useList(
    params?: Record<string, string | number | boolean | undefined>,
    options?: { enabled?: boolean },
  ) {
    return useQuery<{
      filings?: T[];
      returns?: T[];
      certificates?: T[];
      records?: T[];
      entries?: T[];
      total: number;
      page: number;
      limit: number;
    }>({
      queryKey: ["ca", key, params],
      enabled: options?.enabled ?? true,
      queryFn: () => customFetch(apiUrl(`/api/ca/${path}${toQueryString(params)}`)),
    });
  };
}

function invalidateCa(qc: ReturnType<typeof useQueryClient>, ...keys: string[]) {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: ["ca", key] });
  }
  void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
  void qc.invalidateQueries({ queryKey: ["ca", "compliance-score"] });
}

function makeMutations<TCreate extends object, TDto>(path: string, invalidateKeys: string[]) {
  return {
    useCreate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: TCreate) =>
          customFetch<TDto>(apiUrl(`/api/ca/${path}`), { method: "POST", body: JSON.stringify(body) }),
        onSuccess: () => invalidateCa(qc, ...invalidateKeys),
      });
    },
    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, ...body }: Partial<TDto> & { id: number }) =>
          customFetch<TDto>(apiUrl(`/api/ca/${path}/${id}`), {
            method: "PATCH",
            body: JSON.stringify(body),
          }),
        onSuccess: () => invalidateCa(qc, ...invalidateKeys),
      });
    },
    useDelete() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: number) => customFetch(apiUrl(`/api/ca/${path}/${id}`), { method: "DELETE" }),
        onSuccess: () => invalidateCa(qc, ...invalidateKeys),
      });
    },
  };
}

export type CaGstFilingDto = GstReturnFiling & { lateFee?: number; interest?: number; notes?: string | null };
export type CaTdsReturnDto = TdsReturn & { filedAt?: string | null; notes?: string | null };
export type CaTdsCertificateDto = TdsCertificate & { issuedAt?: string | null; financialYear?: string | null };
export type CaCompanyItrDto = CompanyItr & {
  id: number;
  documents?: Array<{ id: number; name: string; uploaded: boolean; fileUrl?: string | null }>;
};
export type CaDirectorItrDto = DirectorItr;
export type CaRocFilingDto = RocFiling & { notes?: string | null };
export type CaDinDscDto = DinDscRecord & { notes?: string | null };
export type CaAuditDto = AuditRecord & {
  firm?: string | null;
  partner?: string | null;
  membershipNo?: string | null;
  notes?: string | null;
};
export type CaSuspenseDto = SuspenseEntry & {
  financePaymentId?: number | null;
  assignedClientId?: number | null;
  assignedVendorId?: number | null;
  resolvedAt?: string | null;
};

export const useCaGstFilings = makeListHook<CaGstFilingDto>("gst-filings", "gst-filings", "filings");
export const useCaTdsReturns = makeListHook<CaTdsReturnDto>("tds-returns", "tds-returns", "returns");
export const useCaTdsCertificates = makeListHook<CaTdsCertificateDto>(
  "tds-certificates",
  "tds-certificates",
  "certificates",
);
export const useCaCompanyItr = makeListHook<CaCompanyItrDto>("company-itr", "company-itr", "records");
export const useCaDirectorItr = makeListHook<CaDirectorItrDto>("director-itr", "director-itr", "records");
export const useCaRocFilings = makeListHook<CaRocFilingDto>("roc-filings", "roc-filings", "filings");
export const useCaDinDsc = makeListHook<CaDinDscDto>("din-dsc", "din-dsc", "records");
export const useCaAudits = makeListHook<CaAuditDto>("audits", "audits", "records");
export const useCaSuspense = makeListHook<CaSuspenseDto>("suspense", "suspense", "entries");

const gstMut = makeMutations<Partial<CaGstFilingDto>, CaGstFilingDto>("gst-filings", ["gst-filings"]);
export const useCreateCaGstFiling = gstMut.useCreate;
export const useUpdateCaGstFiling = gstMut.useUpdate;
export const useDeleteCaGstFiling = gstMut.useDelete;

const tdsRetMut = makeMutations<Partial<CaTdsReturnDto>, CaTdsReturnDto>("tds-returns", ["tds-returns"]);
export const useCreateCaTdsReturn = tdsRetMut.useCreate;
export const useUpdateCaTdsReturn = tdsRetMut.useUpdate;
export const useDeleteCaTdsReturn = tdsRetMut.useDelete;

const tdsCertMut = makeMutations<Partial<CaTdsCertificateDto>, CaTdsCertificateDto>("tds-certificates", [
  "tds-certificates",
]);
export const useCreateCaTdsCertificate = tdsCertMut.useCreate;
export const useUpdateCaTdsCertificate = tdsCertMut.useUpdate;
export const useDeleteCaTdsCertificate = tdsCertMut.useDelete;

const companyItrMut = makeMutations<Partial<CaCompanyItrDto>, CaCompanyItrDto>("company-itr", ["company-itr"]);
export const useCreateCaCompanyItr = companyItrMut.useCreate;
export const useUpdateCaCompanyItr = companyItrMut.useUpdate;
export const useDeleteCaCompanyItr = companyItrMut.useDelete;

const directorItrMut = makeMutations<Partial<CaDirectorItrDto>, CaDirectorItrDto>("director-itr", [
  "director-itr",
]);
export const useCreateCaDirectorItr = directorItrMut.useCreate;
export const useUpdateCaDirectorItr = directorItrMut.useUpdate;
export const useDeleteCaDirectorItr = directorItrMut.useDelete;

const rocMut = makeMutations<Partial<CaRocFilingDto>, CaRocFilingDto>("roc-filings", ["roc-filings"]);
export const useCreateCaRocFiling = rocMut.useCreate;
export const useUpdateCaRocFiling = rocMut.useUpdate;
export const useDeleteCaRocFiling = rocMut.useDelete;

const dinMut = makeMutations<Partial<CaDinDscDto>, CaDinDscDto>("din-dsc", ["din-dsc"]);
export const useCreateCaDinDsc = dinMut.useCreate;
export const useUpdateCaDinDsc = dinMut.useUpdate;
export const useDeleteCaDinDsc = dinMut.useDelete;

const auditMut = makeMutations<Partial<CaAuditDto>, CaAuditDto>("audits", ["audits"]);
export const useCreateCaAudit = auditMut.useCreate;
export const useUpdateCaAudit = auditMut.useUpdate;
export const useDeleteCaAudit = auditMut.useDelete;

const suspenseMut = makeMutations<Partial<CaSuspenseDto>, CaSuspenseDto>("suspense", ["suspense"]);
export const useCreateCaSuspense = suspenseMut.useCreate;
export const useUpdateCaSuspense = suspenseMut.useUpdate;
export const useDeleteCaSuspense = suspenseMut.useDelete;

/** Assign suspense → creates Finance payment and resolves the entry. */
export function useAssignCaSuspense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: number; clientId?: number | null; vendorId?: number | null }) =>
      customFetch<{
        id: number;
        financePaymentId: number | null;
        paymentHref: string | null;
      }>(apiUrl(`/api/ca/suspense/${body.id}/assign`), {
        method: "POST",
        body: JSON.stringify({
          clientId: body.clientId ?? null,
          vendorId: body.vendorId ?? null,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ca", "suspense"] });
      void qc.invalidateQueries({ queryKey: ["ca", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["finance", "payments"] });
    },
  });
}

/** Download CEO compliance pack (JSON). */
export async function downloadCaExportPack() {
  const pack = await customFetch<Record<string, unknown>>(apiUrl("/api/ca/export-pack"));
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ca-compliance-pack-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface CaComplianceScoreDto {
  breakdown: ComplianceScoreBreakdown;
  history: Array<{ month: string; score: number }>;
  drivers: Record<string, number>;
}

export function useCaComplianceScore(enabled = true) {
  return useQuery<CaComplianceScoreDto>({
    queryKey: ["ca", "compliance-score"],
    queryFn: () => customFetch(apiUrl("/api/ca/compliance-score")),
    enabled,
    staleTime: 30_000,
  });
}
