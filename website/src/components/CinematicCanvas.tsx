"use client";

interface CinematicCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function CinematicCanvas({ canvasRef }: CinematicCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none bg-black"
      aria-hidden
    />
  );
}
