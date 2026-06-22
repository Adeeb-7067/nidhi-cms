import type { UserRole } from "@/lib/user-roles";
import { isDevPortalRole } from "@/lib/navigation";

/** List page for projects — role-appropriate (avoids admin-only /admin/projects for dev/QA). */
export function getProjectsListHref(role: UserRole | string | undefined): string {
  if (role === "super_admin") return "/admin/projects";
  if (isDevPortalRole(role)) return "/dev/projects";
  if (role === "client") return "/client";
  return "/dev/projects";
}

/** Project hub detail (shared route; access enforced by API). */
export function getProjectDetailHref(projectId: number | string): string {
  return `/admin/projects/${projectId}`;
}
