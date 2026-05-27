import type { QueryClient } from "@tanstack/react-query";
import {
  getListCommentsQueryKey,
  type Comment,
  type CommentListResult,
  type ListCommentsParams,
} from "@/api";

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
  const out: Comment[] = [];
  for (const c of comments) {
    out.push(c);
    if (c.replies?.length) out.push(...flattenCommentThread(c.replies));
  }
  return out.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function appendCommentToListCache(
  queryClient: QueryClient,
  threadType: string,
  threadId: number,
  comment: Comment,
) {
  const params = commentThreadQueryParams(threadType, threadId);
  queryClient.setQueryData<CommentListResult>(getListCommentsQueryKey(params), (old) => {
    if (!old?.comments?.length) {
      return { comments: [comment], total: 1 };
    }
    if (old.comments.some((c) => c.id === comment.id)) return old;
    const merged = [...old.comments, comment];
    const comments =
      merged.length > COMMENT_THREAD_LIMIT
        ? merged.slice(-COMMENT_THREAD_LIMIT)
        : merged;
    return {
      ...old,
      comments,
      total: (old.total ?? old.comments.length) + 1,
    };
  });
}
