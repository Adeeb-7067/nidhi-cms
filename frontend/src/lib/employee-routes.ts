/** Canonical employee profile routes (shared HRM detail page). */
export function getAdminEmployeeDetailHref(userId: number): string {
  return `/admin/employees/${userId}`;
}

export function getHrmEmployeeDetailHref(userId: number): string {
  return `/hrm/employees/${userId}`;
}

/** @deprecated Use getAdminEmployeeDetailHref — all staff share the same profile page. */
export function getSalesTeamMemberProfileHref(userId: number): string {
  return getAdminEmployeeDetailHref(userId);
}

/** Profile detail for any CMS team member (admin Team roster). */
export function getStaffProfileHref(userId: number, _role?: string, viewerRole?: string): string {
  if (viewerRole === "hr" || viewerRole === "manager") {
    return getHrmEmployeeDetailHref(userId);
  }
  return getAdminEmployeeDetailHref(userId);
}

export function parseEmployeeDetailId(pathname: string): number | null {
  const match = pathname.match(/^\/(?:admin|hrm)\/employees\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function isAdminTeamEmployeeDetail(pathname: string): boolean {
  return /^\/admin\/employees\/\d+/.test(pathname.split("?")[0]);
}

export function isSalesTeamEmployeeDetail(pathname: string): boolean {
  return /^\/sales\/team\/\d+\/profile/.test(pathname.split("?")[0]);
}
