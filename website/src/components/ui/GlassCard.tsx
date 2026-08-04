"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  style?: React.CSSProperties;
};

export function GlassCard({
  children,
  className,
  interactive = true,
  style,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    ref.current.style.setProperty("--spot-x", `${x}%`);
    ref.current.style.setProperty("--spot-y", `${y}%`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      style={style}
      className={cn(
        "glass-panel relative overflow-hidden rounded-[22px]",
        interactive && "group transition-transform duration-500 ease-out hover:-translate-y-1",
        className,
      )}
    >
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--spot-x,50%) var(--spot-y,50%), rgba(43,107,255,0.18), transparent 55%)",
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
