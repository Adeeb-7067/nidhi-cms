"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, CornerDownLeft, Command } from "lucide-react";
import { flattenNavigation } from "@/data/navigation";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const catalog = useMemo(() => flattenNavigation(), []);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.slice(0, 12);
    return catalog
      .filter((row) => row.keywords.includes(q) || row.title.toLowerCase().includes(q))
      .slice(0, 16);
  }, [catalog, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            aria-label="Close search"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Search"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface-2/92 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(results.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter" && results[active]) {
                    go(results[active].href);
                  }
                }}
                placeholder="Search services, technologies, work…"
                className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-meta text-muted-foreground">
                <Command className="h-3 w-3" /> K
              </kbd>
            </div>
            <ul
              data-lenis-prevent
              data-lenis-prevent-wheel
              className="max-h-[50vh] overflow-y-auto overscroll-contain p-2"
            >
              {results.length === 0 ? (
                <li className="px-3 py-8 text-center text-[13px] text-muted-foreground">No matches</li>
              ) : (
                results.map((row, index) => (
                  <li key={`${row.href}-${row.title}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(row.href)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        index === active ? "bg-muted" : "hover:bg-muted"
                      }`}
                    >
                      <span>
                        <span className="block text-[14px] text-foreground">{row.title}</span>
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {row.category} · {row.description}
                        </span>
                      </span>
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
