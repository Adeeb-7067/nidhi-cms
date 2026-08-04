"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? false : { y: 18 }}
      animate={inView || reduced ? { y: 0 } : undefined}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Watermark({ text, className }: { text: string; className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        "pointer-events-none select-none font-deco text-[clamp(4rem,18vw,12rem)] leading-none text-foreground/8",
        className,
      )}
    >
      {text}
    </p>
  );
}

export function MetricTicker({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = usePrefersReducedMotion();
  return (
    <div ref={ref} className="min-w-[7.5rem]">
      <motion.div
        className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-none tracking-tight text-foreground"
        style={accent ? { color: accent } : undefined}
        initial={reduced ? false : { y: 12 }}
        animate={inView || reduced ? { y: 0 } : undefined}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {value}
      </motion.div>
      <div className="mt-2 text-meta text-muted-foreground">{label}</div>
    </div>
  );
}

/** Neural / particle field for AI experiences */
export function ParticleField({ accent = "#2B6BFF" }: { accent?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      r: 1 + Math.random() * 1.8,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          if (dist < 140) {
            ctx.strokeStyle = accent;
            ctx.globalAlpha = (1 - dist / 140) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      for (const p of particles) {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [accent, reduced]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" aria-hidden />;
}

/** Cloud stack layers */
export function CloudStack({ accent = "#00D9FF" }: { accent?: string }) {
  const layers = ["Edge", "CDN", "Compute", "Data", "Control plane"];
  return (
    <div className="relative mx-auto w-full max-w-md perspective-[1200px]">
      {layers.map((label, i) => (
        <motion.div
          key={label}
          className="relative mb-3 rounded-2xl border border-border bg-muted px-5 py-4 backdrop-blur-md"
          style={{
            transform: `translateZ(${i * 18}px) translateY(${i * -6}px)`,
            boxShadow: `0 20px 40px -24px ${accent}66`,
          }}
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-[22px]">{label}</span>
            <span className="text-meta text-muted-foreground">L{i}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
              initial={{ width: 0 }}
              whileInView={{ width: `${70 - i * 8}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Security scan grid */
export function ScanGrid({ accent = "#00C853" }: { accent?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-border bg-surface-2">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {!reduced ? (
        <motion.div
          className="absolute inset-x-0 h-28"
          style={{
            background: `linear-gradient(180deg, transparent, ${accent}66, transparent)`,
            boxShadow: `0 0 40px ${accent}44`,
          }}
          animate={{ top: ["-25%", "105%"] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: [0.45, 0.05, 0.55, 0.95] }}
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative flex h-40 w-40 items-center justify-center rounded-full border"
          style={{ borderColor: `${accent}66`, boxShadow: `0 0 60px ${accent}44` }}
          animate={reduced ? undefined : { scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="h-24 w-24 rounded-full border border-dashed"
            style={{ borderColor: `${accent}55` }}
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
      <p className="absolute bottom-4 left-4 text-eyebrow" style={{ color: accent }}>
        Perimeter · Live
      </p>
    </div>
  );
}

/** Product lifecycle rail */
export function LifecycleRail({
  steps,
}: {
  steps?: { step: string; detail?: string }[];
}) {
  const items = steps?.length
    ? steps
    : [
        { step: "Discover", detail: "Gate · review · artifact" },
        { step: "Design", detail: "Gate · review · artifact" },
        { step: "Build", detail: "Gate · review · artifact" },
        { step: "Ship", detail: "Gate · review · artifact" },
        { step: "Operate", detail: "Gate · review · artifact" },
      ];
  return (
    <div className="relative overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex min-w-[720px] gap-3">
        {items.map((item, i) => (
          <motion.div
            key={item.step}
            className="relative flex-1 rounded-2xl border border-border bg-surface-2 p-5"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
          >
            <span className="text-meta text-brand-orange">0{i + 1}</span>
            <div className="mt-2 font-display text-[26px]">{item.step}</div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {item.detail ?? "Gate · review · artifact"}
            </p>
            {i < items.length - 1 ? (
              <span className="absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-border md:block" />
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Pointer-aware glow panel */
export function GlowPanel({
  children,
  className,
  accent = "#2B6BFF",
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 40 });

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden rounded-[28px] border border-border bg-surface", className)}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setPos({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-[background] duration-200"
        style={{
          background: `radial-gradient(500px 280px at ${pos.x}% ${pos.y}%, ${accent}33, transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export function FaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const active = open === i;
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpen(active ? -1 : i)}
            className="w-full rounded-2xl border border-border bg-muted px-5 py-4 text-left transition-[border-color,background-color] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-border hover:bg-muted"
            aria-expanded={active}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-display text-[22px] md:text-[26px] leading-tight">{item.q}</span>
              <motion.span
                className="text-meta text-muted-foreground"
                animate={{ rotate: active ? 45 : 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                +
              </motion.span>
            </div>
            <motion.div
              initial={false}
              animate={{
                height: active ? "auto" : 0,
                opacity: active ? 1 : 0,
                filter: active ? "blur(0px)" : "blur(4px)",
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <p className="pt-3 xp-prose-sm">{item.a}</p>
            </motion.div>
          </button>
        );
      })}
    </div>
  );
}

export function TechOrbit({ nodes, accent = "#00D9FF" }: { nodes: string[]; accent?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-lg">
      <motion.div
        className="absolute inset-[18%] rounded-full border border-dashed border-border"
        style={{ boxShadow: `inset 0 0 80px ${accent}22` }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-[36%] rounded-full border border-border bg-muted backdrop-blur" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-eyebrow text-muted-foreground">Core</span>
      </div>
      {nodes.slice(0, 8).map((node, i) => {
        const angle = (i / Math.min(nodes.length, 8)) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 38;
        const y = 50 + Math.sin(angle) * 38;
        return (
          <motion.div
            key={node}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-meta text-secondary-foreground backdrop-blur"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.08, borderColor: accent }}
          >
            {node}
          </motion.div>
        );
      })}
    </div>
  );
}
