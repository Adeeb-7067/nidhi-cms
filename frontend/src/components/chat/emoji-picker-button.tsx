import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHAT_EMOJI_GROUPS } from "@/lib/chat-emojis";
import { cn } from "@/lib/utils";

type EmojiPickerButtonProps = {
  disabled?: boolean;
  onPick: (emoji: string) => void;
  className?: string;
  /** Ghost icon inside the capsule bar (WhatsApp-style). */
  inline?: boolean;
};

export function EmojiPickerButton({
  disabled,
  onPick,
  className,
  inline = false,
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Insert emoji"
          className={cn(
            inline
              ? "flex h-full w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-40",
            className,
          )}
        >
          <Smile className={cn(inline ? "h-[22px] w-[22px]" : "h-4 w-4")} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-[min(100vw-2rem,20rem)] p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
          {CHAT_EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
                    onClick={() => {
                      onPick(emoji);
                      setOpen(false);
                    }}
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
