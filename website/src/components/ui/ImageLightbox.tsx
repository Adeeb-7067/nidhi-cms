"use client";

import { AnimatePresence, motion } from "motion/react";
import { X, ZoomIn } from "lucide-react";
import { useOverlayScrollLock } from "@/hooks/useOverlayScrollLock";

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  useOverlayScrollLock(open);

  if (!open || !src) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8"
      >
        {/* Backdrop */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close image lightbox"
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          key="lightbox-content"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-h-[90dvh] max-w-[92vw] overflow-hidden rounded-2xl border border-white/14 bg-[#090d16] shadow-2xl"
        >
          <div className="absolute right-3 top-3 z-20">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <img
            src={src}
            alt={alt || "Case Study Screenshot"}
            className="max-h-[82dvh] w-auto object-contain"
          />

          {alt && (
            <div className="border-t border-white/10 bg-black/70 px-4 py-3 text-center text-small text-slate-300 backdrop-blur-md">
              {alt}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
