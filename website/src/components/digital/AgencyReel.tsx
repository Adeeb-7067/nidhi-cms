"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { reelScenes } from "@/data/digital";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";

function ReelCards() {
  return (
    <>
      {reelScenes.map((scene, i) => (
        <article
          key={scene.id}
          className="group relative w-[min(82vw,720px)] shrink-0 overflow-hidden rounded-[26px] border border-white/10"
        >
          <div className="relative aspect-[16/10]">
            <Image
              src={scene.image}
              alt={scene.title}
              fill
              sizes="(min-width: 768px) 720px, 82vw"
              quality={85}
              className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,3,5,0.1),rgba(2,3,5,0.9))]" />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1"
              style={{ background: `linear-gradient(90deg, ${scene.accent}, transparent)` }}
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: scene.accent }}>
              Scene {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 font-display text-[clamp(1.5rem,3vw,2.4rem)] tracking-[-0.03em] text-white">
              {scene.title}
            </h3>
            <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-white/70">
              {scene.caption}
            </p>
          </div>
        </article>
      ))}
    </>
  );
}

function ReelHeader({ progress }: { progress?: ReturnType<typeof useTransform<number, string>> }) {
  return (
    <div className="relative mx-auto mb-8 w-full max-w-[var(--grid-max)] page-pad">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] tracking-[-0.03em] text-white">
            Inside the studio
          </h2>
          <p className="mt-2 max-w-[50ch] text-[14px] text-white/60">
            From the first conversation to the quarterly outcomes review — the people and rooms
            behind every engagement.
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">Keep scrolling</span>
      </div>
      <div className="mt-6 h-px w-full bg-white/10">
        <motion.div
          className="h-px bg-[linear-gradient(90deg,#2B6BFF,#00D9FF)]"
          style={{ width: progress ?? "0%" }}
        />
      </div>
    </div>
  );
}

/**
 * The scroll-driven half. Split out and mounted only when the reel is close,
 * because `useScroll` measures its target on every scroll event — running that
 * while the film scrubber is seeking forces a layout per frame.
 */
function ReelStage({ shellRef }: { shellRef: RefObject<HTMLDivElement | null> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  const { scrollYProgress } = useScroll({ target: shellRef, offset: ["start start", "end end"] });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const x = useTransform(eased, [0, 1], [0, -distance]);
  const progress = useTransform(eased, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth + 48));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      <ReelHeader progress={progress} />
      <motion.div
        ref={trackRef}
        style={{ x }}
        className="flex gap-6 pl-[var(--page-pad-x)] will-change-transform"
      >
        <ReelCards />
      </motion.div>
    </>
  );
}

/**
 * §7 — A walk through the studio. Vertical scroll drives horizontal travel while
 * the stage is pinned, so the sequence plays like a reel instead of a gallery.
 * Reduced motion swaps the pin for a plain scroll rail.
 */
export function AgencyReel() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = shellRef.current;
    if (!el || reduced) return;
    // Well ahead of the viewport, so mounting is never visible.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  if (reduced) {
    return (
      <section
        className="relative isolate bg-[#04060B] py-20"
        style={{ zIndex: "var(--z-content)" }}
        aria-labelledby="reel-heading"
      >
        <div className="mx-auto w-full max-w-[var(--grid-max)] page-pad">
          <h2 id="reel-heading" className="text-section text-white">
            Inside the studio
          </h2>
          <p className="mt-4 max-w-[52ch] text-[15px] text-white/65">
            From the first conversation to the quarterly outcomes review — the people and rooms
            behind every engagement.
          </p>
        </div>
        <div className="mt-10 flex gap-5 overflow-x-auto px-[var(--page-pad-x)] pb-4">
          <ReelCards />
        </div>
      </section>
    );
  }

  return (
    <div
      ref={shellRef}
      className="relative isolate bg-[#04060B]"
      style={{ height: `${reelScenes.length * 46 + 60}vh`, zIndex: "var(--z-content)" }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 0%, rgba(43,107,255,0.16), transparent 60%), radial-gradient(50% 45% at 85% 100%, rgba(118,73,255,0.14), transparent 62%)",
          }}
        />
        {near ? (
          <ReelStage shellRef={shellRef} />
        ) : (
          <>
            <ReelHeader />
            <div className="flex gap-6 pl-[var(--page-pad-x)]">
              <ReelCards />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
