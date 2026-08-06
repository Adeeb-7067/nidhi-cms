"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

const SHOW_AFTER_PX = 480;

/**
 * Fixed “back to top” control. Appears after meaningful scroll; bottom-right
 * corner (chat FAB removed — SK Assist opens from Actions).
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTop = () => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] md:bottom-6 md:right-6">
      <AnimatePresence>
        {visible ? (
          <motion.button
            key="scroll-top"
            type="button"
            onClick={goTop}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.94 }}
            transition={{ duration: reduced ? 0.15 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[border-color,color,transform] duration-300 hover:border-brand-cyan/40 hover:text-brand-cyan active:scale-95"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
