/** Build discussions page URL with optional project pre-selection. */
export function getDiscussionsHref(
  projectId?: number | null,
  options?: { internal?: boolean; companyTeam?: boolean },
): string {
  if (options?.companyTeam) return "/discussions?channel=team";
  if (projectId == null || !Number.isFinite(projectId)) return "/discussions";
  const params = new URLSearchParams({ project: String(projectId) });
  if (options?.internal) params.set("channel", "internal");
  return `/discussions?${params.toString()}`;
}

/** Read `?project=` from the current URL (discussions deep-link). */
export function readDiscussionsProjectIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("project");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function readDiscussionsChannelFromUrl():
  | "project"
  | "project_internal"
  | "company_team"
  | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("channel");
  if (raw === "internal") return "project_internal";
  if (raw === "team") return "company_team";
  return null;
}

/** Remove `?project=` after the deep-link channel has been opened. */
export function clearDiscussionsProjectFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("project")) return;
  url.searchParams.delete("project");
  const next = url.pathname + (url.search ? url.search : "");
  window.history.replaceState({}, "", next);
}

/** Select a project channel in state (sidebar click). */
export function selectDiscussionsProject(
  projectId: number,
  setSelectedProjectId: (id: number) => void,
): void {
  setSelectedProjectId(projectId);
  clearDiscussionsProjectFromUrl();
}
