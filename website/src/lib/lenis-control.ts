/**
 * Overlay scroll lock for Mission Control / modals / mobile nav.
 *
 * IMPORTANT: Do not call `lenis.stop()`. When Lenis is stopped it
 * `preventDefault`s every wheel event, and a missed `start()` leaves the
 * whole site unable to scroll. Instead we set a flag that Lenis `prevent`
 * reads — Lenis skips smooth-scrolling, and body lock blocks native page
 * scroll. Panels marked `data-lenis-prevent` still scroll themselves.
 *
 * Uses a ref-count so nested/overlapping overlays (menu → search) cannot
 * unlock the page early or leave overflow:hidden stuck after close.
 */

let lockCount = 0;
let savedScrollY = 0;
let overlayLocked = false;

export function isOverlayScrollLocked() {
  return overlayLocked;
}

function applyLock() {
  if (typeof document === "undefined") return;
  savedScrollY = window.scrollY;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  overlayLocked = true;
}

function clearLock() {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty("overflow");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("top");
  document.body.style.removeProperty("left");
  document.body.style.removeProperty("right");
  document.body.style.removeProperty("width");
  overlayLocked = false;
  window.scrollTo(0, savedScrollY);
}

/** Acquire one lock (pair with releaseOverlayScrollLock). */
export function acquireOverlayScrollLock() {
  lockCount += 1;
  if (lockCount === 1) applyLock();
}

/** Release one lock. Safe to call when already unlocked. */
export function releaseOverlayScrollLock() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) clearLock();
}

/**
 * Boolean helper for simple open/close effects.
 * Prefer `useOverlayScrollLock` in components — it cleans up on unmount.
 */
export function setOverlayScrollLock(locked: boolean) {
  if (locked) acquireOverlayScrollLock();
  else releaseOverlayScrollLock();
}

/** Force-clear every lock (HMR / hard reset). */
export function resetOverlayScrollLock() {
  lockCount = 0;
  if (overlayLocked) clearLock();
}
