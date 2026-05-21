import type { QueryKey } from "@tanstack/react-query";
import { QUERY_STALE } from "./query-config";

/** Default React Query options for paginated list endpoints. */
export function listQueryOptions(extra: { queryKey: QueryKey; staleTime?: number }) {
  return {
    queryKey: extra.queryKey,
    staleTime: extra.staleTime ?? QUERY_STALE.list,
  };
}
