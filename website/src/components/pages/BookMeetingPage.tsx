"use client";

import { MarketingShell } from "@/components/pages/MarketingShell";
import { MeetingScheduler } from "@/components/forms/MeetingScheduler";
import { breadcrumbsFor } from "@/data/navigation";
import { Sparkles, Calendar, Clock, Video } from "lucide-react";

export function BookMeetingPage() {
  const crumbs = breadcrumbsFor("/contact/book-meeting");

  return (
    <MarketingShell crumbs={crumbs}>
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-border bg-surface px-6 py-10 md:mb-14 md:rounded-3xl md:px-12 md:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-0 font-deco text-[clamp(5rem,18vw,12rem)] leading-none text-foreground/5 select-none"
        >
          MEET
        </div>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-1 text-meta text-brand-cyan">
            <Sparkles className="h-3.5 w-3.5" />
            1:1 Principal Advisory Call
          </span>
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground">
            Schedule a Strategy Briefing
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
            Book a 30-minute video session with a Satyakabir engineering principal. We’ll discuss your architecture constraints, technology choices, and project roadmap.
          </p>

          <div className="mt-8 flex flex-wrap gap-6 border-t border-border/60 pt-6">
            <div className="flex items-center gap-2 text-small text-foreground">
              <Clock className="h-4 w-4 text-brand-cyan" />
              <span>30 Min Video Session</span>
            </div>
            <div className="flex items-center gap-2 text-small text-foreground">
              <Video className="h-4 w-4 text-emerald-400" />
              <span>Direct Principal Access</span>
            </div>
            <div className="flex items-center gap-2 text-small text-foreground">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Instant Confirmation</span>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-surface/50 p-6 md:p-10">
        <MeetingScheduler />
      </div>
    </MarketingShell>
  );
}
