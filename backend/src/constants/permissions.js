/** CMS-wide permission modules — keep in sync with frontend src/modules/permissions/constants.ts */
export const cmsModuleGroups = [
  {
    label: "Platform",
    modules: ["roles_permissions", "platform_settings", "platform_audit"],
  },
  {
    label: "Manage",
    modules: [
      "admin_dashboard",
      "admin_analytics",
      "admin_companies",
      "admin_projects",
      "admin_project_documents",
      "admin_team",
      "admin_requests",
      "admin_tickets",
      "admin_discussions",
      "admin_alerts",
    ],
  },
  {
    label: "Monitoring",
    modules: ["monitor_screenshots", "monitor_attendance", "monitor_policy"],
  },
  {
    label: "Sales & CRM",
    modules: [
      "sales_dashboard",
      "sales_leads",
      "sales_follow_ups",
      "sales_proposals",
      "sales_customers",
      "sales_installments",
      "sales_invoices",
      "sales_payments",
      "sales_products",
      "sales_reports",
      "sales_notifications",
      "sales_team",
      "sales_settings",
    ],
  },
  {
    label: "Legal",
    modules: ["legal"],
  },
  {
    label: "Digital",
    modules: ["marketing"],
  },
  {
    label: "Finance",
    modules: [
      "finance_dashboard",
      "finance_expenses",
      "finance_income",
      "finance_invoices",
      "finance_payments",
      "finance_budgets",
      "finance_loans",
      "finance_subscriptions",
      "finance_ledgers",
      "finance_tax",
      "finance_reports",
      "finance_notifications",
      "finance_vendors",
    ],
  },
  {
    label: "CA",
    modules: ["ca"],
  },
  {
    label: "Delivery",
    modules: [
      "dev_workspace",
      "dev_projects",
      "dev_logs",
      "dev_tasks",
      "dev_bugs",
      "dev_apk",
      "dev_reports",
      "dev_requests",
      "dev_screenshots",
    ],
  },
  {
    label: "Client portal",
    modules: ["client_portal"],
  },
  {
    label: "HRM",
    modules: [
      "hrm_dashboard",
      "hrm_employees",
      "hrm_departments",
      "hrm_attendance",
      "hrm_leave",
      "hrm_wfh",
      "hrm_shifts",
      "hrm_holidays",
      "hrm_payroll",
      "hrm_settings",
      "hrm_audit",
      "hrm_recruitment",
      "hrm_onboarding",
      "hrm_documents",
      "hrm_policies",
      "hrm_id_cards",
      "hrm_letters",
      "hrm_assets",
      "hrm_exit",
    ],
  },
  {
    label: "HRM self-service",
    modules: [
      "hrm_my_attendance",
      "hrm_my_leave",
      "hrm_my_wfh",
      "hrm_my_payslips",
      "hrm_my_holidays",
    ],
  },
];

export const salesModules = cmsModuleGroups.find((g) => g.label === "Sales & CRM")?.modules ?? [];

export const financeModules = cmsModuleGroups.find((g) => g.label === "Finance")?.modules ?? [];

export const cmsModules = cmsModuleGroups.flatMap((g) => g.modules);

export const cmsActions = ["view", "create", "edit", "delete", "approve", "finalize", "export"];

/** Pre-HRM-only module keys stored in DB — normalized to cmsModules on read/write. */
export const legacyModuleMap = {
  dashboard: "hrm_dashboard",
  employees: "hrm_employees",
  departments: "hrm_departments",
  attendance: "hrm_attendance",
  leave: "hrm_leave",
  wfh: "hrm_wfh",
  shifts: "hrm_shifts",
  holidays: "hrm_holidays",
  payroll: "hrm_payroll",
  roles: "roles_permissions",
  settings: "hrm_settings",
  audit: "hrm_audit",
  recruitment: "hrm_recruitment",
  onboarding: "hrm_onboarding",
  documents: "hrm_documents",
  policies: "hrm_policies",
  id_cards: "hrm_id_cards",
  letters: "hrm_letters",
  assets: "hrm_assets",
  exit: "hrm_exit",
  my_attendance: "hrm_my_attendance",
  my_leave: "hrm_my_leave",
  my_wfh: "hrm_my_wfh",
  my_payslips: "hrm_my_payslips",
  my_holidays: "hrm_my_holidays",
};

export function normalizePermissionModule(module) {
  return legacyModuleMap[module] ?? module;
}

export function isHrmAdminRole(role) {
  return role === "super_admin" || role === "hr";
}

export function canAccessHrm(role) {
  return role !== "client";
}

/** CMS user.role → default role template code when no roleTemplateId is set. */
export const defaultTemplateByRole = {
  super_admin: "super_admin",
  hr: "hr_admin",
  manager: "manager",
  developer: "employee",
  tester: "employee",
  qa: "employee",
  freelancer: "employee",
  bde: "bde",
  finance: "finance",
  client: null,
};

/** Built-in CMS login roles shown in Team / assignee pickers (client excluded). */
export const builtInAssignableCmsRoles = [
  { value: "super_admin", label: "Super Admin" },
  { value: "hr", label: "HR" },
  { value: "manager", label: "Manager" },
  { value: "developer", label: "Developer" },
  { value: "tester", label: "Tester" },
  { value: "qa", label: "QA" },
  { value: "freelancer", label: "Freelancer" },
  { value: "bde", label: "BDE" },
  { value: "finance", label: "Finance" },
];
