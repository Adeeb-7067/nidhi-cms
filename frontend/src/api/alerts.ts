import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export type AlertAudienceType = "user" | "role" | "all";
export type AlertStatus = "scheduled" | "sent" | "cancelled";

export interface Alert {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
  scheduledAt: string;
  audienceType: AlertAudienceType;
  targetUserId: number | null;
  targetUserName: string | null;
  targetRole: string | null;
  status: AlertStatus;
  firedAt: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingAlert {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
}

export interface AlertInput {
  title: string;
  description: string;
  photoUrl?: string | null;
  scheduledAt: string;
  audienceType: AlertAudienceType;
  targetUserId?: number | null;
  targetRole?: string | null;
}

export const alertKeys = {
  list: (params?: object) => ["alerts", params] as const,
  pending: () => ["alerts-pending"] as const,
};

export function useListAlerts(params?: { status?: AlertStatus; page?: number; limit?: number }, enabled = true) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  ).toString();
  return useQuery<{ alerts: Alert[]; total: number; page: number; limit: number }>({
    queryKey: alertKeys.list(params),
    queryFn: () => customFetch(apiUrl(`/api/alerts${qs ? `?${qs}` : ""}`)),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AlertInput) =>
      customFetch<Alert>(apiUrl("/api/alerts"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<AlertInput> & { id: number }) =>
      customFetch<Alert>(apiUrl(`/api/alerts/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useCancelAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/alerts/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useGetPendingAlerts(enabled = true) {
  return useQuery<{ alerts: PendingAlert[] }>({
    queryKey: alertKeys.pending(),
    queryFn: () => customFetch(apiUrl("/api/alerts/pending")),
    enabled,
    staleTime: 0,
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/alerts/${id}/dismiss`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.pending() }),
  });
}
