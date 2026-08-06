"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

/**
 * Counts to `value` once the element enters the viewport.
 * Reduced motion lands on the final value immediately.
 */
export function CountUp({
  value,
  suffix = "",
  prefix = "",
  duration = 1800,
  decimals,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = usePrefersReducedMotion();
  const places = decimals ?? (Number.isInteger(value) ? 0 : 1);
  const [display, setDisplay] = useState(() => value.toFixed(places));

  // The final value is the rendered default, so the number is correct without JS
  // and the count only ever runs as an enhancement once the element is seen.
  useEffect(() => {
    if (!inView || reduced) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 4;
      setDisplay((value * eased).toFixed(places));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value, duration, places]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/**
 * Ambient mesh. Static radial gradients only — animated `filter: blur(110px)`
 * orbs were re-rasterising huge surfaces every frame and soft-blurring the page.
 */
export function AuroraField({
  className,
  tint = "#2B6BFF",
  secondary = "#00D9FF",
  intensity = 1,
}: {
  className?: string;
  tint?: string;
  secondary?: string;
  intensity?: number;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(60% 55% at 15% 10%, ${tint}${Math.round(26 * intensity)
            .toString(16)
            .padStart(2, "0")}, transparent 60%), radial-gradient(55% 50% at 85% 85%, ${secondary}${Math.round(
            22 * intensity,
          )
            .toString(16)
            .padStart(2, "0")}, transparent 62%), radial-gradient(40% 40% at 70% 20%, ${tint}${Math.round(
            12 * intensity,
          )
            .toString(16)
            .padStart(2, "0")}, transparent 70%)`,
        }}
      />
    </div>
  );
}

/** Faint engineering grid — reads as blueprint, not decoration. */
export function GridPlate({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 opacity-[0.35]", className)}
      style={{
        backgroundImage:
          "linear-gradient(var(--divider) 1px, transparent 1px), linear-gradient(90deg, var(--divider) 1px, transparent 1px)",
        backgroundSize: `${size}px ${size}px`,
        maskImage: "radial-gradient(75% 65% at 50% 40%, #000 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(75% 65% at 50% 40%, #000 40%, transparent 100%)",
      }}
    />
  );
}

/**
 * Shared rhythm for the digital act. Each section supplies its own atmosphere;
 * the shell only handles width, vertical pacing, and stacking above the film canvas.
 */
export function DigitalSection({
  id,
  children,
  atmosphere,
  className,
  bleed,
  tone = "base",
  skipWhenOffscreen = true,
}: {
  id?: string;
  children: React.ReactNode;
  /** Full-bleed background layers — rendered outside the measured container. */
  atmosphere?: React.ReactNode;
  className?: string;
  /** Content spans the full viewport width (marquees, reels, maps). */
  bleed?: boolean;
  /**
   * Surface weight. `light` inverts the palette for its own subtree — use it to
   * break up long dark runs, not decoratively.
   */
  tone?: "base" | "raised" | "deep" | "light";
  /** Opt out where a sticky child needs to escape containment. */
  skipWhenOffscreen?: boolean;
}) {
  const tones = {
    base: "bg-background",
    raised: "bg-[color-mix(in_oklab,var(--surface)_60%,var(--background))]",
    deep: "bg-[color-mix(in_oklab,var(--background)_88%,#000)]",
    light: "tone-light",
  } as const;

  return (
    <section
      id={id}
      className={cn(
        "relative isolate overflow-hidden",
        skipWhenOffscreen && "cv-auto",
        tones[tone],
        className,
      )}
      style={{ zIndex: "var(--z-content)" }}
    >
      {atmosphere ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {atmosphere}
        </div>
      ) : null}
      <div
        className={cn(
          "relative z-10",
          bleed ? "w-full" : "mx-auto w-full max-w-[var(--grid-max)] page-pad",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Word-by-word rise. Used on the two or three headings that carry the act —
 * not on every section, so it keeps its impact.
 */
export function RevealHeading({
  text,
  accentFrom,
  className,
  as: Tag = "h2",
}: {
  text: string;
  /** Index of the first word rendered in the brand accent. */
  accentFrom?: number;
  className?: string;
  as?: "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const words = text.split(" ");

  return (
    <div ref={ref}>
      <Tag className={cn("text-section", className)}>
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
            <span
              data-reveal={inView ? "shown" : "pending"}
              className={cn(
                "inline-block will-change-transform",
                accentFrom !== undefined && i >= accentFrom && "text-brand-blue",
              )}
              style={
                {
                  "--reveal-from": "translateY(105%)",
                  "--reveal-delay": `${i * 55}ms`,
                } as React.CSSProperties
              }
            >
              {word}
              {i < words.length - 1 ? "\u00A0" : ""}
            </span>
          </span>
        ))}
      </Tag>
    </div>
  );
}

/** Small capability tag used across the act. */
export function Pill({
  children,
  accent,
  className,
}: {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium tracking-[0.06em] text-secondary-foreground",
        className,
      )}
      style={accent ? { borderColor: `${accent}44`, color: accent } : undefined}
    >
      {children}
    </span>
  );
}
