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
 * Right-edge chapter control — mirrors left Actions.
 * Place names stay horizontal (truncated) so long titles never stretch the rail.
 */
export function ChapterProgress({
  currentFrame,
  isLoaded,
  active: onScreen,
}: ChapterProgressProps) {
  const active = useMemo(() => getActiveChapter(currentFrame), [currentFrame]);
  const index = useMemo(
    () =>
      Math.max(
        0,
        chapters.findIndex((c) => c.id === active.id),
      ),
    [active.id],
  );
  const retired = !onScreen;

  if (!isLoaded) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-0 top-1/2 z-[var(--z-nav)] flex -translate-y-1/2 items-center gap-3",
        "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        retired ? "translate-x-3 opacity-0" : "translate-x-0 opacity-100",
      )}
      aria-hidden={retired}
      aria-live="polite"
    >
      {/* Horizontal label — never vertical, never stretches the capsule */}
      <div className="hidden max-w-[9.5rem] flex-col items-end text-right sm:flex">
        <span className="font-mono text-[9.5px] font-semibold tracking-[0.14em] text-brand-cyan drop-shadow">
          {String(index + 1).padStart(2, "0")}
          <span className="text-white/40"> / </span>
          {String(chapters.length).padStart(2, "0")}
        </span>
        <span
          className="mt-1 line-clamp-2 text-[12px] font-bold leading-snug tracking-[-0.01em] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]"
          title={active.place}
        >
          {active.place}
        </span>
      </div>

      <div
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-white/25 bg-black/75 backdrop-blur-md px-2.5 py-3.5 shadow-xl",
          retired ? "pointer-events-none" : "pointer-events-auto",
        )}
        role="navigation"
        aria-label="Film chapters"
      >
        <span className="mb-1 font-mono text-[8.5px] font-semibold tracking-[0.12em] text-brand-cyan sm:hidden">
          {String(index + 1).padStart(2, "0")}
        </span>
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
                "w-1.5 rounded-full transition-[height,background-color,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40",
                on
                  ? "h-5 bg-brand-cyan shadow-[0_0_8px_rgba(0,217,255,0.8)]"
                  : "h-1.5 bg-white/45 hover:bg-white/80",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
