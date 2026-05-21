/** Build discussions page URL with optional project pre-selection. */
export function getDiscussionsHref(projectId?: number | null): string {
  if (projectId == null || !Number.isFinite(projectId)) return "/admin/discussions";
  return `/admin/discussions?project=${projectId}`;
}

/** Read `?project=` from the current URL (discussions deep-link). */
export function readDiscussionsProjectIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("project");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}
