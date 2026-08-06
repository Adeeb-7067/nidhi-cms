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
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: `
            radial-gradient(55% 45% at 18% 12%, ${atm.glow} 0%, transparent 70%),
            radial-gradient(50% 40% at 88% 88%, ${atm.wash} 0%, transparent 72%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-40 transition-[background] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: `linear-gradient(118deg, transparent 22%, ${atm.glow} 48%, transparent 74%)`,
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px opacity-50 transition-[background] duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${atm.accent}55, transparent)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 42%, transparent 40%, rgba(2,3,5,0.28) 100%)",
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
