import React, { useEffect, useMemo } from "react";
import {
  useListComments,
  useCreateComment,
  getListCommentsQueryKey,
  type Comment,
} from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/contexts/RealtimeContext";
import { appendCommentToListCache } from "@/lib/comment-thread-query";
import { formatUserRole } from "@/lib/bug-workflow";

function roleLabel(role: string) {
  return formatUserRole(role);
}

function roleBadgeClass(role: string) {
  if (role === "qa" || role === "tester") return "bg-purple-500/15 text-purple-700 border-purple-500/30";
  if (role === "developer") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  if (role === "super_admin") return "bg-amber-500/15 text-amber-800 border-amber-500/30";
  return "bg-muted text-muted-foreground";
}

function flattenComments(comments: Comment[]): Comment[] {
  const out: Comment[] = [];
  for (const c of comments) {
    out.push(c);
    if (c.replies?.length) out.push(...flattenComments(c.replies));
  }
  return out.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
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
        <div className="rounded-2xl rounded-tl-md bg-muted/40 border border-border/40 px-3 py-2 text-sm whitespace-pre-wrap shadow-sm">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

export function BugCommentsSection({
  bugId,
  canComment,
}: {
  bugId: number;
  canComment: boolean;
}) {
  const queryClient = useQueryClient();
  const { socket } = useRealtime();
  const [text, setText] = React.useState("");

  const params = { threadType: "bug" as const, threadId: bugId };
  const { data, isLoading } = useListComments(params, {
    query: { enabled: bugId > 0, queryKey: getListCommentsQueryKey(params) },
  });

  const createMutation = useCreateComment();

  useEffect(() => {
    if (!socket || !bugId) return undefined;
    const handler = (payload: {
      threadType?: string;
      threadId?: number;
      comment?: Comment;
    }) => {
      if (payload.threadType === "bug" && payload.threadId === bugId) {
        if (payload.comment) {
          appendCommentToListCache(queryClient, "bug", bugId, payload.comment);
        } else {
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(params) });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
      }
    };
    socket.on("comment", handler);
    return () => {
      socket.off("comment", handler);
    };
  }, [socket, bugId, queryClient, params]);

  const comments = useMemo(
    () => flattenComments(data?.comments ?? []),
    [data?.comments],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await createMutation.mutateAsync({
        data: { threadType: "bug", threadId: bugId, content: text.trim() },
      });
      setText("");
      queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(params) });
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
      toast.success("Comment added");
    } catch (err) {
      toastApiError(err, "Failed to post comment");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Comments
      </h4>
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 min-h-[120px] max-h-[340px]">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No comments yet. Start the conversation.
          </p>
        ) : (
          comments.map((c) => <CommentBubble key={c.id} comment={c} />)
        )}
      </div>
      {canComment && (
        <form onSubmit={handleSubmit} className="mt-4 pt-3 border-t border-border/60 shrink-0">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="min-h-[72px] text-sm resize-none rounded-xl bg-muted/20"
          />
          <div className="flex justify-end mt-2">
            <Button type="submit" size="sm" disabled={createMutation.isPending || !text.trim()}>
              {createMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Post
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
