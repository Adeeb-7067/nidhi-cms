import type { QueryClient } from "@tanstack/react-query";
import type { Comment } from "@/api";
import { getListNotificationsQueryKey } from "@/api";
import {
  appendCommentToListCache,
  markCommentDeletedInListCache,
  patchDiscussionPreviewFromComment,
  updateCommentInListCache,
} from "@/lib/comment-thread-query";
import type { ChannelActivity } from "@/lib/discussions-read-state";
import { discussionCommentPreview } from "@/lib/discussion-comment-preview";

export { discussionCommentPreview };

/** Single write path for live project comments (socket + optimistic send). */
import type { ProjectDiscussionThreadType } from "@/lib/discussion-channels";

function normalizeDiscussionThreadType(
  comment: Comment,
  fallback: ProjectDiscussionThreadType = "project",
): ProjectDiscussionThreadType {
  if (comment.threadType === "company_team") return "company_team";
  if (comment.threadType === "company_team_unofficial") return "company_team_unofficial";
  if (comment.threadType === "project_internal") return "project_internal";
  if (comment.threadType === "direct") return "direct";
  return fallback;
}

export function applyProjectCommentToCaches(
  queryClient: QueryClient,
  projectId: number,
  comment: Comment,
  threadType: ProjectDiscussionThreadType = normalizeDiscussionThreadType(comment),
): void {
  appendCommentToListCache(queryClient, threadType, projectId, comment);
  if (threadType !== "direct") {
    patchDiscussionPreviewFromComment(queryClient, projectId, comment, threadType);
  }
}

/** Merge a soft-deleted comment into the thread cache (socket + cross-page sync). */
export function applyCommentDeletedToCaches(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  commentId: number,
): void {
  markCommentDeletedInListCache(queryClient, threadType, threadId, commentId);
}

/** Merge an edited comment into the thread cache (socket + cross-page sync). */
export function applyCommentUpdatedToCaches(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  comment: Comment,
): void {
  updateCommentInListCache(queryClient, threadType, threadId, comment);
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
