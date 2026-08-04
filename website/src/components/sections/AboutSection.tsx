"use client";

import Image from "next/image";
import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { GlassCard } from "@/components/ui/GlassCard";
import { about, process } from "@/data/mock";

export function AboutSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={32} endFrame={58} fadeFrames={4}>
      <div className="absolute inset-0 bg-gradient-to-r from-[#020305]/95 via-[#020305]/55 to-transparent pointer-events-none" />

      <SectionPanel>
        <div className="grid grid-cols-12 gap-5 lg:gap-8 pb-2">
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            <p className="text-eyebrow text-muted-foreground">
              {about.chapter}
            </p>
            <h2 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05] text-white">
              {about.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>

            <div className="relative mt-1 aspect-[4/5] max-h-[280px] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={about.image}
                alt="Satyakabir studio architecture"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 text-meta text-white/70">
                Studio · Architecture
              </span>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
            <p className="font-light text-[16px] md:text-[18px] text-white/80 leading-[1.5]">
              {about.lead}
            </p>
            <p className="text-[13px] text-white/50 leading-relaxed line-clamp-3">{about.body[0]}</p>

            <div className="grid grid-cols-3 gap-2">
              {about.stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="font-display text-[26px] text-brand-gradient leading-none mb-1">
                    {stat.val}
                  </div>
                  <div className="text-meta text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <GlassCard className="p-4 md:p-5" interactive={false}>
              <p className="font-display text-[18px] md:text-[20px] text-white/90 leading-snug mb-3">
                “{about.ceoQuote.quote}”
              </p>
              <p className="text-meta text-brand-cyan">
                {about.ceoQuote.name} · {about.ceoQuote.role}
              </p>
            </GlassCard>

            <div className="grid sm:grid-cols-3 gap-2">
              {about.pillars.map((p) => (
                <div key={p.title} className="rounded-xl border border-white/10 p-3 bg-[#070A10]/80">
                  <div className="text-meta text-brand-orange mb-1">
                    {p.title}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed line-clamp-4">{p.text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {process.map((step) => (
                <div
                  key={step.step}
                  className="min-w-[140px] flex-1 rounded-xl border border-white/10 p-3 bg-black/40"
                >
                  <div className="text-meta text-brand-blue mb-1">{step.step}</div>
                  <div className="font-display text-[15px] text-white mb-1">{step.title}</div>
                  <p className="text-[10px] text-white/40 line-clamp-2">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionPanel>
    </SectionWrapper>
  );
}
