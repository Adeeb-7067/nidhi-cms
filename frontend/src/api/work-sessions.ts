import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { useRealtime } from "@/contexts/RealtimeContext";

export type StopReason = "clock_out" | "app_quit" | "logout" | "session_expired" | "admin_terminated";

export interface WorkSession {
  id: number;
  userId: number;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  deviceInfo: string | null;
  stopReason: StopReason | null;
  durationMs: number;
}

export const activeSessionQueryKey = () => ["work-sessions", "active"] as const;
export const workSessionsQueryKey = (params?: object) => ["work-sessions", params] as const;

export function useActiveSession(enabled = true) {
  const { isConnected } = useRealtime();
  return useQuery({
    queryKey: activeSessionQueryKey(),
    queryFn: () => customFetch<{ session: WorkSession | null }>(apiUrl("/api/work-sessions/active")),
    enabled,
    refetchInterval: isConnected ? false : 30_000,
    staleTime: 15_000,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceInfo?: string) =>
      customFetch<{ session: WorkSession }>(apiUrl("/api/work-sessions/clock-in"), {
        method: "POST",
        body: JSON.stringify({ deviceInfo }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-sessions"] });
    },
  });
}

export interface WorkSessionListResponse {
  data: WorkSession[];
  total: number;
  page: number;
  limit: number;
}

export interface ConsentRecord {
  id: number;
  userId: number;
  consentGivenAt: string | null;
  consentVersion: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ConsentListResponse {
  data: ConsentRecord[];
  total: number;
  page: number;
  limit: number;
}

export function useAdminWorkSessions(params: { userId?: number; page?: number; limit?: number } = {}) {
  const sp = new URLSearchParams();
  if (params.userId) sp.set("userId", String(params.userId));
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return useQuery({
    queryKey: ["work-sessions", "admin", params],
    queryFn: () =>
      customFetch<WorkSessionListResponse>(apiUrl(`/api/work-sessions${qs ? `?${qs}` : ""}`)),
  });
}

export function useAdminActiveAll() {
  return useQuery({
    queryKey: ["work-sessions", "active-all"],
    queryFn: () =>
      customFetch<{ data: WorkSession[]; total: number }>(apiUrl("/api/work-sessions/active-all")),
    refetchInterval: 30_000,
  });
}

export function useAdminConsentList(params: { page?: number; limit?: number } = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return useQuery({
    queryKey: ["monitoring", "consents", params],
    queryFn: () =>
      customFetch<ConsentListResponse>(apiUrl(`/api/monitoring/consents${qs ? `?${qs}` : ""}`)),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stopReason: StopReason = "clock_out") =>
      customFetch<{ session: WorkSession | null }>(apiUrl("/api/work-sessions/clock-out"), {
        method: "POST",
        body: JSON.stringify({ stopReason }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-sessions"] });
    },
  });
}
