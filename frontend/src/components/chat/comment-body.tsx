import type { Comment } from "@/api";
import { FileText, Smartphone } from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";
import { VoiceMessagePlayer } from "@/components/chat/voice-message-player";
import { isChatVoiceAttachment } from "@/lib/chat-file-upload";
import type { MentionCandidate } from "@/lib/chat-mentions";
import { resolveFileUrl } from "@/lib/resolve-file-url";
import { cn } from "@/lib/utils";

function isPdfAttachment(comment: Pick<Comment, "attachmentMimeType" | "attachmentName">) {
  return (
    comment.attachmentMimeType === "application/pdf" ||
    comment.attachmentName?.toLowerCase().endsWith(".pdf")
  );
}

function isApkAttachment(comment: Pick<Comment, "attachmentMimeType" | "attachmentName">) {
  const name = comment.attachmentName ?? "";
  if (comment.attachmentMimeType === "application/vnd.android.package-archive") return true;
  return name.toLowerCase().endsWith(".apk");
}

function isImageAttachment(comment: Pick<Comment, "attachmentMimeType" | "attachmentName">) {
  if (isPdfAttachment(comment)) return false;
  if (isApkAttachment(comment)) return false;
  if (isChatVoiceAttachment(comment.attachmentMimeType, comment.attachmentName)) return false;
  return (
    comment.attachmentMimeType?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(comment.attachmentName ?? "")
  );
}

const bubbleBase =
  "rounded-2xl rounded-tl-md border px-3 py-2 text-sm shadow-sm";

export function CommentBody({
  comment,
  className,
  bubbleClassName,
  linkClassName,
  mentionCandidates,
  onImageLoad,
  compact,
  isSent,
}: {
  comment: Pick<
    Comment,
    "content" | "attachmentUrl" | "attachmentName" | "attachmentMimeType"
  >;
  className?: string;
  bubbleClassName?: string;
  linkClassName?: string;
  mentionCandidates?: MentionCandidate[];
  onImageLoad?: () => void;
  compact?: boolean;
  isSent?: boolean;
}) {
  const hasText = Boolean(comment.content?.trim());
  const hasAttachment = Boolean(comment.attachmentUrl);
  const isPdf = hasAttachment && isPdfAttachment(comment);
  const isApk = hasAttachment && isApkAttachment(comment);
  const isVoice = hasAttachment && isChatVoiceAttachment(comment.attachmentMimeType, comment.attachmentName);
  const isImage = hasAttachment && isImageAttachment(comment);

  if (!hasText && !hasAttachment) return null;

  const voiceVariant = isSent ? "sent" : "received";
  const attachmentHref = hasAttachment ? resolveFileUrl(comment.attachmentUrl!) : "";

  return (
    <div className={cn("space-y-1.5", className)}>
      {isImage && (
        <a
          href={attachmentHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[min(100%,280px)]"
        >
          <img
            src={attachmentHref}
            alt={comment.attachmentName ?? "Attached image"}
            className="rounded-lg border border-border/50 max-h-64 w-auto object-contain bg-muted/30"
            loading="lazy"
            onLoad={onImageLoad}
          />
        </a>
      )}
      {isVoice && (
        <div
          className={cn(
            bubbleBase,
            "border-border/40 bg-muted/40 py-2.5",
            bubbleClassName,
            compact && "px-2 py-2",
          )}
        >
          <VoiceMessagePlayer
            src={attachmentHref}
            compact={compact}
            variant={voiceVariant}
          />
        </div>
      )}
      {isPdf && (
        <a
          href={attachmentHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[min(100%,280px)] items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50"
        >
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-medium">
            {comment.attachmentName ?? "Attached PDF"}
          </span>
        </a>
      )}
      {isApk && (
        <a
          href={attachmentHref}
          target="_blank"
          rel="noopener noreferrer"
          download={comment.attachmentName ?? undefined}
          className="inline-flex max-w-[min(100%,280px)] items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50"
        >
          <Smartphone className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-medium">
            {comment.attachmentName ?? "Attached APK"}
          </span>
        </a>
      )}
      {hasText && (
        <div
          className={cn(
            bubbleBase,
            "border-border/40 bg-muted/40 whitespace-pre-wrap",
            bubbleClassName,
          )}
        >
          <MessageContent
            text={comment.content!}
            mentionCandidates={mentionCandidates}
            linkClassName={linkClassName}
          />
        </div>
      )}
    </div>
  );
}
