import type { QueryClient } from "@tanstack/react-query";
import {
  getListCommentsQueryKey,
  type Comment,
  type CommentListResult,
  type CommentThreadType,
  type ListCommentsParams,
} from "@/api";
import {
  discussionPreviewsQueryKey,
  type ProjectDiscussionPreviewsResult,
} from "@/api/discussion-previews";
import { discussionCommentPreview } from "@/lib/discussion-comment-preview";

/** Match list fetch window — keeps cache aligned with `recent` pagination on the server. */
export const COMMENT_THREAD_LIMIT = 100;

/** Fetch the latest messages in a thread (avoids default page-1 / first-20-only behavior). */
export function commentThreadQueryParams(
  threadType: string,
  threadId: number,
): ListCommentsParams & { recent: boolean } {
  return {
    threadType,
    threadId,
    limit: COMMENT_THREAD_LIMIT,
    recent: true,
  };
}

/** Flatten top-level + nested replies into chronological order for chat UIs. */
export function flattenCommentThread(comments: Comment[]): Comment[] {
  if (!comments.length) return [];
  const out: Comment[] = [];
  for (const c of comments) {
    out.push(c);
    if (c.replies?.length) {
      for (const r of c.replies) {
        out.push(r);
        if (r.replies?.length) out.push(...flattenCommentThread(r.replies));
      }
    }
  }
  let needsSort = false;
  for (let i = 1; i < out.length; i++) {
    if (
      new Date(out[i].createdAt).getTime() < new Date(out[i - 1].createdAt).getTime()
    ) {
      needsSort = true;
      break;
    }
  }
  if (!needsSort) return out;
  return out.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Cheap signature for memoizing flattened threads. */
export function commentThreadSignature(comments: Comment[] | undefined): string {
  if (!comments?.length) return "";
  const last = comments[comments.length - 1];
  let count = comments.length;
  for (const c of comments) {
    count += c.replies?.length ?? 0;
  }
  return `${count}:${last?.id ?? 0}:${last?.updatedAt ?? last?.createdAt ?? ""}`;
}

function commentExistsInThread(comments: Comment[], id: number): boolean {
  for (const c of comments) {
    if (c.id === id) return true;
    if (c.replies?.length && commentExistsInThread(c.replies, id)) return true;
  }
  return false;
}

function appendReplyToThread(comments: Comment[], parentId: number, reply: Comment): Comment[] {
  return comments.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [...(c.replies ?? []), reply] };
    }
    if (c.replies?.length) {
      return { ...c, replies: appendReplyToThread(c.replies, parentId, reply) };
    }
    return c;
  });
}

function removeCommentFromThread(comments: Comment[], commentId: number): Comment[] {
  const out: Comment[] = [];
  for (const c of comments) {
    if (c.id === commentId) continue;
    const replies = c.replies?.length
      ? removeCommentFromThread(c.replies, commentId)
      : c.replies;
    out.push(replies !== c.replies ? { ...c, replies } : c);
  }
  return out;
}

/** Temporary id for a message shown before the server responds. */
export function createOptimisticCommentId(): number {
  return -Math.abs(Date.now());
}

export function isOptimisticCommentId(id: number): boolean {
  return id < 0;
}

export function createOptimisticComment(options: {
  tempId: number;
  threadType: CommentThreadType;
  threadId: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorRole: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  parentId?: number | null;
}): Comment {
  const now = new Date().toISOString();
  return {
    id: options.tempId,
    authorId: options.authorId,
    authorName: options.authorName,
    authorAvatarUrl: options.authorAvatarUrl ?? null,
    authorRole: options.authorRole,
    threadType: options.threadType,
    threadId: options.threadId,
    content: options.content,
    attachmentUrl: options.attachmentUrl ?? null,
    attachmentName: options.attachmentName ?? null,
    attachmentMimeType: options.attachmentMimeType ?? null,
    parentId: options.parentId ?? null,
    isEdited: false,
    isDeleted: false,
    replies: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function replaceOptimisticCommentInCache(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  tempId: number,
  comment: Comment,
) {
  const params = commentThreadQueryParams(threadType, threadId);
  queryClient.setQueryData<CommentListResult>(getListCommentsQueryKey(params), (old) => {
    if (!old?.comments?.length) {
      return { comments: [comment], total: 1 };
    }
    let comments = removeCommentFromThread(old.comments, tempId);
    if (!commentExistsInThread(comments, comment.id)) {
      const normalized = { ...comment, replies: comment.replies ?? [] };
      if (normalized.parentId != null && commentExistsInThread(comments, normalized.parentId)) {
        comments = appendReplyToThread(comments, normalized.parentId, normalized);
      } else {
        const merged = [...comments, normalized];
        comments =
          merged.length > COMMENT_THREAD_LIMIT
            ? merged.slice(-COMMENT_THREAD_LIMIT)
            : merged;
      }
    }
    return { ...old, comments };
  });
}

function markDeletedInThread(comments: Comment[], commentId: number): Comment[] {
  let changed = false;
  const out = comments.map((c) => {
    if (c.id === commentId) {
      changed = true;
      return {
        ...c,
        isDeleted: true,
        content: "",
        attachmentUrl: null,
        attachmentName: null,
        attachmentMimeType: null,
        mentionedUserIds: [],
      };
    }
    if (c.replies?.length) {
      const replies = markDeletedInThread(c.replies, commentId);
      if (replies !== c.replies) {
        changed = true;
        return { ...c, replies };
      }
    }
    return c;
  });
  return changed ? out : comments;
}

function updateInThread(comments: Comment[], updated: Comment): Comment[] {
  let changed = false;
  const out = comments.map((c) => {
    if (c.id === updated.id) {
      changed = true;
      // Preserve the existing reply subtree; only the message fields change.
      return { ...c, ...updated, replies: c.replies ?? updated.replies ?? [] };
    }
    if (c.replies?.length) {
      const replies = updateInThread(c.replies, updated);
      if (replies !== c.replies) {
        changed = true;
        return { ...c, replies };
      }
    }
    return c;
  });
  return changed ? out : comments;
}

/** Merge an edited comment into the thread cache in place (keeps replies + order). */
export function updateCommentInListCache(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  updated: Comment,
) {
  const params = commentThreadQueryParams(threadType, threadId);
  queryClient.setQueryData<CommentListResult>(getListCommentsQueryKey(params), (old) => {
    if (!old?.comments?.length) return old;
    const comments = updateInThread(old.comments, updated);
    if (comments === old.comments) return old;
    return { ...old, comments };
  });
}

/**
 * Latest message (chronological, incl. replies) currently in the thread cache.
 * Used to keep the chat-list preview aligned with what actually shows last.
 */
export function getLatestThreadComment(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
): Comment | undefined {
  const params = commentThreadQueryParams(threadType, threadId);
  const cached = queryClient.getQueryData<CommentListResult>(
    getListCommentsQueryKey(params),
  );
  if (!cached?.comments?.length) return undefined;
  const flat = flattenCommentThread(cached.comments);
  return flat[flat.length - 1];
}

/** Flag a message as deleted in the thread cache, blanking its body/attachments. */
export function markCommentDeletedInListCache(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  commentId: number,
) {
  const params = commentThreadQueryParams(threadType, threadId);
  queryClient.setQueryData<CommentListResult>(getListCommentsQueryKey(params), (old) => {
    if (!old?.comments?.length) return old;
    const comments = markDeletedInThread(old.comments, commentId);
    if (comments === old.comments) return old;
    return { ...old, comments };
  });
}

export function removeCommentFromListCache(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  commentId: number,
) {
  const params = commentThreadQueryParams(threadType, threadId);
  queryClient.setQueryData<CommentListResult>(getListCommentsQueryKey(params), (old) => {
    if (!old?.comments?.length) return old;
    const comments = removeCommentFromThread(old.comments, commentId);
    return {
      ...old,
      comments,
      total: Math.max(0, (old.total ?? old.comments.length) - 1),
    };
  });
}

function collectCommentIds(comments: Comment[], ids = new Set<number>()): Set<number> {
  for (const c of comments) {
    ids.add(c.id);
    if (c.replies?.length) collectCommentIds(c.replies, ids);
  }
  return ids;
}

/** Keep socket/cache comments when a slower HTTP fetch returns an older page. */
export function mergeCommentListWithCache(
  server: CommentListResult,
  cached: CommentListResult | undefined,
): CommentListResult {
  if (!cached?.comments?.length) return server;

  const serverIds = collectCommentIds(server.comments);
  let comments = [...server.comments];
  let added = 0;

  const cachedFlat: Comment[] = [];
  const walk = (list: Comment[]) => {
    for (const c of list) {
      cachedFlat.push(c);
      if (c.replies?.length) walk(c.replies);
    }
  };
  walk(cached.comments);

  for (const c of cachedFlat) {
    if (isOptimisticCommentId(c.id) || serverIds.has(c.id)) continue;
    const normalized = { ...c, replies: c.replies ?? [] };
    if (normalized.parentId != null) {
      comments = appendReplyToThread(comments, normalized.parentId, normalized);
    } else {
      comments = [...comments, normalized];
      if (comments.length > COMMENT_THREAD_LIMIT) {
        comments = comments.slice(-COMMENT_THREAD_LIMIT);
      }
    }
    serverIds.add(normalized.id);
    added += 1;
  }

  if (added === 0) return server;
  return {
    ...server,
    comments,
    total: Math.max(server.total ?? server.comments.length, comments.length),
  };
}

function discussionPreviewText(comment: Comment): string {
  return discussionCommentPreview(comment);
}

/** Update project chat list preview after a live comment (no refetch). */
export function patchDiscussionPreviewFromComment(
  queryClient: QueryClient,
  projectId: number,
  comment: Comment,
  threadType: "project" | "project_internal" | "company_team" | "company_team_unofficial" =
    comment.threadType === "company_team"
      ? "company_team"
      : comment.threadType === "company_team_unofficial"
        ? "company_team_unofficial"
        : comment.threadType === "project_internal"
          ? "project_internal"
          : "project",
) {
  const at = comment.createdAt ?? new Date().toISOString();
  const entry = {
    projectId,
    threadType,
    lastMessageAt: at,
    lastPreview: discussionPreviewText(comment),
    lastAuthorName: comment.authorName,
    lastAuthorId: comment.authorId,
  };

  queryClient.setQueryData<ProjectDiscussionPreviewsResult>(
    discussionPreviewsQueryKey,
    (old) => {
      if (!old?.previews) return old;
      const idx = old.previews.findIndex(
        (p) => p.projectId === projectId && p.threadType === threadType,
      );
      if (idx < 0) return old;
      const cur = old.previews[idx];
      if (
        cur.lastMessageAt &&
        new Date(at).getTime() < new Date(cur.lastMessageAt).getTime()
      ) {
        return old;
      }
      const previews = [...old.previews];
      previews[idx] = entry;
      return { previews };
    },
  );
}

/** Instantly merge a socket/API comment into the React Query thread cache (no refetch). */
export function appendCommentToListCache(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  comment: Comment,
) {
  const params = commentThreadQueryParams(threadType, threadId);
  const normalized: Comment = { ...comment, replies: comment.replies ?? [] };

  queryClient.setQueryData<CommentListResult>(getListCommentsQueryKey(params), (old) => {
    if (!old?.comments?.length) {
      return { comments: [normalized], total: 1 };
    }
    if (commentExistsInThread(old.comments, normalized.id)) {
      return { ...old };
    }

    let comments: Comment[];
    if (normalized.parentId != null) {
      comments = appendReplyToThread(old.comments, normalized.parentId, normalized);
    } else {
      const merged = [...old.comments, normalized];
      comments =
        merged.length > COMMENT_THREAD_LIMIT
          ? merged.slice(-COMMENT_THREAD_LIMIT)
          : merged;
    }

    return {
      ...old,
      comments,
      total: (old.total ?? old.comments.length) + 1,
    };
  });
}
