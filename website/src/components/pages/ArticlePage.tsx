"use client";

import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/pages/MarketingShell";
import { breadcrumbsFor } from "@/data/navigation";
import type { Article } from "@/data/articles";
import { Clock, Calendar, ArrowLeft, Share2, Bookmark, Check } from "lucide-react";
import { useState } from "react";

export function ArticlePage({ article }: { article: Article }) {
  const [copied, setCopied] = useState(false);
  const crumbs = breadcrumbsFor(`/insights/blog/${article.slug}`);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <MarketingShell crumbs={crumbs}>
      <article className="mx-auto max-w-4xl space-y-10">
        {/* Article Header */}
        <header className="space-y-6">
          <Link
            href="/insights/blog"
            className="inline-flex items-center gap-1.5 text-small font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Insights
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-meta">
            <span className="rounded-full bg-brand-blue/10 px-3 py-1 font-medium text-brand-blue">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {article.publishDate}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {article.readTime}
            </span>
          </div>

          <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-tight tracking-tight text-foreground">
            {article.title}
          </h1>

          <p className="text-[17px] leading-relaxed text-muted-foreground md:text-[19px]">
            {article.summary}
          </p>

          {/* Author Strip */}
          <div className="flex items-center justify-between border-y border-border py-4">
            <div className="flex items-center gap-3">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="h-11 w-11 rounded-full object-cover border border-border"
              />
              <div>
                <p className="font-display font-semibold text-foreground text-small">
                  {article.author.name}
                </p>
                <p className="text-meta text-muted-foreground">{article.author.role}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-small font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              <span>{copied ? "Link Copied" : "Share"}</span>
            </button>
          </div>
        </header>

        {/* Hero Image */}
        <div className="relative aspect-[21/9] overflow-hidden rounded-2xl border border-border bg-surface">
          <img
            src={article.heroImage}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Article Body Content */}
        <div className="prose prose-invert max-w-none space-y-6 text-foreground text-[16px] leading-relaxed">
          {article.blocks.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h2 key={index} className="pt-4 font-display text-2xl font-bold text-foreground">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "quote") {
              return (
                <blockquote
                  key={index}
                  className="my-6 border-l-4 border-brand-cyan bg-brand-cyan/5 p-4 text-[17px] italic text-foreground rounded-r-xl"
                >
                  "{block.text}"
                </blockquote>
              );
            }
            if (block.type === "code") {
              return (
                <pre
                  key={index}
                  className="overflow-x-auto rounded-xl border border-border bg-[#070a10] p-4 text-small font-mono text-cyan-300"
                >
                  <code>{block.text}</code>
                </pre>
              );
            }
            if (block.type === "takeaway") {
              return (
                <div
                  key={index}
                  className="my-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-300 text-small font-medium"
                >
                  {block.text}
                </div>
              );
            }
            return <p key={index}>{block.text}</p>;
          })}
        </div>

        {/* Article Footer & Tags */}
        <footer className="border-t border-border pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-meta text-muted-foreground mr-2">Tags:</span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-meta text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </footer>
      </article>
    </MarketingShell>
  );
}
