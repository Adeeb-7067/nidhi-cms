import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EmojiPickerButton } from "@/components/chat/emoji-picker-button";
import { MentionAutocomplete } from "@/components/chat/mention-autocomplete";
import { VoiceRecordingBar } from "@/components/chat/voice-recording-bar";
import { FileText, Loader2, Mic, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  isChatAttachmentFile,
  isChatImageFile,
  uploadChatAttachment,
} from "@/lib/chat-file-upload";
import type { CommentInput } from "@/api";
import {
  extractMentionedUserIds,
  filterMentionCandidates,
  insertMentionAtCursor,
  parseActiveMentionQuery,
  type MentionCandidate,
} from "@/lib/chat-mentions";
import {
  useVoiceRecorder,
  VOICE_MAX_SECONDS,
  VOICE_MIN_SECONDS,
} from "@/lib/chat-voice-recorder";
import { cn } from "@/lib/utils";
import { dataTransferHasFiles } from "@/lib/file-drag";

export type ChatComposerPayload = Pick<
  CommentInput,
  | "content"
  | "attachmentUrl"
  | "attachmentName"
  | "attachmentMimeType"
  | "mentionedUserIds"
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
  mentionCandidates?: MentionCandidate[];
  enableEmojiPicker?: boolean;
  enableVoice?: boolean;
  /** Allow .apk uploads (discussions); uses apk storage bucket (up to 500MB). */
  enableApk?: boolean;
  /** Drag-and-drop onto the composer to stage a file before send. */
  enableDragDrop?: boolean;
  /** File dropped on a parent drop zone (e.g. full discussion panel). */
  incomingFile?: File | null;
  onIncomingFileHandled?: () => void;
  size?: "default" | "compact";
};

const MAX_TEXTAREA_HEIGHT = 120;
const SINGLE_LINE_HEIGHT = 24;

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  insertion: string,
  onChange: (value: string) => void,
) {
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const next = currentValue.slice(0, start) + insertion + currentValue.slice(end);
  onChange(next);
  const cursor = start + insertion.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  });
  return cursor;
}

function syncTextareaHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = `${SINGLE_LINE_HEIGHT}px`;
  const next = Math.min(Math.max(el.scrollHeight, SINGLE_LINE_HEIGHT), MAX_TEXTAREA_HEIGHT);
  el.style.height = `${next}px`;
}

function ComposerIconButton({
  label,
  onClick,
  disabled,
  children,
  slotClassName,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  slotClassName?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center", slotClassName)}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="flex h-full w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {children}
      </button>
    </div>
  );
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  placeholder = "Type a message",
  submitLabel = "Send",
  className,
  textareaClassName,
  showPresets,
  onKeyDownEnter,
  mentionCandidates,
  enableEmojiPicker = false,
  enableVoice = false,
  enableApk = false,
  enableDragDrop = false,
  incomingFile = null,
  onIncomingFileHandled,
  size = "default",
}: ChatComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceSendInFlightRef = useRef(false);
  const autoMaxSentRef = useRef(false);
  const { isRecording, seconds, start, stop, cancel } = useVoiceRecorder();
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mentionMenu, setMentionMenu] = useState<{
    start: number;
    end: number;
    query: string;
  } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  const mentionsEnabled = Boolean(mentionCandidates?.length);
  const attachOptions = useMemo(() => ({ allowApk: enableApk }), [enableApk]);
  const compact = size === "compact";
  const iconSlot = compact ? "h-8 w-8" : "h-10 w-10";
  const iconSize = compact ? "h-5 w-5" : "h-[22px] w-[22px]";

  const filteredMentions = useMemo(() => {
    if (!mentionMenu || !mentionCandidates?.length) return [];
    return filterMentionCandidates(mentionCandidates, mentionMenu.query);
  }, [mentionMenu, mentionCandidates]);

  const syncMentionMenu = useCallback(
    (text: string, cursor: number) => {
      if (!mentionsEnabled) {
        setMentionMenu(null);
        return;
      }
      const active = parseActiveMentionQuery(text, cursor);
      setMentionMenu(active);
      setMentionIndex(0);
    },
    [mentionsEnabled],
  );

  useLayoutEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [value, compact]);

  const clearPendingAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const attachFile = useCallback(
    (file: File) => {
      if (isRecording) return;
      if (!isChatAttachmentFile(file, attachOptions)) {
        toast.error(
          enableApk
            ? "Drop an image, PDF, or APK file."
            : "Please choose an image (PNG, JPG, GIF, WebP) or PDF file.",
        );
        return;
      }
      clearPendingAttachment();
      setPendingAttachment({
        file,
        previewUrl: isChatImageFile(file) ? URL.createObjectURL(file) : undefined,
      });
    },
    [attachOptions, enableApk, isRecording, clearPendingAttachment],
  );

  useEffect(() => {
    return () => {
      setPendingAttachment((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    attachFile(file);
  };

  useEffect(() => {
    if (!incomingFile) return;
    attachFile(incomingFile);
    onIncomingFileHandled?.();
  }, [incomingFile, attachFile, onIncomingFileHandled]);

  const handleDragEnter = (e: React.DragEvent) => {
    if (!enableDragDrop || isRecording) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (dataTransferHasFiles(e.dataTransfer)) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!enableDragDrop) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragDrop || isRecording) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableDragDrop || isRecording) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    if (files.length > 1) {
      toast.message("Using the first file only.");
    }
    attachFile(files[0]);
  };

  const applyMention = (candidate: MentionCandidate) => {
    if (!mentionMenu || !textareaRef.current) return;
    const { text, cursor } = insertMentionAtCursor(
      value,
      mentionMenu.start,
      mentionMenu.end,
      candidate,
    );
    onChange(text);
    setMentionMenu(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
      syncTextareaHeight(el);
    });
  };

  const canSend =
    Boolean(value.trim() || pendingAttachment) &&
    !isSubmitting &&
    !isUploading &&
    !isRecording;

  const handleStartVoice = async () => {
    if (!enableVoice || canSend || isSubmitting || isUploading || pendingAttachment) return;
    try {
      await start();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not access microphone. Check browser permissions.",
      );
    }
  };

  const handleVoiceSend = useCallback(async () => {
    if (!isRecording || isUploading || voiceSendInFlightRef.current) return;
    voiceSendInFlightRef.current = true;
    const duration = seconds;
    setIsUploading(true);
    try {
      const file = await stop();
      if (!file) return;
      if (duration < VOICE_MIN_SECONDS) {
        toast.error("Hold the mic a little longer before sending.");
        return;
      }
      const uploaded = await uploadChatAttachment(file);
      await onSubmit({
        content: "",
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.originalName,
        attachmentMimeType: uploaded.mimetype,
      });
    } catch (err) {
      toastApiError(err, "Failed to send voice message");
    } finally {
      voiceSendInFlightRef.current = false;
      setIsUploading(false);
    }
  }, [isRecording, isUploading, seconds, stop, onSubmit]);

  const handleVoiceCancel = () => {
    if (isUploading) return;
    autoMaxSentRef.current = false;
    cancel();
  };

  useEffect(() => {
    if (isRecording && seconds >= VOICE_MAX_SECONDS && !autoMaxSentRef.current) {
      autoMaxSentRef.current = true;
      void handleVoiceSend();
    }
    if (!isRecording) {
      autoMaxSentRef.current = false;
    }
  }, [isRecording, seconds, handleVoiceSend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    setIsUploading(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      let attachmentMimeType: string | undefined;

      if (pendingAttachment) {
        const uploaded = await uploadChatAttachment(pendingAttachment.file, attachOptions);
        attachmentUrl = uploaded.url;
        attachmentName = uploaded.originalName;
        attachmentMimeType = uploaded.mimetype;
      }

      const trimmed = value.trim() || "";
      const mentionedUserIds =
        mentionsEnabled && mentionCandidates
          ? extractMentionedUserIds(trimmed, mentionCandidates)
          : undefined;

      await onSubmit({
        content: trimmed,
        attachmentUrl,
        attachmentName,
        attachmentMimeType,
        ...(mentionedUserIds?.length ? { mentionedUserIds } : {}),
      });
      onChange("");
      setMentionMenu(null);
      clearPendingAttachment();
      requestAnimationFrame(() => syncTextareaHeight(textareaRef.current));
    } catch (err) {
      toastApiError(err, "Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionMenu && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionMenu(null);
        return;
      }
    }

    if (onKeyDownEnter) {
      onKeyDownEnter(e);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const fileAccept = enableApk
    ? "image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,.apk,application/vnd.android.package-archive"
    : "image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
      onDragEnter={enableDragDrop ? handleDragEnter : undefined}
      onDragLeave={enableDragDrop ? handleDragLeave : undefined}
      onDragOver={enableDragDrop ? handleDragOver : undefined}
      onDrop={enableDragDrop ? handleDrop : undefined}
    >
      {enableDragDrop && isDragOver ? (
        <div
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/70 bg-emerald-500/10 backdrop-blur-[1px]"
          aria-hidden
        >
          <p className="px-4 text-center text-xs font-medium text-emerald-800 dark:text-emerald-200">
            {enableApk ? "Drop image, PDF, or APK to attach" : "Drop image or PDF to attach"}
          </p>
        </div>
      ) : null}
      {showPresets ? <div className="mb-2">{showPresets}</div> : null}

      {mentionMenu && filteredMentions.length > 0 ? (
        <MentionAutocomplete
          candidates={filteredMentions}
          activeIndex={mentionIndex}
          onSelect={applyMention}
          className="absolute bottom-full left-0 right-0 z-30 mb-2"
        />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept={fileAccept}
        className="hidden"
        onChange={handleFileSelect}
      />

      {pendingAttachment ? (
        <div className="mb-2">
          {pendingAttachment.previewUrl ? (
            <AttachmentImagePreview
              previewUrl={pendingAttachment.previewUrl}
              onRemove={clearPendingAttachment}
            />
          ) : (
            <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2">
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate text-xs font-medium">{pendingAttachment.file.name}</span>
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground"
                onClick={clearPendingAttachment}
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ) : null}

      {isRecording ? (
        <VoiceRecordingBar
          seconds={seconds}
          compact={compact}
          isUploading={isUploading}
          onCancel={handleVoiceCancel}
          onSend={() => void handleVoiceSend()}
        />
      ) : (
      <div
        className={cn(
          "flex w-full items-center gap-0.5 rounded-[1.375rem] px-1.5 shadow-sm",
          compact ? "min-h-10 py-1" : "min-h-[2.875rem] py-1.5",
          "bg-white dark:bg-[#2a3942]",
        )}
      >
        <ComposerIconButton
          label={enableApk ? "Attach image, PDF, or APK" : "Attach image or PDF"}
          disabled={isSubmitting || isUploading}
          onClick={() => fileRef.current?.click()}
          slotClassName={iconSlot}
        >
          <Plus className={iconSize} strokeWidth={1.75} />
        </ComposerIconButton>

        {enableEmojiPicker ? (
          <div className={cn("flex shrink-0 items-center justify-center", iconSlot)}>
            <EmojiPickerButton
              inline
              disabled={isSubmitting || isUploading}
              className="h-full w-full"
              onPick={(emoji) => {
                const el = textareaRef.current;
                if (!el) {
                  onChange(value + emoji);
                  return;
                }
                const cursor = insertAtCursor(el, value, emoji, onChange);
                syncMentionMenu(value + emoji, cursor);
                syncTextareaHeight(el);
              }}
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1 px-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              syncMentionMenu(e.target.value, e.target.selectionStart ?? e.target.value.length);
              syncTextareaHeight(e.target);
            }}
            onClick={(e) =>
              syncMentionMenu(
                e.currentTarget.value,
                e.currentTarget.selectionStart ?? e.currentTarget.value.length,
              )
            }
            onKeyUp={(e) =>
              syncMentionMenu(
                e.currentTarget.value,
                e.currentTarget.selectionStart ?? e.currentTarget.value.length,
              )
            }
            placeholder={placeholder}
            disabled={isSubmitting || isUploading}
            className={cn(
              "block w-full resize-none overflow-y-auto border-0 bg-transparent p-0 leading-6 text-foreground shadow-none outline-none ring-0",
              "caret-emerald-500 placeholder:text-muted-foreground focus-visible:ring-0 disabled:opacity-60",
              compact ? "text-[11px]" : "text-sm",
              textareaClassName,
            )}
            style={{ height: SINGLE_LINE_HEIGHT, maxHeight: MAX_TEXTAREA_HEIGHT }}
            onKeyDown={handleTextareaKeyDown}
          />
        </div>

        <div className={cn("flex shrink-0 items-center justify-center", iconSlot)}>
          {canSend ? (
            <button
              type="submit"
              aria-label={submitLabel}
              disabled={!canSend}
              className={cn(
                "flex items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40",
                compact ? "h-8 w-8" : "h-9 w-9",
              )}
            >
              {isSubmitting || isUploading ? (
                <Loader2 className={compact ? "h-4 w-4 animate-spin" : "h-[18px] w-[18px] animate-spin"} />
              ) : (
                <Send className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
              )}
            </button>
          ) : enableVoice ? (
            <button
              type="button"
              aria-label="Record voice message"
              disabled={isSubmitting || isUploading || Boolean(pendingAttachment)}
              onClick={() => void handleStartVoice()}
              className="flex h-full w-full items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mic className={iconSize} strokeWidth={1.75} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Voice message (not available)"
              disabled
              className="flex h-full w-full items-center justify-center text-muted-foreground opacity-50"
            >
              <Mic className={iconSize} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
      )}
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
        className="max-h-32 rounded-2xl border border-border/50 object-contain"
      />
      <button
        type="button"
        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow hover:text-foreground"
        onClick={onRemove}
        aria-label="Remove image"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
