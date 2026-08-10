"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ARTICLES, type Article, type ArticleCategory } from "@/data/articles";
import { ResourceDownloadModal } from "@/components/forms/ResourceDownloadModal";
import { MarketingShell } from "@/components/pages/MarketingShell";
import { breadcrumbsFor } from "@/data/navigation";
import { Sparkles, Search, Clock, ArrowRight, Download, BookOpen } from "lucide-react";

const CATEGORIES: ("All" | ArticleCategory)[] = [
  "All",
  "AI & Intelligence",
  "Cloud & Infrastructure",
  "Product Engineering",
  "Whitepapers",
];

export function InsightsCatalogPage({ currentSlug }: { currentSlug: string }) {
  const [selectedCat, setSelectedCat] = useState<"All" | ArticleCategory>(
    currentSlug === "whitepapers" ? "Whitepapers" : "All",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeWhitepaper, setActiveWhitepaper] = useState<Article | null>(null);

  const crumbs = breadcrumbsFor(`/insights/${currentSlug}`);

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((art) => {
      if (selectedCat !== "All" && art.category !== selectedCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          art.title.toLowerCase().includes(q) ||
          art.summary.toLowerCase().includes(q) ||
          art.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCat, searchQuery]);

  return (
    <MarketingShell crumbs={crumbs}>
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 md:mb-14 md:rounded-3xl md:px-12 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-0 font-deco text-[clamp(5rem,18vw,12rem)] leading-none text-foreground/5 select-none"
        >
          INSIGHTS
        </div>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/25 bg-brand-orange/10 px-3 py-1 text-meta text-brand-orange">
            <Sparkles className="h-3.5 w-3.5" />
            Field Notes & Technical R&D
          </span>
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground">
            Engineering Signal & Architecture Playbooks
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            Deep dives, evaluation benchmarks, and architecture patterns distilled from building production intelligent systems.
          </p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, tags, or playbooks..."
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-small text-foreground outline-none transition-colors focus:border-brand-blue"
            />
          </div>

          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-small font-medium transition-colors ${
                  selectedCat === cat
                    ? "bg-foreground text-background"
                    : "border border-border bg-surface text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article) => (
          <div
            key={article.slug}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-xl"
          >
            <div>
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={article.heroImage}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-meta font-medium text-foreground backdrop-blur-md">
                  {article.category}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-meta text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{article.readTime}</span>
                  <span>·</span>
                  <span>{article.publishDate}</span>
                </div>

                <h3 className="font-display text-lg font-bold leading-snug text-foreground group-hover:text-brand-blue transition-colors">
                  {article.title}
                </h3>

                <p className="line-clamp-3 text-small text-muted-foreground leading-relaxed">
                  {article.summary}
                </p>
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-border/60 p-5 pt-3">
              {article.isGatedWhitepaper ? (
                <button
                  type="button"
                  onClick={() => setActiveWhitepaper(article)}
                  className="inline-flex w-full items-center justify-between text-small font-semibold text-brand-cyan hover:underline"
                >
                  <span>Download Whitepaper PDF</span>
                  <Download className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  href={`/insights/blog/${article.slug}`}
                  className="inline-flex w-full items-center justify-between text-small font-semibold text-foreground group-hover:text-brand-blue"
                >
                  <span>Read Article</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Whitepaper Download Modal */}
      {activeWhitepaper && (
        <ResourceDownloadModal
          title={activeWhitepaper.title}
          pdfFileName={activeWhitepaper.pdfFileName}
          open={!!activeWhitepaper}
          onClose={() => setActiveWhitepaper(null)}
        />
      )}
    </MarketingShell>
  );
}
