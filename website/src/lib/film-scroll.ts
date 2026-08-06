/**
 * The film is one act in the middle of the homepage, not the document itself:
 * business sections render above it and below it. So anything that jumps "to 20%
 * of the film" must measure the film track, never `document.scrollHeight` —
 * percentages of the document land somewhere arbitrary and silently drift every
 * time a section is added.
 *
 * The track is marked with `data-film-track`; on pages without one these helpers
 * fall back to whole-document behaviour.
 */

type Range = { top: number; distance: number };

export function filmTrackRange(): Range {
  if (typeof window === "undefined") return { top: 0, distance: 0 };
  const viewport = window.innerHeight;
  const track = document.querySelector<HTMLElement>("[data-film-track]");
  if (!track) {
    return {
      top: 0,
      distance: Math.max(0, document.documentElement.scrollHeight - viewport),
    };
  }
  return {
    top: track.getBoundingClientRect().top + window.scrollY,
    distance: Math.max(0, track.offsetHeight - viewport),
  };
}

/** `fraction` is 0–1 along the film. */
export function scrollToFilmFraction(fraction: number, behavior: ScrollBehavior = "smooth") {
  const { top, distance } = filmTrackRange();
  const clamped = Math.min(1, Math.max(0, fraction));
  window.scrollTo({ top: top + distance * clamped, behavior });
}

/** `percentage` is 0–100 along the film. */
export function scrollToFilmPct(percentage: number, behavior: ScrollBehavior = "smooth") {
  scrollToFilmFraction(percentage / 100, behavior);
}

/**
 * Jump to a section by id, accounting for the fixed navbar.
 *
 * Prefer this over `scrollIntoView` (which tucks headings under the bar) and over
 * document-percentage maths, which breaks the moment the page grows.
 */
export function scrollToId(id: string, behavior: ScrollBehavior = "smooth") {
  if (typeof window === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;
  const NAV_OFFSET = 84;
  const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

/**
 * For "is the film on screen?" use the `useFilmInView` hook. Never call
 * `filmTrackRange()` from a scroll handler — it reads layout, and the scrubber
 * writes styles every frame, so the pair forces a synchronous reflow per frame
 * and visibly stutters the film.
 */
