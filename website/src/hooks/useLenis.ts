"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isOverlayScrollLocked, resetOverlayScrollLock } from "@/lib/lenis-control";

/**
 * Smooth scroll for fine-pointer desktops only.
 *
 * On phones/tablets Lenis fights native touch scrolling (and fixed film
 * overlays make that feel like the page is frozen). GSAP ScrollTrigger still
 * tracks `window` scroll either way.
 */
export function useLenis() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 768px)").matches;

    // Clear leftover overlay lock from Mission Control / HMR.
    resetOverlayScrollLock();

    if (reduced || coarse || narrow) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }

    const lenis = new Lenis({
      // Shorter inertia so frame scrubbing tracks the wheel more tightly.
      duration: 0.55,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.1,
      syncTouch: false,
      autoRaf: false,
      // Do NOT enable allowNestedScroll — film chapter panels use overflow-y-auto
      // and would steal wheel events, freezing page scroll. Mega menus / overlays
      // opt out via data-lenis-prevent (handled by Lenis itself).
      // When Mission Control is open, skip Lenis so panels can scroll natively.
      // Never use lenis.stop().
      prevent: () => isOverlayScrollLocked(),
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(500, 33);

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      lenis.destroy();
      gsap.ticker.remove(tick);
      resetOverlayScrollLock();
    };
  }, []);
}
