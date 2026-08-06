"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { scaleCounters, scaleMilestones } from "@/data/digital";
import { CountUp, DigitalSection, RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

/**
 * §12 — Growth as a spine. The rail draws itself once in view and each milestone
 * lands behind it, then the counters band closes the section with hard numbers.
 */
export function CompanyScale() {
  const railRef = useRef<HTMLDivElement>(null);
  const inView = useInView(railRef, { once: true, margin: "-20% 0px" });
  const reduced = usePrefersReducedMotion();
  const drawn = reduced || inView;

  return (
    <DigitalSection id="scale" className="py-[clamp(5rem,10vw,9rem)]" tone="base">
      <div className="max-w-3xl">
        <RevealHeading
          text="Scale built for enterprise delivery."
          accentFrom={1}
          className="text-[clamp(2.1rem,4.6vw,3.5rem)]"
        />
        <p className="mt-5 text-body">
          Growth timeline, team expertise, and engineering culture — the delivery model behind
          every transformation programme.
        </p>
      </div>

      <div ref={railRef} className="relative mt-16">
        {/* Spine */}
        <div className="absolute left-[7px] top-2 h-full w-px bg-[var(--divider)] md:left-0 md:top-[7px] md:h-px md:w-full">
          <div
            className="h-full w-px bg-[linear-gradient(180deg,#2B6BFF,#00D9FF,#00C853)] md:h-px md:w-full md:bg-[linear-gradient(90deg,#2B6BFF,#00D9FF,#00C853)]"
            style={{
              // Uniform scale draws the rail along whichever axis it occupies —
              // vertical on mobile, horizontal from md up.
              transformOrigin: "top left",
              transform: drawn ? "scale(1)" : "scale(0)",
              transition: reduced ? undefined : "transform 1.8s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>

        <ol className="grid gap-9 md:grid-cols-5 md:gap-6">
          {scaleMilestones.map((milestone, i) => (
            <li
              key={milestone.year}
              data-reveal={drawn ? "shown" : "pending"}
              className="relative pl-8 md:pl-0 md:pt-8"
              style={
                {
                  "--reveal-from": "translateY(16px)",
                  "--reveal-delay": `${300 + i * 140}ms`,
                } as React.CSSProperties
              }
            >
              <span
                aria-hidden
                className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-background bg-brand-cyan md:top-0"
                style={{ boxShadow: "0 0 0 3px color-mix(in oklab, var(--brand-cyan) 25%, transparent)" }}
              />
              <p className="font-mono text-[13px] tracking-[0.14em] text-brand-cyan">
                {milestone.year}
              </p>
              <h3 className="mt-2 text-card-title text-foreground">{milestone.title}</h3>
              <p className="mt-2 text-small">{milestone.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-border bg-[var(--divider)] sm:grid-cols-3 lg:grid-cols-6">
        {scaleCounters.map((counter, i) => (
          <div
            key={counter.label}
            className="bg-[color-mix(in_oklab,var(--surface)_86%,transparent)] px-5 py-7 text-center"
          >
            <dd className="font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-extrabold leading-none tracking-[-0.04em] text-foreground">
              <CountUp value={counter.value} suffix={counter.suffix} duration={1400 + i * 100} />
            </dd>
            <dt className="mt-2.5 text-meta">{counter.label}</dt>
          </div>
        ))}
      </dl>
    </DigitalSection>
  );
}
