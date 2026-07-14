import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { Comment } from "@/api";
import type { ProjectDiscussionThreadType } from "@/lib/discussion-channels";
import {
  applyCommentDeletedToCaches,
  applyCommentUpdatedToCaches,
  applyProjectCommentToCaches,
} from "@/lib/discussion-realtime";

type ThreadCommentRealtimeOptions = {
  socket: Socket | null;
  threadType: ProjectDiscussionThreadType | "project";
  threadId: number | null | undefined;
  enabled?: boolean;
};

function matchesThread(
  data: { threadType?: string; threadId?: number },
  threadType: string,
  threadId: number,
) {
  return data.threadType === threadType && data.threadId === threadId;
}

/**
 * Keeps a single thread's comment cache in sync via socket events (new / edit / delete).
 * Use on ProjectDetail, client Portal, and any other page that shows one thread.
 */
export function useThreadCommentRealtime({
  socket,
  threadType,
  threadId,
  enabled = true,
}: ThreadCommentRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !enabled || threadId == null || threadId <= 0) return undefined;

    const tid = threadId;
    const ttype = threadType;

    const handleNewComment = (data: {
      threadType?: string;
      threadId?: number;
      comment?: Comment;
    }) => {
      if (!matchesThread(data, ttype, tid) || !data.comment) return;
      applyProjectCommentToCaches(queryClient, tid, data.comment, ttype);
    };

    const handleCommentDeleted = (data: {
      threadType?: string;
      threadId?: number;
      commentId?: number;
      comment?: Comment;
    }) => {
      if (!matchesThread(data, ttype, tid) || data.commentId == null) return;
      applyCommentDeletedToCaches(queryClient, ttype, tid, data.commentId);
    };

    const handleCommentUpdated = (data: {
      threadType?: string;
      threadId?: number;
      comment?: Comment;
    }) => {
      if (!matchesThread(data, ttype, tid) || !data.comment) return;
      applyCommentUpdatedToCaches(queryClient, ttype, tid, data.comment);
    };

    socket.on("comment", handleNewComment);
    socket.on("comment:deleted", handleCommentDeleted);
    socket.on("comment:updated", handleCommentUpdated);

    return () => {
      socket.off("comment", handleNewComment);
      socket.off("comment:deleted", handleCommentDeleted);
      socket.off("comment:updated", handleCommentUpdated);
    };
  }, [socket, threadType, threadId, enabled, queryClient]);
}
