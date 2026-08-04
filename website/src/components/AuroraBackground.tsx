"use client";

interface AuroraBackgroundProps {
  /** Quieter wash so the film stays sharp and saturated */
  subtle?: boolean;
}

export function AuroraBackground({ subtle = false }: AuroraBackgroundProps) {
  if (subtle) {
    return (
      <div className="fixed inset-0 z-[var(--z-aurora)] pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(115deg, rgba(2,3,5,0.15) 0%, transparent 42%, rgba(2,3,5,0.2) 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[var(--z-aurora)] pointer-events-none overflow-hidden noise-overlay">
      <div
        className="absolute -top-[18%] -left-[12%] w-[65vw] max-w-[860px] aspect-square rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(43,107,255,0.32) 0%, rgba(0,217,255,0.08) 45%, transparent 70%)",
          animation: "float 11s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -bottom-[12%] -right-[10%] w-[55vw] max-w-[720px] aspect-square rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(0,200,83,0.22) 0%, rgba(118,73,255,0.1) 50%, transparent 70%)",
          animation: "float 13s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="absolute top-[30%] left-[45%] w-[36vw] max-w-[480px] aspect-square rounded-full blur-3xl opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(255,138,0,0.2) 0%, transparent 70%)",
          animation: "float 15s ease-in-out infinite",
        }}
      />

      <div
        className="absolute inset-y-0 left-1/2 w-[55%] -translate-x-1/2 opacity-30"
        style={{
          background:
            "linear-gradient(105deg, transparent, rgba(43,107,255,0.12), rgba(0,217,255,0.08), transparent)",
          animation: "ray-sweep 14s ease-in-out infinite",
        }}
      />

      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-[2px]"
          style={{
            top: `${14 + (i % 4) * 18}%`,
            left: `${58 + (i % 5) * 5}%`,
            background: ["#2B6BFF", "#00C853", "#FF8A00", "#00D9FF", "#7649FF", "#2B6BFF", "#00C853", "#FF8A00"][
              i
            ],
            animation: `pixel-drift ${2.8 + i * 0.35}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
