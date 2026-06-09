import type { Notification } from "@/api";
import type { ProjectDiscussionPreview } from "@/api/discussion-previews";
import {
  discussionChannelKey,
  type DiscussionChannel,
  type ProjectDiscussionThreadType,
} from "@/lib/discussion-channels";

export type ChannelActivity = {
  lastMessageAt: string;
  unreadCount: number;
  lastPreview?: string;
  lastAuthorName?: string;
  lastAuthorId?: number;
};

const STORAGE_PREFIX = "discussions:lastRead:";

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadLastReadByChannel(userId: number): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** @deprecated Use loadLastReadByChannel — kept for client portal (project channel only). */
export function loadLastReadByProject(userId: number): Record<number, string> {
  const byChannel = loadLastReadByChannel(userId);
  const out: Record<number, string> = {};
  for (const [key, value] of Object.entries(byChannel)) {
    if (key.startsWith("project:")) {
      const projectId = Number.parseInt(key.slice("project:".length), 10);
      if (Number.isFinite(projectId)) out[projectId] = value;
    }
  }
  return out;
}

export function saveChannelLastRead(
  userId: number,
  channelKey: string,
  at: string = new Date().toISOString(),
): void {
  if (typeof window === "undefined") return;
  const map = loadLastReadByChannel(userId);
  map[channelKey] = at;
  localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

export function saveProjectLastRead(
  userId: number,
  projectId: number,
  at: string = new Date().toISOString(),
): void {
  saveChannelLastRead(userId, discussionChannelKey("project", projectId), at);
}

type NotificationRow = Notification & { isRead?: boolean };

function isNotificationUnread(n: NotificationRow): boolean {
  if (n.readAt) return false;
  if (n.isRead === true) return false;
  return true;
}

function isUnreadDiscussionNotification(n: NotificationRow): boolean {
  if (!isNotificationUnread(n)) return false;
  const type = (n.type ?? "").toLowerCase();
  if (type !== "comment" && type !== "comment_mention") return false;
  const entity = (n.entityType ?? "").toLowerCase();
  if (entity === "company_team") {
    return n.entityId != null && n.entityId === 0;
  }
  return (
    (entity === "project" || entity === "project_internal") &&
    n.entityId != null &&
    n.entityId > 0
  );
}

function authorFromNotificationTitle(title: string): string {
  const commentedSuffix = " commented";
  const mentionSuffix = " mentioned you";
  if (title.endsWith(mentionSuffix)) return title.slice(0, -mentionSuffix.length);
  if (title.endsWith(commentedSuffix)) return title.slice(0, -commentedSuffix.length);
  return title;
}

function isActivityAfterLastRead(
  activityAt: string | undefined,
  lastRead: string | undefined,
): boolean {
  if (!activityAt) return false;
  if (!lastRead) return true;
  return new Date(activityAt) > new Date(lastRead);
}

export function buildChannelActivityFromPreviews(
  previews: ProjectDiscussionPreview[],
): Record<string, ChannelActivity> {
  const out: Record<string, ChannelActivity> = {};
  for (const p of previews) {
    if (!p.lastMessageAt) continue;
    const key = discussionChannelKey(p.threadType, p.projectId);
    out[key] = {
      lastMessageAt: p.lastMessageAt,
      lastPreview: p.lastPreview ?? undefined,
      lastAuthorName: p.lastAuthorName ?? undefined,
      lastAuthorId: p.lastAuthorId ?? undefined,
      unreadCount: 0,
    };
  }
  return out;
}

export function mergePreviewSnapshot(
  prev: Record<string, ChannelActivity>,
  fromPreviews: Record<string, ChannelActivity>,
): Record<string, ChannelActivity> {
  const next = { ...prev };
  for (const [key, preview] of Object.entries(fromPreviews)) {
    const cur = next[key];
    if (!cur) {
      next[key] = preview;
      continue;
    }
    const previewNewer =
      new Date(preview.lastMessageAt).getTime() >= new Date(cur.lastMessageAt).getTime();
    next[key] = {
      unreadCount: cur.unreadCount,
      lastMessageAt: previewNewer ? preview.lastMessageAt : cur.lastMessageAt,
      lastPreview: previewNewer ? preview.lastPreview : cur.lastPreview,
      lastAuthorName: previewNewer ? preview.lastAuthorName : cur.lastAuthorName,
      lastAuthorId: previewNewer ? preview.lastAuthorId : cur.lastAuthorId,
    };
  }
  return next;
}

export function buildChannelActivityFromNotifications(
  notifications: Notification[],
  lastReadByChannel: Record<string, string>,
): Record<string, ChannelActivity> {
  const byChannel = new Map<string, { unreadCount: number; latest: Notification }>();

  for (const n of notifications) {
    if (!isUnreadDiscussionNotification(n)) continue;
    const entity = (n.entityType ?? "project").toLowerCase();
    const threadType = (
      entity === "company_team"
        ? "company_team"
        : entity === "project_internal"
          ? "project_internal"
          : "project"
    ) as ProjectDiscussionThreadType;
    const projectId = n.entityId!;
    const channelKey = discussionChannelKey(threadType, projectId);
    const readAt = lastReadByChannel[channelKey];
    if (readAt && new Date(n.createdAt) <= new Date(readAt)) continue;

    const existing = byChannel.get(channelKey);
    if (!existing) {
      byChannel.set(channelKey, { unreadCount: 1, latest: n });
      continue;
    }
    existing.unreadCount += 1;
    if (new Date(n.createdAt) > new Date(existing.latest.createdAt)) {
      existing.latest = n;
    }
  }

  const out: Record<string, ChannelActivity> = {};
  for (const [channelKey, { unreadCount, latest }] of byChannel) {
    out[channelKey] = {
      unreadCount,
      lastMessageAt: latest.createdAt,
      lastPreview: latest.body?.trim() || "New message",
      lastAuthorName: authorFromNotificationTitle(latest.title),
    };
  }
  return out;
}

export function reconcileChannelActivity(
  prev: Record<string, ChannelActivity>,
  fromNotifications: Record<string, ChannelActivity>,
  lastReadByChannel: Record<string, string>,
): Record<string, ChannelActivity> {
  const next: Record<string, ChannelActivity> = { ...prev };
  const unreadChannelKeys = new Set(Object.keys(fromNotifications));

  for (const [key, inc] of Object.entries(fromNotifications)) {
    const cur = next[key];
    const incTime = new Date(inc.lastMessageAt).getTime();
    const curTime = cur?.lastMessageAt ? new Date(cur.lastMessageAt).getTime() : 0;
    const useIncomingMeta = !cur?.lastMessageAt || incTime >= curTime;

    next[key] = {
      unreadCount: Math.max(cur?.unreadCount ?? 0, inc.unreadCount),
      lastMessageAt: useIncomingMeta ? inc.lastMessageAt : cur!.lastMessageAt,
      lastPreview: useIncomingMeta ? inc.lastPreview : cur!.lastPreview,
      lastAuthorName: useIncomingMeta ? inc.lastAuthorName : cur!.lastAuthorName,
      lastAuthorId: useIncomingMeta ? inc.lastAuthorId : cur!.lastAuthorId,
    };
  }

  for (const [key, cur] of Object.entries(next)) {
    if (unreadChannelKeys.has(key)) continue;
    if (cur.unreadCount <= 0) continue;
    const stillUnread = isActivityAfterLastRead(cur.lastMessageAt, lastReadByChannel[key]);
    if (!stillUnread) {
      next[key] = { ...cur, unreadCount: 0 };
    }
  }

  return next;
}

export function compareChannelsForChatList(
  a: DiscussionChannel,
  b: DiscussionChannel,
  channelActivity: Record<string, ChannelActivity>,
): number {
  if (a.threadType === "company_team" && b.threadType !== "company_team") return -1;
  if (b.threadType === "company_team" && a.threadType !== "company_team") return 1;

  const aUnread = channelActivity[a.key]?.unreadCount ?? 0;
  const bUnread = channelActivity[b.key]?.unreadCount ?? 0;
  if (aUnread > 0 && bUnread === 0) return -1;
  if (bUnread > 0 && aUnread === 0) return 1;
  if (aUnread > 0 && bUnread > 0 && aUnread !== bUnread) {
    return bUnread - aUnread;
  }

  const aTime = channelActivity[a.key]?.lastMessageAt;
  const bTime = channelActivity[b.key]?.lastMessageAt;
  if (aTime && bTime) {
    const byTime = new Date(bTime).getTime() - new Date(aTime).getTime();
    if (byTime !== 0) return byTime;
    return a.projectId - b.projectId || a.threadType.localeCompare(b.threadType);
  }
  if (aTime) return -1;
  if (bTime) return 1;
  const nameCmp = a.project.name.localeCompare(b.project.name);
  if (nameCmp !== 0) return nameCmp;
  return a.threadType.localeCompare(b.threadType);
}

export function filterUnreadCommentNotifications(
  notifications: Notification[],
  projectId: number,
  threadType: ProjectDiscussionThreadType = "project",
): Notification[] {
  return notifications.filter((n) => {
    if (!isUnreadDiscussionNotification(n)) return false;
    const entity = (n.entityType ?? "").toLowerCase();
    const normalizedType =
      entity === "company_team"
        ? "company_team"
        : entity === "project_internal"
          ? "project_internal"
          : "project";
    return n.entityId === projectId && normalizedType === threadType;
  });
}
