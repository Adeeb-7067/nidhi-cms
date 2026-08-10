"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  ChevronDown,
  Cpu,
  Globe2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { HeroCapabilityTypewriter } from "@/components/home/HeroCapabilityTypewriter";
import type { Chapter } from "@/data/cinematic";
import { scrollToId } from "@/lib/film-scroll";

const HERO_STAT_ICONS: LucideIcon[] = [Briefcase, Sparkles, Cpu, Globe2];

/** Film arrival — brand in the pill; display line cycles what we build. */
function HeroStage({ chapter }: { chapter: Chapter }) {
  return (
    <>
      <SectionPanel align="start" className="hero-panel">
        <div className="flex h-full min-h-0 flex-col justify-between gap-6 max-[780px]:gap-4 md:gap-8">
          <div className="relative max-w-3xl pt-1 md:pt-2 lg:pt-4">
            <div className="inline-flex flex-col items-start gap-1.5 rounded-2xl border border-white/20 bg-black/75 backdrop-blur-md px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:rounded-full sm:py-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan/60 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_10px_rgba(0,217,255,0.8)]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                Satyakabir Technologies
              </span>
              <span className="hidden text-white/40 sm:inline" aria-hidden>
                ·
              </span>
              <span className="text-[11px] font-medium tracking-[0.08em] text-slate-200">
                Technology engineering · Digital transformation
              </span>
            </div>

            <h1 className="mt-5 max-w-[min(100%,40rem)] md:mt-6 [text-shadow:0_2px_28px_rgba(0,0,0,0.85)]">
              <span className="block font-display text-[clamp(1.15rem,2.8vw,1.75rem)] font-semibold leading-tight tracking-[-0.02em] text-white">
                We build
              </span>
              <span className="mt-1 block w-full font-display text-[clamp(1.65rem,4.2vw,3.35rem)] font-extrabold leading-[1.12] tracking-[-0.035em]">
                <HeroCapabilityTypewriter />
              </span>
            </h1>

            {chapter.body ? (
              <p className="mt-4 max-w-md text-pretty text-[15px] leading-[1.65] text-slate-200 font-medium [text-shadow:0_2px_16px_rgba(0,0,0,0.9)] md:mt-5 md:max-w-lg md:text-[16px]">
                {chapter.body}
              </p>
            ) : null}

            <div className="mt-6">
              <PremiumButton
                type="button"
                onClick={() => scrollToId("what-we-do")}
                className="pointer-events-auto"
              >
                See what we do
              </PremiumButton>
            </div>
          </div>

          {chapter.stats?.length ? (
            <div className="w-full max-w-3xl pb-1 md:max-w-[44rem]">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.95)] sm:grid-cols-4">
                {chapter.stats.slice(0, 4).map((stat, i) => {
                  const Icon = HERO_STAT_ICONS[i] ?? Sparkles;
                  return (
                    <div
                      key={stat.label}
                      className="flex min-w-0 items-start gap-2.5 overflow-hidden bg-[#070A10]/85 backdrop-blur-md px-3.5 py-3.5 md:gap-3 md:px-4 md:py-4"
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan"
                        strokeWidth={2}
                      />
                      <div className="min-w-0 overflow-hidden">
                        <div className="truncate font-display text-[1.05rem] font-bold leading-none tracking-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] md:text-[1.25rem]">
                          {stat.value}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-300 font-medium md:mt-1.5 md:text-[11px]">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </SectionPanel>

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 md:bottom-6">
        <ChevronDown
          className="h-5 w-5 text-white/70 motion-safe:animate-[float_2.4s_ease-in-out_infinite]"
          strokeWidth={2}
          aria-hidden
        />
        <span className="sr-only">Scroll</span>
      </div>
    </>
  );
}

/** First content page after hero — manifesto / identity landing. */
function IntroStage({ chapter }: { chapter: Chapter }) {
  return (
    <SectionPanel align="center">
      <div className="relative mx-auto grid max-w-5xl grid-cols-12 gap-4 max-[780px]:gap-3 md:gap-8 lg:gap-10">
        <div className="col-span-12 md:col-span-4 lg:col-span-5">
          <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">01 · Headquarters</p>
          <p className="mt-2 font-deco text-[clamp(1.75rem,5vw,3.5rem)] leading-none text-white/20 md:mt-3">
            {chapter.place}
          </p>
        </div>

        <div className="col-span-12 md:col-span-8 lg:col-span-7">
          <h2 className="font-display text-[clamp(1.55rem,3.6vw,2.85rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)]">
            {chapter.title}
          </h2>
          <p className="mt-2 text-[1rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] md:mt-3 md:text-[1.15rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-slate-200 font-normal [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] md:mt-4 md:text-[15px]">
              {chapter.body}
            </p>
          ) : null}

          {chapter.chips?.length ? (
            <div className="mt-4 flex flex-wrap gap-2 md:mt-6">
              {chapter.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/20 bg-[#070A10]/80 backdrop-blur-sm px-3 py-1.5 text-meta text-slate-200 font-medium shadow-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {chapter.links?.length ? (
            <div className="mt-4 flex flex-wrap gap-4 md:mt-6 md:gap-5">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-slate-200 font-medium transition-colors hover:text-white hover:underline"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </SectionPanel>
  );
}

function ChapterEyebrow({ chapter }: { chapter: Chapter }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <span className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em] [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
        {chapter.number} · {chapter.place}
      </span>
    </div>
  );
}

function ChapterTitle({ chapter }: { chapter: Chapter }) {
  const compact = chapter.layout === "project-rail";
  return (
    <>
      <h2
        className={
          compact
            ? "font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)]"
            : "text-hero text-white font-extrabold [text-shadow:0_2px_24px_rgba(0,0,0,0.95)]"
        }
      >
        {chapter.title}
      </h2>
      <p
        className={
          compact
            ? "mt-2 max-w-xl text-[0.95rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.9)] md:text-[1.05rem]"
            : "mt-3 max-w-xl text-[1.05rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_14px_rgba(0,0,0,0.9)] md:text-[1.2rem]"
        }
      >
        {chapter.subtitle}
      </p>
      {chapter.body ? (
        <p className="mt-4 max-w-lg text-measure text-[14px] md:text-[15px] leading-relaxed text-slate-200 font-normal [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">{chapter.body}</p>
      ) : null}
    </>
  );
}

function StatsRow({ stats }: { stats: NonNullable<Chapter["stats"]> }) {
  return (
    <div className="mt-6 flex flex-wrap gap-6 md:gap-8">
      {stats.map((s) => (
        <div key={s.label} className="min-w-[72px]">
          <div className="font-display text-[1.5rem] leading-none font-extrabold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] md:text-[1.85rem]">
            {s.value}
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-300">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function GlassCards({ cards }: { cards: NonNullable<Chapter["cards"]> }) {
  return (
    <div className="mt-4 grid max-w-4xl gap-2.5 sm:grid-cols-2 max-[780px]:mt-3 lg:grid-cols-3">
      {cards.slice(0, 6).map((card) => {
        const inner = (
          <>
            {card.meta ? <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-cyan">{card.meta}</span> : null}
            <div className="mt-0.5 text-[1.05rem] font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] md:text-[1.2rem]">
              {card.title}
            </div>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-200 font-normal md:text-[13px]">
              {card.summary}
            </p>
          </>
        );

        const className =
          "group relative block overflow-hidden rounded-xl border border-white/18 bg-[#060911]/92 p-3.5 shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-brand-cyan/40 hover:bg-[#0a0f1e]/98 hover:shadow-[0_20px_50px_-28px_rgba(0,217,255,0.35)] [contain:layout_paint] md:p-4";

        return card.href ? (
          <Link key={card.title} href={card.href} className={className}>
            <span className="relative">{inner}</span>
          </Link>
        ) : (
          <div key={card.title} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Case study rail — compact image cards that fit the cinematic viewport */
function ProjectRail({ cards }: { cards: NonNullable<Chapter["cards"]> }) {
  return (
    <div className="scrollbar-hide mt-3 flex w-full max-w-5xl gap-3 overflow-x-auto pb-1 md:mt-4 md:gap-3.5">
      {cards.slice(0, 3).map((card) => {
        const inner = (
          <>
            <div className="relative h-[112px] overflow-hidden max-[780px]:h-[100px] md:h-[132px]">
              {card.image ? (
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 768px) 220px, 240px"
                  decoding="async"
                  loading="eager"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-brand-blue/30 to-brand-cyan/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070A10] via-[#070A10]/40 to-transparent" />
              {card.meta ? (
                <span className="absolute left-2.5 top-2.5 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white font-medium">
                  {card.meta}
                </span>
              ) : null}
              {card.metric ? (
                <div className="absolute bottom-2.5 left-2.5">
                  <div className="font-display text-[1.15rem] font-bold leading-none text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.8)] md:text-[1.3rem]">
                    {card.metric}
                  </div>
                  {card.metricLabel ? (
                    <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-300 font-medium">
                      {card.metricLabel}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col px-3 py-2.5 md:py-3">
              <h3 className="font-display text-[0.95rem] font-bold leading-snug tracking-tight text-white md:text-[1.05rem]">
                {card.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-200 font-normal">
                {card.summary}
              </p>
              <span className="mt-1.5 text-[11px] font-semibold text-brand-cyan transition-colors group-hover:text-white">
                View case study →
              </span>
            </div>
          </>
        );

        const className =
          "group flex w-[min(220px,70vw)] shrink-0 flex-col overflow-hidden rounded-xl border border-white/18 bg-[#070A10]/95 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-[0_24px_60px_-24px_rgba(0,217,255,0.35)] [contain:layout_paint] md:w-[240px]";

        return card.href ? (
          <Link key={card.title} href={card.href} className={className}>
            {inner}
          </Link>
        ) : (
          <div key={card.title} className={className}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function ChipCloud({ chips }: { chips: string[] }) {
  return (
    <div className="mt-5 flex max-w-xl flex-wrap gap-2">
      {chips.slice(0, 8).map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-white/20 bg-[#070A10]/85 backdrop-blur-sm px-3 py-1 text-meta text-slate-200 font-medium"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

/** Careers — editorial left + compact role list that fits the viewport */
function CareerStage({ chapter }: { chapter: Chapter }) {
  const roles = chapter.cards?.slice(0, 3) ?? [];

  return (
    <SectionPanel align="center">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-12 items-center gap-4 max-[780px]:gap-3 md:gap-8">
        <div className="col-span-12 md:col-span-5">
          <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)] md:mt-3">
            {chapter.title}
          </h2>
          <p className="mt-2 text-[1rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] md:mt-3 md:text-[1.1rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-200 font-normal [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] md:mt-3 md:text-[14px]">
              {chapter.body}
            </p>
          ) : null}
          {chapter.links?.length ? (
            <div className="mt-4 flex flex-wrap gap-4 md:mt-5">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-slate-200 font-medium transition-colors hover:text-white hover:underline"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7">
          <ul className="flex flex-col gap-2">
            {roles.map((role) => {
              const row = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.05rem] font-bold leading-tight text-white md:text-[1.2rem]">
                        {role.title}
                      </span>
                      {role.meta ? (
                        <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brand-cyan font-semibold">
                          {role.meta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-slate-200 font-normal md:text-[13px]">{role.summary}</p>
                  </div>
                  <span className="shrink-0 text-meta text-brand-cyan font-semibold transition-colors group-hover:text-white">
                    Apply →
                  </span>
                </>
              );

              const className =
                "group flex items-center gap-3 rounded-2xl border border-white/18 bg-[#070A10]/85 backdrop-blur-md px-3.5 py-3 shadow-lg transition-[border-color,background-color,transform] duration-400 hover:-translate-y-0.5 hover:border-white/35 hover:bg-[#070A10]/95 md:gap-4 md:px-5 md:py-3.5";

              return (
                <li key={role.title}>
                  {role.href ? (
                    <Link href={role.href} className={className}>
                      {row}
                    </Link>
                  ) : (
                    <div className={className}>{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </SectionPanel>
  );
}

/** Cloud Operations — copy + layered capability stack */
function CloudOpsStage({ chapter }: { chapter: Chapter }) {
  const layers = chapter.cards?.slice(0, 3) ?? [];

  return (
    <SectionPanel align="center">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-12 items-center gap-4 max-[780px]:gap-3 md:gap-8 lg:gap-10">
        <div className="col-span-12 md:col-span-5">
          <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)] md:mt-3">
            {chapter.title}
          </h2>
          <p className="mt-2 text-[1rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] md:mt-3 md:text-[1.1rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-200 font-normal [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] md:mt-3 md:text-[14px]">
              {chapter.body}
            </p>
          ) : null}
          {chapter.links?.length ? (
            <div className="mt-4 flex flex-wrap gap-4 md:mt-5">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-slate-200 font-medium transition-colors hover:text-white hover:underline"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7">
          <div className="relative flex flex-col gap-2">
            {layers.map((layer, i) => {
              const className =
                "group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-white/18 bg-[#070A10]/90 backdrop-blur-md px-3.5 py-3 shadow-lg transition-[border-color,transform,background-color] duration-400 hover:-translate-y-0.5 hover:border-brand-cyan/45 hover:bg-[#070A10]/98 md:gap-4 md:px-5 md:py-3.5";
              const inner = (
                <>
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-meta text-brand-cyan font-bold md:h-8 md:w-8"
                    style={{
                      boxShadow: i === 0 ? "0 0 24px -8px rgba(0,217,255,0.55)" : undefined,
                    }}
                  >
                    L{i}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.05rem] font-bold leading-tight text-white md:text-[1.2rem]">
                        {layer.title}
                      </span>
                      {layer.meta ? (
                        <span className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brand-cyan font-semibold">
                          {layer.meta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-slate-200 font-normal md:text-[13px]">{layer.summary}</p>
                    <div
                      className="mt-2 h-0.5 max-w-[70%] rounded-full opacity-80 md:mt-3"
                      style={{
                        background:
                          "linear-gradient(90deg, color-mix(in oklab, var(--accent-current) 80%, white), transparent)",
                        width: `${78 - i * 12}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 self-center text-meta text-brand-cyan font-semibold transition-colors group-hover:text-white">
                    →
                  </span>
                </>
              );

              return layer.href ? (
                <Link key={layer.title} href={layer.href} className={className}>
                  {inner}
                </Link>
              ) : (
                <div key={layer.title} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}

function StandardStage({ chapter }: { chapter: Chapter }) {
  const isProject = chapter.layout === "project-rail";
  const contentWidth = isProject
    ? "max-w-5xl mr-auto text-left w-full"
    : chapter.align === "center"
      ? "max-w-2xl mx-auto text-center items-center"
      : chapter.align === "right"
        ? "max-w-lg ml-auto text-left"
        : "max-w-lg mr-auto text-left";

  return (
    <SectionPanel align={isProject ? "start" : "center"}>
      <div className={`flex flex-col ${contentWidth} ${isProject ? "pt-1 md:pt-2" : ""}`}>
        <ChapterEyebrow chapter={chapter} />
        <ChapterTitle chapter={chapter} />

        {(chapter.layout === "split-stats" || chapter.layout === "contact") && chapter.stats ? (
          <StatsRow stats={chapter.stats} />
        ) : null}

        {chapter.layout === "project-rail" && chapter.cards ? (
          <ProjectRail cards={chapter.cards} />
        ) : null}

        {(chapter.layout === "service-grid" ||
          chapter.layout === "badge-row" ||
          chapter.layout === "editorial-left" ||
          chapter.layout === "editorial-right") &&
        chapter.cards ? (
          <GlassCards cards={chapter.cards} />
        ) : null}

        {chapter.chips?.length ? <ChipCloud chips={chapter.chips} /> : null}

        {chapter.layout === "quote" && chapter.quote ? (
          <blockquote className="relative mt-6 rounded-2xl border border-white/18 bg-[#070A10]/85 backdrop-blur-md p-6 shadow-xl">
            <p className="font-display text-[clamp(1.25rem,2.8vw,1.85rem)] leading-[1.3] text-white font-medium [text-shadow:0_2px_14px_rgba(0,0,0,0.9)]">
              “{chapter.quote.text}”
            </p>
            <footer className="mt-4 text-[12px] font-semibold tracking-wider uppercase text-brand-cyan">
              {chapter.quote.by} · {chapter.quote.role}
            </footer>
          </blockquote>
        ) : null}

        {chapter.links?.length ? (
          <div
            className={`mt-5 flex flex-wrap gap-4 ${
              chapter.align === "center" ? "justify-center" : ""
            }`}
          >
            {chapter.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-label text-slate-200 font-medium transition-colors hover:text-white hover:underline"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        ) : null}

        {chapter.cta ? (
          <div
            className={`mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4 ${
              chapter.align === "center" ? "items-center justify-center" : "items-start"
            }`}
          >
            <PremiumButton
              onClick={() => {
                if (chapter.cta?.action === "contact") scrollToId("start");
                else scrollToId("impact");
              }}
            >
              {chapter.cta.label}
            </PremiumButton>
          </div>
        ) : null}
      </div>
    </SectionPanel>
  );
}

/** Service grid layout — editorial left copy + compact cards grid on the right */
function ServiceGridStage({ chapter }: { chapter: Chapter }) {
  const cards = chapter.cards ?? [];

  return (
    <SectionPanel align="center">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-12 items-center gap-4 max-[780px]:gap-3 md:gap-6 lg:gap-8">
        <div className="col-span-12 md:col-span-5 lg:col-span-5">
          <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.65rem,3.2vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)]">
            {chapter.title}
          </h2>
          <p className="mt-2 text-[0.95rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] md:mt-2.5 md:text-[1.05rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-2.5 text-[13px] leading-relaxed text-slate-200 font-normal [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] md:text-[14px]">
              {chapter.body}
            </p>
          ) : null}
          {chapter.links?.length ? (
            <div className="mt-3.5 flex flex-wrap gap-4">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-slate-200 font-medium transition-colors hover:text-white hover:underline"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7 lg:col-span-7">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-2">
            {cards.slice(0, 6).map((card) => {
              const inner = (
                <>
                  <div className="text-[0.98rem] font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                    {card.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-200 font-normal">
                    {card.summary}
                  </p>
                </>
              );

              const className =
                "group relative block overflow-hidden rounded-xl border border-white/18 bg-[#060911]/85 backdrop-blur-md p-3 shadow-lg transition-[transform,border-color,box-shadow,background] duration-400 hover:-translate-y-0.5 hover:border-white/35 hover:bg-[#0a0f1e]/95";

              return card.href ? (
                <Link key={card.title} href={card.href} className={className}>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(280px 120px at 100% 0%, color-mix(in oklab, var(--accent-current) 28%, transparent), transparent 70%)",
                    }}
                  />
                  <span className="relative">{inner}</span>
                </Link>
              ) : (
                <div key={card.title} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}

/** Product Studio — 7-step process timeline + product cards */
function ProductStudioStage({ chapter }: { chapter: Chapter }) {
  const steps = chapter.chips ?? [];
  const cards = chapter.cards ?? [];

  return (
    <SectionPanel align="center">
      <div className="mx-auto flex flex-col w-full max-w-5xl gap-4">
        <div>
          <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-1.5 font-display text-[clamp(1.65rem,3.2vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)]">
            {chapter.title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-[0.95rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] md:text-[1.05rem]">
            {chapter.subtitle}
          </p>
        </div>

        {/* 7-Step Process Pipeline */}
        {steps.length ? (
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/18 bg-[#060911]/90 backdrop-blur-xl p-3 shadow-lg">
              {steps.map((step, idx) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-white/[0.05] px-2.5 py-1 text-[11.5px] font-medium text-slate-200">
                    <span className="font-mono text-[9.5px] font-bold text-brand-cyan">
                      0{idx + 1}
                    </span>
                    {step}
                  </div>
                  {idx < steps.length - 1 ? (
                    <span className="text-[10px] text-white/30 font-mono">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Flagship Product Cards */}
        {cards.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.title}
                className="group relative block overflow-hidden rounded-xl border border-white/18 bg-[#060911]/85 backdrop-blur-md p-4 shadow-xl transition-all duration-300 hover:border-white/35 hover:bg-[#0a0f1e]/95"
              >
                <div className="text-[1.05rem] font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                  {card.title}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-200 font-normal">
                  {card.summary}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SectionPanel>
  );
}

/** Innovation Lab — R&D primitives matrix */
function InnovationLabStage({ chapter }: { chapter: Chapter }) {
  const chips = chapter.chips ?? [];

  return (
    <SectionPanel align="center">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-12 items-center gap-4 md:gap-8">
        <div className="col-span-12 md:col-span-5">
          <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.95)] md:mt-3">
            {chapter.title}
          </h2>
          <p className="mt-2 text-[1rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.85)] md:mt-3 md:text-[1.1rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-slate-200 font-normal [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] md:mt-3 md:text-[14px]">
              {chapter.body}
            </p>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7">
          <div className="grid gap-2 sm:grid-cols-2">
            {chips.map((chip, idx) => (
              <div
                key={chip}
                className="flex items-center gap-3 rounded-xl border border-white/18 bg-[#060911]/90 backdrop-blur-xl px-3.5 py-3 shadow-lg transition-all duration-300 hover:border-brand-cyan/50 hover:bg-[#090e1c]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-brand-cyan/40 bg-brand-cyan/10 font-mono text-[10px] font-bold text-brand-cyan">
                  0{idx + 1}
                </span>
                <span className="text-[13px] font-semibold text-white">{chip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}

/** Enterprise Boardroom — executive metrics showcase */
function BoardroomStage({ chapter }: { chapter: Chapter }) {
  return (
    <SectionPanel align="center">
      <div className="mx-auto flex flex-col items-center text-center w-full max-w-3xl">
        <p className="text-eyebrow text-brand-cyan font-semibold tracking-[0.16em]">
          {chapter.number} · {chapter.place}
        </p>
        <h2 className="mt-2 font-display text-[clamp(1.75rem,3.8vw,3.15rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.95)]">
          {chapter.title}
        </h2>
        <p className="mt-2 max-w-xl text-[1.05rem] leading-snug text-slate-100 font-medium [text-shadow:0_2px_14px_rgba(0,0,0,0.9)] md:text-[1.2rem]">
          {chapter.subtitle}
        </p>
        {chapter.body ? (
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-200 font-normal [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
            {chapter.body}
          </p>
        ) : null}

        {chapter.stats?.length ? <StatsRow stats={chapter.stats} /> : null}
      </div>
    </SectionPanel>
  );
}

export function ChapterStage({ chapter, currentFrame }: { chapter: Chapter; currentFrame: number }) {
  return (
    <SectionWrapper
      currentFrame={currentFrame}
      startFrame={chapter.start}
      endFrame={chapter.end}
      atmosphere={chapter.atmosphere}
    >
      {chapter.layout === "hero" ? (
        <HeroStage chapter={chapter} />
      ) : chapter.layout === "intro" ? (
        <IntroStage chapter={chapter} />
      ) : chapter.layout === "service-grid" ? (
        <ServiceGridStage chapter={chapter} />
      ) : chapter.layout === "career" ? (
        <CareerStage chapter={chapter} />
      ) : chapter.layout === "cloud-ops" ? (
        <CloudOpsStage chapter={chapter} />
      ) : chapter.id === "studio" ? (
        <ProductStudioStage chapter={chapter} />
      ) : chapter.id === "lab" ? (
        <InnovationLabStage chapter={chapter} />
      ) : chapter.id === "boardroom" ? (
        <BoardroomStage chapter={chapter} />
      ) : (
        <StandardStage chapter={chapter} />
      )}
    </SectionWrapper>
  );
}
