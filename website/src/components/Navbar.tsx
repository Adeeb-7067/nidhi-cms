"use client";

import { useState, useEffect, useMemo } from "react";
import { Logo } from "@/components/brand/Logo";
import { PremiumButton } from "@/components/ui/PremiumButton";
import {
  cinematicNav,
  frameToScrollPct,
  getActiveNavKey,
  TOTAL_FRAMES,
} from "@/data/cinematic";
import { site } from "@/data/mock";

export function Navbar({ currentFrame = 1 }: { currentFrame?: number }) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const activeKey = useMemo(() => getActiveNavKey(currentFrame), [currentFrame]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 36);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) setScrollProgress((window.scrollY / docHeight) * 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToFrame = (frame: number) => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: docHeight * ((frame - 1) / (TOTAL_FRAMES - 1)),
      behavior: "smooth",
    });
  };

  const scrollToPct = (percentage: number) => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: docHeight * (percentage / 100), behavior: "smooth" });
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[var(--z-nav)] pointer-events-none px-3 md:px-6 pt-3 md:pt-4">
      <nav
        className={`pointer-events-auto mx-auto max-w-[1200px] transition-all duration-500 ${
          scrolled
            ? "rounded-full glass-panel shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
            : "rounded-2xl border border-transparent bg-transparent"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-4 px-4 md:px-6 ${
            scrolled ? "h-14" : "h-16"
          } transition-[height] duration-500`}
        >
          <button
            onClick={() => scrollToPct(0)}
            className="flex items-center gap-3 group"
            aria-label={`${site.brand} home`}
          >
            <Logo size="sm" className="transition-transform duration-500 group-hover:scale-105" />
            <span className="hidden lg:flex flex-col text-left">
              <span className="font-display text-[15px] text-white leading-none tracking-[0.04em]">
                {site.brandShort}
              </span>
              <span className="text-meta text-muted-foreground mt-1">
                Technologies
              </span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-7">
            {cinematicNav.map((item) => {
              const active = activeKey === item.key;
              return (
                <button
                  key={item.label}
                  onClick={() => scrollToFrame(item.frame)}
                  className={`group relative text-label transition-colors ${
                    active ? "text-white" : "text-white/55 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-[linear-gradient(90deg,#2B6BFF,#00D9FF,#FF8A00)] transition-all duration-400 ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <PremiumButton
            className="!py-2 !px-4 !text-[10px] hidden sm:inline-flex"
            onClick={() => scrollToPct(frameToScrollPct(640))}
          >
            Start a project
          </PremiumButton>
        </div>

        <div
          className="mx-4 mb-0 h-[2px] rounded-full bg-[linear-gradient(90deg,#2B6BFF,#00D9FF)] origin-left"
          style={{ width: `${scrollProgress}%`, maxWidth: "100%" }}
        />
      </nav>
    </div>
  );
}
