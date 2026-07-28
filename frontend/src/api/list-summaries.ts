import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { QUERY_STALE } from "@/lib/query-config";

export type NavBadges = {
  pendingRequests: number;
  openBugs: number;
};

export type TicketsSummary = {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  urgent: number;
  high: number;
};

export type ClientsSummary = {
  total: number;
  active: number;
  inactive: number;
  activeProjects: number;
};

export type RequestsSummary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export const navBadgesQueryKey = () => ["nav-badges"] as const;
export const ticketsSummaryQueryKey = (audience?: string) =>
  ["tickets-summary", audience ?? "all"] as const;
export const clientsSummaryQueryKey = () => ["clients-summary"] as const;
export const requestsSummaryQueryKey = () => ["requests-summary"] as const;

export function useNavBadges(enabled = true) {
  return useQuery({
    queryKey: navBadgesQueryKey(),
    queryFn: () => customFetch<NavBadges>(apiUrl("/api/nav/badges")),
    enabled,
    staleTime: QUERY_STALE.list,
  });
}

export function useTicketsSummary(audience?: string, enabled = true) {
  const qs = audience && audience !== "all" ? `?audience=${encodeURIComponent(audience)}` : "";
  return useQuery({
    queryKey: ticketsSummaryQueryKey(audience),
    queryFn: () => customFetch<TicketsSummary>(apiUrl(`/api/tickets/summary${qs}`)),
    enabled,
    staleTime: QUERY_STALE.reference,
  });
}

export function useClientsSummary(enabled = true) {
  return useQuery({
    queryKey: clientsSummaryQueryKey(),
    queryFn: () => customFetch<ClientsSummary>(apiUrl("/api/clients/summary")),
    enabled,
    staleTime: QUERY_STALE.reference,
  });
}

export function useRequestsSummary(enabled = true) {
  return useQuery({
    queryKey: requestsSummaryQueryKey(),
    queryFn: () => customFetch<RequestsSummary>(apiUrl("/api/requests/summary")),
    enabled,
    staleTime: QUERY_STALE.reference,
  });
}
