"use client";

import { memo } from "react";
import { atmospheres, getActiveChapter, type AtmosphereId } from "@/data/cinematic";

const AtmosphereVisual = memo(function AtmosphereVisual({
  atmosphereId,
}: {
  atmosphereId: AtmosphereId;
}) {
  const atm = atmospheres[atmosphereId];

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-aurora)] overflow-hidden contain-strict">
      {/* Tint only — heavy glow/vignette was fogging the film vs the raw MP4. */}
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: `
            radial-gradient(42% 32% at 14% 8%, ${atm.glow} 0%, transparent 70%),
            radial-gradient(38% 28% at 92% 92%, ${atm.wash} 0%, transparent 72%)
          `,
          opacity: 0.32,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 90% at 50% 45%, transparent 62%, rgba(2,3,5,0.06) 100%)",
        }}
      />
    </div>
  );
});

export function AtmosphereLayer({
  currentFrame,
  hidden,
}: {
  currentFrame: number;
  /** Fully covered by the digital act — skip painting four gradient layers. */
  hidden?: boolean;
}) {
  const atmosphereId = getActiveChapter(currentFrame).atmosphere as AtmosphereId;
  if (hidden) return null;
  return <AtmosphereVisual atmosphereId={atmosphereId} />;
}
