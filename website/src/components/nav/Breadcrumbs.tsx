"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 md:mb-6">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <motion.li
              key={`${item.href}-${item.label}`}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {index > 0 ? <ChevronRight className="icon-nav text-muted-foreground" /> : null}
              {last ? (
                <span className="text-label text-secondary-foreground">{item.label}</span>
              ) : (
                <Link href={item.href} className="text-label text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              )}
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}
