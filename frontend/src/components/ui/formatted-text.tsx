import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormattedTextProps = {
  children: string | null | undefined;
  className?: string;
  /** Shown when text is empty after trim */
  fallback?: ReactNode;
  /** Bordered panel with scroll for long content */
  panel?: boolean;
  /** Extra classes on the panel wrapper (e.g. max-height) */
  panelClassName?: string;
};

/** Renders user-entered text with line breaks and wrapping preserved. */
export function FormattedText({
  children,
  className,
  fallback = null,
  panel = false,
  panelClassName,
}: FormattedTextProps) {
  const text = children?.trim() ?? "";
  if (!text) {
    return fallback ? <>{fallback}</> : null;
  }

  const body = (
    <p
      className={cn(
        "text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
        className,
      )}
    >
      {text}
    </p>
  );

  if (!panel) return body;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/40 bg-muted/30 p-3",
        "max-h-[min(28rem,50vh)] overflow-y-auto overscroll-y-auto dialog-scroll",
        panelClassName,
      )}
    >
      {body}
    </div>
  );
}
