"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronDown } from "lucide-react";
import { navigation, ctaNav } from "@/data/navigation";
import { Logo } from "@/components/brand/Logo";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function MobileNav({
  open,
  onClose,
  onOpenSearch,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>("services");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
          <motion.div
            className="scrollbar-hide absolute inset-x-0 top-0 bottom-0 overflow-y-auto bg-background/95 px-5 pb-10 pt-5"
            initial={{ y: "-4%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-2%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/" onClick={onClose} className="flex items-center gap-3">
                <Logo size="sm" />
                <span className="text-[15px] font-semibold tracking-tight">SK</span>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-border p-2 text-secondary-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSearch();
              }}
              className="mb-6 w-full rounded-xl border border-border bg-muted px-4 py-3 text-left text-label text-muted-foreground"
            >
              Search · Ctrl K
            </button>

            <nav className="space-y-2">
              {navigation.map((item, index) => {
                const isOpen = expanded === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                    className="border-b border-border pb-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="text-section leading-none text-foreground"
                      >
                        {item.label}
                      </Link>
                      {item.groups ? (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setExpanded(isOpen ? null : item.id)}
                          className="rounded-full border border-border p-2 text-muted-foreground"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : null}
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && item.groups ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 py-4">
                            {item.groups.map((group) => (
                              <div key={group.title}>
                                <p className="mb-2 text-eyebrow">{group.title}</p>
                                <div className="grid gap-2">
                                  {group.items.map((leaf) => (
                                    <Link
                                      key={leaf.href}
                                      href={leaf.href}
                                      onClick={onClose}
                                      className="rounded-lg px-2 py-2 text-[14px] text-secondary-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      {leaf.title}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </nav>

            <div className="mt-8">
              <PremiumButton
                className="w-full justify-center"
                onClick={() => {
                  onClose();
                  window.location.href = ctaNav.href;
                }}
              >
                {ctaNav.label}
              </PremiumButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
