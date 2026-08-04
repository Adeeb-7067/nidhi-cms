"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FRAME_START, TOTAL_FRAMES } from "@/data/cinematic";

const PRELOAD_AHEAD = 18;
const PRELOAD_BEHIND = 8;
const INITIAL_BATCH = 40;
const MAX_CACHE = 72;
/** Cap parallel JPG fetches — production servers drop connections under open storms. */
const MAX_CONCURRENT = 6;
const MAX_RETRIES = 3;

function framePath(index: number) {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return `${base}/frames/frame${String(index).padStart(4, "0")}.jpg`;
}

/**
 * Canvas frame scrubber — GPU-friendly draw path, sliding prefetch, LRU cache.
 * Production-hardened: concurrency queue, retries, nearest-frame fallback.
 */
export function useFrameScrubber() {
  const [currentFrame, setCurrentFrameState] = useState(FRAME_START);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const pendingRef = useRef<Set<number>>(new Set());
  const failedRef = useRef<Map<number, number>>(new Map()); // index → attempts
  const queueRef = useRef<number[]>([]);
  const activeLoadsRef = useRef(0);
  const frameRef = useRef(FRAME_START);
  const lastDirRef = useRef(1);
  const drawRafRef = useRef(0);
  const pendingDrawRef = useRef<number | null>(null);
  const pumpRef = useRef<() => void>(() => {});

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
        if (cache.size <= 1) break;
        continue;
      }
      cache.delete(oldest);
    }
  }, []);

  const nearestCached = useCallback((index: number): number | null => {
    const cache = cacheRef.current;
    if (cache.has(index)) return index;
    let best: number | null = null;
    let bestDist = Infinity;
    for (const key of cache.keys()) {
      const dist = Math.abs(key - index);
      if (dist < bestDist) {
        bestDist = dist;
        best = key;
      }
    }
    // Don't stretch more than ~1s of film at 72fps-ish mapping
    if (best != null && bestDist <= 24) return best;
    return null;
  }, []);

  const drawFrame = useCallback(
    (index: number) => {
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

      const drawIndex = nearestCached(index);
      if (drawIndex == null) return;
      const img = cacheRef.current.get(drawIndex);
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
    },
    [nearestCached],
  );

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

  const fetchOne = useCallback(
    (index: number): Promise<boolean> =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        // Bust sticky CDN/proxy error caches between retries
        const attempts = failedRef.current.get(index) ?? 0;
        img.src = attempts > 0 ? `${framePath(index)}?r=${attempts}` : framePath(index);
        img.onload = () => {
          touchCache(index, img);
          failedRef.current.delete(index);
          if (frameRef.current === index) scheduleDraw(index);
          resolve(true);
        };
        img.onerror = () => {
          failedRef.current.set(index, attempts + 1);
          resolve(false);
        };
      }),
    [scheduleDraw, touchCache],
  );

  const pumpQueue = useCallback(() => {
    while (activeLoadsRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
      const index = queueRef.current.shift();
      if (index == null) break;
      if (cacheRef.current.has(index)) {
        pendingRef.current.delete(index);
        continue;
      }

      activeLoadsRef.current += 1;
      void fetchOne(index).then((ok) => {
        activeLoadsRef.current -= 1;
        pendingRef.current.delete(index);

        if (!ok) {
          const attempts = failedRef.current.get(index) ?? 0;
          if (attempts < MAX_RETRIES) {
            // Re-queue failed frame at the end so others keep flowing
            if (!pendingRef.current.has(index) && !cacheRef.current.has(index)) {
              pendingRef.current.add(index);
              queueRef.current.push(index);
            }
          }
        }

        pumpRef.current();
      });
    }
  }, [fetchOne]);

  useEffect(() => {
    pumpRef.current = pumpQueue;
  }, [pumpQueue]);

  const enqueueFrame = useCallback(
    (index: number, priority = false) => {
      if (index < FRAME_START || index > TOTAL_FRAMES) return;
      if (cacheRef.current.has(index) || pendingRef.current.has(index)) return;
      const attempts = failedRef.current.get(index) ?? 0;
      if (attempts >= MAX_RETRIES) return;

      pendingRef.current.add(index);
      if (priority) queueRef.current.unshift(index);
      else queueRef.current.push(index);
      pumpQueue();
    },
    [pumpQueue],
  );

  const loadFrame = useCallback(
    (index: number): Promise<void> => {
      if (index < FRAME_START || index > TOTAL_FRAMES) return Promise.resolve();
      if (cacheRef.current.has(index)) return Promise.resolve();

      enqueueFrame(index, true);

      // Wait until cached or permanently failed (with timeout so scrub never hangs)
      return new Promise((resolve) => {
        const started = performance.now();
        const tick = () => {
          if (cacheRef.current.has(index)) {
            resolve();
            return;
          }
          const attempts = failedRef.current.get(index) ?? 0;
          if (attempts >= MAX_RETRIES && !pendingRef.current.has(index)) {
            resolve();
            return;
          }
          if (performance.now() - started > 8000) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    [enqueueFrame],
  );

  const prefetchAround = useCallback(
    (center: number) => {
      const dir = lastDirRef.current;
      const ahead = dir >= 0 ? PRELOAD_AHEAD : PRELOAD_BEHIND;
      const behind = dir >= 0 ? PRELOAD_BEHIND : PRELOAD_AHEAD;
      const start = Math.max(FRAME_START, center - behind);
      const end = Math.min(TOTAL_FRAMES, center + ahead);
      if (dir >= 0) {
        for (let i = center; i <= end; i++) enqueueFrame(i, i === center);
        for (let i = center - 1; i >= start; i--) enqueueFrame(i);
      } else {
        for (let i = center; i >= start; i--) enqueueFrame(i, i === center);
        for (let i = center + 1; i <= end; i++) enqueueFrame(i);
      }
    },
    [enqueueFrame],
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
        // Draw nearest immediately so scroll never freezes on a blank/stale canvas
        scheduleDraw(clamped);
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
      const targets = Array.from({ length: batch }, (_, i) => FRAME_START + i);

      // Enqueue whole initial window with concurrency limit
      for (const idx of targets) enqueueFrame(idx, true);

      await Promise.all(
        targets.map(
          (idx) =>
            new Promise<void>((resolve) => {
              const started = performance.now();
              const tick = () => {
                if (cancelled) {
                  resolve();
                  return;
                }
                if (cacheRef.current.has(idx)) {
                  loaded += 1;
                  setLoadProgress(Math.round((loaded / batch) * 100));
                  resolve();
                  return;
                }
                const attempts = failedRef.current.get(idx) ?? 0;
                if (
                  (attempts >= MAX_RETRIES && !pendingRef.current.has(idx)) ||
                  performance.now() - started > 12000
                ) {
                  loaded += 1;
                  setLoadProgress(Math.round((loaded / batch) * 100));
                  resolve();
                  return;
                }
                requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }),
        ),
      );

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
  }, [enqueueFrame, prefetchAround, scheduleDraw]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextW = Math.floor(window.innerWidth * dpr);
      const nextH = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
        ctxRef.current = null;
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
