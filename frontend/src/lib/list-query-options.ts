import type { QueryKey } from "@tanstack/react-query";
import { QUERY_GC, QUERY_STALE } from "./query-config";

/** Default React Query options for paginated list endpoints. */
export function listQueryOptions(extra: { queryKey: QueryKey; staleTime?: number }) {
  return {
    queryKey: extra.queryKey,
    staleTime: extra.staleTime ?? QUERY_STALE.list,
  };
}

/** Analytics / dashboard charts — refresh less often than table rows. */
export function analyticsQueryOptions(extra: { queryKey: QueryKey; staleTime?: number }) {
  return {
    queryKey: extra.queryKey,
    staleTime: extra.staleTime ?? QUERY_STALE.analytics,
    gcTime: QUERY_GC,
  };
}

/** Reference pickers (users, projects, clients in dialogs). */
export function referenceQueryOptions(extra: { queryKey: QueryKey; enabled?: boolean }) {
  return {
    queryKey: extra.queryKey,
    staleTime: QUERY_STALE.reference,
    enabled: extra.enabled ?? true,
  };
}
