"use client";

import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, Bot } from "lucide-react";
import { navigation, ctaNav, type NavItem } from "@/data/navigation";
import { SK_ASSIST_OPEN_EVENT } from "@/data/mission-control";
import { Logo } from "@/components/brand/Logo";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { MegaMenu } from "@/components/nav/MegaMenu";
import { MobileNav } from "@/components/nav/MobileNav";
import { CommandPalette } from "@/components/nav/CommandPalette";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

/** Desktop primary — keeps the bar readable; the rest live under More + mobile. */
const PRIMARY_IDS = ["company", "services", "solutions", "work", "insights"] as const;
const MORE_IDS = ["technologies", "industries", "careers", "contact"] as const;

/**
 * The cinematic home re-renders on every scrubbed frame, so the bar is memoised
 * and deliberately takes no frame-derived props — chapter state lives in
 * `ChapterProgress`. Re-rendering this tree per frame stutters the film.
 */
export const PremiumNavbar = memo(function PremiumNavbar({
  variant = "site",
}: {
  variant?: "site" | "cinematic";
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const barRef = useRef<HTMLElement>(null);

  const primary = navigation.filter((n) =>
    (PRIMARY_IDS as readonly string[]).includes(n.id),
  );
  const moreItems = navigation.filter((n) => (MORE_IDS as readonly string[]).includes(n.id));
  const openItem = navigation.find((n) => n.id === openId) ?? null;

  useEffect(() => {
    // `scrollHeight` forces a synchronous layout. On the cinematic home the
    // scrubber mutates styles every frame, so reading it per scroll event
    // thrashes layout and stutters the film — cache it instead.
    let docHeight = 0;
    let queued = false;

    const update = () => {
      queued = false;
      setScrolled(window.scrollY > 20);
      if (docHeight > 0) setProgress((window.scrollY / docHeight) * 100);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    const measure = () => {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
      onScroll();
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setOpenId(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), 180);
  };

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  const openMega = (id: string) => {
    cancelClose();
    setOpenId(id);
  };

  const isActive = (item: NavItem) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-[var(--z-nav)] pointer-events-none">
        {/* Scroll progress — outside the pill so it never clips menus */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-border/60">
          <div
            className="h-full bg-[linear-gradient(90deg,#2B6BFF,#00D9FF)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="pointer-events-none px-3 pt-3 md:px-4 md:pt-4">
          <header
            ref={barRef}
            className="pointer-events-auto relative mx-auto max-w-[1200px]"
            onMouseLeave={scheduleClose}
            onMouseEnter={cancelClose}
          >
            <div
              className={cn(
                "relative rounded-2xl border transition-all duration-400",
                // Cinematic home: never backdrop-blur over the scrub canvas —
                // blur of a fullscreen changing bitmap is the lag + soft look.
                variant === "cinematic"
                  ? "bg-[#070A10]/92"
                  : "backdrop-blur-xl",
                scrolled && variant !== "cinematic" ? "shadow-[var(--nav-shadow)] backdrop-blur-2xl" : "",
                scrolled && variant === "cinematic" ? "shadow-[var(--nav-shadow)] bg-[#070A10]/96" : "",
              )}
              style={
                variant === "cinematic"
                  ? { borderColor: "var(--nav-border)" }
                  : {
                      background: scrolled ? "var(--nav-bg-scrolled)" : "var(--nav-bg)",
                      borderColor: "var(--nav-border)",
                    }
              }
            >
              <div
                className={cn(
                  "flex items-center gap-2 px-3 transition-[height] duration-400 md:px-4",
                  scrolled ? "h-14" : "h-16",
                )}
              >
                {/* Brand */}
                <Link
                  href="/"
                  className="flex shrink-0 items-center gap-2.5 pr-2"
                  onClick={(e) => {
                    if (variant === "cinematic" && pathname === "/") {
                      e.preventDefault();
                      // Top of the document, not the film — the film starts
                      // mid-page now, so `scrollToFilmPct(0)` sent the logo
                      // *down* to the tour instead of home to the hero.
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  <Logo
                    size="sm"
                    className={cn(
                      "transition-transform duration-400",
                      scrolled ? "scale-[0.92]" : "scale-100",
                    )}
                  />
                  <span className="hidden min-w-0 sm:flex flex-col text-left">
                    <span className="truncate text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-foreground md:text-[13px]">
                      Satyakabir
                    </span>
                    <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Technologies
                    </span>
                  </span>
                </Link>

                {/* Primary links + More mega (same on cinematic home and site pages) */}
                <nav className="ml-1 hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
                  {primary.map((item) => {
                    const active = isActive(item);
                    const open = openId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="relative"
                        onMouseEnter={() => {
                          if (item.kind === "mega") openMega(item.id);
                          else {
                            cancelClose();
                            setOpenId(null);
                          }
                        }}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                            active || open
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                          )}
                        >
                          {item.label}
                          {item.kind === "mega" ? (
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 opacity-50 transition-transform duration-200",
                                open && "rotate-180",
                              )}
                            />
                          ) : null}
                        </Link>
                      </div>
                    );
                  })}

                  <div
                    className="relative"
                    onMouseEnter={() => openMega("more")}
                  >
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors",
                        openId === "more" || moreItems.some(isActive)
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      More
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 opacity-50 transition-transform duration-200",
                          openId === "more" && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </nav>

                {/* Actions */}
                <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent(SK_ASSIST_OPEN_EVENT))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 text-[12px] font-semibold text-brand-cyan transition-[border-color,background-color,transform] duration-300 hover:border-brand-cyan/60 hover:bg-brand-cyan/20 active:scale-95"
                    aria-label="Open SK Assist AI Assistant"
                    title="SK Assist AI Assistant"
                  >
                    <Logo size="sm" className="h-4.5 w-4.5 object-contain" />
                    <span className="hidden sm:inline">AI Assist</span>
                  </button>

                  <ThemeToggle />

                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-[border-color,color,transform,background-color] duration-300 hover:border-brand-cyan/40 hover:bg-muted/70 hover:text-foreground active:scale-95"
                    aria-label="Search (Ctrl K)"
                  >
                    <Search className="h-4 w-4" />
                  </button>

                  <PremiumButton
                    magnetic={false}
                    className="!hidden !h-9 !px-4 !py-0 !text-[12px] sm:!inline-flex"
                    onClick={() => {
                      window.location.href = ctaNav.href;
                    }}
                  >
                    Start a project
                  </PremiumButton>

                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
                    aria-label="Open menu"
                    onClick={() => {
                      setOpenId(null);
                      setMobileOpen(true);
                    }}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Full-width mega — not clipped by the pill */}
            <MegaMenu
              item={openItem}
              moreItems={openId === "more" ? moreItems : null}
              open={Boolean(openId)}
              onClose={() => setOpenId(null)}
              onStayOpen={cancelClose}
            />
          </header>
        </div>
      </div>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
});
