"use client";

import Link from "next/link";
import Image from "next/image";
import { SectionWrapper, SectionPanel } from "./SectionWrapper";
import { projectCatalog } from "@/data/catalog";

export function ProjectsSection({ currentFrame }: { currentFrame: number }) {
  return (
    <SectionWrapper currentFrame={currentFrame} startFrame={102} endFrame={138} fadeFrames={4}>
      <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-[#020305]/50 to-[#020305]/80 pointer-events-none" />

      <SectionPanel>
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow text-muted-foreground mb-2">
              Chapter 03 · Portfolio
            </p>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.4rem)] text-white leading-[1.05]">
              Selected work
            </h2>
          </div>
          <Link
            href="/work"
            className="text-label text-white/55 hover:text-white"
          >
            View all case studies →
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-3 pb-2">
          {projectCatalog.map((project, index) => {
            const visible = currentFrame >= 104 + index * 2;
            const wide = project.layout === "wide";

            return (
              <Link
                key={project.slug}
                href={project.href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#070A10] cursor-pointer ${
                  wide ? "col-span-12 md:col-span-7" : "col-span-12 md:col-span-5"
                } min-h-[180px] md:min-h-[200px]`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: `translateY(${visible ? 0 : 18}px)`,
                  transition: "all 0.6s var(--ease-expo)",
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                <Image
                  src={project.image}
                  alt={project.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-[#020305]/55 to-transparent" />
                <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-end">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-meta text-white/70 border border-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-meta text-brand-cyan mb-1">
                        {project.sector}
                      </p>
                      <h3 className="font-display text-[20px] md:text-[24px] text-white leading-tight group-hover:text-brand-cyan transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-[11px] text-white/55 mt-1 line-clamp-2 max-w-md">{project.desc}</p>
                      <p className="mt-2 text-meta text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open case study →
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-[26px] text-white leading-none">{project.metric}</div>
                      <div className="text-meta text-white/40">
                        {project.metricLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionPanel>
    </SectionWrapper>
  );
}
