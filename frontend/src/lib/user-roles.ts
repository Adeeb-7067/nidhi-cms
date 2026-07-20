export type UserRole =
  | "super_admin"
  | "hr"
  | "manager"
  | "developer"
  | "tester"
  | "qa"
  | "client"
  | "freelancer"
  | "bde"
  | "finance"
  | "digital"
  | (string & {});

/** Same delivery permissions as developer — only the display label differs. */
export const DEVELOPER_STAFF_ROLES: UserRole[] = ["developer", "freelancer"];

export const DEV_PORTAL_STAFF_ROLES: UserRole[] = [
  "manager",
  "developer",
  "tester",
  "qa",
  "freelancer",
];

export const STAFF_EMPLOYEE_ROLES: UserRole[] = [
  "manager",
  "developer",
  "tester",
  "qa",
  "freelancer",
  "bde",
  "finance",
  "digital",
];

/** Everyone listed on Admin → Team (non-client internal accounts). */
export const ADMIN_STAFF_ROLES: UserRole[] = [
  "super_admin",
  "hr",
  ...STAFF_EMPLOYEE_ROLES,
];

/** Super admin view-as: any active internal team member (clients use Admin → Clients). */
export const IMPERSONATABLE_STAFF_ROLES: UserRole[] = [...ADMIN_STAFF_ROLES];

/** HRM payroll / leave / employee directory — company employees only (not freelancers). */
export const HRM_EMPLOYEE_ROLES: UserRole[] = ["hr", "manager", "developer", "tester", "qa", "bde", "finance", "digital"];

/** Screenshot / attendance monitoring — mirrors developer for freelancers. */
export const MONITORABLE_STAFF_ROLES: UserRole[] = [
  "manager",
  "developer",
  "tester",
  "qa",
  "freelancer",
  "digital",
];

export const HRM_ADMIN_ROLES: UserRole[] = ["super_admin", "hr"];

/** Clock in/out for attendance tracking — every staff role except super_admin (view only) and client (external). */
export const CLOCKABLE_STAFF_ROLES: UserRole[] = ["hr", ...STAFF_EMPLOYEE_ROLES];

/** Roles that can access CRM & Sales — super_admin manages, bde operates */
export const SALES_STAFF_ROLES: UserRole[] = ["super_admin", "bde"];

/** All internal staff (non-client) — nav visibility is driven by the permission matrix. */
export const INTERNAL_STAFF_ROLES: UserRole[] = [
  "super_admin",
  "hr",
  "bde",
  "finance",
  "digital",
  ...DEV_PORTAL_STAFF_ROLES,
];

export const ALL_AUTHENTICATED_ROLES: UserRole[] = [
  ...INTERNAL_STAFF_ROLES,
  "client",
];

/** Roles that can open /profile (matches PageOutlet RoleGate). */
export const PROFILE_PAGE_ROLES: UserRole[] = [
  "super_admin",
  "hr",
  "bde",
  "finance",
  "digital",
  ...DEV_PORTAL_STAFF_ROLES,
  "client",
];

/**
 * Always use the compact account form on /profile — even when employeeId is set.
 * Company HRM staff with employeeId get the full self-service employee form instead.
 */
export const SIMPLE_PROFILE_ONLY_ROLES: UserRole[] = ["super_admin", "client", "freelancer"];

export function usesSimpleProfileOnly(role: UserRole | string | undefined): boolean {
  return !!role && SIMPLE_PROFILE_ONLY_ROLES.includes(role as UserRole);
}

export function usesEmployeeSelfProfileOnPage(
  role: UserRole | string | undefined,
  employeeId?: string | null,
): boolean {
  if (!role || usesSimpleProfileOnly(role)) return false;
  return Boolean(employeeId?.trim());
}

export function isHrmAdminRole(role: UserRole | string | undefined): boolean {
  return !!role && HRM_ADMIN_ROLES.includes(role as UserRole);
}

export function canAccessHrm(role: UserRole | string | undefined): boolean {
  return !!role && role !== "client";
}

export function isDeveloperRole(role: UserRole | string | undefined): boolean {
  return !!role && DEVELOPER_STAFF_ROLES.includes(role as UserRole);
}

export function isDevPortalRole(role: UserRole | string | undefined): boolean {
  return !!role && DEV_PORTAL_STAFF_ROLES.includes(role as UserRole);
}

export function isStaffEmployeeRole(role: UserRole | string | undefined): boolean {
  return !!role && STAFF_EMPLOYEE_ROLES.includes(role as UserRole);
}

export function isImpersonatableStaffRole(role: UserRole | string | undefined): boolean {
  return !!role && IMPERSONATABLE_STAFF_ROLES.includes(role as UserRole);
}

export function isHrmEmployeeRole(role: UserRole | string | undefined): boolean {
  return !!role && HRM_EMPLOYEE_ROLES.includes(role as UserRole);
}

export function isMonitorableStaffRole(role: UserRole | string | undefined): boolean {
  return !!role && MONITORABLE_STAFF_ROLES.includes(role as UserRole);
}

export function isClockableStaffRole(role: UserRole | string | undefined): boolean {
  return !!role && CLOCKABLE_STAFF_ROLES.includes(role as UserRole);
}

export function isQaStaffRole(role: UserRole | string | undefined): boolean {
  return role === "tester" || role === "qa";
}

/** Short assignee label in task/bug pickers (freelancer shown as Dev). */
export function assigneeRoleShortLabel(role: string | undefined): string {
  if (role === "tester" || role === "qa") return "QA";
  if (role === "manager") return "Mgr";
  return "Dev";
}

export function formatStaffRoleLabel(role: string): string {
  if (role === "super_admin") return "Admin";
  if (role === "hr") return "HR";
  if (role === "manager") return "Manager";
  if (role === "qa") return "QA";
  if (role === "tester") return "Tester";
  if (role === "freelancer") return "Freelancer";
  if (role === "bde") return "BDE";
  if (role === "finance") return "Finance";
  if (role === "digital") return "Digital Specialist";
  if (role === "developer") return "Developer";
  return role.replace(/_/g, " ");
}

export function staffRoleBadgeClass(role: string): string {
  if (role === "super_admin") return "bg-purple-500/10 text-purple-500";
  if (role === "hr") return "bg-pink-500/10 text-pink-700";
  if (role === "manager") return "bg-indigo-500/10 text-indigo-700";
  if (role === "qa") return "bg-amber-500/10 text-amber-700";
  if (role === "tester") return "bg-cyan-500/10 text-cyan-700";
  if (role === "freelancer") return "bg-blue-500/10 text-blue-500";
  if (role === "bde") return "bg-emerald-500/10 text-emerald-700";
  if (role === "finance") return "bg-violet-500/10 text-violet-700";
  if (role === "digital") return "bg-teal-500/10 text-teal-700";
  return "bg-blue-500/10 text-blue-500";
}

/** Shared badge styling for developer-like roles in comment threads. */
export function developerLikeRoleBadgeClass(role: string | undefined): string | null {
  if (isDeveloperRole(role)) return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  return null;
}
