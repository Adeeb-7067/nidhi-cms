import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type WorkspaceDashboard = {
  role: string;
  kpis: {
    projects: number;
    openBugs: number;
    openTickets: number;
    unreadNotifications: number;
    hoursThisWeek?: number;
    bugsAssigned?: number;
    bugsReported?: number;
    maintenanceProjects: number;
    activeDevProjects: number;
  };
  attentionCount: number;
  projectPipeline: {
    scoping: number;
    inProgress: number;
    uat: number;
    onHold: number;
    completed: number;
    maintenance: number;
  };
  bugSeverityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  trends: {
    logHours: { week: string; hours: number }[];
    bugs: { month: string; count: number }[];
  };
  recentProjects: {
    id: number;
    name: string;
    companyName?: string | null;
    status: string;
    type?: string | null;
    completionPct: number;
    deadline?: string | null;
    memberCount?: number;
  }[];
  recentBugs: {
    id: number;
    title: string;
    bugNumber?: string | null;
    severity: string;
    status: string;
    projectName: string;
    projectId: number;
  }[];
  recentLogs: {
    id: number;
    taskTitle: string;
    hoursSpent: number;
    projectName: string;
    logDate: string;
    projectId: number;
  }[];
};

export type ClientHubDashboard = {
  projectCount: number;
  avgCompletionPct: number;
  milestones: { completed: number; total: number };
  pendingRequests: number;
  releaseCount: number;
  projects: {
    id: number;
    name: string;
    status: string;
    completionPct: number;
    deadline?: string | null;
    companyName?: string | null;
  }[];
};

export async function getWorkspaceDashboard(signal?: AbortSignal) {
  return customFetch<WorkspaceDashboard>("/api/analytics/workspace", { signal });
}

export async function getClientHubDashboard(signal?: AbortSignal) {
  return customFetch<ClientHubDashboard>("/api/analytics/client-hub", { signal });
}

export function useGetWorkspaceDashboard() {
  return useQuery({
    queryKey: ["analytics", "workspace"],
    queryFn: ({ signal }) => getWorkspaceDashboard(signal),
    staleTime: 60_000,
  });
}

export function useGetClientHubDashboard(enabled = true) {
  return useQuery({
    queryKey: ["analytics", "client-hub"],
    queryFn: ({ signal }) => getClientHubDashboard(signal),
    enabled,
    staleTime: 60_000,
  });
}
