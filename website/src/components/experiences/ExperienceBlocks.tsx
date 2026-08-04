"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { ExperienceCard, ExperiencePayload, ExperiencePipelineStep } from "@/data/experiences";
import type { BlockLayout } from "@/data/page-compositions/types";
import { Reveal } from "@/components/experiences/primitives";
import { cn, pickFromSlug } from "@/lib/utils";

export function PillCloud({
  pills,
  accent,
  className,
}: {
  pills: string[];
  accent?: string;
  className?: string;
}) {
  if (!pills.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {pills.map((pill, i) => (
        <motion.span
          key={pill}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-full border px-3 py-1.5 text-meta"
          style={{
            borderColor: accent ? `${accent}44` : undefined,
            color: accent,
            background: accent ? `${accent}12` : undefined,
          }}
        >
          {pill}
        </motion.span>
      ))}
    </div>
  );
}

const PIPELINE_LAYOUTS = ["flow", "ladder", "compact"] as const satisfies readonly BlockLayout[];

export function PipelineFlow({
  steps,
  accent,
  title = "Delivery pipeline",
  layout,
  slug = "",
}: {
  steps: ExperiencePipelineStep[];
  accent: string;
  title?: string;
  layout?: BlockLayout;
  slug?: string;
}) {
  if (!steps.length) return null;
  const mode = (layout && PIPELINE_LAYOUTS.includes(layout as (typeof PIPELINE_LAYOUTS)[number])
    ? layout
    : pickFromSlug(slug || title, PIPELINE_LAYOUTS)) as (typeof PIPELINE_LAYOUTS)[number];

  if (mode === "ladder") {
    return (
      <section className="xp-section-lg max-w-[900px]">
        <p className="text-eyebrow text-muted-foreground">{title}</p>
        <ol className="mt-10 space-y-0">
          {steps.map((item, i) => (
            <Reveal key={item.step} delay={i * 0.05}>
              <li className="grid gap-4 border-t border-border py-8 md:grid-cols-[88px_1fr] md:gap-10">
                <span className="font-deco text-[2.4rem] leading-none" style={{ color: accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] leading-tight">{item.step}</h3>
                  <p className="mt-2 max-w-xl xp-prose">{item.detail}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>
    );
  }

  if (mode === "compact") {
    return (
      <section className="xp-section max-w-[1100px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="text-eyebrow text-muted-foreground">{title}</p>
          <p className="max-w-sm text-small text-muted-foreground md:text-right">
            {steps.length} stages · operator-owned handoffs
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-y border-border py-8">
          {steps.map((item, i) => (
            <Reveal key={item.step} delay={i * 0.04} className="min-w-[140px] flex-1">
              <p className="text-meta" style={{ color: accent }}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-1 font-display text-[1.15rem] leading-snug">{item.step}</p>
              <p className="mt-1 text-small text-muted-foreground">{item.detail}</p>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  /* flow — horizontal cards */
  return (
    <section className="xp-section-lg">
      <p className="text-eyebrow text-muted-foreground">{title}</p>
      <div className="scrollbar-hide mt-6 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
        {steps.map((item, i) => (
          <Reveal key={item.step} delay={i * 0.06} className="min-w-[160px] flex-1 md:min-w-0">
            <div className="relative h-full rounded-2xl border border-border bg-surface p-4 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-meta" style={{ color: accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="hidden h-px flex-1 md:block"
                    style={{ background: `linear-gradient(90deg, ${accent}66, transparent)` }}
                  />
                ) : null}
              </div>
              <div className="mt-3 font-display text-[1.35rem] leading-tight md:text-[1.5rem]">{item.step}</div>
              <p className="mt-2 text-small text-muted-foreground">{item.detail}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const CARD_LAYOUTS = ["grid", "bento", "rail", "split", "index"] as const satisfies readonly BlockLayout[];

export function CapabilityCards({
  cards,
  accent,
  title = "Capability map",
  layout,
  slug = "",
  body,
}: {
  cards: ExperienceCard[];
  accent: string;
  title?: string;
  layout?: BlockLayout;
  slug?: string;
  body?: string;
}) {
  if (!cards.length) return null;
  const mode = (layout && CARD_LAYOUTS.includes(layout as (typeof CARD_LAYOUTS)[number])
    ? layout
    : pickFromSlug(slug || title, CARD_LAYOUTS)) as (typeof CARD_LAYOUTS)[number];

  if (mode === "rail") {
    return (
      <section className="xp-section-lg max-w-[1000px]">
        <p className="text-eyebrow text-muted-foreground">{title}</p>
        <div className="mt-10 space-y-0">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.05}>
              <article className="grid gap-3 border-t border-border py-7 md:grid-cols-[160px_1fr] md:gap-12">
                <div>
                  <span className="text-meta" style={{ color: accent }}>
                    {card.meta ?? String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 font-display text-[1.4rem] leading-tight md:text-[1.65rem]">{card.title}</h3>
                </div>
                <p className="max-w-xl self-center xp-prose">
                  {card.summary}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  if (mode === "split") {
    return (
      <section className="xp-section-lg grid gap-8 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-4 md:sticky md:top-28 md:self-start">
          <p className="text-eyebrow text-muted-foreground">{title}</p>
          {body ? (
            <p className="mt-4 xp-prose">{body}</p>
          ) : (
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">What this covers</h2>
          )}
        </div>
        <div className="space-y-4 md:col-span-8">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.05}>
              <article className="flex gap-5 border-l-2 pl-5" style={{ borderColor: `${accent}55` }}>
                <div>
                  {card.meta ? (
                    <span className="text-meta" style={{ color: accent }}>
                      {card.meta}
                    </span>
                  ) : null}
                  <h3 className="font-display text-[1.4rem] leading-tight md:text-[1.55rem]">{card.title}</h3>
                  <p className="mt-2 xp-prose-sm">{card.summary}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  if (mode === "index") {
    return (
      <section className="xp-section-lg max-w-[1100px]">
        <div className="flex items-end justify-between gap-6 border-b border-border pb-6">
          <p className="text-eyebrow text-muted-foreground">{title}</p>
          <span className="text-meta text-muted-foreground">{cards.length} items</span>
        </div>
        <div className="mt-2">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.04}>
              <article className="group grid grid-cols-[48px_1fr] gap-4 border-b border-border py-5 transition-colors hover:bg-surface/60 md:grid-cols-[64px_220px_1fr] md:gap-8">
                <span className="font-mono text-small text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-display text-[1.2rem] leading-snug md:text-[1.35rem]">{card.title}</h3>
                <p className="col-span-2 xp-prose-sm md:col-span-1">
                  {card.summary}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  if (mode === "bento") {
    return (
      <section className="xp-section-lg">
        <p className="text-eyebrow text-muted-foreground">{title}</p>
        <div className="mt-6 grid auto-rows-[minmax(140px,auto)] gap-3 md:grid-cols-6">
          {cards.map((card, i) => {
            const span =
              i === 0
                ? "md:col-span-4 md:row-span-2"
                : i === 1
                  ? "md:col-span-2"
                  : i === 2
                    ? "md:col-span-2"
                    : "md:col-span-3";
            return (
              <Reveal key={card.title} delay={i * 0.05} className={span}>
                <article
                  className={cn(
                    "flex h-full flex-col justify-between rounded-[24px] border border-border p-5 md:p-6",
                    i === 0 ? "bg-surface" : "bg-transparent",
                  )}
                  style={i === 0 ? { background: `linear-gradient(145deg, ${accent}18, transparent 70%)` } : undefined}
                >
                  {card.meta ? (
                    <span className="text-meta" style={{ color: accent }}>
                      {card.meta}
                    </span>
                  ) : (
                    <span className="text-meta text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  )}
                  <div className={i === 0 ? "mt-8" : "mt-4"}>
                    <h3
                      className={cn(
                        "font-display leading-tight",
                        i === 0 ? "text-[clamp(1.6rem,3vw,2.4rem)]" : "text-[1.25rem] md:text-[1.4rem]",
                      )}
                    >
                      {card.title}
                    </h3>
                    <p className="mt-2 xp-prose-sm md:text-[14px]">
                      {card.summary}
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>
    );
  }

  /* grid — equal cards */
  return (
    <section className="xp-section-lg">
      <p className="text-eyebrow text-muted-foreground">{title}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Reveal key={card.title} delay={i * 0.05}>
            <article className="group h-full rounded-2xl border border-border bg-surface p-5 transition-[border-color,transform,background-color] duration-400 hover:-translate-y-1 hover:border-brand-cyan/30">
              {card.meta ? (
                <span className="text-meta" style={{ color: accent }}>
                  {card.meta}
                </span>
              ) : null}
              <h3 className="mt-2 font-display text-[1.35rem] leading-tight md:text-[1.5rem]">{card.title}</h3>
              <p className="mt-2 xp-prose-sm">{card.summary}</p>
              <div
                className="mt-5 h-0.5 w-12 rounded-full opacity-70 transition-[width] duration-500 group-hover:w-20"
                style={{ background: accent }}
              />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function MediaMosaic({
  gallery,
  highlight,
  accent,
}: {
  gallery: string[];
  highlight: string;
  accent: string;
}) {
  const shots = gallery.slice(0, 3);
  if (!shots.length) return null;
  return (
    <section className="xp-section-lg">
      <div className="grid gap-3 md:grid-cols-12 md:gap-4">
        <Reveal className="relative min-h-[240px] overflow-hidden rounded-[28px] md:col-span-7 md:min-h-[360px]">
          <Image src={shots[0]} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 60vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <p className="absolute bottom-5 left-5 right-5 font-deco text-[clamp(1.4rem,3vw,2.4rem)] leading-tight text-white">
            {highlight}
          </p>
        </Reveal>
        <div className="grid gap-3 md:col-span-5 md:grid-rows-2">
          {shots.slice(1).map((src, i) => (
            <Reveal key={src} delay={0.08 + i * 0.06} className="relative min-h-[140px] overflow-hidden rounded-[22px] md:min-h-0">
              <Image src={src} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 40vw" />
              <div
                className="absolute inset-0 opacity-50"
                style={{ background: `linear-gradient(135deg, ${accent}33, transparent 60%)` }}
              />
            </Reveal>
          ))}
          {shots.length === 1 ? (
            <div
              className="rounded-[22px] border border-border p-6"
              style={{ background: `linear-gradient(160deg, ${accent}22, transparent)` }}
            >
              <p className="font-display text-[1.6rem] leading-tight">{highlight}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function StackPills({ stack, accent }: { stack: string[]; accent: string }) {
  if (!stack.length) return null;
  return (
    <section className="xp-section">
      <p className="mb-4 text-eyebrow text-muted-foreground">Stack & standards</p>
      <PillCloud pills={stack} accent={accent} />
    </section>
  );
}

export function ExperienceStory({ data }: { data: ExperiencePayload }) {
  return (
    <section className="xp-section-lg grid gap-6 md:grid-cols-12">
      {data.chapters.map((chapter, i) => (
        <Reveal
          key={chapter.label}
          delay={i * 0.08}
          className={i % 2 === 0 ? "md:col-span-7" : "md:col-span-5 md:mt-16"}
        >
          <p className="text-meta text-muted-foreground">{chapter.label}</p>
          <h3 className="mt-2 font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">{chapter.title}</h3>
          <p className="mt-3 xp-prose">{chapter.body}</p>
        </Reveal>
      ))}
    </section>
  );
}

export function RelatedStrip({ related, sectionHref }: Pick<ExperiencePayload, "related" | "sectionHref">) {
  if (!related.length) return null;
  return (
    <section className="xp-section-lg">
      <p className="text-eyebrow text-muted-foreground">Continue exploring</p>
      <div className="scrollbar-hide mt-6 flex gap-4 overflow-x-auto pb-4">
        {related.map((item, i) => (
          <Reveal key={item.href} delay={i * 0.06} className="min-w-[min(260px,75vw)] max-w-[280px] shrink-0">
            <Link
              href={item.href}
              className="group block rounded-2xl border border-border bg-surface p-5 transition-[border-color,transform] duration-400 hover:-translate-y-1 hover:border-brand-cyan/35"
            >
              <div className="font-display text-[1.25rem] leading-snug">{item.title}</div>
              <p className="mt-2 line-clamp-3 text-small text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex text-meta text-muted-foreground transition-colors group-hover:text-brand-cyan">
                Open →
              </span>
            </Link>
          </Reveal>
        ))}
        <Link
          href={sectionHref}
          className="flex min-w-[160px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-border text-label text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </div>
    </section>
  );
}
