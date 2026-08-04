"use client";

import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { ChevronDown } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { hero } from "@/data/mock";

export function HeroSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={1} endFrame={28} fadeFrames={4}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,3,5,0.72) 0%, rgba(2,3,5,0.35) 42%, rgba(2,3,5,0.08) 68%, rgba(2,3,5,0.25) 100%)",
        }}
      />

      <SectionPanel align="center">
        <div className="grid max-w-6xl grid-cols-12 items-end gap-8 py-2">
          <div className="col-span-12 flex flex-col gap-4 md:gap-5 lg:col-span-7">
            <span className="text-eyebrow text-white/70">{hero.eyebrow}</span>

            <h1 className="text-hero">
              <span className="block text-white">{hero.titleLine1}</span>
              <span className="mt-1 block text-brand-gradient">{hero.titleLine2}</span>
            </h1>

            <p className="max-w-md text-[1.05rem] leading-snug text-white/70 md:text-[1.15rem]">
              {hero.statement}
            </p>

            <p className="text-body text-measure max-w-lg text-white/60">{hero.subtitle}</p>

            <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center">
              <PremiumButton
                onClick={() => {
                  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                  window.scrollTo({ top: docHeight * 0.97, behavior: "smooth" });
                }}
              >
                Start a project
              </PremiumButton>
              <button
                type="button"
                className="text-left text-label text-white/55 transition-colors hover:text-white"
                onClick={() => {
                  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                  window.scrollTo({ top: docHeight * 0.18, behavior: "smooth" });
                }}
              >
                {hero.badge} →
              </button>
            </div>
          </div>

          <div className="col-span-12 flex flex-col gap-5 lg:col-span-5 lg:items-end lg:pb-2">
            <div className="flex w-full justify-start gap-8 lg:w-auto lg:justify-end lg:gap-10">
              {hero.stats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <div className="font-display text-[28px] leading-none tracking-tight text-white md:text-[34px]">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-meta text-white/45">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-50 lg:justify-end">
              {hero.trust.map((t) => (
                <span key={t} className="text-meta text-white/50">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionPanel>

      <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <ChevronDown className="h-4 w-4 text-white/40" />
        <span className="text-meta text-white/30">{hero.scrollHint ?? "Scroll to explore"}</span>
      </div>
    </SectionWrapper>
  );
}
