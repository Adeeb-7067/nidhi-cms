"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FRAME_START, TOTAL_FRAMES } from "@/data/cinematic";

const PRELOAD_AHEAD = 18;
const PRELOAD_BEHIND = 8;
const INITIAL_BATCH = 28;
const MAX_CACHE = 72;

function framePath(index: number) {
  return `/frames/frame${String(index).padStart(4, "0")}.jpg`;
}

/**
 * Canvas frame scrubber — GPU-friendly draw path, sliding prefetch, LRU cache.
 */
export function useFrameScrubber() {
  const [currentFrame, setCurrentFrameState] = useState(FRAME_START);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const pendingRef = useRef<Set<number>>(new Set());
  const frameRef = useRef(FRAME_START);
  const lastDirRef = useRef(1);
  const drawRafRef = useRef(0);
  const pendingDrawRef = useRef<number | null>(null);

  const touchCache = useCallback((index: number, img: HTMLImageElement) => {
    const cache = cacheRef.current;
    if (cache.has(index)) cache.delete(index);
    cache.set(index, img);
    while (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value as number | undefined;
      if (oldest === undefined) break;
      if (oldest === frameRef.current) {
        const keep = cache.get(oldest);
        if (!keep) break;
        cache.delete(oldest);
        cache.set(oldest, keep);
        // If everything else was evicted somehow, stop.
        if (cache.size <= 1) break;
        continue;
      }
      cache.delete(oldest);
    }
  }, []);

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!ctx) return;
      ctxRef.current = ctx;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
    }

    const img = cacheRef.current.get(index);
    if (!img) return;

    const w = canvas.width;
    const h = canvas.height;
    const canvasRatio = w / h;
    const imgRatio = img.width / img.height;

    let drawWidth = w;
    let drawHeight = h;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = w / imgRatio;
      offsetY = (h - drawHeight) / 2;
    } else {
      drawWidth = h * imgRatio;
      offsetX = (w - drawWidth) / 2;
    }

    ctx.fillStyle = "#020305";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  const scheduleDraw = useCallback(
    (index: number) => {
      pendingDrawRef.current = index;
      if (drawRafRef.current) return;
      drawRafRef.current = requestAnimationFrame(() => {
        drawRafRef.current = 0;
        const next = pendingDrawRef.current;
        pendingDrawRef.current = null;
        if (next != null && next === frameRef.current) drawFrame(next);
      });
    },
    [drawFrame],
  );

  const loadFrame = useCallback(
    (index: number): Promise<void> => {
      if (index < FRAME_START || index > TOTAL_FRAMES) return Promise.resolve();
      if (cacheRef.current.has(index) || pendingRef.current.has(index)) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        pendingRef.current.add(index);
        const img = new Image();
        img.decoding = "async";
        img.src = framePath(index);
        img.onload = () => {
          touchCache(index, img);
          pendingRef.current.delete(index);
          resolve();
        };
        img.onerror = () => {
          pendingRef.current.delete(index);
          resolve();
        };
      });
    },
    [touchCache],
  );

  const prefetchAround = useCallback(
    (center: number) => {
      const dir = lastDirRef.current;
      const ahead = dir >= 0 ? PRELOAD_AHEAD : PRELOAD_BEHIND;
      const behind = dir >= 0 ? PRELOAD_BEHIND : PRELOAD_AHEAD;
      const start = Math.max(FRAME_START, center - behind);
      const end = Math.min(TOTAL_FRAMES, center + ahead);
      // Prefer loading in scroll direction first
      if (dir >= 0) {
        for (let i = center; i <= end; i++) void loadFrame(i);
        for (let i = center - 1; i >= start; i--) void loadFrame(i);
      } else {
        for (let i = center; i >= start; i--) void loadFrame(i);
        for (let i = center + 1; i <= end; i++) void loadFrame(i);
      }
    },
    [loadFrame],
  );

  const setCurrentFrame = useCallback(
    (frame: number) => {
      const clamped = Math.min(TOTAL_FRAMES, Math.max(FRAME_START, Math.round(frame)));
      if (frameRef.current === clamped) return;

      lastDirRef.current = clamped > frameRef.current ? 1 : -1;
      frameRef.current = clamped;
      setCurrentFrameState(clamped);

      if (cacheRef.current.has(clamped)) {
        scheduleDraw(clamped);
      } else {
        void loadFrame(clamped).then(() => {
          if (frameRef.current === clamped) scheduleDraw(clamped);
        });
      }
      prefetchAround(clamped);
    },
    [loadFrame, prefetchAround, scheduleDraw],
  );

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    const boot = async () => {
      const batch = Math.min(INITIAL_BATCH, TOTAL_FRAMES - FRAME_START + 1);
      // Sequential-ish chunks keep the main thread responsive during boot
      const chunk = 8;
      for (let offset = 0; offset < batch && !cancelled; offset += chunk) {
        const slice = Array.from(
          { length: Math.min(chunk, batch - offset) },
          (_, i) => FRAME_START + offset + i,
        );
        await Promise.all(
          slice.map((idx) =>
            loadFrame(idx).then(() => {
              if (cancelled) return;
              loaded += 1;
              setLoadProgress(Math.round((loaded / batch) * 100));
            }),
          ),
        );
      }
      if (cancelled) return;
      setIsLoaded(true);
      scheduleDraw(FRAME_START);
      prefetchAround(FRAME_START);
    };

    void boot();
    return () => {
      cancelled = true;
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
    };
  }, [loadFrame, prefetchAround, scheduleDraw]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Cap DPR — full 2x JPG cover-fit is a major cost on retina.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextW = Math.floor(window.innerWidth * dpr);
      const nextH = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
        ctxRef.current = null; // reset after resize
      }
      if (isLoaded) scheduleDraw(frameRef.current);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, [isLoaded, scheduleDraw]);

  return {
    canvasRef,
    currentFrame,
    setCurrentFrame,
    totalFrames: TOTAL_FRAMES,
    frameStart: FRAME_START,
    isLoaded,
    loadProgress,
  };
}
