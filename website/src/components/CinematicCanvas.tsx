"use client";

import { cn } from "@/lib/utils";

interface CinematicCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Native `<video>` surface — same decode path as opening the MP4 in a player. */
  nativeVideo?: boolean;
  /**
   * Drop the fullscreen layer once the digital act covers it. The held frame
   * stays on the element, so scrolling back up shows it immediately.
   */
  hidden?: boolean;
}

export function CinematicCanvas({
  canvasRef,
  videoRef,
  nativeVideo = false,
  hidden,
}: CinematicCanvasProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 bg-black",
        hidden && "invisible",
      )}
      aria-hidden
    >
      {/* Poster / reduced-motion JPG fallback only — not used once native video is live. */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          nativeVideo ? "invisible" : "visible",
        )}
      />
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          nativeVideo ? "visible" : "invisible",
        )}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        tabIndex={-1}
      />
    </div>
  );
}
