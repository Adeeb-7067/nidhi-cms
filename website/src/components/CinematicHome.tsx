"use client";

import { useFrameScrubber } from "@/hooks/useFrameScrubber";
import { useLenis } from "@/hooks/useLenis";
import { useFilmInView } from "@/hooks/useFilmInView";
import { CinematicCanvas } from "@/components/CinematicCanvas";
import { ScrollScrubber } from "@/components/ScrollScrubber";
import { PremiumNavbar } from "@/components/nav/PremiumNavbar";
import { FilmLoadingVeil } from "@/components/home/FilmLoadingVeil";
import { AtmosphereLayer } from "@/components/AtmosphereLayer";
import { ChapterProgress } from "@/components/ChapterProgress";
import { BusinessHero } from "@/components/home/BusinessHero";
import { FilmIsland } from "@/components/home/FilmIsland";
import { BusinessNarrative } from "@/components/home/BusinessNarrative";
import { SupportingNarrative } from "@/components/home/SupportingNarrative";
import { SiteFooter } from "@/components/nav/SiteFooter";

/**
 * Homepage composition.
 *
 * The film opens the page: first paint is the scrub canvas with the `arrival`
 * chapter over it. Everything the film cannot say — proof, outcomes, the service
 * surface, who vouches for us — follows it in one continuous read, with a bypass
 * inside the opening viewport for visitors who want the argument, not the tour.
 *
 * The fixed film canvas lives at `--z-canvas` behind everything. Sections are
 * opaque and sit at `--z-content`, so the canvas is only ever *seen* through the
 * transparent film track; `useFilmInView` additionally drops it out of the paint
 * path entirely once the film is nowhere near the viewport.
 */
export default function CinematicHome() {
  useLenis();
  const { canvasRef, currentFrame, setCurrentFrame, totalFrames, isLoaded, loadProgress } =
    useFrameScrubber();
  const filmInView = useFilmInView();

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 selection:text-white">
      <PremiumNavbar variant="cinematic" />

      <AtmosphereLayer currentFrame={currentFrame} hidden={!filmInView} />
      <CinematicCanvas canvasRef={canvasRef} hidden={!filmInView} />

      <FilmIsland>
        <ScrollScrubber
          currentFrame={currentFrame}
          setCurrentFrame={setCurrentFrame}
          totalFrames={totalFrames}
          isLoaded={isLoaded}
        />
      </FilmIsland>

      <BusinessHero />
      <BusinessNarrative />
      <SupportingNarrative />
      <SiteFooter />

      <FilmLoadingVeil progress={loadProgress} isLoaded={isLoaded} active={filmInView} />
      <ChapterProgress currentFrame={currentFrame} isLoaded={isLoaded} active={filmInView} />
    </div>
  );
}
