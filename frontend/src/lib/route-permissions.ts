import type { CmsAction, CmsModule } from "@/modules/permissions/constants";
import { NAV_HREF_PERMISSION } from "@/modules/permissions/constants";

/** Longest-prefix wins after exact match on NAV_HREF_PERMISSION. */
const ROUTE_PREFIX_PERMISSIONS: Array<[string, CmsModule]> = [
  ["/admin/projects/", "admin_projects"],
  ["/admin/employees/", "hrm_employees"],
  ["/admin/employees", "admin_team"],
  ["/admin/roles", "roles_permissions"],
  ["/dev/tasks/", "dev_tasks"],
  ["/dev/projects", "dev_projects"],
  ["/dev/logs", "dev_logs"],
  ["/dev/bugs", "dev_bugs"],
  ["/dev/apk", "dev_apk"],
  ["/dev/reports", "dev_reports"],
  ["/dev/requests", "dev_requests"],
  ["/dev/my-screenshots", "dev_screenshots"],
  ["/hrm/my-attendance", "hrm_my_attendance"],
  ["/hrm/my-leave", "hrm_my_leave"],
  ["/hrm/my-wfh", "hrm_my_wfh"],
  ["/hrm/my-payslips", "hrm_my_payslips"],
  ["/hrm/my-holidays", "hrm_my_holidays"],
  ["/hrm/departments", "hrm_departments"],
  ["/hrm/employees/", "hrm_employees"],
  ["/hrm/employees", "hrm_employees"],
  ["/hrm/attendance", "hrm_attendance"],
  ["/hrm/leave", "hrm_leave"],
  ["/hrm/wfh", "hrm_wfh"],
  ["/hrm/shifts", "hrm_shifts"],
  ["/hrm/calendar", "hrm_holidays"],
  ["/hrm/holidays", "hrm_holidays"],
  ["/hrm/payroll", "hrm_payroll"],
  ["/hrm/salary-slips", "hrm_payroll"],
  ["/hrm/recruitment", "hrm_recruitment"],
  ["/hrm/documents", "hrm_documents"],
  ["/hrm/policies", "hrm_policies"],
  ["/hrm/settings", "hrm_settings"],
  ["/hrm/audit", "hrm_audit"],
  ["/hrm", "hrm_dashboard"],
  ["/sales/", "sales"],
  ["/legal/", "legal"],
  ["/finance/", "finance"],
  ["/ca/", "ca"],
  ["/client/", "client_portal"],
  ["/settings/organization", "platform_settings"],
  ["/settings/integrations", "platform_settings"],
];

export function resolveRoutePermission(path: string): CmsModule | null {
  const p = path.split("?")[0];
  if (NAV_HREF_PERMISSION[p]) return NAV_HREF_PERMISSION[p];
  for (const [prefix, module] of ROUTE_PREFIX_PERMISSIONS) {
    if (p === prefix.replace(/\/$/, "") || p.startsWith(prefix)) return module;
  }
  if (p === "/dev" || p.startsWith("/dev/")) return "dev_workspace";
  return null;
}

export type RoutePermissionCheck = { module: CmsModule; action: CmsAction };
