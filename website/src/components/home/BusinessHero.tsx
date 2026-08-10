"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { homeHero } from "@/data/digital";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { scrollToId } from "@/lib/film-scroll";

/**
 * The plain-language proposition, immediately after the tour.
 *
 * Single message: we transform businesses through technology engineering.
 * Transformation is the goal; engineering is the method. Stable `#what-we-do`
 * anchor for the film bypass (“See what we do”).
 */
export function BusinessHero() {
  // Entrance runs once on mount. Content is visible by default (see
  // `[data-reveal]` in globals.css), so no-JS and crawlers still get the fold.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const reveal = (delay: number) => ({
    "data-reveal": entered ? "shown" : "pending",
    style: {
      "--reveal-from": "translateY(20px)",
      "--reveal-delay": `${delay}ms`,
    } as React.CSSProperties,
  });

  return (
    <section
      id="what-we-do"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[92svh] flex-col justify-center overflow-hidden bg-[#020305] pt-28 pb-12 md:pt-32"
      style={{ zIndex: "var(--z-content)" }}
    >
      {/* Backdrop: real HQ imagery, weighted right so the type column stays clean. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Not `priority`: this sits below the film, and pre-loading it would
            compete for bandwidth with the scrub asset that owns the first fold. */}
        <Image
          src="/TITLE__Satyakabir_Technologies.poster.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={85}
          className="object-cover object-[68%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(96deg,#020305_0%,rgba(2,3,5,0.94)_34%,rgba(2,3,5,0.62)_62%,rgba(2,3,5,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_18%_28%,rgba(43,107,255,0.20),transparent_62%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,#020305)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[var(--grid-max)] page-pad">
        <div className="grid grid-cols-12 gap-y-10 lg:gap-x-10">
          <div className="col-span-12 lg:col-span-8">
            <p {...reveal(0)} className="text-meta text-white/55">
              {homeHero.location}
            </p>

            <h1 id="hero-heading" {...reveal(70)} className="text-hero mt-5 text-white">
              <span className="block">{homeHero.headline[0]}</span>
              <span className="mt-1 block text-brand-blue">{homeHero.headline[1]}</span>
            </h1>

            <p
              {...reveal(150)}
              className="mt-6 max-w-[62ch] text-[1.05rem] leading-relaxed text-white/72 md:text-[1.18rem]"
            >
              {homeHero.statement}
            </p>

            {/* Capability surface. Plain wrapped text, not eight identical cards —
                the point is breadth read at a glance, not eight things to click. */}
            <ul {...reveal(220)} className="mt-8 flex flex-wrap gap-x-2.5 gap-y-2.5">
              {homeHero.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="rounded-full border border-white/14 bg-white/[0.045] px-3.5 py-1.5 text-[13px] font-medium tracking-[0.01em] text-white/78"
                >
                  {capability}
                </li>
              ))}
            </ul>

            <div
              {...reveal(300)}
              className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <PremiumButton onClick={() => scrollToId("start")}>Start Your Project</PremiumButton>
              <button
                type="button"
                onClick={() => scrollToId("ecosystem")}
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/18 px-6 py-3 text-label text-white/85 transition-colors duration-300 hover:border-white/40 hover:text-white"
              >
                Explore Our Capabilities
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Trust inside the first fold — the full counter grid is the next section. */}
        <div
          {...reveal(380)}
          className="mt-14 border-t border-white/12 pt-7 md:mt-16 lg:mt-20"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
            {homeHero.proof.map((item) => (
              <div key={item.label}>
                <dt className="sr-only">{item.label}</dt>
                <dd>
                  <span className="block font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-extrabold leading-none tracking-[-0.035em] text-white">
                    {item.value}
                  </span>
                  <span className="mt-2 block text-small text-white/55">{item.label}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-meta text-white/35">Trusted by</span>
            {homeHero.clients.map((client) => (
              <span key={client} className="text-label text-white/45">
                {client}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default BusinessHero;
