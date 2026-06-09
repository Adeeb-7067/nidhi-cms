import type { QueryClient } from "@tanstack/react-query";
import type { Comment } from "@/api";
import { getListNotificationsQueryKey } from "@/api";
import {
  appendCommentToListCache,
  patchDiscussionPreviewFromComment,
} from "@/lib/comment-thread-query";
import type { ChannelActivity } from "@/lib/discussions-read-state";
import { discussionCommentPreview } from "@/lib/discussion-comment-preview";

export { discussionCommentPreview };

/** Single write path for live project comments (socket + optimistic send). */
function normalizeDiscussionThreadType(
  comment: Comment,
  fallback: "project" | "project_internal" | "company_team" = "project",
): "project" | "project_internal" | "company_team" {
  if (comment.threadType === "company_team") return "company_team";
  if (comment.threadType === "project_internal") return "project_internal";
  return fallback;
}

export function applyProjectCommentToCaches(
  queryClient: QueryClient,
  projectId: number,
  comment: Comment,
  threadType: "project" | "project_internal" | "company_team" = normalizeDiscussionThreadType(
    comment,
  ),
): void {
  appendCommentToListCache(queryClient, threadType, projectId, comment);
  patchDiscussionPreviewFromComment(queryClient, projectId, comment, threadType);
}

export function channelActivityPatchFromComment(
  comment: Comment,
  options: {
    isActiveChannel: boolean;
    isOwnMessage: boolean;
    alreadyRead: boolean;
    previousUnread: number;
  },
): Partial<ChannelActivity> & { lastMessageAt: string } {
  const at = comment.createdAt ?? new Date().toISOString();
  return {
    lastMessageAt: at,
    lastPreview: discussionCommentPreview(comment),
    lastAuthorName: comment.authorName,
    lastAuthorId: comment.authorId,
    unreadCount: options.isActiveChannel
      ? 0
      : options.isOwnMessage || options.alreadyRead
        ? options.previousUnread
        : options.previousUnread + 1,
  };
}

/** Bump navbar badge without refetching 100 notifications. */
export function bumpUnreadNotificationBadge(queryClient: QueryClient): void {
  queryClient.setQueryData(
    getListNotificationsQueryKey({ unreadOnly: true, limit: 1 }),
    (old: { unreadCount?: number; notifications?: unknown[] } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        unreadCount: (old.unreadCount ?? 0) + 1,
      };
    },
  );
}
