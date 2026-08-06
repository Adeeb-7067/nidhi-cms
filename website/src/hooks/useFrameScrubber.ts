"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FRAME_START, TOTAL_FRAMES } from "@/data/cinematic";

const FILM_FPS = 72;
const POSTER = "/TITLE__Satyakabir_Technologies.poster.jpg";
const DESKTOP_MP4 = "/TITLE__Satyakabir_Technologies.scrub.mp4";
const MOBILE_MP4 = "/TITLE__Satyakabir_Technologies.scrub.mobile.mp4";
const FALLBACK_MP4 = "/TITLE__Satyakabir_Technologies.mp4";

type ScrubMode = "video" | "poster" | "images";

function withBase(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return `${base}${path}`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shouldUseMobileAsset() {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
  const slow =
    (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
      ?.effectiveType === "2g" ||
    (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
      ?.effectiveType === "slow-2g";
  return Boolean(narrow || saveData || slow);
}

function framePath(index: number) {
  return withBase(`/frames/frame${String(index).padStart(4, "0")}.jpg`);
}

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: unknown) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Canvas scrubber — dense-keyframe MP4 seek (mobile/desktop variants),
 * poster first-paint, reduced-motion static path, optional JPG fallback.
 */
export function useFrameScrubber() {
  const [currentFrame, setCurrentFrameState] = useState(FRAME_START);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const posterRef = useRef<HTMLImageElement | null>(null);
  const modeRef = useRef<ScrubMode>("poster");
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const frameRef = useRef(FRAME_START);
  const durationRef = useRef(TOTAL_FRAMES / FILM_FPS);
  const seekingRef = useRef(false);
  const targetTimeRef = useRef(0);
  const drawRafRef = useRef(0);
  const pendingDrawRef = useRef<number | null>(null);
  const rvfcIdRef = useRef(0);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!ctx) return null;
      ctxRef.current = ctx;
      ctx.imageSmoothingEnabled = true;
      // High-quality resampling when the 720p scrub film fills a larger canvas.
      ctx.imageSmoothingQuality = "high";
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

  const drawPoster = useCallback(() => {
    const img = posterRef.current;
    if (!img || !img.complete || img.naturalWidth <= 0) return;
    coverDraw(img, img.naturalWidth, img.naturalHeight);
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
      if (drawIndex == null) {
        drawPoster();
        return;
      }
      const img = cacheRef.current.get(drawIndex);
      if (!img) return;
      coverDraw(img, img.width, img.height);
    },
    [coverDraw, drawPoster, nearestCached],
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
        else if (modeRef.current === "poster") drawPoster();
        else drawImageFrame(next);
      });
    },
    [drawImageFrame, drawPoster, drawVideo],
  );

  const scheduleVideoFrameDraw = useCallback(() => {
    const video = videoRef.current as VideoWithRVFC | null;
    if (!video) {
      drawVideo();
      return;
    }
    if (typeof video.requestVideoFrameCallback === "function") {
      if (rvfcIdRef.current && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(rvfcIdRef.current);
      }
      rvfcIdRef.current = video.requestVideoFrameCallback(() => {
        rvfcIdRef.current = 0;
        drawVideo();
      });
      return;
    }
    drawVideo();
  }, [drawVideo]);

  const pumpSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || modeRef.current !== "video") return;
    if (seekingRef.current) return;

    const target = targetTimeRef.current;
    if (Math.abs(video.currentTime - target) < 0.012) {
      scheduleVideoFrameDraw();
      return;
    }

    seekingRef.current = true;
    try {
      video.currentTime = target;
    } catch {
      seekingRef.current = false;
    }
  }, [scheduleVideoFrameDraw]);

  const pumpSeekRef = useRef(pumpSeek);
  const scheduleVideoFrameDrawRef = useRef(scheduleVideoFrameDraw);
  pumpSeekRef.current = pumpSeek;
  scheduleVideoFrameDrawRef.current = scheduleVideoFrameDraw;

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
          while (cacheRef.current.size > 48) {
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

      if (modeRef.current === "poster") {
        scheduleDraw(clamped);
        return;
      }

      scheduleDraw(clamped);
      void loadJpg(clamped).then(() => {
        if (frameRef.current === clamped) scheduleDraw(clamped);
      });
      for (let i = clamped + 1; i <= Math.min(TOTAL_FRAMES, clamped + 10); i++) void loadJpg(i);
      for (let i = clamped - 1; i >= Math.max(FRAME_START, clamped - 4); i--) void loadJpg(i);
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
      scheduleVideoFrameDrawRef.current();
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - targetTimeRef.current) > 0.02) {
        pumpSeekRef.current();
      }
    };

    const loadPoster = () =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = withBase(POSTER);
        img.onload = () => {
          posterRef.current = img;
          modeRef.current = "poster";
          drawPoster();
          setLoadProgress((p) => Math.max(p, 12));
          resolve(true);
        };
        img.onerror = () => resolve(false);
      });

    const bootReducedMotion = async () => {
      modeRef.current = "poster";
      await loadPoster();
      // Prefer a mid-story still if frames exist locally; otherwise keep poster.
      await loadJpg(Math.round((FRAME_START + TOTAL_FRAMES) / 2));
      if (cacheRef.current.size > 0) modeRef.current = "images";
      setLoadProgress(100);
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

        const mobile = shouldUseMobileAsset();
        // Prefer dense-keyframe MP4s (desktop ~4MB / mobile ~1.5MB).
        const sources = mobile
          ? [withBase(MOBILE_MP4), withBase(DESKTOP_MP4), withBase(FALLBACK_MP4)]
          : [withBase(DESKTOP_MP4), withBase(MOBILE_MP4), withBase(FALLBACK_MP4)];

        let sourceIdx = 0;
        let settled = false;
        let painted = false;

        const detachBootListeners = () => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.removeEventListener("loadeddata", onLoadedData);
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("progress", onProgress);
          video.removeEventListener("error", onError);
          window.clearInterval(progressTimer);
          window.clearTimeout(softTimer);
          window.clearTimeout(hardTimer);
        };

        const paintFirst = () => {
          if (painted || cancelled) return;
          if (video.readyState < 2 || video.videoWidth <= 0) return;
          painted = true;
          modeRef.current = "video";
          durationRef.current =
            Number.isFinite(video.duration) && video.duration > 0
              ? video.duration
              : TOTAL_FRAMES / FILM_FPS;
          targetTimeRef.current = frameToTime(FRAME_START);
          try {
            video.currentTime = targetTimeRef.current;
          } catch {
            /* ignore */
          }
          scheduleVideoFrameDrawRef.current();
          setLoadProgress((p) => Math.max(p, 35));
          // Unlock UI as soon as first frame can paint — keep buffering in background
          if (!settled) {
            settled = true;
            video.addEventListener("seeked", onSeeked);
            setIsLoaded(true);
            resolve(true);
          }
        };

        const finish = () => {
          if (cancelled) return;
          detachBootListeners();
          setLoadProgress(100);
          if (!settled) {
            settled = true;
            modeRef.current = "video";
            video.addEventListener("seeked", onSeeked);
            setIsLoaded(true);
            resolve(true);
          }
        };

        const failOver = () => {
          if (settled && painted) return;
          sourceIdx += 1;
          if (sourceIdx < sources.length) {
            painted = false;
            video.src = sources[sourceIdx];
            video.load();
            return;
          }
          if (!settled) {
            settled = true;
            detachBootListeners();
            video.removeEventListener("seeked", onSeeked);
            video.removeAttribute("src");
            video.load();
            video.remove();
            videoRef.current = null;
            resolve(false);
          }
        };

        const onMeta = () => {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            durationRef.current = video.duration;
          }
        };

        const onLoadedData = () => paintFirst();
        const onCanPlay = () => paintFirst();

        const onProgress = () => {
          try {
            if (!video.duration || !video.buffered.length) return;
            const end = video.buffered.end(video.buffered.length - 1);
            const pct = Math.min(99, Math.round((end / video.duration) * 100));
            setLoadProgress((p) => Math.max(p, pct));
            paintFirst();
            if (end / video.duration >= 0.7) finish();
          } catch {
            /* ignore */
          }
        };

        const onError = () => failOver();

        video.addEventListener("loadedmetadata", onMeta);
        video.addEventListener("loadeddata", onLoadedData);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("progress", onProgress);
        video.addEventListener("error", onError);

        softTimer = window.setTimeout(() => {
          if (video.readyState >= 2) {
            paintFirst();
            finish();
          }
        }, 2200);
        hardTimer = window.setTimeout(() => {
          if (!settled) failOver();
          else finish();
        }, 10000);

        progressTimer = window.setInterval(() => {
          if (settled) return;
          setLoadProgress((p) => (p < 90 ? p + 1 : p));
        }, 140);

        video.src = sources[0];
        video.load();
      });

    const bootImages = async () => {
      modeRef.current = posterRef.current ? "poster" : "images";
      scheduleDraw(FRAME_START);
      const batch = Math.min(24, TOTAL_FRAMES - FRAME_START + 1);
      let loaded = 0;
      for (let i = 0; i < batch && !cancelled; i++) {
        const idx = FRAME_START + i;
        await loadJpg(idx);
        if (cancelled) return;
        loaded += 1;
        modeRef.current = "images";
        setLoadProgress(Math.round((loaded / batch) * 100));
        if (i === 0) scheduleDraw(FRAME_START);
      }
    };

    const boot = async () => {
      await loadPoster();
      if (cancelled) return;

      if (prefersReducedMotion()) {
        await bootReducedMotion();
        if (cancelled) return;
        setIsLoaded(true);
        scheduleDraw(FRAME_START);
        return;
      }

      const ok = await bootVideo();
      if (cancelled) return;
      if (!ok) {
        await bootImages();
        if (cancelled) return;
        setIsLoaded(true);
        scheduleDraw(FRAME_START);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      window.clearTimeout(softTimer);
      window.clearTimeout(hardTimer);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      const video = videoRef.current as VideoWithRVFC | null;
      if (video) {
        if (rvfcIdRef.current && video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(rvfcIdRef.current);
        }
        video.removeEventListener("seeked", onSeeked);
        video.removeAttribute("src");
        video.load();
        video.remove();
        videoRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Size the backing store to real device pixels so the frame is resampled
      // once (video → canvas) instead of twice (video → canvas → compositor).
      // Capped because the source film is 1280×720: past ~2× source width the
      // extra pixels only cost fill rate, they cannot add detail.
      const MAX_W = 2560;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const scale = Math.min(dpr, MAX_W / Math.max(1, cssW));
      const nextW = Math.floor(cssW * scale);
      const nextH = Math.floor(cssH * scale);
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
