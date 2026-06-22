import React, { useEffect, useMemo } from "react";
import {
  useListComments,
  useCreateComment,
  getListCommentsQueryKey,
  getListTicketsQueryKey,
  type Comment,
} from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { developerLikeRoleBadgeClass } from "@/lib/user-roles";
import { useRealtime } from "@/contexts/RealtimeContext";
import { formatUserRole } from "@/lib/bug-workflow";
import {
  TICKET_CHAT_PRESETS,
  ticketPresetRole,
} from "@/lib/ticket-chat-presets";
import { CommentBody } from "@/components/chat/comment-body";
import { ChatComposer } from "@/components/chat/chat-composer";
import {
  appendCommentToListCache,
  commentThreadQueryParams,
  flattenCommentThread,
} from "@/lib/comment-thread-query";

function roleLabel(role: string) {
  return formatUserRole(role);
}

function roleBadgeClass(role: string) {
  if (role === "client") return "bg-emerald-500/15 text-emerald-800 border-emerald-500/30";
  if (role === "qa" || role === "tester") return "bg-purple-500/15 text-purple-700 border-purple-500/30";
  const devLike = developerLikeRoleBadgeClass(role);
  if (devLike) return devLike;
  if (role === "super_admin") return "bg-amber-500/15 text-amber-800 border-amber-500/30";
  return "bg-muted text-muted-foreground";
}

function CommentBubble({ comment }: { comment: Comment }) {
  const initials = comment.authorName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background border border-border/40">
        {comment.authorAvatarUrl ? (
          <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} />
        ) : null}
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">{comment.authorName}</span>
          <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", roleBadgeClass(comment.authorRole))}>
            {roleLabel(comment.authorRole)}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <CommentBody comment={comment} />
      </div>
    </div>
  );
}

export function TicketCommentsSection({
  ticketId,
  canComment,
  userRole,
  listQueryKey,
}: {
  ticketId: number;
  canComment: boolean;
  userRole?: string;
  listQueryKey?: unknown;
}) {
  const queryClient = useQueryClient();
  const { socket } = useRealtime();
  const [text, setText] = React.useState("");

  const params = commentThreadQueryParams("ticket", ticketId);
  const { data, isLoading } = useListComments(params, {
    query: { enabled: ticketId > 0, queryKey: getListCommentsQueryKey(params) },
  });

  const createMutation = useCreateComment();
  const presets = TICKET_CHAT_PRESETS[ticketPresetRole(userRole)];

  useEffect(() => {
    if (!socket || !ticketId) return undefined;
    const onComment = (payload: {
      threadType?: string;
      threadId?: number;
      comment?: Comment;
    }) => {
      if (payload.threadType === "ticket" && payload.threadId === ticketId && payload.comment) {
        appendCommentToListCache(queryClient, "ticket", ticketId, payload.comment);
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
      }
    };
    const onTicket = (payload: { id?: number }) => {
      if (payload.id === ticketId) {
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
      }
    };
    socket.on("comment", onComment);
    socket.on("ticket_update", onTicket);
    return () => {
      socket.off("comment", onComment);
      socket.off("ticket_update", onTicket);
    };
  }, [socket, ticketId, queryClient, params, listQueryKey]);

  const comments = useMemo(
    () => flattenCommentThread(data?.comments ?? []),
    [data?.comments],
  );

  const applyPreset = (preset: string) => {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${preset}` : preset));
  };

  const handleSend = async (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMimeType?: string;
  }) => {
    try {
      const created = await createMutation.mutateAsync({
        data: {
          threadType: "ticket",
          threadId: ticketId,
          content: payload.content ?? "",
          attachmentUrl: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
          attachmentMimeType: payload.attachmentMimeType,
        },
      });
      appendCommentToListCache(queryClient, "ticket", ticketId, created);
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
    } catch (err) {
      toastApiError(err, "Failed to send message");
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Conversation
      </h4>
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 min-h-[160px] max-h-[min(420px,50vh)]">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No messages yet. Use the chat below to work through this ticket.
          </p>
        ) : (
          comments.map((c) => <CommentBubble key={c.id} comment={c} />)
        )}
      </div>
      {canComment && (
        <div className="mt-4 pt-3 border-t border-border/60 shrink-0">
          <ChatComposer
            value={text}
            onChange={setText}
            onSubmit={handleSend}
            isSubmitting={createMutation.isPending}
            placeholder="Type your reply…"
            textareaClassName="min-h-[80px]"
            showPresets={
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-1 px-2 text-[10px] font-normal whitespace-normal text-left max-w-full"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
