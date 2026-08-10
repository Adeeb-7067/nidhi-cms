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
  totalFrames: number;
  isLoaded: boolean;
}

export function ScrollScrubber({
  currentFrame,
  setCurrentFrame,
  totalFrames,
  isLoaded,
}: ScrollScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setFrameRef = useRef(setCurrentFrame);
  const reduced = usePrefersReducedMotion();
  /**
   * Chapter overlays are `position: fixed`, so they must only exist while the
   * film is on screen. ScrollTrigger's `isActive` is the wrong signal for that:
   * on first refresh at scroll 0, GSAP often reports inactive for a tick (or
   * forever if layout hasn't settled), which unmounted the opening title and
   * left a naked building. `useFilmInView` is layout-stable and already gates
   * the canvas and atmosphere.
   */
  const filmInView = useFilmInView();

  useEffect(() => {
    setFrameRef.current = setCurrentFrame;
  }, [setCurrentFrame]);

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
        scrub: prefersReduced ? true : 0.08,
        invalidateOnRefresh: true,
        onUpdate: () => {
          const next = Math.round(obj.frame);
          setFrameRef.current(Math.min(totalFrames, Math.max(FRAME_START, next)));
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

    At the old factor of 800 this resolved to ~2868vh — about 29 screens of
    scrolling, which is why the business case used to be unreachable. 420 puts it
    near 1500vh (~15 screens) for the same 717 frames.

    Do not push this much lower: shorter track means fewer scroll pixels per
    frame, so frame steps get coarser and the scrub starts to judder. ~18px per
    frame is about the floor before smoothness suffers.
  */
  const usable = TOTAL_FRAMES - FRAME_START + 1;
  const heightVh = reduced
    ? Math.max(chapters.length * 100, 800)
    : Math.max(1000, Math.round((usable / 200) * 420));
  // Phones: shorter scrub track so the business case is reachable without endless swipe.
  const mobileHeightVh = reduced
    ? Math.max(chapters.length * 85, 640)
    : Math.max(720, Math.round(heightVh * 0.62));

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
