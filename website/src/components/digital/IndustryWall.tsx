"use client";

import { industryBadges } from "@/data/digital";

/**
 * §2 — Industry wall. Two rows travelling in opposite directions so the eye has
 * somewhere to rest; hovering either row freezes it (handled in globals.css).
 */
function MarqueeRow({
  items,
  direction,
  duration,
}: {
  items: readonly string[];
  direction: "left" | "right";
  duration: number;
}) {
  return (
    <div className="marquee-shell overflow-hidden">
      {/* Spacing lives on the items, not as a flex gap: the track translates by
          exactly 50% of its width, and a trailing gap would break the seam. */}
      <ul
        className="marquee-track py-2"
        style={{ animationName: `marquee-${direction}`, animationDuration: `${duration}s` }}
      >
        {[...items, ...items].map((label, i) => (
          <li key={`${label}-${i}`} className="pr-3" aria-hidden={i >= items.length}>
            {/* Opaque on purpose: a backdrop-filter here would re-blur the
                backdrop of 24 elements on every frame of the marquee. */}
            <span className="group flex items-center gap-3 whitespace-nowrap rounded-full border border-border bg-[color-mix(in_oklab,var(--surface)_94%,var(--background))] px-6 py-3.5 transition-[border-color,background-color] duration-500 hover:border-brand-cyan/45 hover:bg-surface">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan/50 transition-colors duration-500 group-hover:bg-brand-cyan" />
              <span className="font-display text-[clamp(1rem,1.6vw,1.35rem)] tracking-[-0.01em] text-secondary-foreground transition-colors duration-500 group-hover:text-foreground">
                {label}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IndustryWall() {
  const half = Math.ceil(industryBadges.length / 2);
  const top = industryBadges.slice(0, half);
  const bottom = industryBadges.slice(half);

  return (
    <section
      className="cv-auto relative isolate overflow-hidden bg-background py-[clamp(3.5rem,6vw,5.5rem)]"
      style={{ zIndex: "var(--z-content)" }}
      aria-labelledby="industry-wall-heading"
    >
      <div className="mx-auto mb-10 w-full max-w-[var(--grid-max)] page-pad">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-divider pb-5">
          <h2 id="industry-wall-heading" className="text-subhead text-foreground">
            Trusted across eighteen industries
          </h2>
          <p className="text-small">Hover to pause · client names shared under NDA on request</p>
        </div>
      </div>

      <div className="space-y-3">
        <MarqueeRow items={top} direction="left" duration={38} />
        <MarqueeRow items={bottom} direction="right" duration={44} />
      </div>
    </section>
  );
}
