"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { projectCatalog } from "@/data/catalog";
import { MarketingShell } from "@/components/pages/MarketingShell";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { breadcrumbsFor } from "@/data/navigation";
import { Sparkles, Search, ArrowRight, Layers, ZoomIn } from "lucide-react";

const SECTOR_FILTERS = [
  "All",
  "AI & Data",
  "Cloud & Ops",
  "Enterprise & SaaS",
  "Healthcare",
  "Fintech",
];

export function WorkIndexPage() {
  const [selectedSector, setSelectedSector] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);

  const crumbs = breadcrumbsFor("/work");

  const filteredProjects = useMemo(() => {
    return projectCatalog.filter((project) => {
      if (selectedSector !== "All") {
        const sec = project.sector.toLowerCase();
        const sel = selectedSector.toLowerCase();
        if (sel === "ai & data" && !sec.includes("ai") && !sec.includes("data")) return false;
        if (sel === "cloud & ops" && !sec.includes("cloud") && !sec.includes("ops")) return false;
        if (sel === "enterprise & saas" && !sec.includes("enterprise") && !sec.includes("saas")) return false;
        if (sel === "healthcare" && !sec.includes("health") && !sec.includes("care")) return false;
        if (sel === "fintech" && !sec.includes("fintech") && !sec.includes("finance") && !sec.includes("banking")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          project.name.toLowerCase().includes(q) ||
          project.desc.toLowerCase().includes(q) ||
          project.sector.toLowerCase().includes(q) ||
          project.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedSector, searchQuery]);

  return (
    <MarketingShell crumbs={crumbs}>
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 md:mb-14 md:rounded-3xl md:px-12 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-0 font-deco text-[clamp(5rem,18vw,12rem)] leading-none text-foreground/5 select-none"
        >
          WORK
        </div>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-meta text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            Shipped Craft & Outcomes
          </span>
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground">
            Selected Platforms, Products & AI Systems
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            Explore real-world case studies detailing problem framing, architecture decisions, delivery cadences, and business results across regulated and high-growth sectors.
          </p>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project name, tech stack, or sector..."
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
            />
          </div>

          {/* Sector Tabs */}
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1">
            {SECTOR_FILTERS.map((sector) => (
              <button
                key={sector}
                type="button"
                onClick={() => setSelectedSector(sector)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-small font-medium transition-colors ${
                  selectedSector === sector
                    ? "bg-foreground text-background"
                    : "border border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredProjects.map((project) => (
          <div
            key={project.slug}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-foreground/30 hover:shadow-xl"
          >
            <div>
              {/* Image Preview with Lightbox click trigger */}
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={project.image}
                  alt={project.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => setLightboxImg({ src: project.image, alt: project.name })}
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-meta text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Enlarge image"
                >
                  <ZoomIn className="h-3.5 w-3.5" /> Enlarge
                </button>
                <span className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-meta font-medium text-foreground backdrop-blur-md">
                  {project.sector}
                </span>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-amber-400">
                    {project.metric} <span className="text-small font-normal text-muted-foreground">{project.metricLabel}</span>
                  </span>
                </div>

                <h2 className="font-display text-xl font-bold text-foreground group-hover:text-brand-blue transition-colors">
                  {project.name}
                </h2>

                <p className="text-small text-muted-foreground leading-relaxed">
                  {project.desc}
                </p>

                {/* Tech Tag Pills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border bg-surface-2 px-2.5 py-0.5 text-meta text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-border/60 p-6 pt-4">
              <Link
                href={project.href}
                className="inline-flex w-full items-center justify-between font-display text-small font-semibold text-foreground group-hover:text-brand-blue"
              >
                <span>Read Full Case Study</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <ImageLightbox
        src={lightboxImg?.src ?? null}
        alt={lightboxImg?.alt}
        open={!!lightboxImg}
        onClose={() => setLightboxImg(null)}
      />
    </MarketingShell>
  );
}
