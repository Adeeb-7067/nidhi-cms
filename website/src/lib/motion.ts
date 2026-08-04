/** Shared premium motion curves — GPU-friendly, cinematic. */

export const easeExpoOut = [0.16, 1, 0.3, 1] as const;
export const easeExpoInOut = [0.87, 0, 0.13, 1] as const;
export const easeSoft = [0.33, 1, 0.68, 1] as const;

/** Frame-scrub chapter progress → cinematic opacity / transform. */
export function easeOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export function easeInOutQuart(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 8 * x * x * x * x : 1 - (-2 * x + 2) ** 4 / 2;
}

export const springMagnetic = { stiffness: 180, damping: 14, mass: 0.35 };
export const springSoft = { stiffness: 120, damping: 20, mass: 0.5 };
export const springSnappy = { stiffness: 280, damping: 22, mass: 0.3 };

export const revealTransition = {
  duration: 0.95,
  ease: easeExpoOut,
};

export const staggerChildren = {
  staggerChildren: 0.08,
  delayChildren: 0.06,
};
