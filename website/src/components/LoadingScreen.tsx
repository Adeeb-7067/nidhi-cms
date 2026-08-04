"use client";

import { Logo } from "@/components/brand/Logo";

interface LoadingScreenProps {
  progress: number;
  isLoaded: boolean;
}

export function LoadingScreen({ progress, isLoaded }: LoadingScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-[var(--z-loader)] flex flex-col items-center justify-center bg-[#020305] transition-[opacity,filter] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isLoaded ? "pointer-events-none opacity-0 blur-sm" : "opacity-100 blur-0"
      }`}
      aria-hidden={isLoaded}
    >
      <div className="noise-overlay absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(43,107,255,0.32) 0%, rgba(0,217,255,0.1) 38%, transparent 70%)",
            animation: "float 8s ease-in-out infinite alternate",
          }}
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-[2px]"
            style={{
              top: `${40 + i * 3}%`,
              left: `${54 + i * 2.2}%`,
              background: ["#2B6BFF", "#00C853", "#FF8A00", "#00D9FF", "#7649FF"][i],
              animation: `pixel-drift ${2.2 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
              boxShadow: `0 0 12px ${["#2B6BFF", "#00C853", "#FF8A00", "#00D9FF", "#7649FF"][i]}88`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center px-6">
        <Logo
          size="xl"
          priority
          className="mb-6 scale-100 drop-shadow-[0_0_48px_rgba(43,107,255,0.5)] transition-transform duration-700"
        />
        <p className="mb-2 font-deco text-[18px] tracking-[0.1em] text-white/85 md:text-[22px]">
          SATYAKABIR
        </p>
        <p className="text-eyebrow mb-10 text-muted-foreground">Technologies</p>

        <div className="h-[2px] w-[240px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#2B6BFF,#00D9FF)] shadow-[0_0_16px_rgba(0,217,255,0.45)] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-meta mt-4 text-white/45">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}
