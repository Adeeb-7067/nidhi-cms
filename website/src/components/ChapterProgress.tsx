"use client";

import { useMemo } from "react";
import { chapters, getActiveChapter, frameToScrollPct } from "@/data/cinematic";
import { cn } from "@/lib/utils";

interface ChapterProgressProps {
  currentFrame: number;
  isLoaded: boolean;
}

function scrollToFrame(frame: number) {
  const pct = frameToScrollPct(frame);
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: Math.max(0, docHeight * (pct / 100)), behavior: "smooth" });
}

/**
 * Subtle chapter rail — place label + jump dots for the cinematic homepage.
 */
export function ChapterProgress({ currentFrame, isLoaded }: ChapterProgressProps) {
  const active = useMemo(() => getActiveChapter(currentFrame), [currentFrame]);
  const index = useMemo(
    () => Math.max(0, chapters.findIndex((c) => c.id === active.id)),
    [active.id],
  );

  if (!isLoaded) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-[var(--z-nav)] flex -translate-x-1/2 flex-col items-center gap-3 px-4",
        "md:bottom-8",
      )}
      aria-live="polite"
    >
      <div className="pointer-events-none flex flex-col items-center text-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
          {active.number} · {String(index + 1).padStart(2, "0")} /{" "}
          {String(chapters.length).padStart(2, "0")}
        </span>
        <span className="mt-1 max-w-[280px] truncate text-[13px] font-medium tracking-[-0.01em] text-white/80">
          {active.place}
        </span>
      </div>

      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md"
        role="navigation"
        aria-label="Film chapters"
      >
        {chapters.map((chapter) => {
          const on = chapter.id === active.id;
          return (
            <button
              key={chapter.id}
              type="button"
              title={`${chapter.number} ${chapter.place}`}
              aria-label={`Jump to ${chapter.place}`}
              aria-current={on ? "true" : undefined}
              onClick={() => scrollToFrame(chapter.start + 2)}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                on ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
