"use client";

import { cn } from "@/lib/utils";

interface CinematicCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /**
   * Drop the fullscreen layer once the digital act covers it. The bitmap is
   * retained, so scrolling back up shows the held frame immediately.
   */
  hidden?: boolean;
}

export function CinematicCanvas({ canvasRef, hidden }: CinematicCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "fixed top-0 left-0 w-full h-full z-0 pointer-events-none bg-black",
        hidden && "invisible",
      )}
      aria-hidden
    />
  );
}
