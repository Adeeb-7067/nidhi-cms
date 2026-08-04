"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { springSoft } from "@/lib/motion";

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees */
  maxTilt?: number;
  glare?: boolean;
};

/** Cursor-aware depth card — transform only (GPU). */
export function TiltCard({
  children,
  className,
  maxTilt = 7,
  glare = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const springRx = useSpring(rx, springSoft);
  const springRy = useSpring(ry, springSoft);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgba(255,255,255,0.16), transparent 55%)`;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * maxTilt * 2);
    rx.set((0.5 - py) * maxTilt * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("group relative transform-gpu will-change-transform [perspective:1000px]", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: springRx,
        rotateY: springRy,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
      {glare ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      ) : null}
    </motion.div>
  );
}
