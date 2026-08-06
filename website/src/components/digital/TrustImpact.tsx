"use client";

import { impactStats } from "@/data/digital";
import { AuroraField, CountUp, DigitalSection, RevealHeading } from "./primitives";

/**
 * §1 — Opens the digital act. Reads as a single instrument panel with hairline
 * dividers rather than six floating cards, with the headline stat given twice
 * the width so the grid has a focal point.
 */
export function TrustImpact() {
  return (
    <DigitalSection
      id="impact"
      className="py-[clamp(5rem,10vw,9rem)]"
      tone="deep"
      atmosphere={<AuroraField tint="#2B6BFF" secondary="#7649FF" />}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end">
        <div>
          <RevealHeading
            text="Proof that engineering moves the business."
            accentFrom={1}
            className="text-[clamp(2.25rem,5vw,4rem)]"
          />
          <p className="mt-5 max-w-[52ch] text-body">
            Satyakabir engineers the platforms organizations run on — AI, cloud, enterprise software,
            data, and automation — so transformation shows up as measurable outcomes, not slideware.
          </p>
        </div>
        <div className="flex items-center gap-3 lg:justify-end">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
          </span>
          <p className="text-meta">Figures reviewed January 2026</p>
        </div>
      </div>

      <div className="surface-panel mt-12 overflow-hidden rounded-[26px] shadow-[var(--shadow-glass)]">
        <div className="grid grid-cols-1 gap-px bg-[var(--divider)] sm:grid-cols-2 lg:grid-cols-4">
          {impactStats.map((stat, i) => {
            // First and last cells double up so the four-column grid closes
            // cleanly with six stats — no dead cell showing the divider plate.
            const wide = i === 0 || i === impactStats.length - 1;
            return (
              <div
                key={stat.label}
                className={[
                  "group relative bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] px-6 py-8 transition-colors duration-500",
                  "hover:bg-[color-mix(in_oklab,var(--surface)_96%,transparent)]",
                  wide ? "lg:col-span-2" : "",
                  i === 0 ? "lg:py-12" : "",
                ].join(" ")}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-[linear-gradient(90deg,transparent,#2B6BFF,transparent)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                />
                <div
                  className={[
                    "font-display font-extrabold leading-[0.9] tracking-[-0.04em] text-foreground",
                    i === 0
                      ? "text-[clamp(3.25rem,8vw,6rem)]"
                      : "text-[clamp(2.5rem,4.5vw,3.5rem)]",
                  ].join(" ")}
                >
                  <CountUp value={stat.value} suffix={stat.suffix} duration={1600 + i * 120} />
                </div>
                <p className="mt-3 text-card-title text-foreground">{stat.label}</p>
                <p className="mt-1.5 text-small">{stat.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </DigitalSection>
  );
}
