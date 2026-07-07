import type { CmsAction, CmsModule } from "@/modules/permissions/constants";
import { NAV_HREF_PERMISSION } from "@/modules/permissions/constants";

/** Longest-prefix wins after exact match on NAV_HREF_PERMISSION. */
const ROUTE_PREFIX_PERMISSIONS: Array<[string, CmsModule]> = [
  ["/admin/projects/", "admin_projects"],
  ["/admin/employees/", "hrm_employees"],
  ["/admin/employees", "admin_team"],
  ["/admin/roles", "roles_permissions"],
  ["/admin/screenshots", "monitor_screenshots"],
  ["/admin/attendance", "monitor_attendance"],
  ["/admin/tickets", "admin_tickets"],
  ["/discussions", "admin_discussions"],
  ["/hrm/roles", "roles_permissions"],
  ["/sales/bde", "sales_dashboard"],
  ["/dev/tasks/", "dev_tasks"],
  ["/dev/projects/", "dev_projects"],
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
  ["/hrm/onboarding", "hrm_onboarding"],
  ["/hrm/documents", "hrm_documents"],
  ["/hrm/policies", "hrm_policies"],
  ["/hrm/assets", "hrm_assets"],
  ["/hrm/exit", "hrm_exit"],
  ["/hrm/id-cards", "hrm_id_cards"],
  ["/hrm/settings", "hrm_settings"],
  ["/hrm/audit", "hrm_audit"],
  ["/hrm", "hrm_dashboard"],
  ["/sales/leads", "sales_leads"],
  ["/sales/follow-ups", "sales_follow_ups"],
  ["/sales/proposals", "sales_proposals"],
  ["/sales/customers", "sales_customers"],
  ["/sales/client-team", "sales_customers"],
  ["/sales/installments", "sales_installments"],
  ["/sales/invoices", "sales_invoices"],
  ["/sales/payments", "sales_payments"],
  ["/sales/products", "sales_products"],
  ["/sales/reports", "sales_reports"],
  ["/sales/notifications", "sales_notifications"],
  ["/sales/team/", "sales_team"],
  ["/sales/team", "sales_team"],
  ["/sales/settings", "sales_settings"],
  ["/sales/receipts", "sales_payments"],
  ["/legal/", "legal"],
  ["/marketing/", "marketing"],
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

/** Nav links with no permission module — visible to all authenticated users. */
const NAV_PUBLIC_HREFS = new Set(["/profile", "/notifications", "/settings"]);

export function isNavHrefPublic(href: string): boolean {
  const path = href.split("?")[0];
  if (NAV_PUBLIC_HREFS.has(path)) return true;
  if (path === "/settings" || path.startsWith("/settings/")) return true;
  return false;
}

export type RoutePermissionCheck = { module: CmsModule; action: CmsAction };
