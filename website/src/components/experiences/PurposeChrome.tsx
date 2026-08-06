"use client";

import Link from "next/link";
import { PremiumButton } from "@/components/ui/PremiumButton";
import {
  COMPANY_IDENTITY,
  type TrustMetric,
} from "@/data/first-viewport";
import { cn } from "@/lib/utils";

export type PurposeChromeProps = {
  /** Human page context, e.g. Services · AI Development */
  context: string;
  title: string;
  /** One-line promise — what this page is for */
  promise: string;
  outcomes: string[];
  trust: TrustMetric[];
  cta: { label: string; href: string };
  accent?: string;
  /**
   * default — ink on page surface
   * onDark — white text (film / dark panels)
   * onMedia — white text over image gradient
   */
  tone?: "default" | "onDark" | "onMedia";
  align?: "left" | "center";
  className?: string;
  /** Optional company line override */
  company?: string;
  craft?: string;
  /** Hide trust row when parent already shows metrics */
  hideTrust?: boolean;
};

/**
 * Universal first-viewport message stack.
 * Order is fixed: identity → context → title → promise → outcomes → CTA → trust.
 * Visual storytelling belongs beside/below — never instead of this.
 */
export function PurposeChrome({
  context,
  title,
  promise,
  outcomes,
  trust,
  cta,
  accent,
  tone = "default",
  align = "left",
  className,
  company = COMPANY_IDENTITY.company,
  craft = COMPANY_IDENTITY.craft,
  hideTrust = false,
}: PurposeChromeProps) {
  const onDark = tone === "onDark" || tone === "onMedia";
  const center = align === "center";

  return (
    <div
      className={cn(
        "min-w-0",
        center && "mx-auto text-center",
        className,
      )}
    >
      <p
        className={cn(
          "text-[0.7rem] font-medium tracking-[0.14em] uppercase",
          onDark ? "text-white/55" : "text-muted-foreground",
        )}
      >
        {company}
      </p>
      <p
        className={cn(
          "mt-1 text-[0.7rem] tracking-[0.06em]",
          onDark ? "text-white/45" : "text-muted-foreground/90",
        )}
      >
        {craft}
      </p>

      <p
        className="text-eyebrow mt-5"
        style={{ color: accent ?? (onDark ? "rgba(255,255,255,0.75)" : undefined) }}
      >
        {context}
      </p>

      <h1
        className={cn(
          "xp-title mt-3 text-balance",
          onDark && "text-white",
          center && "mx-auto",
        )}
      >
        {title}
      </h1>

      <p
        className={cn(
          "mt-4 max-w-xl text-[1.05rem] leading-relaxed md:text-[1.125rem]",
          onDark ? "text-white/80" : "text-secondary-foreground",
          center && "mx-auto",
        )}
      >
        {promise}
      </p>

      {outcomes.length > 0 ? (
        <ul
          className={cn(
            "mt-6 flex flex-wrap gap-2",
            center && "justify-center",
          )}
        >
          {outcomes.slice(0, 3).map((item) => (
            <li
              key={item}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.75rem] leading-snug",
                onDark
                  ? "border-white/18 bg-white/8 text-white/85"
                  : "border-border bg-muted/60 text-secondary-foreground",
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      <div className={cn("mt-8", center && "flex justify-center")}>
        <Link href={cta.href}>
          <PremiumButton
            variant={onDark ? "primary" : "primary"}
            className={onDark ? undefined : undefined}
          >
            {cta.label}
          </PremiumButton>
        </Link>
      </div>

      {!hideTrust && trust.length > 0 ? (
        <div
          className={cn(
            "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4",
            "min-h-[3.25rem]",
            center && "mx-auto max-w-2xl",
          )}
        >
          {trust.slice(0, 4).map((m) => (
            <div key={m.label} className="min-w-0">
              <p
                className={cn(
                  "font-display text-[1.15rem] leading-none tracking-tight md:text-[1.35rem]",
                  onDark ? "text-white" : "text-foreground",
                )}
                style={!onDark && accent ? { color: accent } : undefined}
              >
                {m.value}
              </p>
              <p
                className={cn(
                  "mt-1 text-[0.65rem] leading-snug md:text-[0.7rem]",
                  onDark ? "text-white/50" : "text-muted-foreground",
                )}
              >
                {m.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
