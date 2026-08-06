"use client";

import { useMemo, useState } from "react";
import { ecosystemGroups, ecosystemNodes } from "@/data/digital";
import { quantize } from "@/lib/utils";
import { DigitalSection, RevealHeading } from "./primitives";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

const RADIUS = 39;
const CENTER = 50;

/**
 * §9 — The full service surface as one graph. Hovering a node lifts it and its
 * dependencies and drops everything else back, which makes the "one ecosystem"
 * claim legible instead of asserted.
 */
export function ServicesEcosystem() {
  const [hovered, setHovered] = useState<string | null>(null);
  /**
   * Click pins a node. Hover alone was a false affordance: these are `<button>`s,
   * so clicking implied an action that did nothing, and on touch laptops and
   * tablets — which do get this graph, since it is gated at `md:` rather than by
   * pointer type — the whole reveal mechanic was unreachable.
   */
  const [pinned, setPinned] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const active = pinned ?? hovered;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    ecosystemNodes.forEach((node, i) => {
      const angle = (i / ecosystemNodes.length) * Math.PI * 2 - Math.PI / 2;
      map.set(node.id, {
        x: quantize(CENTER + Math.cos(angle) * RADIUS),
        y: quantize(CENTER + Math.sin(angle) * RADIUS),
      });
    });
    return map;
  }, []);

  const edges = useMemo(() => {
    const seen = new Set<string>();
    const list: { a: string; b: string }[] = [];
    for (const node of ecosystemNodes) {
      for (const target of node.links) {
        const key = [node.id, target].sort().join("-");
        if (seen.has(key) || !positions.has(target)) continue;
        seen.add(key);
        list.push({ a: node.id, b: target });
      }
    }
    return list;
  }, [positions]);

  const related = useMemo(() => {
    if (!active) return null;
    const node = ecosystemNodes.find((n) => n.id === active);
    return new Set([active, ...(node?.links ?? [])]);
  }, [active]);

  return (
    <DigitalSection
      id="ecosystem"
      className="py-[clamp(5rem,10vw,9rem)]"
      tone="raised"
      atmosphere={
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 45%, color-mix(in oklab, var(--brand-purple) 12%, transparent), transparent 65%)",
          }}
        />
      }
    >
      <div className="mx-auto max-w-2xl text-center">
        <RevealHeading
          text="Capabilities that drive transformation."
          accentFrom={1}
          className="text-[clamp(2.1rem,4.6vw,3.5rem)]"
        />
        <p className="mx-auto mt-5 max-w-[54ch] text-body">
          Select any capability to see what it depends on and what it feeds. Nothing is sold in
          isolation — every engineering surface exists to move a business outcome.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {Object.entries(ecosystemGroups).map(([key, group]) => (
          <span key={key} className="flex items-center gap-2 text-small">
            <span className="h-2 w-2 rounded-full" style={{ background: group.color }} />
            {group.label}
          </span>
        ))}
      </div>

      {/* Graph — pointer surfaces only */}
      <div className="relative mx-auto mt-10 hidden aspect-square w-full max-w-[620px] md:block">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden
          shapeRendering="geometricPrecision"
        >
          {edges.map(({ a, b }) => {
            const pa = positions.get(a)!;
            const pb = positions.get(b)!;
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const cx = quantize(CENTER + (mx - CENTER) * 0.24);
            const cy = quantize(CENTER + (my - CENTER) * 0.24);
            const lit = related ? related.has(a) && related.has(b) : false;
            return (
              <path
                key={`${a}-${b}`}
                d={`M ${pa.x} ${pa.y} Q ${cx} ${cy} ${pb.x} ${pb.y}`}
                fill="none"
                stroke={lit ? "#00D9FF" : "var(--muted-foreground)"}
                strokeWidth={lit ? 0.42 : 0.16}
                opacity={related ? (lit ? 0.9 : 0.07) : 0.24}
                style={{ transition: "opacity 0.45s ease, stroke-width 0.45s ease" }}
              />
            );
          })}
          <circle cx={CENTER} cy={CENTER} r={11} fill="var(--surface)" stroke="var(--border)" strokeWidth={0.3} />
        </svg>

        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-display text-[1.05rem] leading-tight tracking-[-0.02em] text-foreground">
            Satyakabir
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            One partner
          </p>
        </div>

        {ecosystemNodes.map((node) => {
          const pos = positions.get(node.id)!;
          const group = ecosystemGroups[node.group];
          const dim = related ? !related.has(node.id) : false;
          const focused = active === node.id;
          return (
            <button
              key={node.id}
              type="button"
              aria-pressed={pinned === node.id}
              onClick={() => setPinned((prev) => (prev === node.id ? null : node.id))}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(node.id)}
              onBlur={() => setHovered(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[color-mix(in_oklab,var(--surface)_96%,var(--background))] px-4 py-2"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                borderColor: focused ? group.color : "var(--border)",
                opacity: dim ? 0.28 : 1,
                boxShadow: focused ? `0 0 0 1px ${group.color}, 0 18px 44px -22px ${group.color}` : undefined,
                transform: `translate(-50%, -50%) scale(${focused && !reduced ? 1.1 : 1})`,
                transition:
                  "opacity 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <span className="whitespace-nowrap font-display text-[0.95rem] tracking-[-0.02em] text-foreground">
                {node.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact grouping for small screens */}
      <div className="mt-10 grid gap-4 md:hidden">
        {Object.entries(ecosystemGroups).map(([key, group]) => (
          <div key={key} className="rounded-2xl border border-border bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: group.color }} />
              <h3 className="text-card-title text-foreground">{group.label}</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ecosystemNodes
                .filter((node) => node.group === key)
                .map((node) => (
                  <span
                    key={node.id}
                    className="rounded-full border border-border px-3 py-1.5 text-[13px] text-secondary-foreground"
                  >
                    {node.label}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </DigitalSection>
  );
}
