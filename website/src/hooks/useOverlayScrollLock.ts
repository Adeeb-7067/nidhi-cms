"use client";

import { useEffect } from "react";
import {
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
} from "@/lib/lenis-control";

/**
 * Locks document scroll while `active` is true.
 * Safe with overlapping overlays (ref-counted) and always releases on unmount.
 */
export function useOverlayScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquireOverlayScrollLock();
    return () => releaseOverlayScrollLock();
  }, [active]);
}
