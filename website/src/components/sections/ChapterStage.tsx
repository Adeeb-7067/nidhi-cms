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
import type { Chapter } from "@/data/cinematic";

function scrollToPct(pct: number) {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: Math.max(0, docHeight * pct), behavior: "smooth" });
}

const HERO_STAT_ICONS: LucideIcon[] = [Briefcase, Sparkles, Cpu, Globe2];

/** Hero inspired by premium tech landings — brand-led, film as stage, not a clone. */
function HeroStage({ chapter }: { chapter: Chapter }) {
  return (
    <>
      <SectionPanel align="start" className="hero-panel">
        <div className="flex h-[calc(100dvh-var(--nav-h)-5.5rem)] flex-col justify-between gap-8">
          {/* Primary story — no extra top pad; section-panel already clears the nav */}
          <div className="relative max-w-2xl pt-2 md:pt-4 lg:pt-6">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-black/45 px-3.5 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan/60 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_10px_rgba(0,217,255,0.8)]" />
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">
                Building the future. Together.
              </span>
            </div>

            <h1 className="mt-5 md:mt-6">
              <span className="block font-display text-[clamp(2.6rem,6.5vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-white">
                {chapter.title}
              </span>
              <span className="mt-0.5 block font-display text-[clamp(2.6rem,6.5vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-brand-gradient">
                {chapter.subtitle}
              </span>
            </h1>

            {chapter.body ? (
              <p className="mt-4 max-w-md text-[15px] leading-[1.65] text-white/65 md:mt-5 md:max-w-lg md:text-[16px]">
                {chapter.body}
              </p>
            ) : null}
          </div>

          {/* Analytics strip */}
          {chapter.stats?.length ? (
            <div className="w-full max-w-3xl pb-1 md:max-w-[44rem]">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:grid-cols-4">
                {chapter.stats.slice(0, 4).map((stat, i) => {
                  const Icon = HERO_STAT_ICONS[i] ?? Sparkles;
                  return (
                    <div
                      key={stat.label}
                      className="flex items-start gap-2.5 bg-[#070A10]/55 px-3.5 py-3.5 md:gap-3 md:px-4 md:py-4"
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan/80"
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0">
                        <div className="font-display text-[1.05rem] font-bold leading-none tracking-tight text-white md:text-[1.25rem]">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-[10px] leading-snug text-white/45 md:mt-1.5 md:text-[11px]">
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

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 md:bottom-6">
        <ChevronDown
          className="h-5 w-5 text-white/50 motion-safe:animate-[float_2.4s_ease-in-out_infinite]"
          strokeWidth={1.75}
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
      <div className="relative mx-auto grid max-w-5xl grid-cols-12 gap-6 md:gap-10 lg:gap-12">
        <div className="col-span-12 md:col-span-4 lg:col-span-5">
          <p className="text-eyebrow text-white/55">01 · Headquarters</p>
          <p className="mt-3 font-deco text-[clamp(2rem,6vw,4rem)] leading-none text-white/[0.07] md:mt-4">
            {chapter.place}
          </p>
        </div>

        <div className="col-span-12 md:col-span-8 lg:col-span-7">
          <h2 className="font-display text-[clamp(1.75rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white">
            {chapter.title}
          </h2>
          <p className="mt-3 text-[1.05rem] leading-snug text-white/70 md:mt-4 md:text-[1.2rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/55 md:mt-5">
              {chapter.body}
            </p>
          ) : null}

          {chapter.chips?.length ? (
            <div className="mt-6 flex flex-wrap gap-2 md:mt-7">
              {chapter.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-meta text-white/70"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {chapter.links?.length ? (
            <div className="mt-6 flex flex-wrap gap-4 md:mt-8 md:gap-5">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-white/60 transition-colors hover:text-white"
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
      <span className="text-eyebrow text-white/70">
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
            ? "font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white"
            : "text-hero text-white"
        }
      >
        {chapter.title}
      </h2>
      <p
        className={
          compact
            ? "mt-2 max-w-xl text-[0.95rem] leading-snug text-white/65 md:text-[1.05rem]"
            : "mt-3 max-w-xl text-[1.05rem] leading-snug text-white/65 md:text-[1.2rem]"
        }
      >
        {chapter.subtitle}
      </p>
      {chapter.body ? (
        <p className="text-body mt-4 max-w-lg text-measure">{chapter.body}</p>
      ) : null}
    </>
  );
}

function StatsRow({ stats }: { stats: NonNullable<Chapter["stats"]> }) {
  return (
    <div className="mt-6 flex flex-wrap gap-6 md:gap-8">
      {stats.map((s) => (
        <div key={s.label} className="min-w-[72px]">
          <div className="font-display text-[1.5rem] leading-none text-white md:text-[1.85rem]">
            {s.value}
          </div>
          <div className="text-meta mt-1.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function GlassCards({ cards }: { cards: NonNullable<Chapter["cards"]> }) {
  return (
    <div className="mt-5 grid max-w-3xl gap-2.5 sm:grid-cols-2">
      {cards.slice(0, 4).map((card) => {
        const inner = (
          <>
            {card.meta ? <span className="text-meta">{card.meta}</span> : null}
            <div className="text-card-title mt-0.5 text-[1.1rem] text-white md:text-[1.25rem]">
              {card.title}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/50">
              {card.summary}
            </p>
          </>
        );

        const className =
          "group relative block overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] p-3.5 transition-[transform,border-color,box-shadow,background] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-white/22 hover:bg-white/[0.07] hover:shadow-[0_20px_50px_-28px_rgba(43,107,255,0.55)] md:p-4";

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
  );
}

/** Case study rail — compact image cards that fit the cinematic viewport */
function ProjectRail({ cards }: { cards: NonNullable<Chapter["cards"]> }) {
  return (
    <div className="scrollbar-hide mt-4 flex w-full max-w-5xl gap-3 overflow-x-auto pb-2 md:mt-5 md:gap-3.5">
      {cards.slice(0, 3).map((card) => {
        const inner = (
          <>
            <div className="relative h-[132px] overflow-hidden md:h-[148px]">
              {card.image ? (
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="280px"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-brand-blue/30 to-brand-cyan/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070A10] via-[#070A10]/40 to-transparent" />
              {card.meta ? (
                <span className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/80">
                  {card.meta}
                </span>
              ) : null}
              {card.metric ? (
                <div className="absolute bottom-2.5 left-2.5">
                  <div className="font-display text-[1.2rem] font-bold leading-none text-white md:text-[1.35rem]">
                    {card.metric}
                  </div>
                  {card.metricLabel ? (
                    <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/55">
                      {card.metricLabel}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col px-3 py-3">
              <h3 className="font-display text-[1rem] font-bold leading-snug tracking-tight text-white md:text-[1.1rem]">
                {card.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-white/50">
                {card.summary}
              </p>
              <span className="mt-2 text-[11px] font-medium text-white/45 transition-colors group-hover:text-brand-cyan">
                View case study →
              </span>
            </div>
          </>
        );

        const className =
          "group flex w-[min(240px,72vw)] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#070A10]/90 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_24px_60px_-24px_rgba(43,107,255,0.45)] md:w-[260px]";

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
          className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-meta text-white/70"
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
      <div className="mx-auto grid w-full max-w-5xl grid-cols-12 items-center gap-6 md:gap-10">
        <div className="col-span-12 md:col-span-5">
          <p className="text-eyebrow text-white/65">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            {chapter.title}
          </h2>
          <p className="mt-3 text-[1.05rem] leading-snug text-white/70 md:text-[1.15rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/50 md:text-[15px]">
              {chapter.body}
            </p>
          ) : null}
          {chapter.links?.length ? (
            <div className="mt-6 flex flex-wrap gap-4">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-white/60 transition-colors hover:text-white"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7">
          <ul className="flex flex-col gap-2.5">
            {roles.map((role) => {
              const row = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.15rem] font-semibold leading-tight text-white md:text-[1.3rem]">
                        {role.title}
                      </span>
                      {role.meta ? (
                        <span className="rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/50">
                          {role.meta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] text-white/50">{role.summary}</p>
                  </div>
                  <span className="shrink-0 text-meta text-white/35 transition-colors group-hover:text-brand-cyan">
                    Apply →
                  </span>
                </>
              );

              const className =
                "group flex items-center gap-4 rounded-2xl border border-white/10 bg-[#070A10]/75 px-4 py-3.5 transition-[border-color,background-color,transform] duration-400 hover:-translate-y-0.5 hover:border-white/22 hover:bg-[#070A10]/90 md:px-5 md:py-4";

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
      <div className="mx-auto grid w-full max-w-5xl grid-cols-12 items-center gap-6 md:gap-10 lg:gap-12">
        <div className="col-span-12 md:col-span-5">
          <p className="text-eyebrow text-white/65">
            {chapter.number} · {chapter.place}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            {chapter.title}
          </h2>
          <p className="mt-3 text-[1.05rem] leading-snug text-white/70 md:text-[1.15rem]">
            {chapter.subtitle}
          </p>
          {chapter.body ? (
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/50 md:text-[15px]">
              {chapter.body}
            </p>
          ) : null}
          {chapter.links?.length ? (
            <div className="mt-6 flex flex-wrap gap-4">
              {chapter.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-label text-white/60 transition-colors hover:text-white"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7">
          <div className="relative flex flex-col gap-2.5">
            {layers.map((layer, i) => {
              const className =
                "group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#070A10]/80 px-4 py-3.5 transition-[border-color,transform,background-color] duration-400 hover:-translate-y-0.5 hover:border-brand-cyan/35 hover:bg-[#070A10]/95 md:px-5 md:py-4";
              const inner = (
                <>
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-meta text-white/45"
                    style={{
                      boxShadow: i === 0 ? "0 0 24px -8px rgba(0,217,255,0.55)" : undefined,
                    }}
                  >
                    L{i}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[1.15rem] font-semibold leading-tight text-white md:text-[1.3rem]">
                        {layer.title}
                      </span>
                      {layer.meta ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/45">
                          {layer.meta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-white/50">{layer.summary}</p>
                    <div
                      className="mt-3 h-0.5 max-w-[70%] rounded-full opacity-80"
                      style={{
                        background:
                          "linear-gradient(90deg, color-mix(in oklab, var(--accent-current) 80%, white), transparent)",
                        width: `${78 - i * 12}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 self-center text-meta text-white/30 transition-colors group-hover:text-brand-cyan">
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
      <div className={`flex flex-col ${contentWidth} ${isProject ? "pt-2 md:pt-4" : ""}`}>
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
          <blockquote className="relative mt-6">
            <p className="font-display text-[clamp(1.25rem,2.8vw,1.85rem)] leading-[1.3] text-white/90">
              “{chapter.quote.text}”
            </p>
            <footer className="text-meta mt-4">
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
                className="text-label text-white/60 transition-colors hover:text-white"
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
                if (chapter.cta?.action === "contact") scrollToPct(0.97);
                else scrollToPct(0.2);
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
      ) : chapter.layout === "career" ? (
        <CareerStage chapter={chapter} />
      ) : chapter.layout === "cloud-ops" ? (
        <CloudOpsStage chapter={chapter} />
      ) : (
        <StandardStage chapter={chapter} />
      )}
    </SectionWrapper>
  );
}
