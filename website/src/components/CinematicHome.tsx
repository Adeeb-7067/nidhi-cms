"use client";

import { useFrameScrubber } from "@/hooks/useFrameScrubber";
import { useLenis } from "@/hooks/useLenis";
import { CinematicCanvas } from "@/components/CinematicCanvas";
import { ScrollScrubber } from "@/components/ScrollScrubber";
import { PremiumNavbar } from "@/components/nav/PremiumNavbar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AtmosphereLayer } from "@/components/AtmosphereLayer";
import { ChapterProgress } from "@/components/ChapterProgress";

export default function CinematicHome() {
  useLenis();
  const { canvasRef, currentFrame, setCurrentFrame, totalFrames, isLoaded, loadProgress } =
    useFrameScrubber();

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-primary/30 selection:text-white">
      <LoadingScreen progress={loadProgress} isLoaded={isLoaded} />
      <AtmosphereLayer currentFrame={currentFrame} />
      <PremiumNavbar variant="cinematic" currentFrame={currentFrame} />
      <CinematicCanvas canvasRef={canvasRef} />
      <ScrollScrubber
        currentFrame={currentFrame}
        setCurrentFrame={setCurrentFrame}
        totalFrames={totalFrames}
        isLoaded={isLoaded}
      />
      <ChapterProgress currentFrame={currentFrame} isLoaded={isLoaded} />
    </div>
  );
}
