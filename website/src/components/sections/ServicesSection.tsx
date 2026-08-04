"use client";

import Link from "next/link";
import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import {
  BrainCircuit,
  Cloud,
  Code,
  Building,
  Globe,
  Smartphone,
  GitMerge,
  Database,
  PenTool,
  ShieldCheck,
  Activity,
  LineChart,
  TestTube,
  Cpu,
  Network,
  Users,
  type LucideIcon,
} from "lucide-react";
import { serviceCatalog } from "@/data/catalog";

const iconMap: Record<string, LucideIcon> = {
  BrainCircuit,
  Cloud,
  Code,
  Building,
  Globe,
  Smartphone,
  GitMerge,
  Database,
  PenTool,
  ShieldCheck,
  Activity,
  LineChart,
  TestTube,
  Cpu,
  Network,
  Users,
};

export function ServicesSection({ currentFrame }: { currentFrame: number }) {
  const featured = serviceCatalog.slice(0, 4);
  const rest = serviceCatalog.slice(4);

  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={62} endFrame={98} fadeFrames={4}>
      <div className="absolute inset-0 bg-[#020305]/75 backdrop-blur-[2px] pointer-events-none" />
      <p className="pointer-events-none absolute left-4 bottom-8 font-deco text-[clamp(3rem,12vw,9rem)] text-white/[0.03] leading-none select-none">
        BUILD
      </p>

      <SectionPanel>
        <div className="grid grid-cols-12 gap-5 pb-2">
          <div className="col-span-12 lg:col-span-4">
            <p className="text-eyebrow text-muted-foreground mb-2">
              Chapter 02 · Capabilities
            </p>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] text-white leading-[1.05] mb-3">
              What we build
            </h2>
            <p className="text-[13px] text-white/55 leading-relaxed mb-3 max-w-sm">
              Magazine of practices — AI research to dedicated squads — each delivered production-ready.
            </p>
            <Link
              href="/services"
              className="inline-block mb-4 text-label text-brand-cyan hover:text-white"
            >
              Browse all services →
            </Link>
            <div className="hidden lg:flex flex-col gap-1 max-h-[240px] overflow-hidden">
              {rest.map((s, i) => (
                <Link
                  key={s.slug}
                  href={s.href}
                  className="flex items-center justify-between border-b border-white/8 py-2 hover:text-brand-cyan transition-colors"
                  style={{
                    opacity: currentFrame >= 70 + i ? 1 : 0.35,
                    transition: "opacity 0.4s var(--ease-expo)",
                    pointerEvents: currentFrame >= 70 + i ? "auto" : "none",
                  }}
                >
                  <span className="text-[12px] text-white/70 truncate pr-2">{s.name}</span>
                  <span className="text-meta text-white/25">
                    {(i + 5).toString().padStart(2, "0")}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
            {featured.map((service, index) => {
              const Icon = iconMap[service.icon];
              const reverse = index % 2 === 1;
              const visible = currentFrame >= 64 + index * 2;

              return (
                <Link
                  key={service.slug}
                  href={service.href}
                  className={`gradient-border glass-panel rounded-2xl p-4 md:p-5 grid grid-cols-12 gap-3 items-center cursor-pointer hover:bg-white/[0.04] transition-colors ${
                    reverse ? "md:[&>*:first-child]:order-2" : ""
                  }`}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: `translateX(${visible ? 0 : reverse ? 16 : -16}px)`,
                    transition: "all 0.55s var(--ease-expo)",
                    pointerEvents: visible ? "auto" : "none",
                  }}
                >
                  <div className="col-span-12 md:col-span-7">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,rgba(43,107,255,0.25),rgba(0,217,255,0.12))] flex items-center justify-center border border-white/10">
                        {Icon && <Icon className="w-4 h-4 text-brand-cyan" strokeWidth={1.5} />}
                      </div>
                      <h3 className="font-display text-[18px] md:text-[20px] text-white">{service.name}</h3>
                    </div>
                    <p className="text-[12px] text-brand-green/90 mb-1.5">{service.summary}</p>
                    <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{service.desc}</p>
                    <p className="mt-2 text-meta text-white/55">
                      Open details →
                    </p>
                  </div>
                  <div className="col-span-12 md:col-span-5 flex flex-wrap gap-1.5 md:justify-end">
                    {service.outcomes.map((o) => (
                      <span
                        key={o}
                        className="text-meta text-white/55 border border-white/12 rounded-full px-2.5 py-1"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </SectionPanel>
    </SectionWrapper>
  );
}
