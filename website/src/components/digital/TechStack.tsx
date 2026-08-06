"use client";

import { useId, useState } from "react";
import { stackLayers } from "@/data/digital";
import { DigitalSection, RevealHeading } from "./primitives";

/**
 * §8 — Technology stack as an argument, not a logo wall.
 *
 * Every agency shows the same badges, so recognition proves nothing. Selecting a
 * tool reveals the decision behind it, which is the part a CTO is actually
 * evaluating.
 *
 * Driven by click and keyboard rather than hover: the previous graph section
 * taught us that hover-only reveals are dead weight on touch laptops and
 * tablets, which are a real share of enterprise traffic.
 */
export function TechStack() {
  const [layerId, setLayerId] = useState(stackLayers[0].id);
  const [toolName, setToolName] = useState(stackLayers[0].tools[0].name);
  const panelId = useId();

  const layer = stackLayers.find((l) => l.id === layerId) ?? stackLayers[0];
  const tool = layer.tools.find((t) => t.name === toolName) ?? layer.tools[0];

  const selectLayer = (id: string) => {
    const next = stackLayers.find((l) => l.id === id);
    if (!next) return;
    setLayerId(id);
    setToolName(next.tools[0].name);
  };

  // Light island: the densest reading on the page, and it gives the post-film
  // half its own bright beat.
  return (
    <DigitalSection id="stack" className="py-[clamp(5rem,10vw,9rem)]" tone="light">
      <div className="max-w-3xl">
        <RevealHeading
          text="The stack — chosen for transformation."
          accentFrom={2}
          className="text-[clamp(2.1rem,4.6vw,3.4rem)]"
        />
        <p className="mt-5 max-w-[62ch] text-body">
          Frontend, backend, cloud, data, AI, DevOps, and security — each tool is here because it
          helps businesses modernize, automate, and scale. Choose a layer, then any tool for why.
        </p>
      </div>

      {/* Layer selector */}
      <div
        role="tablist"
        aria-label="Technology layers"
        className="mt-11 flex flex-wrap gap-2.5"
      >
        {stackLayers.map((item) => {
          const selected = item.id === layer.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${panelId}-${item.id}`}
              onClick={() => selectLayer(item.id)}
              className="rounded-full border px-5 py-2.5 text-label transition-[color,border-color,background-color] duration-400"
              style={{
                borderColor: selected ? item.accent : "var(--border)",
                background: selected
                  ? `color-mix(in oklab, ${item.accent} 12%, transparent)`
                  : "transparent",
                color: selected ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${panelId}-${layer.id}`}
        role="tabpanel"
        aria-label={layer.label}
        className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-14"
      >
        <div>
          <p className="text-[1.05rem] leading-relaxed text-secondary-foreground">
            {layer.premise}
          </p>

          <ul className="mt-7 flex flex-wrap gap-2">
            {layer.tools.map((item) => {
              const selected = item.name === tool.name;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setToolName(item.name)}
                    className="rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-[color,border-color,background-color] duration-300"
                    style={{
                      borderColor: selected ? layer.accent : "var(--border)",
                      background: selected
                        ? `color-mix(in oklab, ${layer.accent} 14%, transparent)`
                        : "var(--muted)",
                      color: selected ? "var(--foreground)" : "var(--secondary-foreground)",
                    }}
                  >
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Rationale. aria-live so keyboard and screen-reader users are told the
            panel changed — the visual crossfade alone announces nothing. */}
        <div
          className="surface-panel relative overflow-hidden rounded-[22px] p-7 md:p-9"
          aria-live="polite"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${layer.accent}, transparent)` }}
          />
          <p className="text-meta" style={{ color: layer.accent }}>
            {layer.label}
          </p>
          <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-tight tracking-[-0.025em] text-foreground">
            {tool.name}
          </h3>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-secondary-foreground">
            {tool.why}
          </p>
        </div>
      </div>
    </DigitalSection>
  );
}
