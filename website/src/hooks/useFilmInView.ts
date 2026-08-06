"use client";

import { useEffect, useState } from "react";

/**
 * True while the cinematic film track is on (or near) screen.
 *
 * The film opens the page but the page is much longer than the film, so this is
 * a window rather than a one-way threshold: the fixed fullscreen canvas and
 * atmosphere must drop out once the business sections cover them, and come back
 * if the visitor scrolls up into the tour again. Left mounted, they sit behind
 * every section below burning paint for nothing.
 *
 * IntersectionObserver deliberately, not scroll maths — the scrubber writes
 * styles every animation frame, and a scroll handler that reads layout would
 * force a synchronous reflow per frame and stutter the film.
 */
export function useFilmInView(rootMargin = "60% 0px 60% 0px") {
  // Starts true because the film opens the page: the canvas, atmosphere, and
  // loading veil all need to be present on the very first paint. Seeding false
  // would blank the opening frame for a tick while the observer reported in.
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const track = document.querySelector<HTMLElement>("[data-film-track]");
    if (!track) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(track);
    return () => observer.disconnect();
  }, [rootMargin]);

  return inView;
}
