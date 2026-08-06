"use client";

import Image from "next/image";
import { transformIndustries } from "@/data/digital";
import { DigitalSection, RevealHeading } from "./primitives";

const BAR_SET = [38, 62, 44, 80, 56, 92, 70];

/** Miniature telemetry plate — stands in for the client dashboard we shipped. */
function DashboardPreview({ accent }: { accent: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[#080B12]/90 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/55">Live metrics</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-2.5 flex h-10 items-end gap-1">
        {BAR_SET.map((height, i) => (
          <span
            key={i}
            className="flex-1 rounded-[2px] transition-[height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              height: `${height}%`,
              background: `linear-gradient(180deg, ${accent}, ${accent}33)`,
              transitionDelay: `${i * 45}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * §6 — Industry showcase. Sizes vary across the grid so it never reads as eight
 * identical tiles; imagery desaturates until hover, when the dashboard plate and
 * capability chips rise into view.
 */
export function IndustriesTransform() {
  return (
    <DigitalSection id="industries" className="py-[clamp(5rem,10vw,9rem)]" tone="base">
      <div className="max-w-3xl">
        <RevealHeading
          text="How industries transform with us."
          accentFrom={2}
          className="text-[clamp(2.1rem,4.6vw,3.5rem)]"
        />
        <p className="mt-5 text-body">
          Every industry has a different operating pressure. We engineer the platforms, data, and
          automation that turn that pressure into a competitive advantage.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {transformIndustries.map((industry, i) => {
          const feature = i === 0;
          const wide = i === 3;
          return (
            <li
              key={industry.name}
              className={[
                "group relative overflow-hidden rounded-[22px] border border-border",
                feature ? "sm:col-span-2 lg:row-span-2" : "",
                wide ? "sm:col-span-2" : "",
              ].join(" ")}
            >
              <div className={feature ? "relative min-h-[22rem] lg:min-h-[34rem]" : "relative min-h-[16rem]"}>
                <Image
                  src={industry.image}
                  alt=""
                  fill
                  sizes={feature ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"}
                  quality={85}
                  className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
                {/* Desaturate via overlay — CSS filter on the image softens it and costs paint. */}
                <div className="absolute inset-0 bg-[color-mix(in_oklab,#020305_38%,transparent)] transition-opacity duration-700 group-hover:opacity-0" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,3,5,0.15)_0%,rgba(2,3,5,0.72)_58%,rgba(2,3,5,0.94)_100%)]" />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(90% 70% at 50% 100%, ${industry.accent}33, transparent 70%)`,
                  }}
                />

                {/* Floating capability chips */}
                <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
                  {industry.signals.map((signal, s) => (
                    <span
                      key={signal}
                      className="translate-y-0 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] tracking-[0.06em] text-white/70 transition-[transform,color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:text-white"
                      style={{ transitionDelay: `${s * 70}ms` }}
                    >
                      {signal}
                    </span>
                  ))}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-end justify-between gap-3">
                    <h3
                      className={[
                        "font-display leading-tight tracking-[-0.025em] text-white",
                        feature ? "text-[clamp(1.6rem,3vw,2.4rem)]" : "text-[1.2rem]",
                      ].join(" ")}
                    >
                      {industry.name}
                    </h3>
                    <div className="text-right">
                      <div
                        className="font-display text-[clamp(1.1rem,2vw,1.6rem)] leading-none"
                        style={{ color: industry.accent }}
                      >
                        {industry.metric}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/55">
                        {industry.metricLabel}
                      </div>
                    </div>
                  </div>

                  <p
                    className={[
                      "mt-2 text-[13px] leading-relaxed text-white/70",
                      feature ? "max-w-[46ch]" : "",
                    ].join(" ")}
                  >
                    {industry.promise}
                  </p>

                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-rows-[1fr] motion-reduce:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <div className="pt-4">
                        <DashboardPreview accent={industry.accent} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </DigitalSection>
  );
}
