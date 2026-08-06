"use client";

import { useMemo } from "react";
import { chapters, getActiveChapter, frameToScrollPct } from "@/data/cinematic";
import { scrollToFilmPct } from "@/lib/film-scroll";
import { cn } from "@/lib/utils";

interface ChapterProgressProps {
  currentFrame: number;
  isLoaded: boolean;
  /** The film is on screen. The rail is meaningless anywhere else on the page. */
  active: boolean;
}

function scrollToFrame(frame: number) {
  scrollToFilmPct(frameToScrollPct(frame));
}

/**
 * Subtle chapter rail — place label + jump dots for the film act.
 *
 * The film is a mid-page island now, so this is tied to the island's visibility
 * rather than to "have we scrolled past it": it must not hover over the business
 * sections above the tour, where its chapter numbers mean nothing.
 */
export function ChapterProgress({ currentFrame, isLoaded, active: onScreen }: ChapterProgressProps) {
  const active = useMemo(() => getActiveChapter(currentFrame), [currentFrame]);
  const index = useMemo(
    () => Math.max(0, chapters.findIndex((c) => c.id === active.id)),
    [active.id],
  );
  const retired = !onScreen;

  if (!isLoaded) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 z-[var(--z-nav)] flex -translate-x-1/2 flex-col items-center gap-3 px-4",
        "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:bottom-8",
        retired ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100",
      )}
      aria-hidden={retired}
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
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md",
          retired ? "pointer-events-none" : "pointer-events-auto",
        )}
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
