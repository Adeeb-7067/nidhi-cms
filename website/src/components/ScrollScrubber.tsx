"use client";

import { useRef, useEffect, useMemo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FRAME_START, TOTAL_FRAMES, getActiveChapter } from "@/data/cinematic";
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

  useEffect(() => {
    if (!isLoaded) return;

    gsap.registerPlugin(ScrollTrigger);

    const obj = { frame: FRAME_START };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tween = gsap.to(obj, {
      frame: totalFrames,
      ease: "none",
      snap: reduced ? { frame: 1 } : undefined,
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        // Lower scrub lag = film tracks the wheel more tightly (feels less mushy).
        scrub: reduced ? true : 0.35,
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

  // More scroll distance per frame → smoother scrubbing, fewer frame jumps.
  const usable = TOTAL_FRAMES - FRAME_START + 1;
  const heightVh = Math.max(1100, Math.round((usable / 200) * 800));

  const active = useMemo(() => getActiveChapter(currentFrame), [currentFrame]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: `${heightVh}vh` }}>
      {/* Only the exclusive active chapter mounts — avoids 16 overlay trees per frame. */}
      {active && currentFrame >= active.start && currentFrame <= active.end ? (
        <ChapterStage key={active.id} chapter={active} currentFrame={currentFrame} />
      ) : null}
    </div>
  );
}
