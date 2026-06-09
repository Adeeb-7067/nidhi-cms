import { Loader2, Mic, Send, Trash2 } from "lucide-react";
import { formatVoiceDuration } from "@/lib/chat-voice-recorder";
import { cn } from "@/lib/utils";

type VoiceRecordingBarProps = {
  seconds: number;
  compact?: boolean;
  isUploading?: boolean;
  onCancel: () => void;
  onSend: () => void;
};

export function VoiceRecordingBar({
  seconds,
  compact,
  isUploading,
  onCancel,
  onSend,
}: VoiceRecordingBarProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-[1.375rem] px-3 shadow-sm",
        compact ? "min-h-10 py-1.5" : "min-h-[2.875rem] py-2",
        "bg-white dark:bg-[#2a3942]",
      )}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span
        className={cn(
          "min-w-[2.5rem] tabular-nums text-red-600 dark:text-red-400",
          compact ? "text-[11px]" : "text-sm font-medium",
        )}
      >
        {formatVoiceDuration(seconds)}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-muted-foreground",
          compact ? "text-[10px]" : "text-sm",
        )}
      >
        Recording voice message…
      </span>
      <button
        type="button"
        aria-label="Cancel recording"
        disabled={isUploading}
        onClick={onCancel}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40",
          compact ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <Trash2 className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
      </button>
      <button
        type="button"
        aria-label="Send voice message"
        disabled={isUploading}
        onClick={onSend}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40",
          compact ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        {isUploading ? (
          <Loader2 className={cn(compact ? "h-4 w-4" : "h-[18px] w-[18px]", "animate-spin")} />
        ) : (
          <Send className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        )}
      </button>
    </div>
  );
}
