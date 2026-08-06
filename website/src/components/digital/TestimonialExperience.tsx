"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { richTestimonials } from "@/data/digital";
import { DigitalSection } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

const DURATION = 9000;

/**
 * §11 — One testimonial at a time, full stage: portrait, rating, the numbers
 * that back the claim, and a film cue. Auto-advances with a visible timer and
 * pauses whenever the section has pointer or keyboard attention.
 */
export function TestimonialExperience() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const active = richTestimonials[index];

  const go = useCallback((delta: number) => {
    setIndex((current) => (current + delta + richTestimonials.length) % richTestimonials.length);
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const timer = window.setTimeout(() => go(1), DURATION);
    return () => window.clearTimeout(timer);
  }, [index, paused, reduced, go]);

  const words = active.quote.split(" ");

  return (
    <DigitalSection
      id="testimonials"
      className="py-[clamp(5rem,10vw,9rem)]"
      tone="deep"
      atmosphere={
        <div
          className="absolute inset-0 transition-[background] duration-1000"
          style={{
            background: `radial-gradient(60% 50% at 18% 20%, ${active.accent}20, transparent 62%)`,
          }}
        />
      }
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Client testimonials"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-meta">In their words</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-secondary-foreground transition-[border-color,color,transform] duration-400 hover:-translate-x-0.5 hover:border-brand-cyan/50 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-secondary-foreground transition-[border-color,color,transform] duration-400 hover:translate-x-0.5 hover:border-brand-cyan/50 hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,1fr)] lg:gap-16">
          {/* Portrait */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${active.name}-portrait`}
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-[24px] border border-border">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={active.photo}
                    alt={`${active.name}, ${active.role} at ${active.company}`}
                    fill
                    sizes="(min-width: 1024px) 26vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(2,3,5,0.9))]" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-display text-[1.2rem] tracking-[-0.02em] text-white">
                    {active.name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-white/65">{active.role}</p>
                  <p className="text-[13px]" style={{ color: active.accent }}>
                    {active.company}
                  </p>
                </div>
              </div>

              {/* A play button used to sit here for a video testimonial we do not
                  have. Promising media that does not load costs more trust than
                  the control was buying, so the portrait stands on its own. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 top-6 h-14 w-14 rounded-full opacity-40"
                style={{ boxShadow: `0 0 36px ${active.accent}` }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Quote */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1" aria-label={`${active.rating} out of 5`}>
                {Array.from({ length: active.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-brand-orange text-brand-orange" />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={active.name}
                  className="mt-6 font-display text-[clamp(1.4rem,3.2vw,2.5rem)] leading-[1.22] tracking-[-0.03em] text-foreground"
                  initial="hidden"
                  animate="shown"
                  exit="hidden"
                >
                  {words.map((word, i) => (
                    <motion.span
                      key={`${word}-${i}`}
                      className="inline-block"
                      variants={{
                        hidden: reduced ? {} : { opacity: 0, y: 12 },
                        shown: { opacity: 1, y: 0 },
                      }}
                      transition={{
                        duration: 0.5,
                        delay: reduced ? 0 : i * 0.022,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {word}
                      {i < words.length - 1 ? "\u00A0" : ""}
                    </motion.span>
                  ))}
                </motion.blockquote>
              </AnimatePresence>
            </div>

            <div className="mt-10">
              <div className="flex flex-wrap gap-x-12 gap-y-5">
                {active.metrics.map((metric) => (
                  <div key={metric.label}>
                    <div
                      className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none tracking-[-0.035em]"
                      style={{ color: active.accent }}
                    >
                      {metric.value}
                    </div>
                    <p className="mt-1.5 text-meta">{metric.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-3">
                {richTestimonials.map((item, i) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show testimonial from ${item.name}`}
                    aria-current={i === index}
                    className="group relative h-1 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: item.accent,
                        width: i === index ? "100%" : "0%",
                        transition:
                          i === index && !reduced && !paused
                            ? `width ${DURATION}ms linear`
                            : "width 0.3s ease",
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DigitalSection>
  );
}
