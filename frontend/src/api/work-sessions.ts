import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export type StopReason =
  | "clock_out"
  | "app_quit"
  | "logout"
  | "session_expired"
  | "day_ended"
  | "shift_ended"
  | "admin_terminated"
  | "system_sleep"
  | "system_shutdown"
  | "network_lost"
  | "client_disconnected"
  | "overtime_idle";

export interface WorkSessionPausePeriod {
  pausedAt: string;
  resumedAt: string | null;
  stopReason: StopReason | null;
}

export interface WorkSession {
  id: number;
  userId: number;
  startedAt: string;
  segmentStartedAt?: string | null;
  endedAt: string | null;
  isActive: boolean;
  deviceInfo: string | null;
  stopReason: StopReason | null;
  lastHeartbeatAt?: string | null;
  lastUserActivityAt?: string | null;
  pausePeriods?: WorkSessionPausePeriod[];
  /** Active work time (excludes pause periods). */
  durationMs: number;
  totalDurationMs?: number;
  pauseDurationMs?: number;
}

export interface ClockInResponse {
  session: WorkSession;
  resumed?: boolean;
}

export const activeSessionQueryKey = () => ["work-sessions", "active"] as const;
export const workSessionsQueryKey = (params?: object) => ["work-sessions", params] as const;

export type ActiveSessionState = {
  session: WorkSession | null;
  stopReason?: StopReason | string;
};

export function useActiveSession(enabled = true) {
  return useQuery({
    queryKey: activeSessionQueryKey(),
    queryFn: () =>
      customFetch<ActiveSessionState>(apiUrl("/api/work-sessions/active")),
    select: (data): ActiveSessionState => ({
      session: data.session?.isActive ? data.session : null,
      stopReason: data.session?.isActive ? undefined : data.stopReason,
    }),
    enabled,
    refetchInterval: (query) => {
      const session = query.state.data?.session;
      if (session?.isActive) return 60_000;
      return 30_000;
    },
    staleTime: 15_000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceInfo?: string) =>
      customFetch<ClockInResponse>(apiUrl("/api/work-sessions/clock-in"), {
        method: "POST",
        body: JSON.stringify({ deviceInfo }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (data) => {
      qc.setQueryData(activeSessionQueryKey(), { session: data.session, stopReason: undefined });
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

export interface DailySessionTotal {
  userId: number;
  date: string;
  totalMs: number;
  sessionCount: number;
  hasActiveSession: boolean;
}

export interface DailySessionTotalsResponse {
  data: DailySessionTotal[];
  total: number;
  page: number;
  limit: number;
  from: string;
  to: string;
  timezone: string;
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
    refetchInterval: 15_000,
  });
}

export function useDailySessionTotals(
  params: { userId?: number; fromDate?: string; toDate?: string; page?: number; limit?: number } = {},
  options?: { refetchInterval?: number | false },
) {
  const sp = new URLSearchParams();
  if (params.userId) sp.set("userId", String(params.userId));
  if (params.fromDate) sp.set("fromDate", params.fromDate);
  if (params.toDate) sp.set("toDate", params.toDate);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return useQuery({
    queryKey: ["work-sessions", "daily-totals", params],
    queryFn: () =>
      customFetch<DailySessionTotalsResponse>(
        apiUrl(`/api/work-sessions/daily-totals${qs ? `?${qs}` : ""}`),
      ),
    refetchInterval: options?.refetchInterval,
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
      qc.setQueryData(activeSessionQueryKey(), { session: null });
      qc.invalidateQueries({ queryKey: ["work-sessions"] });
    },
  });
}

/** Keep lastHeartbeatAt + lastUserActivityAt fresh while clocked in (required for overtime idle pause). */
export async function sendWorkSessionHeartbeat(
  lastUserActivityAt?: string | null,
): Promise<ActiveSessionState> {
  return customFetch<ActiveSessionState>(apiUrl("/api/work-sessions/heartbeat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lastUserActivityAt: lastUserActivityAt ?? undefined,
    }),
  });
}
