"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FRAME_START, TOTAL_FRAMES } from "@/data/cinematic";

/** Logical film stills were baked at 72fps from a ~10s master. */
const FILM_FPS = 72;
const SCRUB_SRC = "/TITLE__Satyakabir_Technologies.scrub.mp4";
const FALLBACK_SRC = "/TITLE__Satyakabir_Technologies.mp4";

function withBase(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return `${base}${path}`;
}

function framePath(index: number) {
  return withBase(`/frames/frame${String(index).padStart(4, "0")}.jpg`);
}

/**
 * Canvas scrubber — prefers a single MP4 seek (reliable on servers),
 * falls back to the JPG sequence if video cannot load.
 */
export function useFrameScrubber() {
  const [currentFrame, setCurrentFrameState] = useState(FRAME_START);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modeRef = useRef<"video" | "images">("video");
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const frameRef = useRef(FRAME_START);
  const durationRef = useRef(TOTAL_FRAMES / FILM_FPS);
  const seekingRef = useRef(false);
  const targetTimeRef = useRef(0);
  const drawRafRef = useRef(0);
  const pendingDrawRef = useRef<number | null>(null);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!ctx) return null;
      ctxRef.current = ctx;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
    }
    return ctx;
  }, []);

  const coverDraw = useCallback(
    (source: CanvasImageSource, sw: number, sh: number) => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx || sw <= 0 || sh <= 0) return;

      const w = canvas.width;
      const h = canvas.height;
      const canvasRatio = w / h;
      const srcRatio = sw / sh;

      let drawWidth = w;
      let drawHeight = h;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasRatio > srcRatio) {
        drawHeight = w / srcRatio;
        offsetY = (h - drawHeight) / 2;
      } else {
        drawWidth = h * srcRatio;
        offsetX = (w - drawWidth) / 2;
      }

      ctx.fillStyle = "#020305";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
    },
    [getCtx],
  );

  const frameToTime = useCallback((frame: number) => {
    const dur = durationRef.current;
    if (!Number.isFinite(dur) || dur <= 0) return 0;
    const t = ((frame - 1) / Math.max(1, TOTAL_FRAMES - 1)) * dur;
    return Math.min(Math.max(0, t), Math.max(0, dur - 0.04));
  }, []);

  const drawVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth <= 0) return;
    coverDraw(video, video.videoWidth, video.videoHeight);
  }, [coverDraw]);

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
    if (best != null && bestDist <= 36) return best;
    return null;
  }, []);

  const drawImageFrame = useCallback(
    (index: number) => {
      const drawIndex = nearestCached(index);
      if (drawIndex == null) return;
      const img = cacheRef.current.get(drawIndex);
      if (!img) return;
      coverDraw(img, img.width, img.height);
    },
    [coverDraw, nearestCached],
  );

  const scheduleDraw = useCallback(
    (index: number) => {
      pendingDrawRef.current = index;
      if (drawRafRef.current) return;
      drawRafRef.current = requestAnimationFrame(() => {
        drawRafRef.current = 0;
        const next = pendingDrawRef.current;
        pendingDrawRef.current = null;
        if (next == null || next !== frameRef.current) return;
        if (modeRef.current === "video") drawVideo();
        else drawImageFrame(next);
      });
    },
    [drawImageFrame, drawVideo],
  );

  const pumpSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || modeRef.current !== "video") return;
    if (seekingRef.current) return;

    const target = targetTimeRef.current;
    if (Math.abs(video.currentTime - target) < 0.012) {
      drawVideo();
      return;
    }

    seekingRef.current = true;
    try {
      video.currentTime = target;
    } catch {
      seekingRef.current = false;
    }
  }, [drawVideo]);

  // Stable seeked handler via ref so boot effect does not re-run
  const pumpSeekRef = useRef(pumpSeek);
  const drawVideoRef = useRef(drawVideo);
  pumpSeekRef.current = pumpSeek;
  drawVideoRef.current = drawVideo;

  const loadJpg = useCallback(
    (index: number) =>
      new Promise<void>((resolve) => {
        if (cacheRef.current.has(index)) {
          resolve();
          return;
        }
        const img = new Image();
        img.decoding = "async";
        img.src = framePath(index);
        img.onload = () => {
          cacheRef.current.set(index, img);
          while (cacheRef.current.size > 64) {
            const oldest = cacheRef.current.keys().next().value as number | undefined;
            if (oldest === undefined || oldest === frameRef.current) break;
            cacheRef.current.delete(oldest);
          }
          if (frameRef.current === index) scheduleDraw(index);
          resolve();
        };
        img.onerror = () => resolve();
      }),
    [scheduleDraw],
  );

  const setCurrentFrame = useCallback(
    (frame: number) => {
      const clamped = Math.min(TOTAL_FRAMES, Math.max(FRAME_START, Math.round(frame)));
      if (frameRef.current === clamped) return;
      frameRef.current = clamped;
      setCurrentFrameState(clamped);

      if (modeRef.current === "video") {
        targetTimeRef.current = frameToTime(clamped);
        pumpSeek();
        return;
      }

      scheduleDraw(clamped);
      void loadJpg(clamped).then(() => {
        if (frameRef.current === clamped) scheduleDraw(clamped);
      });
      for (let i = clamped + 1; i <= Math.min(TOTAL_FRAMES, clamped + 12); i++) void loadJpg(i);
      for (let i = clamped - 1; i >= Math.max(FRAME_START, clamped - 6); i--) void loadJpg(i);
    },
    [frameToTime, loadJpg, pumpSeek, scheduleDraw],
  );

  useEffect(() => {
    let cancelled = false;
    let progressTimer = 0;
    let softTimer = 0;
    let hardTimer = 0;

    const onSeeked = () => {
      seekingRef.current = false;
      drawVideoRef.current();
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - targetTimeRef.current) > 0.02) {
        pumpSeekRef.current();
      }
    };

    const bootVideo = () =>
      new Promise<boolean>((resolve) => {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.disablePictureInPicture = true;
        video.controls = false;
        video.style.cssText =
          "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:0";
        document.body.appendChild(video);
        videoRef.current = video;

        const sources = [withBase(SCRUB_SRC), withBase(FALLBACK_SRC)];
        let sourceIdx = 0;
        let settled = false;

        const detachBootListeners = () => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("progress", onProgress);
          video.removeEventListener("error", onError);
          window.clearInterval(progressTimer);
          window.clearTimeout(softTimer);
          window.clearTimeout(hardTimer);
        };

        const succeed = () => {
          if (settled || cancelled) return;
          settled = true;
          detachBootListeners();
          modeRef.current = "video";
          durationRef.current =
            Number.isFinite(video.duration) && video.duration > 0
              ? video.duration
              : TOTAL_FRAMES / FILM_FPS;
          video.addEventListener("seeked", onSeeked);
          targetTimeRef.current = frameToTime(FRAME_START);
          try {
            video.currentTime = targetTimeRef.current;
          } catch {
            /* ignore */
          }
          setLoadProgress(100);
          resolve(true);
        };

        const failOver = () => {
          if (settled) return;
          sourceIdx += 1;
          if (sourceIdx < sources.length) {
            video.src = sources[sourceIdx];
            video.load();
            return;
          }
          settled = true;
          detachBootListeners();
          video.removeEventListener("seeked", onSeeked);
          video.removeAttribute("src");
          video.load();
          video.remove();
          videoRef.current = null;
          resolve(false);
        };

        const onMeta = () => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            durationRef.current = video.duration;
          }
        };

        const onCanPlay = () => {
          if (video.readyState >= 2) succeed();
        };

        const onProgress = () => {
          try {
            if (!video.duration || !video.buffered.length) return;
            const end = video.buffered.end(video.buffered.length - 1);
            const pct = Math.min(99, Math.round((end / video.duration) * 100));
            setLoadProgress((p) => Math.max(p, pct));
            if (end / video.duration >= 0.85 && video.readyState >= 3) succeed();
          } catch {
            /* ignore */
          }
        };

        const onError = () => failOver();

        video.addEventListener("loadedmetadata", onMeta);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("progress", onProgress);
        video.addEventListener("error", onError);

        softTimer = window.setTimeout(() => {
          if (!settled && video.readyState >= 2) succeed();
        }, 3500);
        hardTimer = window.setTimeout(() => {
          if (!settled) failOver();
        }, 12000);

        progressTimer = window.setInterval(() => {
          if (settled) return;
          setLoadProgress((p) => (p < 90 ? p + 1 : p));
        }, 120);

        video.src = sources[0];
        video.load();
      });

    const bootImages = async () => {
      modeRef.current = "images";
      const batch = Math.min(36, TOTAL_FRAMES - FRAME_START + 1);
      let loaded = 0;
      const chunk = 6;
      for (let offset = 0; offset < batch && !cancelled; offset += chunk) {
        const slice = Array.from(
          { length: Math.min(chunk, batch - offset) },
          (_, i) => FRAME_START + offset + i,
        );
        await Promise.all(
          slice.map((idx) =>
            loadJpg(idx).then(() => {
              if (cancelled) return;
              loaded += 1;
              setLoadProgress(Math.round((loaded / batch) * 100));
            }),
          ),
        );
      }
    };

    const boot = async () => {
      const ok = await bootVideo();
      if (cancelled) return;
      if (!ok) await bootImages();
      if (cancelled) return;
      setIsLoaded(true);
      scheduleDraw(FRAME_START);
    };

    void boot();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      window.clearTimeout(softTimer);
      window.clearTimeout(hardTimer);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      const video = videoRef.current;
      if (video) {
        video.removeEventListener("seeked", onSeeked);
        video.removeAttribute("src");
        video.load();
        video.remove();
        videoRef.current = null;
      }
    };
    // Boot once on mount — helpers are stable enough via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
