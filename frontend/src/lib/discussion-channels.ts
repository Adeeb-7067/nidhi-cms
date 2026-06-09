import type { Project } from "@/api";

export type ProjectDiscussionThreadType = "project" | "project_internal" | "company_team";

export const COMPANY_TEAM_THREAD_ID = 0;

export const COMPANY_TEAM_PROJECT = {
  id: COMPANY_TEAM_THREAD_ID,
  name: "Team",
  companyId: 0,
  companyName: "",
  clientId: 0,
  clientName: "",
  status: "in_progress",
  priority: "medium",
  type: "development",
  startDate: "",
  deadline: "",
  techStack: [],
  completionPct: 0,
  memberCount: 0,
  createdAt: "",
} as Project;

export type DiscussionChannelFilter = "all" | "unread" | "client" | "internal";

export type DiscussionChannel = {
  projectId: number;
  threadType: ProjectDiscussionThreadType;
  key: string;
  project: Project;
};

export function isCompanyTeamChannel(
  threadType: ProjectDiscussionThreadType | string | undefined,
): boolean {
  return threadType === "company_team";
}

export function canAccessCompanyTeamDiscussion(role: string | undefined): boolean {
  return (
    role === "super_admin" ||
    role === "developer" ||
    role === "tester" ||
    role === "qa"
  );
}

export function discussionChannelKey(
  threadType: ProjectDiscussionThreadType,
  projectId: number,
): string {
  return `${threadType}:${projectId}`;
}

export function parseDiscussionChannelKey(key: string): {
  threadType: ProjectDiscussionThreadType;
  projectId: number;
} | null {
  const [threadType, projectIdRaw] = key.split(":");
  const projectId = Number.parseInt(projectIdRaw ?? "", 10);
  if (
    (threadType !== "project" &&
      threadType !== "project_internal" &&
      threadType !== "company_team") ||
    !Number.isFinite(projectId)
  ) {
    return null;
  }
  return { threadType, projectId };
}

export function canAccessInternalDiscussion(role: string | undefined): boolean {
  return role != null && role !== "client";
}

export function discussionChannelTitle(
  projectName: string,
  threadType: ProjectDiscussionThreadType,
): string {
  if (threadType === "company_team") return "Team";
  return threadType === "project_internal" ? `${projectName} · Internal` : projectName;
}

export function discussionChannelSubtitle(
  threadType: ProjectDiscussionThreadType,
): string {
  if (threadType === "company_team") return "All dev & QA";
  return threadType === "project_internal" ? "Staff only" : "Team & client";
}

export function buildDiscussionChannels(
  projects: Project[],
  role: string | undefined,
): DiscussionChannel[] {
  const channels: DiscussionChannel[] = [];
  const includeInternal = canAccessInternalDiscussion(role);
  const includeCompanyTeam = canAccessCompanyTeamDiscussion(role);

  if (includeCompanyTeam) {
    channels.push({
      projectId: COMPANY_TEAM_THREAD_ID,
      threadType: "company_team",
      key: discussionChannelKey("company_team", COMPANY_TEAM_THREAD_ID),
      project: COMPANY_TEAM_PROJECT,
    });
  }

  for (const project of projects) {
    channels.push({
      projectId: project.id,
      threadType: "project",
      key: discussionChannelKey("project", project.id),
      project,
    });
    if (includeInternal) {
      channels.push({
        projectId: project.id,
        threadType: "project_internal",
        key: discussionChannelKey("project_internal", project.id),
        project,
      });
    }
  }

  return channels;
}
