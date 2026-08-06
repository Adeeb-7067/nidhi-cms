"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isOverlayScrollLocked, setOverlayScrollLock } from "@/lib/lenis-control";

export function useLenis() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Native scroll for reduced motion — no inertia layer.
    if (reduced) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }

    // Clear leftover overlay lock from Mission Control / HMR.
    setOverlayScrollLock(false);

    const lenis = new Lenis({
      // Shorter inertia so frame scrubbing tracks the wheel more tightly.
      duration: 0.55,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.1,
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
      setOverlayScrollLock(false);
    };
  }, []);
}
