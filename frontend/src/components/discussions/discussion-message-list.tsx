import type { Comment } from "@/api";
import { CommentAuthorPresence } from "@/components/presence/CommentAuthorPresence";
import { CommentBody } from "@/components/chat/comment-body";
import {
  formatChatDateDivider,
  formatMessageTime,
  shouldShowDateDivider,
} from "@/lib/discussion-chat-format";
import { isOptimisticCommentId } from "@/lib/comment-thread-query";
import { discussionCommentPreview } from "@/lib/discussion-comment-preview";
import type { MentionCandidate } from "@/lib/chat-mentions";
import { cn } from "@/lib/utils";
import { CornerUpLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STACK_GAP_MS = 2 * 60 * 1000;

function isStackedWithPrevious(prev: Comment | undefined, current: Comment): boolean {
  if (!prev || prev.authorId !== current.authorId) return false;
  if (!prev.createdAt || !current.createdAt) return false;
  return (
    new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime() <= STACK_GAP_MS
  );
}

type DiscussionMessageListProps = {
  messages: Comment[];
  currentUserId?: number;
  mentionCandidates?: MentionCandidate[];
  onImageLoad?: () => void;
  canDeleteMessage?: (comment: Comment) => boolean;
  onDeleteMessage?: (comment: Comment) => void;
  canEditMessage?: (comment: Comment) => boolean;
  onEditMessage?: (comment: Comment) => void;
  onReplyMessage?: (comment: Comment) => void;
};

export function DiscussionMessageList({
  messages,
  currentUserId,
  mentionCandidates,
  onImageLoad,
  canDeleteMessage,
  onDeleteMessage,
  canEditMessage,
  onEditMessage,
  onReplyMessage,
}: DiscussionMessageListProps) {
  const messagesById = useMemo(() => {
    const map = new Map<number, Comment>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  return (
    <div className="space-y-1 pb-2">
      {messages.map((comment, index) => {
        const isMe = comment.authorId === currentUserId;
        const prev = messages[index - 1];
        const stacked = isStackedWithPrevious(prev, comment);
        const showDate = shouldShowDateDivider(comment.createdAt, prev?.createdAt);
        const showAvatar = !isMe && !stacked;
        const showTailName = !isMe && !stacked;
        const canDelete =
          !comment.isDeleted &&
          !isOptimisticCommentId(comment.id) &&
          Boolean(onDeleteMessage) &&
          (canDeleteMessage ? canDeleteMessage(comment) : false);
        const canEdit =
          !comment.isDeleted &&
          !isOptimisticCommentId(comment.id) &&
          Boolean(comment.content?.trim()) &&
          Boolean(onEditMessage) &&
          (canEditMessage ? canEditMessage(comment) : false);
        const canReply =
          !comment.isDeleted &&
          !isOptimisticCommentId(comment.id) &&
          // Only top-level messages can be replied to (data model is one level deep).
          comment.parentId == null &&
          Boolean(onReplyMessage);
        const hasMenu = canReply || canEdit || canDelete;
        const parent =
          comment.parentId != null ? messagesById.get(comment.parentId) : undefined;

        return (
          <div key={comment.id}>
            {showDate && comment.createdAt ? (
              <div className="my-4 flex justify-center">
                <span className="rounded-lg bg-white/90 px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm dark:bg-card/90">
                  {formatChatDateDivider(comment.createdAt)}
                </span>
              </div>
            ) : null}
            <div className={cn("flex", isMe ? "justify-end" : "justify-start", stacked ? "mt-0.5" : "mt-2.5")}>
              <div
                className={cn(
                  "group flex max-w-[min(100%,28rem)] gap-2 sm:max-w-[min(100%,32rem)]",
                  isMe ? "flex-row-reverse" : "flex-row",
                )}
              >
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {showAvatar ? (
                      <CommentAuthorPresence
                        authorId={comment.authorId}
                        authorName={comment.authorName}
                        authorAvatarUrl={comment.authorAvatarUrl}
                        className="h-7 w-7 border shadow-sm"
                      />
                    ) : null}
                  </div>
                )}
                <div className={cn("flex min-w-0 flex-col", isMe ? "items-end" : "items-start")}>
                  {showTailName && (
                    <span className="mb-0.5 px-1 text-[10px] font-medium text-muted-foreground">
                      {comment.authorName}
                    </span>
                  )}
                  <div className="flex max-w-full flex-col gap-0.5">
                    {parent && !comment.isDeleted ? (
                      <div
                        className={cn(
                          "flex items-stretch gap-1.5 rounded-md border-l-2 px-2 py-1",
                          isMe
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : "border-primary/50 bg-muted/60",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-semibold text-foreground/70">
                            {parent.authorId === currentUserId ? "You" : parent.authorName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {parent.isDeleted
                              ? "This message was deleted"
                              : discussionCommentPreview(parent)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <CommentBody
                      comment={comment}
                      isSent={isMe}
                      mentionCandidates={mentionCandidates}
                      onImageLoad={onImageLoad}
                      bubbleClassName={cn(
                        "shadow-sm",
                        isMe
                          ? "rounded-lg rounded-tr-sm border border-emerald-200/80 bg-[#d9fdd3] text-foreground dark:border-emerald-900/50 dark:bg-emerald-950/60 [&_img]:border-emerald-900/20"
                          : "rounded-lg rounded-tl-sm border border-border/80 bg-white dark:bg-card",
                        stacked && (isMe ? "rounded-tr-lg" : "rounded-tl-lg"),
                      )}
                      linkClassName={
                        isMe ? "text-foreground underline decoration-foreground/50" : undefined
                      }
                    />
                    <span
                      className={cn(
                        "px-1 text-[9px] tabular-nums text-muted-foreground/80",
                        isMe ? "text-right" : "text-left",
                      )}
                    >
                      {comment.isEdited && !comment.isDeleted ? "edited · " : ""}
                      {formatMessageTime(comment.createdAt)}
                    </span>
                  </div>
                </div>
                {hasMenu ? (
                  <div className="flex shrink-0 items-center self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-100 transition hover:bg-muted focus:opacity-100 focus:outline-none data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Message actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isMe ? "end" : "start"}>
                        {canReply ? (
                          <DropdownMenuItem onSelect={() => onReplyMessage?.(comment)}>
                            <CornerUpLeft className="mr-2 h-4 w-4" />
                            Reply
                          </DropdownMenuItem>
                        ) : null}
                        {canEdit ? (
                          <DropdownMenuItem onSelect={() => onEditMessage?.(comment)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit message
                          </DropdownMenuItem>
                        ) : null}
                        {canDelete ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => onDeleteMessage?.(comment)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete message
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
