"use client";

import { MarketingShell } from "@/components/pages/MarketingShell";
import { ProjectEstimator } from "@/components/forms/ProjectEstimator";
import { breadcrumbsFor } from "@/data/navigation";
import { Sparkles, ShieldCheck, Zap, Award } from "lucide-react";

export function QuotePage() {
  const crumbs = breadcrumbsFor("/contact/get-quote");

  return (
    <MarketingShell crumbs={crumbs}>
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 md:mb-14 md:rounded-3xl md:px-12 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-0 font-deco text-[clamp(5rem,18vw,12rem)] leading-none text-foreground/5 select-none"
        >
          QUOTE
        </div>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/25 bg-brand-blue/10 px-3 py-1 text-meta text-brand-blue">
            <Sparkles className="h-3.5 w-3.5" />
            Interactive Scope Calculator
          </span>
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground">
            Scope & Estimate Your Initiative
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            Configure your technical requirements, desired timeline, and team capacity parameters to calculate a real-time investment estimate for your enterprise platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-6 border-t border-border/60 pt-6">
            <div className="flex items-center gap-2 text-small text-foreground">
              <Zap className="h-4 w-4 text-brand-cyan" />
              <span>1 Business Day Proposal</span>
            </div>
            <div className="flex items-center gap-2 text-small text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>SOC2 & Audit Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-small text-foreground">
              <Award className="h-4 w-4 text-amber-400" />
              <span>Principal-Led Pods</span>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-surface/50 p-6 md:p-10">
        <ProjectEstimator />
      </div>
    </MarketingShell>
  );
}
