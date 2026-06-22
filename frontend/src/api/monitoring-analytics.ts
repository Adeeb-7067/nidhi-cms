import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { analyticsQueryOptions } from "@/lib/list-query-options";

export type MonitoringAnalyticsEmployee = {
  userId: number;
  name: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  role: string;
  status: string;
  clockHours: number;
  loggedHours: number;
  varianceHours: number;
  variancePct: number;
  clockUtilisationPct: number;
  logUtilisationPct: number;
  sessionCount: number;
  daysClocked: number;
  logEntriesCount: number;
  autoClosedSessions: number;
  screenshotCount: number;
  hasConsent: boolean;
  consentCurrent: boolean;
  lastClockDate?: string | null;
  flagged: boolean;
};

export type MonitoringAnalyticsResponse = {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  timezone: string;
  monthlyCapacityHours: number;
  summary: {
    monitoredStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    withConsent: number;
    pendingConsent: number;
    totalClockHours: number;
    totalLoggedHours: number;
    avgClockUtilisation: number;
    avgLogUtilisation: number;
    activeSessionsNow: number;
    flaggedVarianceCount: number;
    totalScreenshots: number;
    screenshotEnabled: boolean;
  };
  insights: {
    topContributor: {
      userId: number;
      name: string;
      clockHours: number;
      clockUtilisationPct: number;
    } | null;
    lowestAlignment: {
      userId: number;
      name: string;
      variancePct: number;
      clockHours: number;
      loggedHours: number;
    } | null;
  };
  employees: MonitoringAnalyticsEmployee[];
  clockHeatmap: { date: string; sessionCount: number }[];
};

export const monitoringAnalyticsQueryKey = (params?: { month?: number; year?: number }) =>
  ["monitoring", "analytics", params] as const;

export function useMonitoringAnalytics(month: number, year: number) {
  return useQuery({
    queryFn: () =>
      customFetch<MonitoringAnalyticsResponse>(
        apiUrl(`/api/monitoring/analytics?month=${month}&year=${year}`),
      ),
    ...analyticsQueryOptions({ queryKey: monitoringAnalyticsQueryKey({ month, year }) }),
  });
}
