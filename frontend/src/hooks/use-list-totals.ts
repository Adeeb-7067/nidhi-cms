import { QUERY_STALE } from "@/lib/query-config";

/**
 * Params for list APIs that only need the `total` field (minimal payload).
 * Prefer dedicated `/summary` endpoints for page KPIs — do not add new
 * LIST_COUNT_PARAMS fan-out on list pages (see list-summaries.ts).
 */
export const LIST_COUNT_PARAMS = { page: 1, limit: 1 } as const;

export function selectListTotal<T extends { total?: number }>(data: T): number {
  return data.total ?? 0;
}

export function countListQueryOptions(queryKey: readonly unknown[]) {
  return {
    queryKey,
    staleTime: QUERY_STALE.reference,
    select: selectListTotal,
  };
}
