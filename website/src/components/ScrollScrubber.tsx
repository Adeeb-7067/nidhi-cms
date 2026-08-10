"use client";

import { useRef, useEffect, useMemo, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FRAME_START, TOTAL_FRAMES, chapters, getActiveChapter } from "@/data/cinematic";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";
import { useFilmInView } from "@/hooks/useFilmInView";
import { ChapterStage } from "./sections/ChapterStage";

interface ScrollScrubberProps {
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  setScrubProgress?: (progress: number) => void;
  totalFrames: number;
  isLoaded: boolean;
}

export function ScrollScrubber({
  currentFrame,
  setCurrentFrame,
  setScrubProgress,
  totalFrames,
  isLoaded,
}: ScrollScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setFrameRef = useRef(setCurrentFrame);
  const setProgressRef = useRef(setScrubProgress);
  const reduced = usePrefersReducedMotion();
  const filmInView = useFilmInView();

  useEffect(() => {
    setFrameRef.current = setCurrentFrame;
    setProgressRef.current = setScrubProgress;
  }, [setCurrentFrame, setScrubProgress]);

  useEffect(() => {
    if (!isLoaded) return;

    gsap.registerPlugin(ScrollTrigger);

    const obj = { frame: FRAME_START };
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tween = gsap.to(obj, {
      frame: totalFrames,
      ease: "none",
      // Reduced motion: snap to whole frames so story advances by chapter, not continuous film.
      snap: prefersReduced ? { frame: 1 } : undefined,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.15,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (setProgressRef.current) {
            setProgressRef.current(self.progress);
          } else {
            const next = Math.round(obj.frame);
            setFrameRef.current(Math.min(totalFrames, Math.max(FRAME_START, next)));
          }
        },
      },
    });

    // Opening frame must be written even if the visitor has not scrolled yet —
    // otherwise the arrival chapter can sit behind a stale frame number.
    setFrameRef.current(FRAME_START);

    const id = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(id);
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [isLoaded, totalFrames]);

  /*
    Track length is the film's whole UX budget.
    900vh (~9 screens) gives comfortable room for all 9 chapters without
    excessive scrolling fatigue or double-smoothing lag.
  */
  const usable = TOTAL_FRAMES - FRAME_START + 1;
  const heightVh = reduced
    ? Math.max(chapters.length * 80, 600)
    : Math.max(750, Math.round((usable / 200) * 280));
  // Phones: shorter scrub track so film chapters cycle smoothly on touch flicks.
  const mobileHeightVh = reduced
    ? Math.max(chapters.length * 60, 420)
    : Math.max(480, Math.round(heightVh * 0.6));

  const active = useMemo(() => getActiveChapter(currentFrame), [currentFrame]);
  const showChapter =
    filmInView && active && currentFrame >= active.start && currentFrame <= active.end;

  return (
    <div
      ref={containerRef}
      data-film-track
      className="relative w-full max-md:[height:var(--film-h-mobile)] md:[height:var(--film-h)]"
      style={
        {
          ["--film-h" as string]: `${heightVh}vh`,
          ["--film-h-mobile" as string]: `${mobileHeightVh}vh`,
        } as CSSProperties
      }
    >
      {showChapter ? (
        <ChapterStage key={active.id} chapter={active} currentFrame={currentFrame} />
      ) : null}
    </div>
  );
}
