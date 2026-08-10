"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FRAME_START, TOTAL_FRAMES } from "@/data/cinematic";

const FILM_FPS = 72;
const POSTER = "/TITLE__Satyakabir_Technologies.poster.jpg";
const DESKTOP_MP4 = "/TITLE__Satyakabir_Technologies.scrub.mp4";
const MOBILE_MP4 = "/TITLE__Satyakabir_Technologies.scrub.mobile.mp4";
/** Master file — same bits the user sees when opening the MP4 in a player. */
const MASTER_MP4 = "/TITLE__Satyakabir_Technologies.mp4";

type ScrubMode = "video" | "poster" | "images";

function withBase(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return `${base}${path}`;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function shouldUseMobileAsset() {
  if (typeof window === "undefined") return false;
  const saveData = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  const slow =
    (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection?.effectiveType === "2g" ||
    (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection?.effectiveType === "slow-2g";
  return Boolean(saveData || slow);
}

function framePath(index: number) {
  return withBase(`/frames/frame${String(index).padStart(4, "0")}.jpg`);
}

/**
 * Scroll-scrubbed film.
 *
 * Video mode paints with a native `<video object-fit:cover>` element (same
 * decoder path as a media player) — no canvas redraw, no contrast filters.
 * Canvas is only for poster first-paint and reduced-motion JPG fallback.
 */
export function useFrameScrubber() {
  const [currentFrame, setCurrentFrameState] = useState(FRAME_START);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [nativeVideo, setNativeVideo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const posterRef = useRef<HTMLImageElement | null>(null);
  const modeRef = useRef<ScrubMode>("poster");
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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "medium";
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
    return best;
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
        if (next == null) return;
        drawImageFrame(next);
      });
    },
    [drawImageFrame],
  );

  const pumpSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || modeRef.current !== "video") return;

    const target = targetTimeRef.current;
    if (Math.abs(video.currentTime - target) < 0.005) return;

    try {
      if (
        "fastSeek" in video &&
        typeof (video as unknown as { fastSeek: (t: number) => void })
          .fastSeek === "function"
      ) {
        (video as unknown as { fastSeek: (t: number) => void }).fastSeek(
          target,
        );
      } else {
        video.currentTime = target;
      }
    } catch {
      // Ignore transient seeking errors
    }
  }, []);

  const loadJpg = useCallback(
    (index: number) =>
      new Promise<void>((resolve) => {
        if (cacheRef.current.has(index)) {
          resolve();
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, 1500);

        const img = new Image();
        img.decoding = "async";
        (img as unknown as { fetchPriority: string }).fetchPriority = "high";
        img.src = framePath(index);
        img.onload = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cacheRef.current.set(index, img);
          if (Math.abs(frameRef.current - index) <= 2) {
            scheduleDraw(frameRef.current);
          }
          resolve();
        };
        img.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        };
      }),
    [scheduleDraw],
  );

  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);

  // Continuous 60fps RAF loop with smooth LERP interpolation for liquid mouse-wheel scrubbing
  useEffect(() => {
    let animId: number;
    const loop = () => {
      const target = targetProgressRef.current;
      const diff = target - smoothProgressRef.current;
      if (Math.abs(diff) > 0.0001) {
        smoothProgressRef.current += diff * 0.22;
      } else {
        smoothProgressRef.current = target;
      }

      const clampedFrame = Math.min(
        TOTAL_FRAMES,
        Math.max(
          FRAME_START,
          Math.round(
            FRAME_START + smoothProgressRef.current * (TOTAL_FRAMES - FRAME_START),
          ),
        ),
      );

      if (frameRef.current !== clampedFrame) {
        frameRef.current = clampedFrame;

        if (modeRef.current === "video" && videoRef.current) {
          const video = videoRef.current;
          const t = frameToTime(clampedFrame);
          targetTimeRef.current = t;
          if (Math.abs(video.currentTime - t) >= 0.005) {
            try {
              if (
                "fastSeek" in video &&
                typeof (video as unknown as { fastSeek: (t: number) => void }).fastSeek === "function"
              ) {
                (video as unknown as { fastSeek: (t: number) => void }).fastSeek(t);
              } else {
                video.currentTime = t;
              }
            } catch {
              // Ignore transient seeking errors
            }
          }
        }

        // Schedule canvas draw and preload adjacent JPG frames
        scheduleDraw(clampedFrame);
        for (let i = clampedFrame + 1; i <= Math.min(TOTAL_FRAMES, clampedFrame + 10); i++) {
          void loadJpg(i);
        }
        for (let i = clampedFrame - 1; i >= Math.max(FRAME_START, clampedFrame - 4); i--) {
          void loadJpg(i);
        }

        // Smooth 60fps UI frame sync via requestAnimationFrame
        if (!uiFrameRafRef.current) {
          uiFrameRafRef.current = requestAnimationFrame(() => {
            uiFrameRafRef.current = 0;
            setCurrentFrameState(frameRef.current);
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [frameToTime, loadJpg, scheduleDraw]);

  const uiFrameRafRef = useRef(0);

  const setCurrentFrame = useCallback(
    (frame: number) => {
      const clamped = Math.min(
        TOTAL_FRAMES,
        Math.max(FRAME_START, Math.round(frame)),
      );
      targetProgressRef.current = (clamped - FRAME_START) / (TOTAL_FRAMES - FRAME_START);
    },
    [],
  );

  const setScrubProgress = useCallback(
    (progress: number) => {
      targetProgressRef.current = Math.min(1, Math.max(0, progress));
    },
    [],
  );

  const pumpSeekRef = useRef(pumpSeek);

  useEffect(() => {
    pumpSeekRef.current = pumpSeek;
  }, [pumpSeek]);

  useEffect(() => {
    let cancelled = false;
    let progressTimer = 0;
    let softTimer = 0;
    let hardTimer = 0;
    let waitForVideoEl = 0;

    const onSeeked = () => {
      seekingRef.current = false;
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
      await loadJpg(Math.round((FRAME_START + TOTAL_FRAMES) / 2));
      if (cacheRef.current.size > 0) modeRef.current = "images";
      setNativeVideo(false);
      setLoadProgress(100);
    };

    const waitForVideoNode = () =>
      new Promise<HTMLVideoElement | null>((resolve) => {
        const start = performance.now();
        const tryGet = () => {
          const el = videoRef.current;
          if (el) {
            resolve(el);
            return;
          }
          if (performance.now() - start > 2000) {
            resolve(null);
            return;
          }
          waitForVideoEl = window.setTimeout(tryGet, 16);
        };
        tryGet();
      });

    const bootVideo = () =>
      new Promise<boolean>((resolve) => {
        void waitForVideoNode().then((video) => {
          if (!video || cancelled) {
            resolve(false);
            return;
          }

          video.muted = true;
          video.playsInline = true;
          video.preload = "auto";
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
          video.disablePictureInPicture = true;

          const mobile = shouldUseMobileAsset();
          // Desktop: master first — identical quality to opening the file in a player.
          // Mobile / save-data: lighter scrub encode, then master.
          const sources = mobile
            ? [
                withBase(MOBILE_MP4),
                withBase(MASTER_MP4),
                withBase(DESKTOP_MP4),
              ]
            : [
                withBase(MASTER_MP4),
                withBase(DESKTOP_MP4),
                withBase(MOBILE_MP4),
              ];

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
            setNativeVideo(true);
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
            setLoadProgress((p) => Math.max(p, 35));
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
              setNativeVideo(true);
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
              setNativeVideo(false);
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
              const pct = Math.min(
                99,
                Math.round((end / video.duration) * 100),
              );
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
      });

    const bootImages = async () => {
      modeRef.current = posterRef.current ? "poster" : "images";
      setNativeVideo(false);
      scheduleDraw(FRAME_START);

      // Safety fallback to guarantee loading veil hides within 1.2s on any network connection
      const veilSafetyTimer = setTimeout(() => {
        setIsLoaded(true);
        setLoadProgress(100);
      }, 1200);

      // 1. Concurrently load initial 12 frames for sub-150ms instant first paint over network
      const initialChunk = Array.from({ length: 12 }, (_, i) => FRAME_START + i);
      await Promise.all(initialChunk.map((idx) => loadJpg(idx)));
      clearTimeout(veilSafetyTimer);
      if (cancelled) return;

      modeRef.current = "images";
      setIsLoaded(true);
      setLoadProgress(100);
      scheduleDraw(FRAME_START);

      // 2. Concurrently preload remaining frames in parallel chunks of 16 for zero-lag scrubbing
      const remainingFrames = Array.from(
        { length: TOTAL_FRAMES - (FRAME_START + 12) + 1 },
        (_, i) => FRAME_START + 12 + i,
      );

      const CHUNK_SIZE = 16;
      for (let b = 0; b < remainingFrames.length && !cancelled; b += CHUNK_SIZE) {
        const chunk = remainingFrames.slice(b, b + CHUNK_SIZE);
        await Promise.all(chunk.map((idx) => loadJpg(idx)));
      }
    };

    const boot = async () => {
      // 1. Instantly load poster image so canvas paints background immediately on first network fetch
      await loadPoster();
      if (cancelled) return;

      if (prefersReducedMotion()) {
        await bootReducedMotion();
        if (cancelled) return;
        setIsLoaded(true);
        scheduleDraw(FRAME_START);
        return;
      }

      // 2. Canvas image sequence mode is the primary 60fps/120fps liquid-smooth scrubbing engine
      await bootImages();
    };

    void boot();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      window.clearTimeout(softTimer);
      window.clearTimeout(hardTimer);
      window.clearTimeout(waitForVideoEl);
      if (uiFrameRafRef.current) window.clearTimeout(uiFrameRafRef.current);
      if (drawRafRef.current) cancelAnimationFrame(drawRafRef.current);
      const video = videoRef.current;
      if (video) {
        video.removeEventListener("seeked", onSeeked);
        video.removeAttribute("src");
        video.load();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const resize = () => {
      if (modeRef.current === "video") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const srcW = posterRef.current?.naturalWidth || 1280;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const scale = Math.min(dpr, srcW / Math.max(1, cssW));
      const nextW = Math.max(1, Math.floor(cssW * scale));
      const nextH = Math.max(1, Math.floor(cssH * scale));
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
    videoRef,
    nativeVideo,
    currentFrame,
    setCurrentFrame,
    setScrubProgress,
    totalFrames: TOTAL_FRAMES,
    frameStart: FRAME_START,
    isLoaded,
    loadProgress,
  };
}
