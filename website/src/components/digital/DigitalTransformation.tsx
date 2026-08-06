"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { transformationFlow } from "@/data/digital";
import { AuroraField, DigitalSection, GridPlate, RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

type Point = { x: number; y: number };

/** Cubic smoothing through node centres — control points sit on the x-midpoint. */
function smoothPath(points: Point[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const mx = (prev.x + curr.x) / 2;
    d += ` C ${mx.toFixed(1)} ${prev.y.toFixed(1)}, ${mx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(
      1,
    )} ${curr.y.toFixed(1)}`;
  }
  return d;
}

/**
 * The customer journey — assessment through continuous innovation.
 * Nodes flow in document order and an SVG spine is measured from their real
 * positions, so the connection survives any wrap at any breakpoint.
 */
export function DigitalTransformation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLLIElement | null)[]>([]);
  const pathRef = useRef<SVGPathElement>(null);
  const [path, setPath] = useState("");
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [length, setLength] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const inView = useInView(containerRef, { once: true, margin: "-20% 0px" });
  const reduced = usePrefersReducedMotion();

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const points = nodeRefs.current
      .filter((n): n is HTMLLIElement => Boolean(n))
      .map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
      });
    setBox({ w: base.width, h: base.height });
    setPath(smoothPath(points));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    window.addEventListener("resize", measure);
    // Web fonts settle after hydration and shift chip widths.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    if (!path || !pathRef.current) return;
    setLength(pathRef.current.getTotalLength());
  }, [path]);

  const drawn = reduced || inView;

  return (
    <DigitalSection
      id="transformation"
      className="py-[clamp(5.5rem,11vw,10rem)]"
      tone="base"
      atmosphere={
        <>
          <AuroraField tint="#7649FF" secondary="#00D9FF" intensity={1.15} />
          <GridPlate size={72} />
        </>
      }
    >
      <div className="mx-auto max-w-3xl text-center">
        <RevealHeading
          text="The transformation journey."
          accentFrom={1}
          className="text-[clamp(2.5rem,6.5vw,5rem)] leading-[0.95]"
        />
        <p className="mx-auto mt-6 max-w-[58ch] text-body">
          One continuous path from business challenge to continuous innovation — assessment,
          strategy, architecture, engineering, deployment, and optimization as a single practice.
        </p>
      </div>

      <div ref={containerRef} className="relative mt-16 md:mt-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${box.w || 1} ${box.h || 1}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="flow-spine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2B6BFF" />
              <stop offset="45%" stopColor="#7649FF" />
              <stop offset="75%" stopColor="#00D9FF" />
              <stop offset="100%" stopColor="#00C853" />
            </linearGradient>
            <filter id="flow-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            ref={pathRef}
            d={path}
            fill="none"
            stroke="url(#flow-spine)"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.35}
            style={
              length
                ? {
                    strokeDasharray: length,
                    strokeDashoffset: drawn ? 0 : length,
                    transition: reduced ? undefined : "stroke-dashoffset 2.4s cubic-bezier(0.16,1,0.3,1)",
                  }
                : undefined
            }
          />
          {!reduced && drawn && path ? (
            <path
              d={path}
              fill="none"
              stroke="url(#flow-spine)"
              strokeWidth={2.5}
              strokeLinecap="round"
              filter="url(#flow-glow)"
              style={{
                strokeDasharray: "26 134",
                animation: "flow-dash 3.2s linear infinite",
              }}
            />
          ) : null}
        </svg>

        <ol className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8">
          {transformationFlow.map((stage, i) => {
            const last = i === transformationFlow.length - 1;
            const dimmed = active !== null && active !== i;
            return (
              <li
                key={stage.id}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                data-reveal={drawn ? "shown" : "pending"}
                className="group relative"
                style={
                  {
                    "--reveal-from": "translateY(14px)",
                    "--reveal-delay": `${i * 90}ms`,
                  } as React.CSSProperties
                }
              >
                <div
                  className={[
                    "relative flex flex-col items-center gap-1 rounded-2xl border bg-[color-mix(in_oklab,var(--surface)_96%,var(--background))] px-5 py-4 text-center",
                    "transition-[transform,border-color,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5",
                    last ? "px-7 py-5" : "",
                  ].join(" ")}
                  style={{
                    borderColor: `${stage.accent}3d`,
                    boxShadow: `0 22px 60px -34px ${stage.accent}cc`,
                    opacity: dimmed ? 0.45 : 1,
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(120% 120% at 50% 0%, ${stage.accent}26, transparent 70%)`,
                    }}
                  />
                  <span
                    className={[
                      "relative font-display tracking-[-0.02em] text-foreground",
                      last
                        ? "text-[clamp(1.15rem,2.2vw,1.6rem)]"
                        : "text-[clamp(0.95rem,1.5vw,1.15rem)]",
                    ].join(" ")}
                  >
                    {stage.label}
                  </span>
                  <span className="relative text-[11px] tracking-[0.04em] text-muted-foreground">
                    {stage.note}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </DigitalSection>
  );
}
