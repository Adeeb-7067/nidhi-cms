/** HRM permission modules — keep in sync with backend constants/hrm.js */
export const HRM_MODULES = [
  "dashboard",
  "employees",
  "departments",
  "attendance",
  "leave",
  "wfh",
  "shifts",
  "holidays",
  "payroll",
  "roles",
  "settings",
  "audit",
  "recruitment",
  "onboarding",
  "documents",
  "policies",
  "id_cards",
  "my_attendance",
  "my_leave",
  "my_wfh",
  "my_payslips",
  "my_holidays",
] as const;

export type HrmModule = (typeof HRM_MODULES)[number];
export type HrmAction = "view" | "create" | "edit" | "delete" | "approve" | "finalize" | "export";

export type HrmPermission = { module: HrmModule; action: HrmAction };

export const HRM_MODULE_LABELS: Record<HrmModule, string> = {
  dashboard: "Dashboard",
  employees: "Employees",
  departments: "Departments",
  attendance: "Attendance",
  leave: "Leave",
  wfh: "WFH",
  shifts: "Shifts",
  holidays: "Holidays",
  payroll: "Payroll",
  roles: "Roles & Permissions",
  settings: "HRM Settings",
  audit: "Audit Log",
  recruitment: "Recruitment",
  onboarding: "Onboarding",
  documents: "Documents",
  policies: "Policies",
  id_cards: "ID Cards",
  my_attendance: "My Attendance",
  my_leave: "My Leave",
  my_wfh: "My WFH",
  my_payslips: "My Payslips",
  my_holidays: "My Holidays",
};

export const HRM_ACTION_LABELS: Record<HrmAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  finalize: "Finalize",
  export: "Export",
};

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: "Present",
  onsite: "Onsite",
  late: "Onsite",
  absent: "Absent",
  on_leave: "On leave",
  wfh: "WFH",
  half_day: "Half day",
  holiday: "Holiday",
  weekend: "Weekend",
  short: "Half day",
  scheduled: "Scheduled",
};

/** Primary statuses for filters, corrections, and reports. */
export const PRIMARY_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "on_leave",
  "onsite",
  "wfh",
  "half_day",
] as const;

export function normalizeAttendanceStatus(status: string): string {
  if (status === "late") return "onsite";
  if (status === "short") return "half_day";
  return status;
}

export function isPresentLikeStatus(status: string): boolean {
  return ["present", "onsite", "late", "wfh"].includes(status);
}

/** Satyakabir "Scheduled" — global WFH day awaiting clock-in. */
export function resolveAttendanceDisplayStatus(
  status: string,
  options?: { globalWfh?: boolean },
): string {
  if (options?.globalWfh && status === "absent") return "scheduled";
  return normalizeAttendanceStatus(status);
}

export function attendanceDisplayLabel(
  status: string,
  options?: { globalWfh?: boolean },
): string {
  const key = resolveAttendanceDisplayStatus(status, options);
  if (key === "scheduled") return "Scheduled";
  return ATTENDANCE_STATUS_LABELS[key] ?? ATTENDANCE_STATUS_LABELS[status] ?? status;
}

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
