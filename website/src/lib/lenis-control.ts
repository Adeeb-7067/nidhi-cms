/**
 * Overlay scroll lock for Mission Control / modals.
 *
 * IMPORTANT: Do not call `lenis.stop()`. When Lenis is stopped it
 * `preventDefault`s every wheel event, and a missed `start()` leaves the
 * whole site unable to scroll. Instead we set a flag that Lenis `prevent`
 * reads — Lenis skips smooth-scrolling, and `overflow: hidden` blocks native
 * page scroll. Panels marked `data-lenis-prevent` still scroll themselves.
 */

let overlayLocked = false;

export function isOverlayScrollLocked() {
  return overlayLocked;
}

export function setOverlayScrollLock(locked: boolean) {
  overlayLocked = locked;
  if (typeof document === "undefined") return;
  if (locked) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  } else {
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
  }
}
