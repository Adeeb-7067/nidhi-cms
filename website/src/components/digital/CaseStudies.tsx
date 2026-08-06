"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { caseStudies } from "@/data/digital";
import { DigitalSection, Pill, RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

/**
 * §5 — Case studies as a single immersive stage rather than a rail of cards.
 * The client index drives one large device composition plus the full brief:
 * challenge, solution, stack, timeline, and the numbers that moved.
 */
export function CaseStudies() {
  const [index, setIndex] = useState(0);
  const study = caseStudies[index];
  const reduced = usePrefersReducedMotion();

  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <DigitalSection
      id="stories"
      className="py-[clamp(5rem,10vw,9rem)]"
      tone="deep"
      atmosphere={
        <div
          className="absolute inset-0 transition-[background] duration-700"
          style={{
            background: `radial-gradient(70% 55% at 78% 12%, ${study.accent}1f, transparent 65%)`,
          }}
        />
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <RevealHeading
          text="Client success — challenge to impact."
          accentFrom={1}
          className="text-[clamp(2.1rem,4.6vw,3.5rem)]"
        />
        <Link
          href="/work"
          className="group inline-flex items-center gap-2 text-small text-foreground transition-colors hover:text-brand-cyan"
        >
          All case studies
          <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,1fr)] lg:gap-14">
        {/* Client index */}
        <div
          role="tablist"
          aria-label="Case studies"
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {caseStudies.map((item, i) => {
            const active = i === index;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIndex(i)}
                className="group relative shrink-0 rounded-xl px-4 py-3 text-left transition-colors duration-400 lg:w-full lg:px-5 lg:py-4"
                style={{
                  background: active
                    ? "color-mix(in oklab, var(--surface) 88%, transparent)"
                    : "transparent",
                }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 hidden h-8 w-[2px] -translate-y-1/2 rounded-full transition-[opacity,height] duration-500 lg:block"
                  style={{
                    background: item.accent,
                    opacity: active ? 1 : 0,
                    height: active ? "2rem" : "0.5rem",
                  }}
                />
                <span
                  className="block font-display text-[1.05rem] tracking-[-0.02em] transition-colors duration-400"
                  style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
                >
                  {item.client}
                </span>
                <span className="mt-0.5 block text-[11px] tracking-[0.06em] text-muted-foreground">
                  {item.industry}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stage */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={study.id} {...fade}>
              {/* Device composition */}
              <div className="relative">
                <div
                  className="relative overflow-hidden rounded-[20px] border border-border bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] shadow-[0_50px_120px_-60px_rgba(0,0,0,0.9)]"
                  style={{ boxShadow: `0 60px 140px -70px ${study.accent}aa` }}
                >
                  <div className="flex items-center gap-2 border-b border-divider px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3 truncate rounded-md bg-[var(--muted)] px-3 py-1 text-[11px] text-muted-foreground">
                      {study.client.toLowerCase().replace(/\s+/g, "")}.app / dashboard
                    </span>
                  </div>
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={study.image}
                      alt={`${study.client} — ${study.headline}`}
                      fill
                      sizes="(min-width: 1024px) 62vw, 100vw"
                      quality={90}
                      className="object-cover"
                      priority={false}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(2,3,5,0.82))]" />
                    {/* Was a play button for a film that does not exist — a dead
                        click on the most prominent element of the section. It now
                        goes where the interest actually leads. */}
                    <Link
                      href={study.href}
                      className="group absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110"
                      aria-label={`Read the ${study.client} case study`}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full opacity-60"
                        style={{ boxShadow: `0 0 40px ${study.accent}` }}
                      />
                      <ArrowUpRight className="relative h-5 w-5 text-white" />
                    </Link>
                    <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-end justify-between gap-4">
                      <h3 className="max-w-[34ch] font-display text-[clamp(1.15rem,2.4vw,1.9rem)] leading-tight tracking-[-0.025em] text-white">
                        {study.headline}
                      </h3>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-white/70">
                        {study.timeline}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gallery — offset phone frame */}
                <div className="absolute -bottom-8 -right-2 hidden w-[132px] overflow-hidden rounded-[22px] border-4 border-[var(--surface-2)] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] md:block lg:-right-6 lg:w-[152px]">
                  <div className="relative aspect-[9/17]">
                    <Image
                      src={study.gallery[0]}
                      alt={`${study.client} mobile experience`}
                      fill
                      sizes="152px"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Brief */}
              <div className="mt-14 grid gap-8 md:grid-cols-2 md:gap-10">
                <div>
                  <p className="text-meta" style={{ color: study.accent }}>
                    Challenge
                  </p>
                  <p className="mt-3 text-body">{study.challenge}</p>
                </div>
                <div>
                  <p className="text-meta" style={{ color: study.accent }}>
                    Solution
                  </p>
                  <p className="mt-3 text-body">{study.solution}</p>
                </div>
              </div>

              <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-[var(--divider)] sm:grid-cols-3">
                {study.impact.map((metric) => (
                  <div
                    key={metric.label}
                    className="bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] px-6 py-6"
                  >
                    <div
                      className="font-display text-[clamp(1.75rem,3.2vw,2.5rem)] leading-none tracking-[-0.03em]"
                      style={{ color: study.accent }}
                    >
                      {metric.value}
                    </div>
                    <p className="mt-2 text-small">{metric.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
                <div className="flex flex-wrap gap-2">
                  {study.stack.map((tech) => (
                    <Pill key={tech}>{tech}</Pill>
                  ))}
                </div>
                <Link
                  href={study.href}
                  className="group inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-medium transition-[background-color,border-color,color] duration-500"
                  style={{ borderColor: `${study.accent}55`, color: study.accent }}
                >
                  Read the full story
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DigitalSection>
  );
}
