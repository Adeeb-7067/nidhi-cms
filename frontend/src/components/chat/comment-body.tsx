import type { Comment } from "@/api";
import { FileText } from "lucide-react";
import { LinkifiedText } from "@/components/chat/linkified-text";
import { cn } from "@/lib/utils";

function isPdfAttachment(comment: Pick<Comment, "attachmentMimeType" | "attachmentName">) {
  return (
    comment.attachmentMimeType === "application/pdf" ||
    comment.attachmentName?.toLowerCase().endsWith(".pdf")
  );
}

export function CommentBody({
  comment,
  className,
  bubbleClassName,
  linkClassName,
  onImageLoad,
}: {
  comment: Pick<
    Comment,
    "content" | "attachmentUrl" | "attachmentName" | "attachmentMimeType"
  >;
  className?: string;
  bubbleClassName?: string;
  linkClassName?: string;
  onImageLoad?: () => void;
}) {
  const hasText = Boolean(comment.content?.trim());
  const hasAttachment = Boolean(comment.attachmentUrl);
  const isPdf = hasAttachment && isPdfAttachment(comment);
  const isImage = hasAttachment && !isPdf;

  if (!hasText && !hasAttachment) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {isImage && (
        <a
          href={comment.attachmentUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[min(100%,280px)]"
        >
          <img
            src={comment.attachmentUrl!}
            alt={comment.attachmentName ?? "Attached image"}
            className="rounded-lg border border-border/50 max-h-64 w-auto object-contain bg-muted/30"
            loading="lazy"
            onLoad={onImageLoad}
          />
        </a>
      )}
      {isPdf && (
        <a
          href={comment.attachmentUrl!}
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
      {hasText && (
        <div
          className={cn(
            "rounded-2xl rounded-tl-md bg-muted/40 border border-border/40 px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
            bubbleClassName,
          )}
        >
          <LinkifiedText text={comment.content!} linkClassName={linkClassName} />
        </div>
      )}
    </div>
  );
}
