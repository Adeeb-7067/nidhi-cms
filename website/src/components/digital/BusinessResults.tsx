"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { businessResults } from "@/data/digital";
import { CountUp, DigitalSection, RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

/**
 * §4 — Outcomes as a ledger rather than a card grid: each result is a full-width
 * row whose measure bar fills on entry, so the page reads like a results report.
 */
function ResultRow({ kpi, index }: { kpi: (typeof businessResults)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, margin: "-18% 0px" });
  const reduced = usePrefersReducedMotion();
  const shown = reduced || inView;

  return (
    <li
      ref={ref}
      data-reveal={shown ? "shown" : "pending"}
      className="group relative border-t border-divider py-8 md:py-10"
      style={
        {
          "--reveal-from": "translateY(22px)",
          "--reveal-delay": `${index * 90}ms`,
        } as React.CSSProperties
      }
    >
      <div className="grid items-baseline gap-4 md:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] md:gap-10">
        <div className="font-display text-[clamp(3rem,9vw,6.5rem)] font-extrabold leading-[0.85] tracking-[-0.05em] text-foreground">
          <CountUp
            value={kpi.value}
            prefix={kpi.prefix}
            suffix={kpi.suffix}
            duration={1500 + index * 150}
          />
        </div>
        <div>
          <h3 className="text-card-title text-foreground">{kpi.title}</h3>
          <p className="mt-2 max-w-[56ch] text-small">{kpi.detail}</p>
          <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2B6BFF,#00D9FF)]"
              style={{
                width: shown ? `${kpi.fill}%` : "0%",
                transition: reduced
                  ? undefined
                  : `width 1.4s cubic-bezier(0.16,1,0.3,1) ${240 + index * 90}ms`,
              }}
            />
          </div>
        </div>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-brand-cyan/60 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
      />
    </li>
  );
}

export function BusinessResults() {
  return (
    <DigitalSection
      id="results"
      className="py-[clamp(5rem,10vw,9rem)]"
      /* Light island. Outcome numbers are the most scrutinised content on the
         page, and a bright report-like surface both reads faster and breaks the
         long dark run either side of it. */
      tone="light"
      /* The intro column is sticky; containment would change how it resolves. */
      skipWhenOffscreen={false}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
          <RevealHeading
            text="Business results that prove the transformation."
            accentFrom={1}
            className="text-[clamp(2.1rem,4.4vw,3.4rem)]"
          />
          <p className="mt-5 max-w-[46ch] text-body">
            Revenue, cost, efficiency, experience, speed — every engagement starts with the outcome
            the business needs to move, then engineers the system that moves it.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-[var(--divider)]">
            <div className="bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] px-5 py-4">
              <dt className="text-meta">Measured over</dt>
              <dd className="mt-1 font-display text-[1.35rem] text-foreground">24 months</dd>
            </div>
            <div className="bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] px-5 py-4">
              <dt className="text-meta">Programmes</dt>
              <dd className="mt-1 font-display text-[1.35rem] text-foreground">40+</dd>
            </div>
          </dl>
        </div>

        <ol className="border-b border-divider">
          {businessResults.map((kpi, i) => (
            <ResultRow key={kpi.title} kpi={kpi} index={i} />
          ))}
        </ol>
      </div>
    </DigitalSection>
  );
}
