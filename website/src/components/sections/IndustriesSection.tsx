"use client";

import Link from "next/link";
import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { industryCatalog } from "@/data/catalog";

export function IndustriesSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={177} endFrame={208} fadeFrames={4}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,200,83,0.12),transparent_50%)] pointer-events-none" />

      <SectionPanel>
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-eyebrow text-muted-foreground mb-2">
              Chapter 05 · Domains
            </p>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] text-white leading-[1.05] mb-2">
              Industries we serve
            </h2>
            <p className="text-[13px] text-white/50">
              Click any domain for capabilities, outcomes, and how we engage.
            </p>
          </div>
          <Link
            href="/industries"
            className="text-label text-white/55 hover:text-white"
          >
            All industries →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pb-2">
          {industryCatalog.map((ind, index) => {
            const visible = currentFrame >= 179 + index * 2;
            return (
              <Link
                key={ind.slug}
                href={ind.href}
                className="group relative min-h-[120px] md:min-h-[140px] rounded-2xl border border-white/10 bg-[#070A10]/90 p-3.5 overflow-hidden transition-transform duration-500 hover:-translate-y-1 cursor-pointer"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: `translateY(${visible ? 0 : 12}px)`,
                  transition: "opacity 0.5s var(--ease-expo), transform 0.5s var(--ease-expo)",
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top_right,rgba(43,107,255,0.25),transparent_55%)]" />
                <div className="relative z-10 h-full flex flex-col">
                  <span className="text-meta text-brand-blue mb-2">{ind.num}</span>
                  <h3 className="font-display text-[15px] md:text-[17px] text-white leading-tight mb-2 group-hover:text-brand-cyan transition-colors">
                    {ind.name}
                  </h3>
                  <p className="text-[11px] text-white/45 leading-relaxed mt-auto line-clamp-3 group-hover:text-white/70 transition-colors">
                    {ind.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionPanel>
    </SectionWrapper>
  );
}
