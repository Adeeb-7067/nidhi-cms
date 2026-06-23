/** Canonical employee profile routes (HRM detail page). */
export function getAdminEmployeeDetailHref(userId: number): string {
  return `/admin/employees/${userId}`;
}

export function getHrmEmployeeDetailHref(userId: number): string {
  return `/hrm/employees/${userId}`;
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
