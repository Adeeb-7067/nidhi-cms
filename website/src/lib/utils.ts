import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Quantise a trig-derived coordinate before it reaches markup.
 *
 * `Math.cos`/`Math.sin` are implementation-defined in ECMAScript, so Node and the
 * browser can disagree in the final bits. Interpolated straight into an SVG `d`
 * or a `left: %`, that difference is a hydration mismatch (`30.5%` vs
 * `30.499999999999982%`) and React discards the server HTML for that subtree.
 * 3dp is finer than any of these layouts can render.
 */
export function quantize(n: number, dp = 3) {
  const factor = 10 ** dp;
  return Math.round(n * factor) / factor;
}

/** Deterministic pick from a slug so sibling pages get different layouts. */
export function pickFromSlug<T>(slug: string, variants: readonly T[]): T {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return variants[hash % variants.length]!;
}
