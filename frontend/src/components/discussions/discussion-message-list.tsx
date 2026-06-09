import type { Comment } from "@/api";
import { CommentAuthorPresence } from "@/components/presence/CommentAuthorPresence";
import { CommentBody } from "@/components/chat/comment-body";
import {
  formatChatDateDivider,
  formatMessageTime,
  shouldShowDateDivider,
} from "@/lib/discussion-chat-format";
import type { MentionCandidate } from "@/lib/chat-mentions";
import { cn } from "@/lib/utils";

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
};

export function DiscussionMessageList({
  messages,
  currentUserId,
  mentionCandidates,
  onImageLoad,
}: DiscussionMessageListProps) {
  return (
    <div className="space-y-1 pb-2">
      {messages.map((comment, index) => {
        const isMe = comment.authorId === currentUserId;
        const prev = messages[index - 1];
        const stacked = isStackedWithPrevious(prev, comment);
        const showDate = shouldShowDateDivider(comment.createdAt, prev?.createdAt);
        const showAvatar = !isMe && !stacked;
        const showTailName = !isMe && !stacked;

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
                  "flex max-w-[min(100%,28rem)] gap-2 sm:max-w-[min(100%,32rem)]",
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
                      {formatMessageTime(comment.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
