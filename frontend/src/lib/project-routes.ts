import type { UserRole } from "@/lib/user-roles";
import { isDevPortalRole } from "@/lib/navigation";

/** List page for projects — role-appropriate (avoids admin-only /admin/projects for dev/QA). */
export function getProjectsListHref(role: UserRole | string | undefined): string {
  if (role === "super_admin") return "/admin/projects";
  if (role === "bde") return "/sales/bde/projects";
  if (role === "digital") return "/marketing/projects";
  if (isDevPortalRole(role)) return "/dev/projects";
  if (role === "client") return "/client";
  return "/dev/projects";
}

/** Project hub detail (shared route; access enforced by API). */
export function getProjectDetailHref(
  projectId: number | string,
  role?: UserRole | string | null,
  type?: string | null,
): string {
  if (type === "digital") return `/marketing/projects/${projectId}`;
  if (role === "super_admin") return `/admin/projects/${projectId}`;
  if (role === "bde") return `/admin/projects/${projectId}`;
  if (role && isDevPortalRole(role)) return `/dev/projects/${projectId}`;
  return `/admin/projects/${projectId}`;
}
