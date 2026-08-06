"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Capability phrases for the film arrival hero — what we do, not the brand name. */
export const HERO_CAPABILITY_PHRASES = [
  "App Development",
  "Website Development",
  "Software Development",
  "AI Development",
  "Cloud Engineering",
  "Enterprise Platforms",
  "Digital Transformation",
  "Product Engineering",
] as const;

type HeroCapabilityTypewriterProps = {
  phrases?: readonly string[];
  className?: string;
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
};

/**
 * Typing cycle for arrival hero capabilities.
 * Only the live phrase is painted — sizer is opacity-0 (no gradient), so nothing stacks.
 */
export function HeroCapabilityTypewriter({
  phrases = HERO_CAPABILITY_PHRASES,
  className,
  typeMs = 55,
  deleteMs = 32,
  holdMs = 1800,
}: HeroCapabilityTypewriterProps) {
  const list = phrases.length ? phrases : HERO_CAPABILITY_PHRASES;
  const longest = list.reduce((a, b) => (a.length >= b.length ? a : b), list[0]!);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(list[0]!);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("holding");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!reduced) return;
    setText(list[index]!);
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 2800);
    return () => window.clearTimeout(id);
  }, [reduced, index, list]);

  useEffect(() => {
    if (reduced) return;
    const full = list[index]!;

    if (phase === "holding") {
      const id = window.setTimeout(() => setPhase("deleting"), holdMs);
      return () => window.clearTimeout(id);
    }

    if (phase === "deleting") {
      if (text.length === 0) {
        setIndex((i) => (i + 1) % list.length);
        setPhase("typing");
        return;
      }
      const id = window.setTimeout(() => {
        setText((t) => t.slice(0, -1));
      }, deleteMs);
      return () => window.clearTimeout(id);
    }

    if (text === full) {
      setPhase("holding");
      return;
    }
    const id = window.setTimeout(() => {
      setText(full.slice(0, text.length + 1));
    }, typeMs);
    return () => window.clearTimeout(id);
  }, [reduced, phase, text, index, list, typeMs, deleteMs, holdMs]);

  return (
    <span
      className={cn("relative block w-full whitespace-nowrap", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Width/height reserve only — must stay fully transparent (no brand gradient). */}
      <span
        className="pointer-events-none block select-none whitespace-nowrap text-transparent"
        aria-hidden
      >
        {longest}
      </span>
      <span className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap text-brand-gradient">
        {text}
        <span
          className={cn(
            "ml-1 inline-block h-[0.85em] w-[0.09em] shrink-0 translate-y-[0.06em] rounded-[1px] bg-brand-cyan",
            !reduced && "motion-safe:animate-pulse",
          )}
          aria-hidden
        />
      </span>
    </span>
  );
}
