"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FRAME_START, TOTAL_FRAMES, chapters, getActiveChapter } from "@/data/cinematic";
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
  setFrameRef.current = setCurrentFrame;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

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
        scrub: prefersReduced ? true : 0.35,
        invalidateOnRefresh: true,
        onUpdate: () => {
          const next = Math.round(obj.frame);
          setFrameRef.current(Math.min(totalFrames, Math.max(FRAME_START, next)));
        },
      },
    });

    const id = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(id);
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [isLoaded, totalFrames]);

  // Reduced motion: shorter page — still enough to visit each chapter via scroll/jumps.
  const usable = TOTAL_FRAMES - FRAME_START + 1;
  const heightVh = reduced
    ? Math.max(chapters.length * 100, 900)
    : Math.max(1100, Math.round((usable / 200) * 800));

  const active = useMemo(() => getActiveChapter(currentFrame), [currentFrame]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: `${heightVh}vh` }}>
      {active && currentFrame >= active.start && currentFrame <= active.end ? (
        <ChapterStage key={active.id} chapter={active} currentFrame={currentFrame} />
      ) : null}
    </div>
  );
}
