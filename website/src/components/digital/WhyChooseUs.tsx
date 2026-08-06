"use client";

import { Eye, Handshake, Layers, Target, Users, Zap, type LucideIcon } from "lucide-react";
import { chooseUsCards } from "@/data/digital";
import { DigitalSection, RevealHeading } from "./primitives";

const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  eye: Eye,
  users: Users,
  layers: Layers,
  target: Target,
  handshake: Handshake,
};

const SPANS = {
  wide: "lg:col-span-4",
  tall: "lg:col-span-2 lg:row-span-2",
  normal: "lg:col-span-2",
} as const;

/**
 * §10 — Bento. Tiles differ in weight and content shape (metric, prose, icon
 * scale) so the grid has a reading order rather than six equal claims.
 */
export function WhyChooseUs() {
  return (
    <DigitalSection id="why-us" className="py-[clamp(5rem,10vw,9rem)]" tone="raised">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <RevealHeading
          text="Why organizations choose us."
          accentFrom={1}
          className="text-[clamp(2.1rem,4.6vw,3.5rem)]"
        />
        <p className="max-w-[42ch] text-body">
          Engineering excellence, business-first thinking, and partnerships that last platforms —
          not just projects.
        </p>
      </div>

      <div className="mt-12 grid auto-rows-[minmax(11rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {chooseUsCards.map((card) => {
          const Icon = ICONS[card.icon];
          const tall = card.span === "tall";
          return (
            <article
              key={card.title}
              className={[
                "group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-border bg-[color-mix(in_oklab,var(--surface)_86%,transparent)] p-6 md:p-7",
                "transition-[border-color,transform] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-brand-cyan/40",
                SPANS[card.span],
              ].join(" ")}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(43,107,255,0.28),transparent_70%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />

              <div className="relative">
                <Icon
                  className={[
                    "text-brand-cyan transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110",
                    tall ? "h-9 w-9" : "h-6 w-6",
                  ].join(" ")}
                  strokeWidth={1.4}
                />
                <h3
                  className={[
                    "mt-5 font-display tracking-[-0.025em] text-foreground",
                    card.span === "wide" || tall
                      ? "text-[clamp(1.35rem,2.4vw,1.85rem)]"
                      : "text-[1.15rem]",
                  ].join(" ")}
                >
                  {card.title}
                </h3>
                <p className="mt-2.5 max-w-[46ch] text-small">{card.body}</p>
              </div>

              {card.metric ? (
                <div className="relative mt-8 flex items-baseline gap-3 border-t border-divider pt-4">
                  <span className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-none tracking-[-0.035em] text-foreground">
                    {card.metric}
                  </span>
                  <span className="text-meta">{card.metricLabel}</span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </DigitalSection>
  );
}
