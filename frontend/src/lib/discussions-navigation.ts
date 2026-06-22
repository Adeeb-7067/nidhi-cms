import { getLocationSearch, clearLocationParam } from "@/lib/electron-bridge";

/** Build discussions page URL with optional project pre-selection. */
export function getDiscussionsHref(
  projectId?: number | null,
  options?: {
    internal?: boolean;
    companyTeam?: boolean;
    companyTeamUnofficial?: boolean;
    directConversationId?: number;
  },
): string {
  if (options?.companyTeam) return "/discussions?channel=team";
  if (options?.companyTeamUnofficial) return "/discussions?channel=unofficial";
  if (options?.directConversationId != null && Number.isFinite(options.directConversationId)) {
    return `/discussions?direct=${options.directConversationId}`;
  }
  if (projectId == null || !Number.isFinite(projectId)) return "/discussions";
  const params = new URLSearchParams({ project: String(projectId) });
  if (options?.internal) params.set("channel", "internal");
  return `/discussions?${params.toString()}`;
}

/** Read `?project=` from the current URL (discussions deep-link). */
export function readDiscussionsProjectIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(getLocationSearch()).get("project");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function readDiscussionsDirectConversationIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(getLocationSearch()).get("direct");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function readDiscussionsChannelFromUrl():
  | "project"
  | "project_internal"
  | "company_team"
  | "company_team_unofficial"
  | "direct"
  | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(getLocationSearch()).get("channel");
  if (raw === "internal") return "project_internal";
  if (raw === "team" || raw === "official") return "company_team";
  if (raw === "unofficial" || raw === "team-unofficial") return "company_team_unofficial";
  if (raw === "direct") return "direct";
  return null;
}

/** Remove deep-link params after the target channel has been opened. */
export function clearDiscussionsProjectFromUrl(): void {
  clearLocationParam("project");
  clearLocationParam("direct");
  clearLocationParam("channel");
}

/** Select a project channel in state (sidebar click). */
export function selectDiscussionsProject(
  projectId: number,
  setSelectedProjectId: (id: number) => void,
): void {
  setSelectedProjectId(projectId);
  clearDiscussionsProjectFromUrl();
}
