"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Command,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Search,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { usePrefersReducedMotion } from "@/components/experiences/primitives";
import { flattenNavigation } from "@/data/navigation";
import { site } from "@/data/mock";
import {
  filterActions,
  MC_OPEN_EVENT,
  MISSION_ACTIONS,
  SK_ASSIST_OPEN_EVENT,
  pushRecent,
  suggestionsForPath,
  type MissionAction,
} from "@/data/mission-control";
import { scrollToFilmFraction, scrollToId } from "@/lib/film-scroll";
import { useOverlayScrollLock } from "@/hooks/useOverlayScrollLock";
import { easeExpoOut, springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";

const phoneDigits = site.phone.replace(/\D/g, "");

const CONTACT_CHANNELS = [
  {
    id: "phone",
    label: "Phone",
    href: `tel:${phoneDigits}`,
    icon: Phone,
  },
  {
    id: "email",
    label: "Email",
    href: `mailto:${site.email}`,
    icon: Mail,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: `https://wa.me/${phoneDigits}`,
    icon: MessageCircle,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: site.socials.linkedin,
    icon: Linkedin,
  },
] as const;

function openAssist() {
  window.dispatchEvent(new CustomEvent(SK_ASSIST_OPEN_EVENT));
}

export function MissionControl() {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const catalog = useMemo(() => flattenNavigation(), []);
  const actions = useMemo(() => filterActions(query), [query]);
  const pageHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((row) => row.keywords.includes(q) || row.title.toLowerCase().includes(q))
      .slice(0, 6);
  }, [catalog, query]);
  const suggestions = useMemo(() => suggestionsForPath(pathname || "/"), [pathname]);

  const close = useCallback(() => setOpen(false), []);
  const openPanel = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(MC_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(MC_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }
      // Shift+Space — Mission Control (Ctrl/Cmd+K remains CommandPalette search)
      if (e.shiftKey && e.code === "Space" && !typing) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useOverlayScrollLock(open);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), reduced ? 0 : 380);
    return () => window.clearTimeout(id);
  }, [open, reduced]);

  const runAction = useCallback(
    (action: MissionAction) => {
      close();
      if (action.kind === "chat") {
        openAssist();
        return;
      }
      if (action.kind === "hq") {
        if (pathname === "/") {
          scrollToFilmFraction(0);
          scrollToId("inside");
        } else {
          router.push("/#inside");
          window.setTimeout(() => {
            scrollToFilmFraction(0);
            scrollToId("inside");
          }, 120);
        }
        return;
      }
      if (action.href) {
        pushRecent({ href: action.href, title: action.title });
        router.push(action.href);
      }
    },
    [close, pathname, router],
  );

  const goHref = useCallback(
    (href: string, title?: string) => {
      close();
      if (href.startsWith("/#")) {
        const id = href.slice(2);
        if (pathname === "/") scrollToId(id);
        else router.push(href);
        return;
      }
      if (title) pushRecent({ href, title });
      router.push(href);
    },
    [close, pathname, router],
  );

  return (
    <>
      {/* Left rail — vertical tab, same quiet chrome as “See what we do” */}
      <div className="pointer-events-none fixed left-0 top-1/2 z-[55] -translate-y-1/2">
        <button
          type="button"
          onClick={openPanel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open actions"
          className={cn(
            "pointer-events-auto group flex flex-col items-center gap-3 rounded-r-2xl border border-l-0 border-white/16 bg-black/45 px-2.5 py-4",
            "text-white/70 transition-[opacity,transform,color,border-color,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "hover:border-white/35 hover:bg-black/55 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
            open && "pointer-events-none -translate-x-2 opacity-0",
          )}
        >
          <Command className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
          <span
            className="text-[11px] font-medium uppercase tracking-[0.16em]"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Actions
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[72] flex items-stretch justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.35 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#020305]/55 backdrop-blur-sm"
              aria-label="Close actions"
              onClick={close}
            />

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal
              aria-label="Actions"
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
              onWheel={(e) => e.stopPropagation()}
              className={cn(
                "pointer-events-auto relative z-10 m-3 flex h-[min(680px,calc(100dvh-1.5rem))] w-full max-w-[24rem] flex-col overflow-hidden rounded-2xl md:m-5 md:h-[min(720px,calc(100dvh-2.5rem))] md:max-w-[26rem]",
                "border border-white/12 bg-[#070A10]/94 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.9)]",
                "backdrop-blur-xl",
              )}
              initial={
                reduced ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }
              }
              animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16, scale: 0.98 }}
              transition={reduced ? { duration: 0.2 } : { type: "spring", ...springSoft }}
            >
              {/* Header */}
              <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-5 py-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Logo size="sm" className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="font-display text-[1rem] font-bold tracking-tight text-white">
                      Actions
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      Shortcuts · <span className="font-mono text-[10px]">⇧ Space</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 text-white/55 transition-[border-color,color,background-color] duration-300 hover:border-white/28 hover:bg-white/5 hover:text-white"
                  aria-label="Close actions"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </header>

              {/* Search */}
              <div className="relative z-10 shrink-0 px-5 pt-3 md:px-6">
                <label className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-3.5 py-2.5 transition-[border-color] focus-within:border-white/28">
                  <Search className="h-4 w-4 shrink-0 text-white/40" strokeWidth={1.75} />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search pages and actions…"
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
                  />
                </label>
              </div>

              {/* Scrollable body — min-h-0 is required for flex overflow */}
              <div
                data-lenis-prevent
                className="relative z-10 mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-4 md:px-6 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
              >
                {!query ? (
                  <section>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-white/40">
                      For this page
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            if (s.actionId) {
                              const action = MISSION_ACTIONS.find((a) => a.id === s.actionId);
                              if (action) runAction(action);
                              return;
                            }
                            if (s.href) goHref(s.href, s.label);
                          }}
                          className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition-[border-color,background-color,color] duration-300 hover:border-white/28 hover:bg-white/[0.06] hover:text-white"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Page search hits */}
                {pageHits.length ? (
                  <section>
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                      Pages
                    </p>
                    <ul className="space-y-1">
                      {pageHits.map((row) => (
                        <li key={row.href}>
                          <button
                            type="button"
                            onClick={() => goHref(row.href, row.title)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-[border-color,background-color] hover:border-white/10 hover:bg-white/[0.04]"
                          >
                            <span>
                              <span className="block text-[13px] font-medium text-white">
                                {row.title}
                              </span>
                              <span className="block text-[11px] text-white/40">{row.category}</span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-white/30" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {/* Action cards */}
                <section>
                  <p className="mb-2.5 text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {query ? "Matching actions" : "Quick links"}
                  </p>
                  <motion.ul
                    className="grid gap-2"
                    initial="hidden"
                    animate="shown"
                    variants={{
                      hidden: {},
                      shown: {
                        transition: reduced
                          ? { staggerChildren: 0 }
                          : { staggerChildren: 0.05, delayChildren: 0.12 },
                      },
                    }}
                  >
                    {actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <motion.li
                          key={action.id}
                          variants={{
                            hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
                            shown: { opacity: 1, y: 0 },
                          }}
                          transition={{ duration: 0.45, ease: easeExpoOut }}
                        >
                          <button
                              type="button"
                              onClick={() => runAction(action)}
                              className={cn(
                                "group relative flex w-full items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left",
                                "transition-[border-color,background-color,transform] duration-400",
                                "hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.06]",
                              )}
                            >
                              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white/70 transition-colors duration-400 group-hover:text-white">
                                <Icon className="h-4 w-4" strokeWidth={1.6} />
                              </span>
                              <span className="relative min-w-0 flex-1">
                                <span className="block text-[14px] font-medium tracking-tight text-white">
                                  {action.title}
                                </span>
                                <span className="mt-0.5 block text-[12px] leading-snug text-white/45">
                                  {action.description}
                                </span>
                              </span>
                              <ArrowRight
                                className="relative h-4 w-4 shrink-0 text-white/25 transition-[color,transform] duration-400 group-hover:translate-x-0.5 group-hover:text-white/70"
                                strokeWidth={1.75}
                              />
                            </button>
                        </motion.li>                      );
                    })}
                    {!actions.length ? (
                      <li className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/40">
                        No actions match — try “AI”, “Cloud”, or “Careers”.
                      </li>
                    ) : null}
                  </motion.ul>
                </section>
              </div>

              {/* Quick contact */}
              <footer className="relative z-10 shrink-0 border-t border-white/8 px-5 py-3.5 md:px-6">
                <p className="mb-2.5 text-[11px] uppercase tracking-[0.14em] text-white/40">
                  Contact
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <a
                        key={ch.id}
                        href={ch.href}
                        target={ch.href.startsWith("http") ? "_blank" : undefined}
                        rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        aria-label={ch.label}
                        title={ch.label}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-full",
                          "border border-white/12 bg-white/[0.03] text-white/65",
                          "transition-[border-color,color,background-color] duration-300",
                          "hover:border-white/28 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </a>
                    );
                  })}
                </div>
              </footer>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
