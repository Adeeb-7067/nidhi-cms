import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export interface CmsActivityItem {
  id: number;
  actorId: number | null;
  actorName: string;
  actorRole: string | null;
  actorAvatarUrl?: string | null;
  action: string;
  rawAction: string;
  entityType: string;
  entityId: number | null;
  entityName: string;
  timestamp: string;
}

export interface CmsActivityList {
  items: CmsActivityItem[];
  total: number;
  page: number;
  limit: number;
}

export type CmsActivityParams = {
  page?: number;
  limit?: number;
  actorId?: number;
  entityType?: string;
  q?: string;
};

export const cmsActivityKeys = {
  list: (params?: CmsActivityParams) => ["cms-activity", params] as const,
};

function buildQuery(params?: CmsActivityParams): string {
  const sp = new URLSearchParams();
  if (params?.page != null) sp.set("page", String(params.page));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.actorId != null) sp.set("actorId", String(params.actorId));
  if (params?.entityType) sp.set("entityType", params.entityType);
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCmsActivity(
  params?: CmsActivityParams,
  options?: { signal?: AbortSignal },
): Promise<CmsActivityList> {
  return customFetch<CmsActivityList>(apiUrl(`/api/analytics/activity${buildQuery(params)}`), {
    signal: options?.signal,
  });
}

export function useCmsActivity(params?: CmsActivityParams, enabled = true) {
  return useQuery({
    queryKey: cmsActivityKeys.list(params),
    queryFn: ({ signal }) => fetchCmsActivity(params, { signal }),
    enabled,
    placeholderData: (prev) => prev,
  });
}
