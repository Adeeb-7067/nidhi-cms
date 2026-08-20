"use client";

import React from "react";
import { CmsBlock } from "@/lib/cms-api";
import { ServicesSection } from "./ServicesSection";
import { TechnologiesSection } from "./TechnologiesSection";
import { ProjectsSection } from "./ProjectsSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { ContactSection } from "./ContactSection";
import { IndustriesSection } from "./IndustriesSection";

interface DynamicBlockRendererProps {
  blocks: CmsBlock[];
}

export function DynamicBlockRenderer({ blocks }: DynamicBlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const sortedBlocks = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-16 py-12">
      {sortedBlocks.map((block, idx) => {
        const key = block.id || `block_${idx}`;
        const data = block.data || {};

        switch (block.type) {
          case "hero":
            return (
              <section key={key} className="relative pt-24 pb-16 px-6 max-w-7xl mx-auto text-center space-y-6">
                {data.badgeText && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    {data.badgeText}
                  </span>
                )}
                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
                  {data.headline || "Enterprise Solutions"}
                </h1>
                {data.subheadline && (
                  <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    {data.subheadline}
                  </p>
                )}
                {data.primaryCta?.label && (
                  <div className="pt-4">
                    <a
                      href={data.primaryCta.href || "/contact"}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                      {data.primaryCta.label}
                    </a>
                  </div>
                )}
              </section>
            );

          case "stats":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto border-y border-slate-800/80">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  {(data.items || [
                    { label: "Active Clients", value: "500+" },
                    { label: "Uptime SLA", value: "99.99%" },
                    { label: "Global Regions", value: "24+" },
                    { label: "Engineers", value: "150+" },
                  ]).map((stat: any, sIdx: number) => (
                    <div key={sIdx} className="space-y-1">
                      <div className="text-3xl md:text-4xl font-extrabold text-indigo-400 font-mono">
                        {stat.value}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );

          case "feature_grid":
          case "services":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto">
                <ServicesSection currentFrame={80} />
              </section>
            );

          case "cards":
          case "projects":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto">
                <ProjectsSection currentFrame={120} />
              </section>
            );

          case "technologies":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto">
                <TechnologiesSection currentFrame={160} />
              </section>
            );

          case "industries":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto">
                <IndustriesSection currentFrame={200} />
              </section>
            );

          case "testimonials":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto">
                <TestimonialsSection currentFrame={240} />
              </section>
            );

          case "richtext":
            return (
              <section key={key} className="py-12 px-6 max-w-4xl mx-auto prose prose-invert">
                <div dangerouslySetInnerHTML={{ __html: data.contentHtml || "" }} />
              </section>
            );

          case "cta":
            return (
              <section key={key} className="py-16 px-6 max-w-5xl mx-auto">
                <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-3xl p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                    {data.title || "Ready to scale your digital platform?"}
                  </h2>
                  {data.subheadline && (
                    <p className="text-slate-300 max-w-xl mx-auto">
                      {data.subheadline}
                    </p>
                  )}
                  <a
                    href={data.buttonUrl || "/contact"}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-slate-950 hover:bg-slate-100 font-extrabold rounded-xl shadow-xl transition-all"
                  >
                    {data.buttonText || "Get In Touch"}
                  </a>
                </div>
              </section>
            );

          case "faq":
            return (
              <section key={key} className="py-12 px-6 max-w-4xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-slate-100 text-center">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {(data.items || []).map((faq: any, fIdx: number) => (
                    <div key={fIdx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
                      <h3 className="font-bold text-slate-200 text-base">{faq.question}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            );

          case "form_embed":
          case "contact":
            return (
              <section key={key} className="py-12 px-6 max-w-7xl mx-auto">
                <ContactSection currentFrame={280} />
              </section>
            );

          default:
            return (
              <section key={key} className="py-8 px-6 max-w-5xl mx-auto text-slate-400">
                <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
                    {block.type} Block
                  </span>
                  {data.title && <h3 className="text-xl font-bold text-white mt-1">{data.title}</h3>}
                  {data.description && <p className="text-sm mt-2">{data.description}</p>}
                </div>
              </section>
            );
        }
      })}
    </div>
  );
}
