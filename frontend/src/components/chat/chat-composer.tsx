import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  isChatImageFile,
  isChatPdfFile,
  uploadChatAttachment,
} from "@/lib/chat-file-upload";
import type { CommentInput } from "@/api";
import { cn } from "@/lib/utils";

export type ChatComposerPayload = Pick<
  CommentInput,
  "content" | "attachmentUrl" | "attachmentName" | "attachmentMimeType"
>;

type PendingAttachment = {
  file: File;
  previewUrl?: string;
};

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: ChatComposerPayload) => Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  textareaClassName?: string;
  showPresets?: React.ReactNode;
  onKeyDownEnter?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  placeholder = "Type a message…",
  submitLabel = "Send",
  className,
  textareaClassName,
  showPresets,
  onKeyDownEnter,
}: ChatComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const clearPendingAttachment = () => {
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isChatImageFile(file) && !isChatPdfFile(file)) {
      toast.error("Please choose an image (PNG, JPG, GIF, WebP) or PDF file.");
      return;
    }
    clearPendingAttachment();
    setPendingAttachment({
      file,
      previewUrl: isChatImageFile(file) ? URL.createObjectURL(file) : undefined,
    });
  };

  const canSend = Boolean(value.trim() || pendingAttachment) && !isSubmitting && !isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    setIsUploading(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      let attachmentMimeType: string | undefined;

      if (pendingAttachment) {
        const uploaded = await uploadChatAttachment(pendingAttachment.file);
        attachmentUrl = uploaded.url;
        attachmentName = uploaded.originalName;
        attachmentMimeType = uploaded.mimetype;
      }

      await onSubmit({
        content: value.trim() || "",
        attachmentUrl,
        attachmentName,
        attachmentMimeType,
      });
      onChange("");
      clearPendingAttachment();
    } catch (err) {
      toastApiError(err, "Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", className)}>
      {showPresets}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
      {pendingAttachment &&
        (pendingAttachment.previewUrl ? (
          <AttachmentImagePreview
            previewUrl={pendingAttachment.previewUrl}
            onRemove={clearPendingAttachment}
          />
        ) : (
          <div className="relative inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-xs font-medium">{pendingAttachment.file.name}</span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-full shadow"
              onClick={clearPendingAttachment}
              aria-label="Remove file"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg"
          disabled={isSubmitting || isUploading}
          onClick={() => fileRef.current?.click()}
          aria-label="Attach image or PDF"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-h-[72px] flex-1 text-sm resize-none rounded-xl bg-muted/20",
            textareaClassName,
          )}
          onKeyDown={(e) => {
            if (onKeyDownEnter) onKeyDownEnter(e);
            else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg"
          disabled={!canSend}
          aria-label={submitLabel}
        >
          {isSubmitting || isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}

function AttachmentImagePreview({
  previewUrl,
  onRemove,
}: {
  previewUrl: string;
  onRemove: () => void;
}) {
  return (
    <div className="relative inline-block">
      <img
        src={previewUrl}
        alt="Preview"
        className="max-h-32 rounded-lg border border-border object-contain"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute -right-2 -top-2 h-6 w-6 rounded-full shadow"
        onClick={onRemove}
        aria-label="Remove image"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
