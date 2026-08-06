"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Magnetic } from "@/components/ui/Magnetic";
import { RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";
import { site } from "@/data/mock";

/** Fixed seeds keep server and client markup identical. */
const MOTES = [
  { x: 8, y: 22, s: 3, d: 0, dur: 17 },
  { x: 18, y: 68, s: 2, d: 2.4, dur: 21 },
  { x: 29, y: 38, s: 4, d: 1.1, dur: 15 },
  { x: 41, y: 80, s: 2, d: 3.6, dur: 24 },
  { x: 52, y: 16, s: 3, d: 0.8, dur: 19 },
  { x: 63, y: 60, s: 2, d: 4.2, dur: 22 },
  { x: 71, y: 30, s: 4, d: 1.9, dur: 16 },
  { x: 82, y: 74, s: 2, d: 3.1, dur: 25 },
  { x: 90, y: 44, s: 3, d: 2.7, dur: 18 },
  { x: 35, y: 54, s: 2, d: 5, dur: 20 },
];

/**
 * §13 — Closing frame. One idea, one action, and enough space around it that the
 * button is the only thing left to do.
 */
export function FinalCta() {
  const reduced = usePrefersReducedMotion();

  return (
    <section
      id="start"
      className="cv-auto relative isolate overflow-hidden bg-[#03060D]"
      style={{ zIndex: "var(--z-content)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 90% at 50% 120%, rgba(43,107,255,0.35), transparent 62%), radial-gradient(50% 60% at 12% 8%, rgba(118,73,255,0.28), transparent 60%), radial-gradient(45% 55% at 88% 12%, rgba(0,217,255,0.22), transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {!reduced && (
        <div aria-hidden className="absolute inset-0">
          {MOTES.map((mote, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-brand-cyan/45 blur-[1px]"
              style={{
                left: `${mote.x}%`,
                top: `${mote.y}%`,
                width: mote.s,
                height: mote.s,
                animation: `float ${mote.dur}s ease-in-out ${mote.d}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-[var(--grid-max)] flex-col items-center page-pad py-[clamp(6rem,14vw,12rem)] text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
          Technology engineering · Digital transformation
        </p>

        <RevealHeading
          text="Let's build what's next."
          className="mt-6 max-w-[14ch] text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.94] text-white"
        />

        <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-white/65">
          Tell us the transformation you need — modernize a platform, automate operations, scale
          with AI and cloud, or harden security. Principals reply within one business day.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic className="inline-flex" strength={0.4}>
            <Link
              href="/contact/get-quote"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-8 py-4 text-[14px] font-medium tracking-[0.02em] text-white shadow-[0_24px_70px_-24px_rgba(43,107,255,0.85)] transition-shadow duration-500 hover:shadow-[0_30px_90px_-20px_rgba(0,217,255,0.6)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#2B6BFF_0%,#4B8AFF_45%,#00D9FF_100%)] bg-[length:220%_220%] bg-[position:0%_50%] transition-[background-position] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[position:100%_50%]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-[5] translate-x-[-120%] bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.4)_50%,transparent_70%)] transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[120%]"
              />
              Start Your Transformation
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
            </Link>
          </Magnetic>

          <Link
            href="/contact/book-meeting"
            className="inline-flex items-center gap-2 rounded-full border border-white/18 px-7 py-4 text-[14px] font-medium text-white/80 transition-[border-color,color,background-color] duration-500 hover:border-white/40 hover:bg-white/5 hover:text-white"
          >
            Schedule a Discovery Call
          </Link>
        </div>

        <p className="mt-10 text-[13px] text-white/40">
          {site.email} · Bengaluru · Remote-first · Global delivery
        </p>
      </div>
    </section>
  );
}
