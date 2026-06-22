import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, X, Clock, Trash2 } from "lucide-react";
import type { ScreenshotItem } from "@/api/monitoring";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCaptureTimestamp, screenshotImageUrl } from "@/lib/screenshot-gallery-utils";

export interface ScreenshotSlideViewState {
  slides: ScreenshotItem[];
  index: number;
  hourLabel: string;
  employeeName?: string;
}

export function ScreenshotSlideViewer({
  state,
  onClose,
  onNavigate,
  onDelete,
  readOnly = false,
}: {
  state: ScreenshotSlideViewState | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete?: (id: number) => Promise<void>;
  readOnly?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  const slides = state?.slides ?? [];
  const idx = state?.index ?? 0;
  const current = slides[idx];
  const imageUrl = screenshotImageUrl(current);
  const captureTimestamp = current ? formatCaptureTimestamp(current.takenAt) : "";

  const prev = useCallback(() => {
    if (idx > 0) onNavigate(idx - 1);
  }, [idx, onNavigate]);

  const next = useCallback(() => {
    if (idx < slides.length - 1) onNavigate(idx + 1);
  }, [idx, slides.length, onNavigate]);

  useEffect(() => {
    if (state && slides.length > 0 && !current) onClose();
  }, [state, slides.length, current, onClose]);

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, prev, next, onClose]);

  const handleDelete = async () => {
    if (!current || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(current.id);
      if (slides.length <= 1) {
        onClose();
      } else {
        onNavigate(Math.min(idx, slides.length - 2));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[92vw] w-full max-h-[94vh] p-0 gap-0 overflow-hidden rounded-2xl bg-zinc-950 border-zinc-800 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Screenshot Viewer</DialogTitle>
        {state && current && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                {state.employeeName && (
                  <>
                    <span className="text-sm font-semibold text-white truncate">{state.employeeName}</span>
                    <span className="text-zinc-500">·</span>
                  </>
                )}
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{state.hourLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-500 font-medium tabular-nums">
                  {idx + 1} / {slides.length}
                </span>
                {!readOnly && onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={handleDelete}
                    disabled={deleting}
                    title="Delete this screenshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center min-h-0 bg-zinc-950 px-14 py-4">
              {imageUrl ? (
                <div className="relative inline-flex max-w-full max-h-full">
                  <img
                    key={current.id}
                    src={imageUrl}
                    alt="screenshot"
                    className="max-w-full max-h-[calc(94vh-180px)] rounded-lg shadow-2xl object-contain"
                  />
                  <div className="absolute top-2.5 left-2.5 right-2.5 pointer-events-none flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-black/65 backdrop-blur-md px-2.5 py-1.5 text-sm font-semibold text-white tabular-nums shadow-lg">
                      <Clock className="h-3.5 w-3.5 text-white/80 shrink-0" />
                      {captureTimestamp}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Screenshot image unavailable.</p>
              )}

              <button
                type="button"
                onClick={prev}
                disabled={idx === 0}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 backdrop-blur text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all",
                  idx === 0 && "opacity-20 cursor-not-allowed",
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={next}
                disabled={idx >= slides.length - 1}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 backdrop-blur text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all",
                  idx >= slides.length - 1 && "opacity-20 cursor-not-allowed",
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {slides.length > 1 && (
              <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {slides.map((s, i) => {
                    const thumb = screenshotImageUrl(s);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onNavigate(i)}
                        title={formatCaptureTimestamp(s.takenAt)}
                        className={cn(
                          "relative shrink-0 h-12 w-20 rounded-md overflow-hidden border-2 transition-all bg-zinc-800",
                          i === idx
                            ? "border-primary shadow-md shadow-primary/30"
                            : "border-transparent opacity-50 hover:opacity-80",
                        )}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
