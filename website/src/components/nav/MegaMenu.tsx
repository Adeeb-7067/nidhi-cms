"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Brain,
  Cloud,
  Code2,
  Cpu,
  Layers,
  Shield,
  Smartphone,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { MegaFeatured, NavItem, NavLeaf } from "@/data/navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  ai: Brain,
  cloud: Cloud,
  code: Code2,
  web: Layers,
  mobile: Smartphone,
  security: Shield,
  design: Sparkles,
  default: Cpu,
};

function pickIcon(leaf: NavLeaf): LucideIcon {
  const key = (leaf.icon ?? "").toLowerCase();
  if (key.includes("167744") || key.includes("ai")) return iconMap.ai;
  if (key.includes("145118") || key.includes("cloud")) return iconMap.cloud;
  if (key.includes("151294") || key.includes("mobile")) return iconMap.mobile;
  if (key.includes("155594") || key.includes("security")) return iconMap.security;
  if (key.includes("156107") || key.includes("design")) return iconMap.design;
  if (key.includes("151769") || key.includes("code")) return iconMap.code;
  if (key.includes("146092") || key.includes("web")) return iconMap.web;
  return iconMap.default;
}

function FeaturedPanel({ featured, onNavigate }: { featured: MegaFeatured; onNavigate: () => void }) {
  return (
    <Link
      href={featured.href}
      onClick={onNavigate}
      className="group relative flex h-full min-h-[180px] flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface-2 p-4"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(320px 160px at 90% 0%, rgba(43,107,255,0.28), transparent 60%)",
        }}
      />
      <div className="relative">
        <p className="text-eyebrow">{featured.eyebrow}</p>
        <h3 className="mt-2 text-[1.25rem] font-display leading-tight text-foreground md:text-[1.4rem]">
          {featured.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{featured.summary}</p>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        {featured.stat ? (
          <div>
            <div className="font-display text-[1.5rem] leading-none text-foreground">{featured.stat}</div>
            <div className="text-meta mt-1">{featured.statLabel}</div>
          </div>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 text-label text-secondary-foreground group-hover:text-foreground">
          Explore <ArrowUpRight className="icon-btn" />
        </span>
      </div>
    </Link>
  );
}

function LeafLink({ leaf, onNavigate }: { leaf: NavLeaf; onNavigate: () => void }) {
  const Icon = pickIcon(leaf);
  return (
    <Link
      href={leaf.href}
      onClick={onNavigate}
      className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-brand-cyan transition-colors group-hover:border-border group-hover:text-foreground">
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-foreground group-hover:text-foreground">
          {leaf.title}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{leaf.description}</span>
      </span>
    </Link>
  );
}

export function MegaMenu({
  item,
  moreItems,
  open,
  onClose,
  onStayOpen,
}: {
  item: NavItem | null;
  moreItems?: NavItem[] | null;
  open: boolean;
  onClose: () => void;
  onStayOpen?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const showMore = Boolean(moreItems?.length);
  const groups = item?.groups ?? [];
  const featured = item?.featured;
  /** Keep mega menus viewport-safe — show a curated subset, rest on section page */
  const maxPerGroup = groups.length >= 3 ? 4 : 5;

  return (
    <AnimatePresence>
      {open && (item || showMore) ? (
        <motion.div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70]"
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={onStayOpen}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-[var(--nav-shadow)] backdrop-blur-2xl">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(43,107,255,0.1), transparent 45%)",
              }}
            />

            {showMore ? (
              <div className="scrollbar-hide relative max-h-[min(70vh,480px)] overflow-y-auto overscroll-contain p-3 sm:p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {moreItems!.map((section) => (
                    <div key={section.id} className="rounded-xl border border-border bg-muted p-3">
                      <Link
                        href={section.href}
                        onClick={onClose}
                        className="mb-2 flex items-center justify-between text-[15px] font-display text-foreground hover:text-brand-cyan"
                      >
                        {section.label}
                        <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                      </Link>
                      <div className="space-y-0.5">
                        {(section.groups?.[0]?.items ?? []).slice(0, 4).map((leaf) => (
                          <Link
                            key={leaf.href}
                            href={leaf.href}
                            onClick={onClose}
                            className="block truncate rounded-lg px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {leaf.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="scrollbar-hide relative max-h-[min(72vh,560px)] overflow-y-auto overscroll-contain">
                <div className="grid lg:grid-cols-[1fr_240px]">
                  <div className="p-3 md:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="text-eyebrow">{item!.label}</p>
                        <Link
                          href={item!.href}
                          onClick={onClose}
                          className="text-[1.15rem] font-display text-foreground transition-colors hover:text-brand-cyan"
                        >
                          View all {item!.label.toLowerCase()}
                        </Link>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "grid gap-x-3 gap-y-4",
                        groups.length >= 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                      )}
                    >
                      {groups.map((group) => (
                        <div key={group.title} className="min-w-0">
                          <p className="mb-1 px-2 text-eyebrow">{group.title}</p>
                          <div className="space-y-0">
                            {group.items.slice(0, maxPerGroup).map((leaf) => (
                              <LeafLink key={leaf.href} leaf={leaf} onNavigate={onClose} />
                            ))}
                            {group.items.length > maxPerGroup ? (
                              <Link
                                href={item!.href}
                                onClick={onClose}
                                className="mt-1 block px-2 py-1 text-[12px] text-brand-cyan/80 hover:text-brand-cyan"
                              >
                                +{group.items.length - maxPerGroup} more
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {featured ? (
                    <div className="hidden border-t border-border p-3 md:border-l md:border-t-0 md:p-4 lg:block">
                      <FeaturedPanel featured={featured} onNavigate={onClose} />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
