"use client";

import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { GlassCard } from "@/components/ui/GlassCard";
import { testimonials } from "@/data/mock";

export function TestimonialsSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={212} endFrame={223} fadeFrames={3}>
      <div className="absolute inset-0 bg-[#020305]/72 backdrop-blur-sm pointer-events-none" />

      <SectionPanel align="center">
        <div className="text-center mb-5">
          <p className="text-eyebrow text-muted-foreground mb-2">
            Chapter 06 · Proof
          </p>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-white mb-2">
            Voices from the operators
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {testimonials.map((test, index) => {
            const visible = currentFrame >= 214 + index * 2;
            return (
              <GlassCard
                key={test.name}
                className="p-5 flex flex-col min-h-[240px]"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: `translateY(${visible ? 0 : 16}px)`,
                  transition: "all 0.6s var(--ease-expo)",
                }}
              >
                <p className="font-display text-[48px] leading-none text-brand-gradient opacity-40 mb-1">
                  “
                </p>
                <p className="font-display text-[15px] md:text-[16px] text-white/85 leading-snug mb-5 flex-1">
                  {test.quote}
                </p>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-[13px] font-semibold text-white">{test.name}</p>
                  <p className="text-[11px] text-white/50">{test.role}</p>
                  <p className="text-meta text-muted-foreground mt-1">
                    {test.company}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </SectionPanel>
    </SectionWrapper>
  );
}
