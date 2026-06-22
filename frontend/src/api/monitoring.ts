import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { useRealtime } from "@/contexts/RealtimeContext";

export interface ScreenshotItem {
  id: number;
  userId: number;
  sessionId: number | null;
  projectId: number | null;
  fileUrl: string;
  fileSize: number | null;
  takenAt: string;
}

export interface ScreenshotListResponse {
  data: ScreenshotItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MonitoringStatus {
  screenshotEnabled: boolean;
  screenshotIntervalMinutes: number;
  screenshotRetentionDays: number;
  screenshotBlurEnabled: boolean;
  screenshotConsentVersion: string;
}

export interface ConsentStatus {
  hasConsented: boolean;
  isCurrentVersion: boolean;
  consentVersion: string;
  consentGivenAt: string | null;
  needsRenewal: boolean;
}

export const monitoringStatusQueryKey = () => ["monitoring", "status"] as const;
export const consentStatusQueryKey = () => ["monitoring", "consent-status"] as const;
export const screenshotsQueryKey = (params: object) => ["screenshots", params] as const;

export function useMonitoringStatus(enabled = true) {
  const { isConnected } = useRealtime();
  return useQuery({
    queryKey: monitoringStatusQueryKey(),
    queryFn: () => customFetch<MonitoringStatus>(apiUrl("/api/monitoring/status")),
    enabled,
    refetchInterval: isConnected ? false : 60_000,
  });
}

export function useConsentStatus(enabled = true) {
  return useQuery({
    queryKey: consentStatusQueryKey(),
    queryFn: () => customFetch<ConsentStatus>(apiUrl("/api/monitoring/consent-status")),
    enabled,
  });
}

export function useRecordConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch<{ ok: boolean; consentGivenAt: string }>(apiUrl("/api/monitoring/consent"), {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentStatusQueryKey() });
    },
  });
}

export type ScreenshotListParams = {
  userId?: number;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

const SCREENSHOT_PAGE_SIZE = 500;

function buildScreenshotSearchParams(params: ScreenshotListParams, page: number) {
  const sp = new URLSearchParams();
  if (params.userId) sp.set("userId", String(params.userId));
  if (params.projectId) sp.set("projectId", String(params.projectId));
  if (params.startDate) sp.set("startDate", params.startDate);
  if (params.endDate) sp.set("endDate", params.endDate);
  sp.set("page", String(page));
  sp.set("limit", String(params.limit ?? SCREENSHOT_PAGE_SIZE));
  return sp;
}

async function fetchScreenshotListPage(params: ScreenshotListParams, page: number) {
  const qs = buildScreenshotSearchParams(params, page).toString();
  return customFetch<ScreenshotListResponse>(apiUrl(`/api/screenshots?${qs}`));
}

async function fetchAllScreenshotPages(params: ScreenshotListParams) {
  const pageSize = params.limit ?? SCREENSHOT_PAGE_SIZE;
  let page = 1;
  const data: ScreenshotItem[] = [];
  let total = 0;

  while (true) {
    const res = await fetchScreenshotListPage(params, page);
    total = res.total;
    data.push(...res.data);
    if (data.length >= total || res.data.length === 0) break;
    page += 1;
  }

  return { data, total, page: 1, limit: pageSize };
}

export function useListScreenshots(
  params: ScreenshotListParams,
  enabled = true,
  refetchIntervalMs?: number,
  fetchAllPages = false,
) {
  const queryParams = fetchAllPages ? { ...params, fetchAllPages: true as const } : params;

  return useQuery({
    queryKey: screenshotsQueryKey(queryParams),
    queryFn: () =>
      fetchAllPages ? fetchAllScreenshotPages(params) : fetchScreenshotListPage(params, params.page ?? 1),
    enabled,
    refetchInterval: refetchIntervalMs,
  });
}

export function useDeleteScreenshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/screenshots/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screenshots"] });
    },
  });
}

export function useBulkDeleteScreenshots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      customFetch<{ deleted: number }>(apiUrl("/api/screenshots/bulk-delete"), {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screenshots"] });
    },
  });
}
