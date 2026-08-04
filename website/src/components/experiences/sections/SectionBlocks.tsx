"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import type { ExperiencePayload } from "@/data/experiences";
import type { SectionProps } from "@/data/page-compositions/types";
import {
  CloudStack,
  FaqAccordion,
  GlowPanel,
  LifecycleRail,
  MetricTicker,
  ParticleField,
  Reveal,
  ScanGrid,
  TechOrbit,
  Watermark,
} from "@/components/experiences/primitives";
import {
  CapabilityCards,
  MediaMosaic,
  PillCloud,
  PipelineFlow,
  RelatedStrip,
  StackPills,
} from "@/components/experiences/ExperienceBlocks";
import { cn, pickFromSlug } from "@/lib/utils";
import type { BlockLayout } from "@/data/page-compositions/types";

type Ctx = { data: ExperiencePayload; props?: SectionProps };

const TEXT_LAYOUTS = ["flush", "split-text", "display", "center", "pull"] as const satisfies readonly BlockLayout[];
const VALUE_LAYOUTS = ["columns", "stack", "pair"] as const satisfies readonly BlockLayout[];
const CHAPTER_LAYOUTS = ["magazine", "cascade", "ledger"] as const satisfies readonly BlockLayout[];

export function SectionHeroManifesto({ data, props }: Ctx) {
  return (
    <section className="xp-section text-center">
      <p className="text-eyebrow" style={{ color: data.accent }}>
        {props?.eyebrow ?? data.eyebrow}
      </p>
      <h1 className="xp-title mx-auto mt-5 max-w-5xl">{data.title}</h1>
      <p className="xp-prose mx-auto mt-6 max-w-2xl text-balance">
        {props?.body ?? data.summary}
      </p>
      {data.pills.length > 0 && (
        <PillCloud pills={data.pills} accent={data.accent} className="mt-8 justify-center" />
      )}
    </section>
  );
}

export function SectionHeroSplit({ data, props }: Ctx) {
  const image = props?.image ?? data.image;
  return (
    <section className="xp-section grid items-center gap-8 md:min-h-[70vh] md:grid-cols-2 md:gap-12">
      <div className="min-w-0">
        <p className="text-eyebrow" style={{ color: data.accent }}>
          {data.eyebrow}
        </p>
        <h1 className="xp-title mt-4">{data.title}</h1>
        <p className="xp-prose mt-5">{props?.body ?? data.summary}</p>
      </div>
      <div className="relative aspect-[4/5] min-h-[240px] overflow-hidden rounded-[1.5rem] sm:aspect-[5/4] md:aspect-auto md:min-h-[420px] md:rounded-[1.75rem]">
        <Image
          src={image}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width:768px) 100vw, 50vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent dark:from-black/55" />
      </div>
    </section>
  );
}

export function SectionHeroEditorial({ data, props }: Ctx) {
  return (
    <section className="xp-section mx-auto max-w-[820px]">
      <p className="text-eyebrow" style={{ color: data.accent }}>
        {data.eyebrow}
      </p>
      <h1 className="xp-title mt-5">{data.title}</h1>
      <p className="xp-prose mt-6 text-[1.05rem] leading-[1.75] md:text-[1.125rem]">
        {props?.body ?? data.summary}
      </p>
      {props?.image && (
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-[1.5rem]">
          <Image src={props.image} alt="" fill className="object-cover" sizes="820px" />
        </div>
      )}
    </section>
  );
}

export function SectionHeroMedia({ data, props }: Ctx) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);
  const image = props?.image ?? data.image;

  return (
    <section className="xp-section-sm">
      <div
        ref={ref}
        className="relative min-h-[min(72vh,560px)] overflow-hidden rounded-[1.5rem] md:min-h-[min(75vh,640px)] md:rounded-[2rem]"
      >
        <motion.div style={{ y }} className="absolute inset-0 scale-110">
          <Image src={image} alt="" fill className="object-cover" sizes="100vw" priority />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-12">
          <p className="text-eyebrow text-white/75">{data.eyebrow}</p>
          <h1 className="xp-title mt-3 max-w-3xl text-white">{data.title}</h1>
          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-white/85 md:text-[1rem]">
            {props?.body ?? data.summary}
          </p>
        </div>
      </div>
    </section>
  );
}

export function SectionHeroSignal({ data }: Ctx) {
  const [focus, setFocus] = useState(false);
  return (
    <section className="xp-section relative flex min-h-[58vh] flex-col items-center justify-center text-center md:min-h-[64vh]">
      <div
        aria-hidden
        className={`pointer-events-none absolute h-56 w-56 rounded-full blur-3xl transition-opacity duration-700 md:h-64 md:w-64 ${focus ? "opacity-50" : "opacity-20"}`}
        style={{ background: data.accent }}
      />
      <p className="relative text-eyebrow" style={{ color: data.accent }}>
        {data.eyebrow}
      </p>
      <h1 className="xp-title relative mt-4 max-w-4xl">{data.title}</h1>
      <p className="xp-prose relative mt-5 max-w-lg">{data.summary}</p>
      <div className="relative mt-2" onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
    </section>
  );
}

export function SectionHeroNeural({ data }: Ctx) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  return (
    <section ref={ref} className="relative min-h-[min(88vh,720px)] overflow-hidden">
      <ParticleField accent={data.accent} />
      <motion.div
        style={{ scale }}
        className="relative z-10 mx-auto flex min-h-[min(88vh,720px)] max-w-[1200px] flex-col justify-end px-5 pb-12 md:px-8 md:pb-16"
      >
        <Watermark text={data.watermark} className="absolute right-0 top-20 hidden opacity-80 sm:block" />
        <p className="text-eyebrow" style={{ color: data.accent }}>
          {data.eyebrow}
        </p>
        <h1 className="xp-title mt-4 max-w-4xl">{data.title}</h1>
        <p className="xp-prose mt-5 max-w-xl">{data.summary}</p>
        <PillCloud pills={data.pills} accent={data.accent} className="mt-8" />
      </motion.div>
    </section>
  );
}

export function SectionHeroCloud({ data }: Ctx) {
  return (
    <section className="xp-section">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface p-6 sm:p-8 md:rounded-[2rem] md:p-12">
        <CloudStack accent={data.accent} />
        <div className="relative z-10 max-w-2xl">
          <p className="text-eyebrow" style={{ color: data.accent }}>
            {data.eyebrow}
          </p>
          <h1 className="xp-title mt-4">{data.title}</h1>
          <p className="xp-prose mt-5">{data.summary}</p>
        </div>
        <Watermark text="CLOUD" className="absolute bottom-0 right-0 opacity-50" />
      </div>
    </section>
  );
}

export function SectionHeroProduct({ data }: Ctx) {
  return (
    <section className="xp-section">
      <p className="text-eyebrow" style={{ color: data.accent }}>
        {data.eyebrow}
      </p>
      <h1 className="xp-title mt-4 max-w-4xl">{data.title}</h1>
      <p className="xp-prose mt-5 max-w-2xl">{data.summary}</p>
      <PillCloud pills={data.pills} accent={data.accent} className="mt-8" />
    </section>
  );
}

export function SectionHeroWork({ data }: Ctx) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);
  return (
    <section className="xp-section-sm">
      <div
        ref={ref}
        className="relative min-h-[320px] overflow-hidden rounded-[1.5rem] md:min-h-[520px] md:rounded-[1.75rem]"
      >
        <motion.div style={{ scale }} className="absolute inset-0">
          <Image src={data.image} alt="" fill className="object-cover" sizes="100vw" priority />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6 md:p-8">
          <p className="text-eyebrow text-white/70">{data.eyebrow}</p>
          <h1 className="xp-title mt-2 text-white">{data.title}</h1>
        </div>
      </div>
    </section>
  );
}

export function SectionHeroDefault({ data }: Ctx) {
  return (
    <section className="xp-section">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface p-6 sm:p-8 md:p-12">
        {data.image && (
          <div className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-30">
            <Image src={data.image} alt="" fill className="object-cover" sizes="1200px" />
          </div>
        )}
        <div className="relative max-w-2xl">
          <p className="text-eyebrow" style={{ color: data.accent }}>
            {data.eyebrow}
          </p>
          <h1 className="xp-title mt-4">{data.title}</h1>
          <p className="xp-prose mt-5">{data.summary}</p>
        </div>
      </div>
    </section>
  );
}

export function SectionPills({ data }: Ctx) {
  if (!data.pills.length) return null;
  return (
    <section className="xp-section-sm !py-2 md:!py-3">
      <PillCloud pills={data.pills} accent={data.accent} />
    </section>
  );
}

export function SectionHighlightBand({ data, props }: Ctx) {
  const title = props?.title ?? data.highlight;
  const body = props?.body ?? data.highlight;
  const eyebrow = props?.eyebrow ?? "Overview";
  const mode = (props?.layout && TEXT_LAYOUTS.includes(props.layout as (typeof TEXT_LAYOUTS)[number])
    ? props.layout
    : pickFromSlug(data.slug + "-text", TEXT_LAYOUTS)) as (typeof TEXT_LAYOUTS)[number];

  if (mode === "split-text") {
    return (
      <section className="xp-section grid gap-8 md:grid-cols-12 md:gap-12">
        <Reveal className="md:col-span-5">
          <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-3 xp-heading leading-[0.95]">{title}</h2>
        </Reveal>
        <Reveal delay={0.08} className="md:col-span-7 md:pt-10">
          <p className="max-w-xl xp-prose">{body}</p>
        </Reveal>
      </section>
    );
  }

  if (mode === "display") {
    return (
      <section className="xp-section-lg">
        <Reveal>
          <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-4 max-w-5xl font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.92]">{title}</h2>
          {body && body !== title ? (
            <p className="mt-8 max-w-lg border-l-2 pl-5 xp-prose" style={{ borderColor: data.accent }}>
              {body}
            </p>
          ) : null}
        </Reveal>
      </section>
    );
  }

  if (mode === "center") {
    return (
      <section className="xp-section-lg max-w-[820px] text-center">
        <Reveal>
          <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-4 xp-heading leading-tight text-balance">{title}</h2>
          <p className="mx-auto mt-6 max-w-xl xp-prose">{body}</p>
        </Reveal>
      </section>
    );
  }

  if (mode === "pull") {
    return (
      <section className="xp-section max-w-[1100px]">
        <Reveal>
          <div
            className="rounded-[28px] border border-border px-6 py-10 md:px-12 md:py-14"
            style={{ background: `linear-gradient(135deg, ${data.accent}14, transparent 55%)` }}
          >
            <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-3 max-w-3xl font-deco text-[clamp(1.6rem,3.5vw,2.8rem)] leading-snug">{title}</h2>
            <p className="mt-5 max-w-2xl xp-prose">{body}</p>
          </div>
        </Reveal>
      </section>
    );
  }

  /* flush */
  return (
    <section className="xp-section max-w-[1000px]">
      <Reveal>
        <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-3 xp-heading leading-tight">{title}</h2>
        {body ? (
          <p className="mt-4 max-w-2xl xp-prose">{body}</p>
        ) : null}
      </Reveal>
    </section>
  );
}

export function SectionPipeline({ data, props }: Ctx) {
  const steps = props?.pipeline ?? data.pipeline;
  if (!steps.length) return null;
  return (
    <PipelineFlow
      steps={steps}
      accent={data.accent}
      title={props?.title}
      layout={props?.layout}
      slug={data.slug}
    />
  );
}

export function SectionCards({ data, props }: Ctx) {
  const cards = props?.cards ?? data.cards;
  if (!cards.length) return null;
  return (
    <CapabilityCards
      cards={cards}
      accent={data.accent}
      title={props?.title}
      layout={props?.layout}
      slug={data.slug}
      body={props?.body}
    />
  );
}

export function SectionChaptersGrid({ data, props }: Ctx) {
  if (!data.chapters.length) return null;
  const mode = (props?.layout && CHAPTER_LAYOUTS.includes(props.layout as (typeof CHAPTER_LAYOUTS)[number])
    ? props.layout
    : pickFromSlug(data.slug + "-ch", CHAPTER_LAYOUTS)) as (typeof CHAPTER_LAYOUTS)[number];

  if (mode === "ledger") {
    return (
      <section className="xp-section-lg max-w-[1000px]">
        {data.chapters.map((chapter, i) => (
          <Reveal key={chapter.label} delay={i * 0.06}>
            <article className="grid gap-3 border-t border-border py-10 md:grid-cols-[140px_1fr] md:gap-10">
              <p className="text-meta" style={{ color: data.accent }}>
                {chapter.label}
              </p>
              <div>
                <h3 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight">{chapter.title}</h3>
                <p className="mt-3 max-w-2xl xp-prose">{chapter.body}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </section>
    );
  }

  if (mode === "cascade") {
    return (
      <section className="xp-section-lg max-w-[1100px] space-y-16 md:space-y-20">
        {data.chapters.map((chapter, i) => (
          <Reveal
            key={chapter.label}
            delay={i * 0.06}
            className={cn(i % 2 === 0 ? "md:pr-[18%]" : "md:pl-[18%] md:text-right")}
          >
            <p className={cn("text-meta text-muted-foreground", i % 2 ? "md:ml-auto" : "")}>{chapter.label}</p>
            <h3 className="mt-2 xp-heading leading-[0.95]">{chapter.title}</h3>
            <p
              className={cn(
                "mt-4 max-w-xl xp-prose",
                i % 2 ? "md:ml-auto" : "",
              )}
            >
              {chapter.body}
            </p>
          </Reveal>
        ))}
      </section>
    );
  }

  /* magazine — staggered columns */
  return (
    <section className="xp-section-lg grid gap-6 md:grid-cols-12">
      {data.chapters.map((chapter, i) => (
        <Reveal
          key={chapter.label}
          delay={i * 0.08}
          className={cn(
            i % 3 === 0 && "md:col-span-7",
            i % 3 === 1 && "md:col-span-5 md:mt-20",
            i % 3 === 2 && "md:col-span-10 md:col-start-2",
          )}
        >
          <p className="text-meta text-muted-foreground">{chapter.label}</p>
          <h3 className="mt-2 xp-heading leading-tight">{chapter.title}</h3>
          <p className="mt-3 xp-prose">{chapter.body}</p>
        </Reveal>
      ))}
    </section>
  );
}

export function SectionChaptersAlternating({ data, props }: Ctx) {
  if (!data.chapters.length) return null;
  const mode = props?.layout ?? pickFromSlug(data.slug + "-alt", ["cascade", "ledger"] as const);

  if (mode === "ledger") {
    return <SectionChaptersGrid data={data} props={{ ...props, layout: "ledger" }} />;
  }

  return (
    <section className="xp-section max-w-[900px] space-y-12 md:space-y-16">
      {data.chapters.map((c, i) => (
        <Reveal key={c.label} className={i % 2 ? "text-right" : "text-left"}>
          <p className="text-eyebrow text-muted-foreground">{c.label}</p>
          <h2 className="mt-2 xp-heading">{c.title}</h2>
          <p className={`mt-4 max-w-xl xp-prose ${i % 2 ? "ml-auto" : ""}`}>{c.body}</p>
        </Reveal>
      ))}
    </section>
  );
}

export function SectionChaptersEditorial({ data, props }: Ctx) {
  if (!data.chapters.length) return null;
  const mode = props?.layout ?? pickFromSlug(data.slug + "-ed", ["flush", "pull", "display"] as const);

  if (mode === "pull") {
    return (
      <section className="xp-section max-w-[920px] space-y-8">
        {data.chapters.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.05}>
            <article
              className="rounded-[24px] border border-border p-6 md:p-8"
              style={i === 0 ? { background: `linear-gradient(160deg, ${data.accent}12, transparent)` } : undefined}
            >
              <p className="text-meta text-muted-foreground">{c.label}</p>
              <h2 className="mt-2 font-display text-[28px] md:text-[34px]">{c.title}</h2>
              <p className="mt-3 xp-prose">{c.body}</p>
            </article>
          </Reveal>
        ))}
      </section>
    );
  }

  if (mode === "display") {
    return (
      <section className="xp-section max-w-[1100px]">
        {data.chapters.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.06} className="border-t border-border py-12 first:border-t-0 first:pt-0">
            <p className="text-eyebrow" style={{ color: data.accent }}>
              {c.label}
            </p>
            <h2 className="mt-3 max-w-4xl font-display text-[clamp(2rem,4.5vw,3.6rem)] leading-[0.95]">{c.title}</h2>
            <p className="mt-5 max-w-2xl xp-prose">{c.body}</p>
          </Reveal>
        ))}
      </section>
    );
  }

  return (
    <section className="xp-section max-w-[820px] space-y-10 md:space-y-12">
      {data.chapters.map((c) => (
        <article key={c.label}>
          <Reveal>
            <p className="text-meta text-muted-foreground">{c.label}</p>
            <h2 className="mt-2 font-display text-[28px] md:text-[34px]">{c.title}</h2>
            <p className="mt-3 xp-prose">{c.body}</p>
          </Reveal>
        </article>
      ))}
    </section>
  );
}

export function SectionMetrics({ data, props }: Ctx) {
  if (!data.metrics.length) return null;
  const mode = props?.layout ?? pickFromSlug(data.slug + "-met", ["grid", "rail", "compact"] as const);

  if (mode === "rail") {
    return (
      <section className="xp-section max-w-[1100px]">
        <div className="flex flex-col gap-8 border-y border-border py-10 md:flex-row md:items-stretch md:justify-between md:gap-4">
          {data.metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.05} className="md:flex-1 md:border-l md:border-border md:pl-6 first:md:border-l-0 first:md:pl-0">
              <MetricTicker value={m.value} label={m.label} accent={data.accent} />
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  if (mode === "compact") {
    return (
      <section className="xp-section max-w-[900px]">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-6 md:gap-x-10">
          {data.metrics.map((m) => (
            <div key={m.label}>
              <p className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-none" style={{ color: data.accent }}>
                {m.value}
              </p>
              <p className="mt-2 text-meta text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="xp-section">
      <div className="grid grid-cols-2 gap-8 border-y border-border py-10 md:grid-cols-4">
        {data.metrics.map((m) => (
          <MetricTicker key={m.label} value={m.value} label={m.label} accent={data.accent} />
        ))}
      </div>
    </section>
  );
}

export function SectionGallery({ data, props }: Ctx) {
  const gallery = props?.images?.length ? props.images : data.gallery;
  if (!gallery.length) return null;
  return (
    <div>
      {props?.title && (
        <p className="xp-section-sm !pb-0 text-eyebrow text-muted-foreground">{props.title}</p>
      )}
      <MediaMosaic gallery={gallery} highlight={props?.body ?? data.highlight} accent={data.accent} />
    </div>
  );
}

export function SectionStack({ data, props }: Ctx) {
  if (!data.stack.length) return null;
  return (
    <div>
      {props?.title && (
        <p className="xp-section-sm !pb-0 text-eyebrow text-muted-foreground">{props.title}</p>
      )}
      <StackPills stack={data.stack} accent={data.accent} />
    </div>
  );
}

export function SectionTimeline({ data, props }: Ctx) {
  const items = props?.timeline;
  if (!items?.length) return null;
  return (
    <section className="xp-section-lg max-w-[900px]">
      <p className="text-eyebrow text-muted-foreground">{props?.eyebrow ?? "Timeline"}</p>
      <h2 className="mt-3 xp-heading">{props?.title ?? "Journey"}</h2>
      <ol className="relative mt-12 space-y-0 border-l border-border pl-8">
        {items.map((item, i) => (
          <Reveal key={item.year + item.title} delay={i * 0.06}>
            <li className="relative pb-12 last:pb-0">
              <span
                className="absolute -left-[39px] top-1.5 h-3 w-3 rounded-full"
                style={{ background: data.accent }}
              />
              <p className="text-meta" style={{ color: data.accent }}>
                {item.year}
              </p>
              <h3 className="mt-1 font-display text-[22px] md:text-[28px]">{item.title}</h3>
              <p className="mt-2 max-w-xl xp-prose">{item.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export function SectionTeamGrid({ data, props }: Ctx) {
  const team = props?.team;
  if (!team?.length) return null;
  return (
    <section className="xp-section-lg">
      <p className="text-eyebrow text-muted-foreground">{props?.eyebrow ?? "People"}</p>
      <h2 className="mt-3 xp-heading">{props?.title ?? "Team"}</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((member, i) => (
          <Reveal key={member.name + member.role} delay={i * 0.05}>
            <article className="overflow-hidden rounded-[24px] border border-border bg-surface">
              {member.image && (
                <div className="relative aspect-[4/3]">
                  <Image src={member.image} alt="" fill className="object-cover" sizes="400px" />
                </div>
              )}
              <div className="p-5">
                <p className="text-meta" style={{ color: data.accent }}>
                  {member.role}
                </p>
                <h3 className="mt-1 font-display text-[22px]">{member.name}</h3>
                <p className="mt-2 xp-prose-sm">{member.blurb}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function SectionValues({ data, props }: Ctx) {
  const values = props?.values;
  if (!values?.length) return null;
  const mode = (props?.layout && VALUE_LAYOUTS.includes(props.layout as (typeof VALUE_LAYOUTS)[number])
    ? props.layout
    : pickFromSlug(data.slug + "-val", VALUE_LAYOUTS)) as (typeof VALUE_LAYOUTS)[number];
  const heading = props?.title ?? "Values";

  if (mode === "stack") {
    return (
      <section className="xp-section-lg max-w-[900px]">
        <h2 className="xp-heading">{heading}</h2>
        <div className="mt-10">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.05}>
              <article className="grid gap-3 border-t border-border py-8 md:grid-cols-[72px_1fr]">
                <p className="font-deco text-[1.8rem]" style={{ color: data.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3 className="font-display text-[24px] md:text-[28px]">{v.title}</h3>
                  <p className="mt-2 max-w-xl xp-prose">{v.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  if (mode === "pair") {
    return (
      <section className="xp-section-lg">
        <h2 className="max-w-xl xp-heading">{heading}</h2>
        <div className="mt-10 grid gap-x-12 gap-y-12 md:grid-cols-2">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.06} className={i % 2 ? "md:mt-16" : ""}>
              <p className="text-meta" style={{ color: data.accent }}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-display text-[clamp(1.5rem,2.5vw,2rem)]">{v.title}</h3>
              <p className="mt-3 xp-prose-sm">{v.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="xp-section-lg">
      <h2 className="xp-heading">{heading}</h2>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {values.map((v, i) => (
          <Reveal key={v.title} delay={i * 0.06}>
            <p className="text-meta" style={{ color: data.accent }}>
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 font-display text-[24px]">{v.title}</h3>
            <p className="mt-3 xp-prose-sm">{v.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function SectionQuoteBand({ data, props }: Ctx) {
  const quotes = props?.quotes;
  if (!quotes?.length) return null;
  const q = quotes[0];
  return (
    <section className="xp-section-lg max-w-[1000px]">
      <Reveal>
        <blockquote className="border-l-2 pl-6 md:pl-10" style={{ borderColor: data.accent }}>
          <p className="font-deco text-[clamp(1.4rem,3vw,2.2rem)] leading-snug text-foreground">“{q.quote}”</p>
          <footer className="mt-6 text-small text-muted-foreground">
            <span className="text-foreground">{q.name}</span> · {q.role}
          </footer>
        </blockquote>
      </Reveal>
    </section>
  );
}

export function SectionLinkBand({ data, props }: Ctx) {
  const links =
    props?.links ??
    data.related.slice(0, 4).map((r) => ({ title: r.title, href: r.href, description: r.description }));
  if (!links.length) return null;
  return (
    <section className="xp-section">
      {props?.title && <h2 className="xp-heading">{props.title}</h2>}
      <div className={`grid gap-3 ${props?.title ? "mt-8" : ""} sm:grid-cols-2 lg:grid-cols-4`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-border bg-surface p-5 transition-transform duration-400 hover:-translate-y-1"
          >
            <h3 className="font-display text-[20px] group-hover:text-foreground">{link.title}</h3>
            {link.description && (
              <p className="mt-2 text-small text-muted-foreground">{link.description}</p>
            )}
            <span className="mt-4 inline-block text-label" style={{ color: data.accent }}>
              Explore →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SectionContactForm({ data }: Ctx) {
  const [focus, setFocus] = useState(false);
  return (
    <section className="xp-section flex max-w-[520px] flex-col items-center">
      <form
        className="w-full space-y-3"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmit={(e) => e.preventDefault()}
      >
        <div
          aria-hidden
          className={`pointer-events-none fixed left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-opacity ${focus ? "opacity-40" : "opacity-0"}`}
          style={{ background: data.accent }}
        />
        <input
          placeholder="Your name"
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-3 text-small outline-none focus:border-brand-blue/50"
        />
        <input
          placeholder="Work email"
          type="email"
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-3 text-small outline-none focus:border-brand-blue/50"
        />
        <textarea
          placeholder="What are you building?"
          rows={4}
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-3 text-small outline-none focus:border-brand-blue/50"
        />
        <PremiumButton type="submit" className="w-full justify-center">
          Send signal
        </PremiumButton>
      </form>
    </section>
  );
}

export function SectionOrbit({ data }: Ctx) {
  return (
    <section className="xp-section-sm flex justify-center">
      <TechOrbit nodes={data.stack.slice(0, 8)} accent={data.accent} />
    </section>
  );
}

export function SectionLifecycle({ data }: Ctx) {
  if (!data.pipeline.length) return null;
  return (
    <section className="xp-section">
      <LifecycleRail steps={data.pipeline} />
    </section>
  );
}

export function SectionScan({ data }: Ctx) {
  return (
    <section className="xp-section-sm">
      <ScanGrid accent={data.accent} />
    </section>
  );
}

export function SectionFaq({ data }: Ctx) {
  if (!data.faqs.length) return null;
  return (
    <section className="xp-section max-w-[900px]">
      <FaqAccordion items={data.faqs} />
    </section>
  );
}

export function SectionCta({ data }: Ctx) {
  const { cta, accent } = data;
  return (
    <section className="xp-section">
      <Reveal>
        <GlowPanel
          accent={accent}
          className="relative overflow-hidden rounded-[32px] border border-border px-6 py-12 md:px-12 md:py-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 90% 80% at 0% 0%, ${accent}2e, transparent 58%)`,
            }}
          />
          <p
            aria-hidden
            className="pointer-events-none absolute -right-8 top-1/2 z-0 -translate-y-[42%] select-none font-deco text-[clamp(5.5rem,24vw,15rem)] leading-none text-foreground/[0.07]"
            style={{
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, transparent 12%, rgba(0,0,0,0.35) 38%, black 62%)",
              maskImage:
                "linear-gradient(90deg, transparent 0%, transparent 12%, rgba(0,0,0,0.35) 38%, black 62%)",
            }}
          >
            {cta.watermark ?? "BUILD"}
          </p>
          <div className="relative z-10 max-w-xl">
            <p className="text-eyebrow text-muted-foreground">{cta.eyebrow}</p>
            <h2 className="mt-3 xp-heading leading-[1.05]">{cta.headline}</h2>
            <p className="mt-4 max-w-md xp-prose">{cta.supporting}</p>
            <div className="mt-8">
              <Link href={cta.href}>
                <PremiumButton>{cta.label}</PremiumButton>
              </Link>
            </div>
          </div>
        </GlowPanel>
      </Reveal>
    </section>
  );
}

export function SectionRelated({ data }: Ctx) {
  if (!data.related.length) return null;
  return <RelatedStrip related={data.related} sectionHref={data.sectionHref} />;
}
