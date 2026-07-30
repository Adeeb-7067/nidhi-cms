import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import type {
  AgreementRecord,
  ClientMatter,
  ComplianceItem,
  CourtCase,
  EmployeeLegalCase,
  LegalCounsel,
  LegalDashboardKpis,
  LegalExpense,
  LegalNotice,
  NdaRecord,
  VendorDispute,
} from "@/modules/legal/types";

function toQueryString(params?: object) {
  if (!params) return "";
  const qs = new URLSearchParams(
    Object.entries(params as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `?${qs}` : "";
}

export const legalKeys = {
  dashboard: ["legal", "dashboard"] as const,
  counsel: (params?: object) => ["legal", "counsel", params] as const,
  cases: (params?: object) => ["legal", "cases", params] as const,
  case: (id: number) => ["legal", "case", id] as const,
  vendorDisputes: (params?: object) => ["legal", "vendor-disputes", params] as const,
  clientMatters: (params?: object) => ["legal", "client-matters", params] as const,
  ndas: (params?: object) => ["legal", "ndas", params] as const,
  agreements: (params?: object) => ["legal", "agreements", params] as const,
  notices: (params?: object) => ["legal", "notices", params] as const,
  courtCases: (params?: object) => ["legal", "court-cases", params] as const,
  compliance: (params?: object) => ["legal", "compliance", params] as const,
  expenses: (params?: object) => ["legal", "expenses", params] as const,
};

export type LegalHearingDto = {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  risk: "low" | "medium" | "high";
  href: string;
  assignedToId?: number | null;
};

export type LegalDashboardDto = {
  kpis: LegalDashboardKpis;
  counsel: LegalCounsel[];
  casesByStatus: Array<{ name: string; status: string; count: number }>;
  riskDistribution: Array<{ name: string; risk: string; count: number; value: number }>;
  upcomingHearings: LegalHearingDto[];
  ndaExpiryAlerts: NdaRecord[];
  agreementRenewalReminders: AgreementRecord[];
  expensesByCategory: Array<{ category: string; amount: number }>;
  complianceScore: number;
  expensesYtd: number;
  complianceGaps: ComplianceItem[];
};

export type ListParams = {
  status?: string;
  risk?: string;
  type?: string;
  direction?: string;
  partyType?: string;
  category?: string;
  framework?: string;
  role?: string;
  q?: string;
  search?: string;
  page?: number;
  limit?: number;
};

type ListResult<K extends string, T> = Record<K, T[]> & {
  total: number;
  page: number;
  limit: number;
};

function invalidateLegal(qc: ReturnType<typeof useQueryClient>, ...keys: string[]) {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: ["legal", key] });
  }
  void qc.invalidateQueries({ queryKey: legalKeys.dashboard });
}

function makeMutations<TCreate extends object, TDto>(path: string, invalidateKeys: string[]) {
  return {
    useCreate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (body: TCreate) =>
          customFetch<TDto>(apiUrl(`/api/legal/${path}`), {
            method: "POST",
            body: JSON.stringify(body),
          }),
        onSuccess: () => invalidateLegal(qc, ...invalidateKeys),
      });
    },
    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, ...body }: Partial<TDto> & { id: number }) =>
          customFetch<TDto>(apiUrl(`/api/legal/${path}/${id}`), {
            method: "PATCH",
            body: JSON.stringify(body),
          }),
        onSuccess: () => invalidateLegal(qc, ...invalidateKeys),
      });
    },
    useDelete() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: number) =>
          customFetch(apiUrl(`/api/legal/${path}/${id}`), { method: "DELETE" }),
        onSuccess: () => invalidateLegal(qc, ...invalidateKeys),
      });
    },
  };
}

export function useLegalDashboard(enabled = true) {
  return useQuery<LegalDashboardDto>({
    queryKey: legalKeys.dashboard,
    queryFn: () => customFetch(apiUrl("/api/legal/dashboard")),
    enabled,
    staleTime: 30_000,
  });
}

export function useLegalCounsel(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"counsel", LegalCounsel>>({
    queryKey: legalKeys.counsel(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/counsel${toQueryString(params)}`)),
  });
}

export function useLegalCases(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"cases", EmployeeLegalCase>>({
    queryKey: legalKeys.cases(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/cases${toQueryString(params)}`)),
  });
}

export function useLegalCase(id: number, enabled = true) {
  return useQuery<EmployeeLegalCase>({
    queryKey: legalKeys.case(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
    queryFn: () => customFetch(apiUrl(`/api/legal/cases/${id}`)),
  });
}

export function useLegalVendorDisputes(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"disputes", VendorDispute>>({
    queryKey: legalKeys.vendorDisputes(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/vendor-disputes${toQueryString(params)}`)),
  });
}

export function useLegalClientMatters(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"matters", ClientMatter>>({
    queryKey: legalKeys.clientMatters(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/client-matters${toQueryString(params)}`)),
  });
}

export function useLegalNdas(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"ndas", NdaRecord>>({
    queryKey: legalKeys.ndas(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/ndas${toQueryString(params)}`)),
  });
}

export function useLegalAgreements(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"agreements", AgreementRecord>>({
    queryKey: legalKeys.agreements(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/agreements${toQueryString(params)}`)),
  });
}

export function useLegalNotices(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"notices", LegalNotice>>({
    queryKey: legalKeys.notices(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/notices${toQueryString(params)}`)),
  });
}

export function useLegalCourtCases(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"courtCases", CourtCase>>({
    queryKey: legalKeys.courtCases(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/court-cases${toQueryString(params)}`)),
  });
}

export function useLegalCompliance(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"items", ComplianceItem>>({
    queryKey: legalKeys.compliance(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/compliance${toQueryString(params)}`)),
  });
}

export function useLegalExpenses(params?: ListParams, options?: { enabled?: boolean }) {
  return useQuery<ListResult<"expenses", LegalExpense>>({
    queryKey: legalKeys.expenses(params),
    enabled: options?.enabled ?? true,
    queryFn: () => customFetch(apiUrl(`/api/legal/expenses${toQueryString(params)}`)),
  });
}

type WithCounselId = { assignedToId?: number; ownerId?: number };

const counselMut = makeMutations<
  { name: string; email: string; role: string },
  LegalCounsel
>("counsel", ["counsel"]);
export const useCreateLegalCounsel = counselMut.useCreate;
export const useUpdateLegalCounsel = counselMut.useUpdate;
export const useDeleteLegalCounsel = counselMut.useDelete;

const casesMut = makeMutations<Partial<EmployeeLegalCase> & WithCounselId, EmployeeLegalCase>(
  "cases",
  ["cases", "case"],
);
export const useCreateLegalCase = casesMut.useCreate;
export const useUpdateLegalCase = casesMut.useUpdate;
export const useDeleteLegalCase = casesMut.useDelete;

const disputesMut = makeMutations<Partial<VendorDispute> & WithCounselId, VendorDispute>(
  "vendor-disputes",
  ["vendor-disputes"],
);
export const useCreateLegalVendorDispute = disputesMut.useCreate;
export const useUpdateLegalVendorDispute = disputesMut.useUpdate;
export const useDeleteLegalVendorDispute = disputesMut.useDelete;

const mattersMut = makeMutations<Partial<ClientMatter> & WithCounselId, ClientMatter>(
  "client-matters",
  ["client-matters"],
);
export const useCreateLegalClientMatter = mattersMut.useCreate;
export const useUpdateLegalClientMatter = mattersMut.useUpdate;
export const useDeleteLegalClientMatter = mattersMut.useDelete;

const ndasMut = makeMutations<Partial<NdaRecord> & WithCounselId, NdaRecord>("ndas", ["ndas"]);
export const useCreateLegalNda = ndasMut.useCreate;
export const useUpdateLegalNda = ndasMut.useUpdate;
export const useDeleteLegalNda = ndasMut.useDelete;

const agreementsMut = makeMutations<Partial<AgreementRecord> & WithCounselId, AgreementRecord>(
  "agreements",
  ["agreements"],
);
export const useCreateLegalAgreement = agreementsMut.useCreate;
export const useUpdateLegalAgreement = agreementsMut.useUpdate;
export const useDeleteLegalAgreement = agreementsMut.useDelete;

const noticesMut = makeMutations<Partial<LegalNotice> & WithCounselId, LegalNotice>("notices", [
  "notices",
]);
export const useCreateLegalNotice = noticesMut.useCreate;
export const useUpdateLegalNotice = noticesMut.useUpdate;
export const useDeleteLegalNotice = noticesMut.useDelete;

const courtMut = makeMutations<Partial<CourtCase> & WithCounselId, CourtCase>("court-cases", [
  "court-cases",
]);
export const useCreateLegalCourtCase = courtMut.useCreate;
export const useUpdateLegalCourtCase = courtMut.useUpdate;
export const useDeleteLegalCourtCase = courtMut.useDelete;

const complianceMut = makeMutations<Partial<ComplianceItem> & WithCounselId, ComplianceItem>(
  "compliance",
  ["compliance"],
);
export const useCreateLegalCompliance = complianceMut.useCreate;
export const useUpdateLegalCompliance = complianceMut.useUpdate;
export const useDeleteLegalCompliance = complianceMut.useDelete;

const expensesMut = makeMutations<Partial<LegalExpense>, LegalExpense>("expenses", ["expenses"]);
export const useCreateLegalExpense = expensesMut.useCreate;
export const useUpdateLegalExpense = expensesMut.useUpdate;
export const useDeleteLegalExpense = expensesMut.useDelete;
