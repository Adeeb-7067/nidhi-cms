"use client";

import { ArrowDown } from "lucide-react";
import { scrollToId } from "@/lib/film-scroll";
import { useFilmInView } from "@/hooks/useFilmInView";

/**
 * Act 1 — the cinematic tour, and the first thing the page paints.
 *
 * No title card sits above the film. The `arrival` chapter already renders the
 * brand, offer, and proof over the opening frames, so an extra opaque intro
 * section would only push the scrub below the fold — the opposite of opening
 * with it.
 *
 * The track stays transparent so the fixed canvas at `--z-canvas` shows through
 * it. The outro dissolves the held final frame into the page background so the
 * handoff to the business case reads as a fade rather than a cut.
 */
export function FilmIsland({ children }: { children: React.ReactNode }) {
  const inFilm = useFilmInView();

  return (
    <div id="inside" className="relative">
      {children}

      {/*
        Fixed and tied to film visibility rather than parked in the opening
        viewport: the track runs ~1500vh, so an absolutely positioned bypass
        scrolls away within one screen and abandons exactly the visitor who
        wanted it.

        Top-right is free for “See what we do” — Actions owns the left edge and
        `ChapterProgress` mirrors it on the right while the film is in view.
        Chat stays bottom-right.
      */}
      <button
        type="button"
        onClick={() => scrollToId("what-we-do")}
        tabIndex={inFilm ? 0 : -1}
        aria-hidden={!inFilm}
        className={`group fixed right-5 z-[var(--z-nav)] inline-flex items-center gap-2 rounded-full border border-white/16 bg-black/45 px-5 py-2.5 text-label text-white/70 backdrop-blur-none transition-[opacity,transform,color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/38 hover:text-white md:right-8 ${
          inFilm ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{ top: "calc(var(--nav-h) + 0.75rem)" }}
      >
        See what we do
        <ArrowDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
      </button>

      <div
        aria-hidden
        className="relative h-[30vh] w-full bg-[linear-gradient(180deg,transparent_0%,color-mix(in_oklab,var(--background)_45%,transparent)_52%,var(--background)_100%)]"
        style={{ zIndex: "var(--z-content)" }}
      />
    </div>
  );
}
