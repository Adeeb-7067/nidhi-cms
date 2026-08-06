"use client";

import { useEffect, useRef, useState } from "react";
import { presenceMarkers, presenceStats } from "@/data/digital";
import { DigitalSection, RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

const R = 150;
const CX = 180;
const CY = 180;
const TILT = (18 * Math.PI) / 180;
const HUB = presenceMarkers.find((m) => m.hub) ?? presenceMarkers[0];

type Projected = { x: number; y: number; z: number };

/** Orthographic projection with a fixed tilt and an animated longitude offset. */
function project(latDeg: number, lngDeg: number, lambda: number): Projected {
  const phi = (latDeg * Math.PI) / 180;
  const theta = (lngDeg * Math.PI) / 180 - lambda;
  const cosPhi = Math.cos(phi);
  return {
    x: CX + R * cosPhi * Math.sin(theta),
    y: CY - R * (Math.cos(TILT) * Math.sin(phi) - Math.sin(TILT) * cosPhi * Math.cos(theta)),
    z: Math.sin(TILT) * Math.sin(phi) + Math.cos(TILT) * cosPhi * Math.cos(theta),
  };
}

function graticulePath(kind: "lat" | "lng", value: number, lambda: number) {
  const points: string[] = [];
  let pen = false;
  for (let i = 0; i <= 72; i++) {
    const t = -90 + (i / 72) * 180;
    const p = kind === "lat" ? project(value, t * 2, lambda) : project(t, value, lambda);
    if (p.z <= 0) {
      pen = false;
      continue;
    }
    points.push(`${pen ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    pen = true;
  }
  return points.join(" ");
}

const LATITUDES = [-60, -30, 0, 30, 60];
const LONGITUDES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];

/**
 * §8 — Rotating wireframe globe with live delivery arcs from the Bengaluru hub.
 * Geometry is written straight to the DOM inside the frame loop, so a 60fps
 * rotation never triggers a React render.
 */
export function GlobalPresence() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = usePrefersReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  // Read inside the frame loop without restarting it on every hover.
  const hoveredRef = useRef<string | null>(null);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let raf = 0;
    const start = performance.now();

    const render = (lambda: number) => {
      LATITUDES.forEach((lat, i) => {
        svg
          .querySelector(`[data-lat="${i}"]`)
          ?.setAttribute("d", graticulePath("lat", lat, lambda));
      });
      LONGITUDES.forEach((lng, i) => {
        svg
          .querySelector(`[data-lng="${i}"]`)
          ?.setAttribute("d", graticulePath("lng", lng, lambda));
      });

      const hub = project(HUB.lat, HUB.lng, lambda);

      presenceMarkers.forEach((marker, i) => {
        const p = project(marker.lat, marker.lng, lambda);
        const group = svg.querySelector(`[data-marker="${i}"]`) as SVGGElement | null;
        if (group) {
          group.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          const front = p.z > 0.04;
          const focused = hoveredRef.current === marker.city;
          group.setAttribute(
            "opacity",
            front ? (focused || !hoveredRef.current ? "1" : "0.35") : "0",
          );
        }

        const arc = svg.querySelector(`[data-arc="${i}"]`) as SVGPathElement | null;
        if (!arc) return;
        if (marker.hub || p.z <= 0.04 || hub.z <= 0.04) {
          arc.setAttribute("opacity", "0");
          return;
        }
        // Bow the connection away from the sphere centre so it reads as an arc.
        const mx = (hub.x + p.x) / 2;
        const my = (hub.y + p.y) / 2;
        const dx = mx - CX;
        const dy = my - CY;
        const len = Math.hypot(dx, dy) || 1;
        const lift = 34 + len * 0.28;
        arc.setAttribute(
          "d",
          `M ${hub.x.toFixed(1)} ${hub.y.toFixed(1)} Q ${(mx + (dx / len) * lift).toFixed(1)} ${(
            my +
            (dy / len) * lift
          ).toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        );
        const focused = hoveredRef.current === marker.city;
        arc.setAttribute("opacity", focused ? "0.95" : hoveredRef.current ? "0.18" : "0.5");
      });
    };

    if (reduced) {
      render(-0.9);
      return;
    }

    const loop = (now: number) => {
      render(-0.9 + ((now - start) / 1000) * 0.085);
      raf = requestAnimationFrame(loop);
    };

    // Hold the rotation while the globe is off screen.
    let running = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(svg);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [reduced]);

  return (
    <DigitalSection
      id="global"
      className="py-[clamp(5rem,10vw,9rem)]"
      tone="deep"
      atmosphere={
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 55% at 68% 45%, rgba(0,217,255,0.13), transparent 62%), radial-gradient(45% 40% at 20% 80%, rgba(43,107,255,0.12), transparent 65%)",
          }}
        />
      }
    >
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <RevealHeading
            text="Global delivery. Local accountability."
            accentFrom={1}
            className="text-[clamp(2.1rem,4.6vw,3.5rem)]"
          />
          <p className="mt-5 max-w-[48ch] text-body">
            Engineering hubs and delivery cover across countries and timezones — so transformation
            programmes keep moving when the business never sleeps.
          </p>

          <ul className="mt-10 divide-y divide-[var(--divider)] border-y border-divider">
            {presenceMarkers.map((marker) => (
              <li key={marker.city}>
                <button
                  type="button"
                  onMouseEnter={() => setHovered(marker.city)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(marker.city)}
                  onBlur={() => setHovered(null)}
                  className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors duration-300 hover:text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="h-1.5 w-1.5 rounded-full transition-transform duration-300"
                      style={{
                        background: marker.hub ? "#00D9FF" : "#2B6BFF",
                        transform: hovered === marker.city ? "scale(2.2)" : "scale(1)",
                      }}
                    />
                    <span className="font-display text-[1.05rem] tracking-[-0.02em] text-foreground">
                      {marker.country}
                    </span>
                  </span>
                  <span className="text-small">{marker.detail}</span>
                </button>
              </li>
            ))}
          </ul>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {presenceStats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-none text-foreground">
                  {stat.value}
                </dd>
                <p className="mt-1.5 text-meta">{stat.label}</p>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <svg
            ref={svgRef}
            viewBox="0 0 360 360"
            role="img"
            aria-label="Rotating globe showing Satyakabir delivery locations across India, the UAE, the United Kingdom, the United States, Singapore, and Australia"
            className="h-auto w-full"
          >
            <defs>
              <radialGradient id="globe-fill" cx="35%" cy="28%">
                <stop offset="0%" stopColor="#0d1b33" />
                <stop offset="70%" stopColor="#050912" />
                <stop offset="100%" stopColor="#02040a" />
              </radialGradient>
              <linearGradient id="arc-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00D9FF" />
                <stop offset="100%" stopColor="#2B6BFF" stopOpacity="0.15" />
              </linearGradient>
              <filter id="globe-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx={CX} cy={CY} r={R + 18} fill="none" stroke="rgba(0,217,255,0.12)" />
            <circle cx={CX} cy={CY} r={R} fill="url(#globe-fill)" />

            <g stroke="rgba(120,175,255,0.22)" strokeWidth={0.7} fill="none">
              {LATITUDES.map((_, i) => (
                <path key={`lat-${i}`} data-lat={i} />
              ))}
              {LONGITUDES.map((_, i) => (
                <path key={`lng-${i}`} data-lng={i} />
              ))}
            </g>

            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="rgba(0,217,255,0.42)"
              strokeWidth={1.1}
            />

            <g fill="none" stroke="url(#arc-stroke)" strokeWidth={1.4} strokeLinecap="round">
              {presenceMarkers.map((marker, i) => (
                <path key={`arc-${marker.city}`} data-arc={i} opacity={0} />
              ))}
            </g>

            {presenceMarkers.map((marker, i) => (
              <g key={marker.city} data-marker={i} opacity={0} filter="url(#globe-glow)">
                <circle
                  r={marker.hub ? 5.5 : 3.5}
                  fill={marker.hub ? "#00D9FF" : "#8EB6FF"}
                  style={
                    reduced
                      ? undefined
                      : { animation: `orbit-pulse ${marker.hub ? 2.4 : 3.4}s ease-in-out infinite` }
                  }
                />
                <circle r={marker.hub ? 11 : 8} fill="none" stroke="#00D9FF" strokeOpacity={0.3} />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </DigitalSection>
  );
}
