import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import type {
  ClientPermissionLevel,
  ClientPortalSection,
} from "@/lib/client-team";

/* ----------------------------- Types --------------------------------- */

export interface ClientTeamMeResponse {
  isClientUser: boolean;
  isAdmin: boolean;
  companyId: number | null;
  companyName: string | null;
  memberId: number | null;
  permissions: Partial<Record<ClientPortalSection, ClientPermissionLevel>>;
  sections: { key: ClientPortalSection; label: string }[];
  permissionLevels: ClientPermissionLevel[];
}

export type ClientTeamMemberStatus = "pending" | "active" | "inactive";

export interface ClientTeamMember {
  id: number;
  userId: number;
  clientCompanyId: number;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  title: string | null;
  status: ClientTeamMemberStatus;
  permissions: Partial<Record<ClientPortalSection, ClientPermissionLevel>>;
  invitedAt: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  lastInviteSentAt: string | null;
  inviteCount: number;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  userStatus: string;
  invitedByUserId: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClientTeamMembersResponse {
  members: ClientTeamMember[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientTeamInvitationResult {
  requested?: boolean;
  sent: boolean;
  emailConfigured: boolean;
  /** Returned only when the email could not be sent so the admin can copy it manually. */
  temporaryPassword?: string;
}

export interface ClientTeamCreateInput {
  name: string;
  email: string;
  title?: string | null;
  phoneNumber?: string | null;
  password?: string;
  sendInvitationEmail?: boolean;
  permissions?: Partial<Record<ClientPortalSection, ClientPermissionLevel>>;
}

export interface ClientTeamUpdateInput {
  name?: string;
  email?: string;
  phoneNumber?: string | null;
  title?: string | null;
}

export interface ClientTeamActivityRow {
  id: number;
  action: string;
  section: string | null;
  entityType: string | null;
  entityId: number | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  actorUserId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  actorAvatarUrl: string | null;
  actorIsAdmin: boolean;
  createdAt: string;
}

export interface ClientTeamActivityResponse {
  activities: ClientTeamActivityRow[];
  total: number;
  page: number;
  limit: number;
}

/* ---------------------------- Query keys ----------------------------- */

export const clientTeamMeQueryKey = () => ["client-team", "me"] as const;
export const clientTeamMembersQueryKey = (
  filters: Record<string, unknown> = {},
) => ["client-team", "members", filters] as const;
export const clientTeamMemberQueryKey = (id: number) =>
  ["client-team", "member", id] as const;
export const clientTeamActivityQueryKey = (
  filters: Record<string, unknown> = {},
) => ["client-team", "activity", filters] as const;

/* --------------------------- Fetchers ------------------------------- */

export function fetchClientTeamMe(): Promise<ClientTeamMeResponse> {
  return customFetch<ClientTeamMeResponse>(apiUrl("/api/client-team/me"));
}

function buildSearchParams(input: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === "") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function fetchClientTeamMembers(filters: {
  status?: ClientTeamMemberStatus | "";
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ClientTeamMembersResponse> {
  return customFetch<ClientTeamMembersResponse>(
    apiUrl(`/api/client-team/members${buildSearchParams(filters)}`),
  );
}

export function fetchClientTeamMember(id: number): Promise<{ member: ClientTeamMember }> {
  return customFetch(apiUrl(`/api/client-team/members/${id}`));
}

export function fetchClientTeamActivity(filters: {
  userId?: number;
  action?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ClientTeamActivityResponse> {
  return customFetch<ClientTeamActivityResponse>(
    apiUrl(`/api/client-team/activity${buildSearchParams(filters)}`),
  );
}

/* --------------------------- Hooks ---------------------------------- */

export function useClientTeamMe(
  options?: Omit<
    UseQueryOptions<ClientTeamMeResponse>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<ClientTeamMeResponse>({
    queryKey: clientTeamMeQueryKey(),
    queryFn: () => fetchClientTeamMe(),
    staleTime: 60_000,
    ...options,
  });
}

export function useClientTeamMembers(filters: {
  status?: ClientTeamMemberStatus | "";
  search?: string;
  page?: number;
  limit?: number;
} = {}, enabled = true) {
  return useQuery<ClientTeamMembersResponse>({
    queryKey: clientTeamMembersQueryKey(filters),
    queryFn: () => fetchClientTeamMembers(filters),
    enabled,
  });
}

export function useClientTeamActivity(filters: {
  userId?: number;
  action?: string;
  page?: number;
  limit?: number;
} = {}, enabled = true) {
  return useQuery<ClientTeamActivityResponse>({
    queryKey: clientTeamActivityQueryKey(filters),
    queryFn: () => fetchClientTeamActivity(filters),
    enabled,
  });
}

/* --------------------------- Mutations ------------------------------ */

function jsonRequest<T>(path: string, init: RequestInit) {
  return customFetch<T>(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

export function useCreateClientTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientTeamCreateInput) =>
      jsonRequest<{ member: ClientTeamMember; invitation: ClientTeamInvitationResult }>(
        "/api/client-team/members",
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-team"] });
    },
  });
}

export function useUpdateClientTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: ClientTeamUpdateInput & { id: number }) =>
      jsonRequest<{ member: ClientTeamMember }>(`/api/client-team/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-team"] });
    },
  });
}

export function useUpdateClientTeamMemberPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: number;
      permissions: Partial<Record<ClientPortalSection, ClientPermissionLevel>>;
    }) =>
      jsonRequest<{ member: ClientTeamMember }>(
        `/api/client-team/members/${id}/permissions`,
        { method: "PATCH", body: JSON.stringify({ permissions }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-team"] });
    },
  });
}

export function useDeactivateClientTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      jsonRequest<{ message: string }>(`/api/client-team/members/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-team"] });
    },
  });
}

export function useReactivateClientTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      jsonRequest<{ member: ClientTeamMember }>(
        `/api/client-team/members/${id}/reactivate`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-team"] });
    },
  });
}

export function useResendClientTeamInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      jsonRequest<{ invitation: ClientTeamInvitationResult }>(
        `/api/client-team/members/${id}/resend-invitation`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-team"] });
    },
  });
}

export function useResetClientTeamMemberPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword?: string }) =>
      jsonRequest<{ message: string; temporaryPassword?: string }>(
        `/api/client-team/members/${id}/reset-password`,
        {
          method: "POST",
          body: JSON.stringify(newPassword ? { newPassword } : {}),
        },
      ),
  });
}
