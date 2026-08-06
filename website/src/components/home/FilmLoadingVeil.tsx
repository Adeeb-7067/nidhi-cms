"use client";

import { Logo } from "@/components/brand/Logo";

/**
 * The film's loading state.
 *
 * The film opens the page, so this covers the viewport while the scrub asset
 * decodes — a half-drawn canvas as the first impression is worse than a held
 * brand frame with honest progress.
 *
 * Deliberately `pointer-events-none`: if the asset stalls or fails, the visitor
 * can still scroll straight past to the business case underneath instead of
 * being trapped behind a loader that never resolves.
 *
 * `visibility` is transitioned alongside opacity so the veil leaves the paint
 * path once it has faded, rather than sitting invisible over every section for
 * the rest of the session.
 */
export function FilmLoadingVeil({
  progress,
  isLoaded,
  active,
}: {
  progress: number;
  isLoaded: boolean;
  /** Film is on or near screen — no point announcing progress otherwise. */
  active: boolean;
}) {
  const visible = active && !isLoaded;

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#020305] transition-[opacity,visibility] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "visible opacity-100" : "invisible opacity-0"
      }`}
      style={{ zIndex: "var(--z-loader)" }}
    >
      <Logo size="lg" className="opacity-90" />
      <div className="flex flex-col items-center gap-3">
        <p className="text-meta text-white/50">Preparing the tour</p>
        <div className="h-[2px] w-[200px] overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#2B6BFF,#00D9FF)] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
