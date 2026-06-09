import type { MentionCandidate } from "@/lib/chat-mentions";
import { cn } from "@/lib/utils";

type MentionAutocompleteProps = {
  candidates: MentionCandidate[];
  activeIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
  className?: string;
};

export function MentionAutocomplete({
  candidates,
  activeIndex,
  onSelect,
  className,
}: MentionAutocompleteProps) {
  if (!candidates.length) return null;

  return (
    <ul
      role="listbox"
      aria-label="Mention someone"
      className={cn(
        "absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full min-w-[12rem] overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg",
        className,
      )}
    >
      {candidates.map((c, index) => (
        <li key={c.id} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
              index === activeIndex && "bg-muted",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(c);
            }}
          >
            <span className="font-medium text-primary">@</span>
            <span className="truncate">{c.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
