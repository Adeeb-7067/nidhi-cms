import type { Project } from "@/api";
import type { DirectConversation, DirectConversationPeer } from "@/api/direct-conversations";
import { isStaffEmployeeRole } from "@/lib/user-roles";

export type ProjectDiscussionThreadType =
  | "project"
  | "project_internal"
  | "company_team"
  | "company_team_unofficial"
  | "direct";

export const COMPANY_TEAM_THREAD_ID = 0;
export const COMPANY_TEAM_UNOFFICIAL_THREAD_ID = 0;

const OFFICE_CHANNEL_BASE = {
  companyId: 0,
  companyName: "",
  clientId: 0,
  clientName: "",
  status: "in_progress" as const,
  priority: "medium" as const,
  type: "development" as const,
  startDate: "",
  deadline: "",
  techStack: [] as string[],
  completionPct: 0,
  memberCount: 0,
  createdAt: "",
};

export const COMPANY_TEAM_OFFICIAL_PROJECT = {
  ...OFFICE_CHANNEL_BASE,
  id: COMPANY_TEAM_THREAD_ID,
  name: "Official",
} as Project;

export const COMPANY_TEAM_UNOFFICIAL_PROJECT = {
  ...OFFICE_CHANNEL_BASE,
  id: COMPANY_TEAM_UNOFFICIAL_THREAD_ID,
  name: "Unofficial",
} as Project;

/** @deprecated Use COMPANY_TEAM_OFFICIAL_PROJECT */
export const COMPANY_TEAM_PROJECT = COMPANY_TEAM_OFFICIAL_PROJECT;

export type DiscussionChannelFilter = "all" | "unread" | "client" | "internal";

export type DiscussionPeerUser = DirectConversationPeer;

export type DiscussionChannel = {
  projectId: number;
  threadType: ProjectDiscussionThreadType;
  key: string;
  project: Project;
  /** Present for 1:1 direct chats — the other participant. */
  peerUser?: DiscussionPeerUser;
};

export function isCompanyTeamChannel(
  threadType: ProjectDiscussionThreadType | string | undefined,
): boolean {
  return threadType === "company_team" || threadType === "company_team_unofficial";
}

export function isOfficialCompanyTeamChannel(
  threadType: ProjectDiscussionThreadType | string | undefined,
): boolean {
  return threadType === "company_team";
}

export function isDirectChannel(
  threadType: ProjectDiscussionThreadType | string | undefined,
): boolean {
  return threadType === "direct";
}

export function canAccessCompanyTeamDiscussion(role: string | undefined): boolean {
  return role === "super_admin" || isStaffEmployeeRole(role);
}

export function canAccessDirectDiscussions(role: string | undefined): boolean {
  return role === "super_admin";
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
      threadType !== "company_team" &&
      threadType !== "company_team_unofficial" &&
      threadType !== "direct") ||
    !Number.isFinite(projectId)
  ) {
    return null;
  }
  return { threadType: threadType as ProjectDiscussionThreadType, projectId };
}

export function canAccessInternalDiscussion(role: string | undefined): boolean {
  return role != null && role !== "client";
}

export function directPeerToSyntheticProject(
  conversationId: number,
  peer: DiscussionPeerUser,
): Project {
  return {
    id: conversationId,
    name: peer.name,
    companyId: 0,
    companyName: peer.subtitle ?? "",
    clientId: 0,
    clientName: peer.subtitle ?? "",
    status: "in_progress",
    priority: "medium",
    type: "development",
    startDate: "",
    deadline: "",
    techStack: [],
    completionPct: 0,
    memberCount: 0,
    createdAt: "",
  };
}

export function discussionChannelTitle(
  projectName: string,
  threadType: ProjectDiscussionThreadType,
  peerUser?: DiscussionPeerUser,
): string {
  if (threadType === "direct") return peerUser?.name ?? projectName;
  if (threadType === "company_team") return "Official";
  if (threadType === "company_team_unofficial") return "Unofficial";
  return threadType === "project_internal" ? `${projectName} · Internal` : projectName;
}

export function discussionChannelSubtitle(
  threadType: ProjectDiscussionThreadType,
  peerUser?: DiscussionPeerUser,
  project?: Pick<Project, "type" | "companyName" | "clientName"> | null,
): string {
  if (threadType === "direct") {
    const detail = peerUser?.subtitle ?? "Private";
    return `One-to-one · ${detail}`;
  }
  if (threadType === "company_team") return "Office · official";
  if (threadType === "company_team_unofficial") return "Office · unofficial";
  if (threadType === "project_internal") {
    const company = project?.companyName || project?.clientName;
    const kind = project?.type === "digital" ? "Digital" : "Delivery";
    return company ? `Staff only · ${kind} · ${company}` : `Staff only · ${kind}`;
  }
  const company = project?.companyName || project?.clientName;
  if (project?.type === "digital") {
    return company ? `Digital client · ${company}` : "Digital client";
  }
  return company ? `Delivery client · ${company}` : "Team & client";
}

export function isDigitalDiscussionProject(
  project?: Pick<Project, "type"> | null,
): boolean {
  return project?.type === "digital";
}

/** Synthetic id for a 1:1 row before a conversation exists on the server. */
export const PENDING_DIRECT_ID_BASE = -1_000_000_000;

export function pendingDirectChannelKey(peerUserId: number): string {
  return `direct:peer:${peerUserId}`;
}

export function parsePendingDirectPeerId(channelKey: string): number | null {
  const match = /^direct:peer:(\d+)$/.exec(channelKey);
  if (!match) return null;
  const id = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(id) ? id : null;
}

export function buildDirectChannelFromContact(
  contact: DiscussionPeerUser,
  conversation?: DirectConversation,
): DiscussionChannel {
  const conversationId = conversation?.id;
  const key = conversationId
    ? discussionChannelKey("direct", conversationId)
    : pendingDirectChannelKey(contact.id);
  const projectId = conversationId ?? PENDING_DIRECT_ID_BASE - contact.id;
  return {
    projectId,
    threadType: "direct",
    key,
    project: directPeerToSyntheticProject(conversationId ?? contact.id, contact),
    peerUser: contact,
  };
}

export function buildDirectChannelsFromContacts(
  contacts: DiscussionPeerUser[],
  conversations: DirectConversation[],
): DiscussionChannel[] {
  const byPeerId = new Map(conversations.map((c) => [c.peerUser.id, c]));
  return contacts.map((contact) =>
    buildDirectChannelFromContact(contact, byPeerId.get(contact.id)),
  );
}

export function adminSectionForDirectPeer(
  category: DiscussionPeerUser["category"],
): "team_direct" | "clients_direct" {
  return category === "client" ? "clients_direct" : "team_direct";
}

/** Resolve a list/selection key to a persisted direct conversation id, if one exists. */
export function resolveDirectConversationIdFromKey(
  channelKey: string,
  conversations: DirectConversation[],
): number | null {
  const parsed = parseDiscussionChannelKey(channelKey);
  if (parsed?.threadType === "direct" && parsed.projectId > 0) {
    return conversations.some((c) => c.id === parsed.projectId) ? parsed.projectId : null;
  }
  const pendingPeer = parsePendingDirectPeerId(channelKey);
  if (pendingPeer != null) {
    return conversations.find((c) => c.peerUser.id === pendingPeer)?.id ?? null;
  }
  return null;
}

/** Whether the current selection refers to a known or in-flight 1:1 chat (all roles). */
export function isAdminDirectSelectionKey(
  channelKey: string,
  conversations: DirectConversation[],
): boolean {
  if (parsePendingDirectPeerId(channelKey) != null) return true;
  return resolveDirectConversationIdFromKey(channelKey, conversations) != null;
}

/** Match list row highlight when selection uses conversation id but row still uses peer id. */
export function isDirectChannelRowSelected(
  selectedKey: string | null,
  channel: DiscussionChannel,
  conversations: DirectConversation[],
): boolean {
  if (!selectedKey) return false;
  if (selectedKey === channel.key) return true;
  if (channel.threadType !== "direct" || !channel.peerUser) return false;

  const selectedConvId = resolveDirectConversationIdFromKey(selectedKey, conversations);
  const rowConvId = resolveDirectConversationIdFromKey(channel.key, conversations);
  if (selectedConvId != null && rowConvId != null) return selectedConvId === rowConvId;

  const selectedPeer = parsePendingDirectPeerId(selectedKey) ??
    (selectedConvId != null
      ? conversations.find((c) => c.id === selectedConvId)?.peerUser.id
      : null);
  return selectedPeer != null && selectedPeer === channel.peerUser.id;
}

export function buildDirectDiscussionChannels(
  conversations: DirectConversation[],
): DiscussionChannel[] {
  return conversations.map((conversation) => buildDirectChannelFromContact(
    conversation.peerUser,
    conversation,
  ));
}

export function buildCompanyTeamChannels(): DiscussionChannel[] {
  return [
    {
      projectId: COMPANY_TEAM_THREAD_ID,
      threadType: "company_team",
      key: discussionChannelKey("company_team", COMPANY_TEAM_THREAD_ID),
      project: COMPANY_TEAM_OFFICIAL_PROJECT,
    },
    {
      projectId: COMPANY_TEAM_UNOFFICIAL_THREAD_ID,
      threadType: "company_team_unofficial",
      key: discussionChannelKey("company_team_unofficial", COMPANY_TEAM_UNOFFICIAL_THREAD_ID),
      project: COMPANY_TEAM_UNOFFICIAL_PROJECT,
    },
  ];
}

export function buildDiscussionChannels(
  projects: Project[],
  role: string | undefined,
  directConversations: DirectConversation[] = [],
): DiscussionChannel[] {
  const channels: DiscussionChannel[] = [];
  const includeInternal = canAccessInternalDiscussion(role);
  const includeCompanyTeam = canAccessCompanyTeamDiscussion(role);

  if (directConversations.length > 0) {
    channels.push(...buildDirectDiscussionChannels(directConversations));
  }

  if (includeCompanyTeam) {
    channels.push(...buildCompanyTeamChannels());
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
