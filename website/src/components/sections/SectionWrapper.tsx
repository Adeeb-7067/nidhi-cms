"use client";

import { atmospheres, type AtmosphereId, FRAME_FADE } from "@/data/cinematic";
import { easeOutCubic } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  currentFrame: number;
  startFrame: number;
  endFrame: number;
  fadeFrames?: number;
  atmosphere?: AtmosphereId;
  children: React.ReactNode;
  className?: string;
}

/**
 * Soft exit only — a chapter opens at full opacity and fades on the way out, so
 * entering the film never shows an empty frame waiting for text to arrive.
 *
 * These overlays are `fixed`, and only `ScrollScrubber` knows whether the film
 * track is covering the viewport. Do not mount a chapter outside that window: on
 * this page the film sits *below* the hero and seven business sections, so an
 * ungated overlay paints straight over them.
 */
function chapterEnvelope(
  frame: number,
  start: number,
  end: number,
  fadeFrames: number,
): { opacity: number; progress: number; yOffset: number; scale: number } {
  if (frame < start || frame > end) {
    return { opacity: 0, progress: 0, yOffset: 16, scale: 0.99 };
  }

  const span = Math.max(1, end - start);
  const edge = Math.min(fadeFrames, Math.max(4, Math.floor(span / 4)));
  const exitStart = end - edge;

  if (frame <= exitStart) {
    return { opacity: 1, progress: 1, yOffset: 0, scale: 1 };
  }

  const t = (end - frame) / edge;
  const opacity = easeOutCubic(Math.min(1, Math.max(0, t)));
  return {
    opacity,
    progress: opacity,
    yOffset: -12 * (1 - opacity),
    scale: 0.99 + 0.01 * opacity,
  };
}

export function SectionWrapper({
  currentFrame,
  startFrame,
  endFrame,
  fadeFrames = FRAME_FADE,
  atmosphere,
  children,
  className = "",
}: SectionWrapperProps) {
  if (currentFrame < startFrame || currentFrame > endFrame) {
    return null;
  }

  const { opacity, progress, yOffset, scale } = chapterEnvelope(
    currentFrame,
    startFrame,
    endFrame,
    fadeFrames,
  );

  const isVisible = opacity > 0.02;
  const interactive = opacity >= 0.45;
  const atm = atmosphere ? atmospheres[atmosphere] : null;

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-10 flex h-[100dvh] w-full flex-col transform-gpu",
        className,
      )}
      style={{
        opacity,
        transform: `translate3d(0, ${yOffset}px, 0) scale(${scale})`,
        willChange: "opacity, transform",
        ["--accent-current" as string]: atm?.accent ?? "var(--brand-blue)",
      }}
      aria-hidden={!interactive}
      data-section-interactive={interactive ? "true" : "false"}
      data-chapter-progress={progress.toFixed(3)}
    >
      {/* Clean transparent wrapper without dark scrim overlay so video is bright and clear */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-500" />
      <div className="pointer-events-none relative flex h-full min-h-0 w-full flex-col">
        {children}
      </div>
    </div>
  );
}

export function SectionPanel({
  children,
  className = "",
  align = "start",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <div
      className={cn(
        /* overflow/overscroll: desktop may scroll dense panels; touch must NOT
           trap gestures — iOS freezes page scroll on fixed overflow:auto layers. */
        "section-panel pointer-events-none relative z-10 h-full min-h-0 w-full",
        align === "center" && "section-panel--center",
        align === "end" && "section-panel--end",
        className,
      )}
    >
      {/*
        Only controls receive hits when interactive. Full-area pointer-events on
        the inner block ate touch pans on phones and blocked document scroll.
      */}
      <div className="section-panel-inner pointer-events-none">{children}</div>
    </div>
  );
}
