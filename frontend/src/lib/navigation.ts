import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  BarChart3,
  Inbox,
  Bug,
  Smartphone,
  FileText,
  Clock,
  Settings,
  MessageSquare,
  Ticket,
  Bell,
  Shield,
  UserCircle,
  ListTodo,
  TrendingUp,
  TrendingDown,
  Target,
  Handshake,
  UsersRound,
  FileSpreadsheet,
  UserPlus,
  Rocket,
  CalendarClock,
  Receipt,
  Wallet,
  Package,
  Layers,
  Landmark,
  PiggyBank,
  BookOpen,
  Percent,
  Monitor,
  Camera,
  ClipboardList,
  Scale,
  Gavel,
  FileWarning,
  ShieldCheck,
  Mail,
  Calculator,
  CreditCard,
  AlertTriangle,
  KeyRound,
  FolderOpen,
  CalendarDays,
  IdCard,
  Laptop,
  LogOut,
  Megaphone,
  CheckSquare,
  Image,
  Video,
  Share2,
  Search,
  ScrollText,
} from "lucide-react";

import { CA_ACCESS_ROLES } from "@/modules/ca/constants";
import { MARKETING_ACCESS_ROLES } from "@/modules/marketing/constants";

import type { UserRole } from "@/lib/user-roles";
import {
  DEV_PORTAL_STAFF_ROLES,
  DEVELOPER_STAFF_ROLES,
  HRM_ADMIN_ROLES,
  HRM_EMPLOYEE_ROLES,
  MONITORABLE_STAFF_ROLES,
  INTERNAL_STAFF_ROLES,
  SALES_STAFF_ROLES,
  isDevPortalRole,
  isDeveloperRole,
  isQaStaffRole,
} from "@/lib/user-roles";
import {
  persistSettingsSection,
  parseSettingsSectionFromLocation,
} from "@/lib/settings-section";

function navPathOnly(hrefOrPath: string): string {
  const q = hrefOrPath.indexOf("?");
  return q === -1 ? hrefOrPath : hrefOrPath.slice(0, q);
}

/** Sync settings tab state when a nav item points at /settings/:section. */
export function syncSettingsSectionFromNavHref(href: string): void {
  const section = parseSettingsSectionFromLocation(navPathOnly(href));
  if (section) persistSettingsSection(section);
}

/** Navigate via wouter; settings tabs use /settings/:section paths (not query strings). */
export function navigateNavHref(href: string, setLocation: (to: string) => void): void {
  syncSettingsSectionFromNavHref(href);
  setLocation(navPathOnly(href));
}

export type { UserRole };
export { isDevPortalRole, isQaStaffRole, isDeveloperRole, DEV_PORTAL_STAFF_ROLES, DEVELOPER_STAFF_ROLES };

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badgeKey?: "requests" | "bugs" | "notifications";
  /** Optional subgroup label shown in the submenu (e.g. "Pipeline", "Billing"). */
  group?: string;
};

export type NavSection = {
  label: string;
  /** Short label on the primary icon rail */
  railLabel: string;
  icon: LucideIcon;
  roles: UserRole[];
  items: NavItem[];
};

export function getHomeHref(role: UserRole): string {
  if (role === "super_admin") return "/admin";
  if (role === "hr") return "/hrm";
  if (role === "client") return "/client";
  return "/dev";
}

export function getNavSections(role: UserRole): NavSection[] {
  const all: NavSection[] = [
    // =========================
    // MANAGE (FIRST PRIORITY)
    // =========================
    {
      label: "Manage",
      railLabel: "Manage",
      icon: Shield,
      roles: ["super_admin"],
      items: [
        { title: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["super_admin"], group: "Overview" },
        { title: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["super_admin"], group: "Overview" },
        { title: "All companies", href: "/admin/clients", icon: Building2, roles: ["super_admin"], group: "Organization" },
        { title: "All projects", href: "/admin/projects", icon: Briefcase, roles: ["super_admin"], group: "Organization" },
        { title: "All team", href: "/admin/employees", icon: Users, roles: ["super_admin"], group: "Organization" },
        { title: "Roles & permissions", href: "/admin/roles", icon: Shield, roles: ["super_admin"], group: "Organization" },
        {
          title: "Requests",
          href: "/admin/requests",
          icon: Inbox,
          roles: ["super_admin"],
          badgeKey: "requests",
          group: "Operations",
        },
      ],
    },

    // =========================
    // MONITORING
    // =========================
    {
      label: "Monitoring",
      railLabel: "Monitor",
      icon: Monitor,
      roles: [...HRM_ADMIN_ROLES, ...MONITORABLE_STAFF_ROLES],
      items: [
        {
          title: "Work analytics",
          href: "/admin/monitoring/analytics",
          icon: BarChart3,
          roles: [...HRM_ADMIN_ROLES, "manager"],
          group: "Activity",
        },
        {
          title: "Screenshots",
          href: "/admin/screenshots",
          icon: Camera,
          roles: [...HRM_ADMIN_ROLES],
          group: "Activity",
        },
        {
          title: "Monitoring policy",
          href: "/settings/monitoring",
          icon: Settings,
          roles: [...HRM_ADMIN_ROLES],
          group: "Activity",
        },
        {
          title: "Attendance",
          href: "/admin/attendance",
          icon: ClipboardList,
          roles: [...HRM_ADMIN_ROLES, "manager"],
          group: "Activity",
        },
        {
          title: "My Screenshots",
          href: "/dev/my-screenshots",
          icon: Camera,
          roles: [...MONITORABLE_STAFF_ROLES],
          group: "Activity",
        },
      ],
    },

    // =========================
    // CRM & SALES
    // =========================
    {
      label: "CRM & Sales",
      railLabel: "Sales",
      icon: TrendingUp,
      roles: [...INTERNAL_STAFF_ROLES],
      items: [
        { title: "My Dashboard", href: "/sales/bde", icon: LayoutDashboard, roles: ["bde"], group: "Overview" },
        { title: "Dashboard", href: "/sales", icon: LayoutDashboard, roles: INTERNAL_STAFF_ROLES.filter(r => r !== "bde"), group: "Overview" },
        { title: "Lead management", href: "/sales/leads", icon: Target, roles: [...INTERNAL_STAFF_ROLES], group: "Pipeline" },
        { title: "Follow-ups", href: "/sales/follow-ups", icon: CalendarClock, roles: [...INTERNAL_STAFF_ROLES], group: "Pipeline" },
        { title: "Proposals", href: "/sales/proposals", icon: FileSpreadsheet, roles: [...INTERNAL_STAFF_ROLES], group: "Pipeline" },
        { title: "Customers", href: "/sales/customers", icon: Handshake, roles: [...INTERNAL_STAFF_ROLES], group: "Pipeline" },
        { title: "Client team", href: "/sales/client-team", icon: UsersRound, roles: [...INTERNAL_STAFF_ROLES], group: "Pipeline" },
        { title: "Installments", href: "/sales/installments", icon: Layers, roles: [...INTERNAL_STAFF_ROLES], group: "Billing" },
        { title: "Invoices", href: "/sales/invoices", icon: Receipt, roles: [...INTERNAL_STAFF_ROLES], group: "Billing" },
        { title: "Payments", href: "/sales/payments", icon: Wallet, roles: [...INTERNAL_STAFF_ROLES], group: "Billing" },
        { title: "Products", href: "/sales/products", icon: Package, roles: [...INTERNAL_STAFF_ROLES], group: "Catalog" },
        { title: "Sales reports", href: "/sales/reports", icon: BarChart3, roles: [...INTERNAL_STAFF_ROLES], group: "Insights" },
        { title: "Financial alerts", href: "/sales/notifications", icon: Bell, roles: [...INTERNAL_STAFF_ROLES], group: "Insights" },
        { title: "Sales team", href: "/sales/team", icon: UserPlus, roles: ["super_admin", "hr"], group: "Team" },
        { title: "Automation", href: "/sales/settings", icon: Settings, roles: [...HRM_ADMIN_ROLES], group: "Team" },
      ],
    },

    // =========================
    // DIGITAL MARKETING (UI only — no backend yet)
    // =========================
    {
      label: "Digital",
      railLabel: "Digital",
      icon: Megaphone,
      roles: [...MARKETING_ACCESS_ROLES],
      items: [
        { title: "Dashboard", href: "/marketing", icon: LayoutDashboard, roles: [...MARKETING_ACCESS_ROLES], group: "Overview" },
        { title: "Tasks", href: "/marketing/tasks", icon: CheckSquare, roles: [...MARKETING_ACCESS_ROLES], group: "Operations" },
        { title: "Clients", href: "/marketing/clients", icon: Building2, roles: [...MARKETING_ACCESS_ROLES], group: "Operations" },
        { title: "Calendar", href: "/marketing/calendar", icon: CalendarDays, roles: [...MARKETING_ACCESS_ROLES], group: "Content" },
        { title: "Graphics", href: "/marketing/graphics", icon: Image, roles: [...MARKETING_ACCESS_ROLES], group: "Content" },
        { title: "Videos", href: "/marketing/videos", icon: Video, roles: [...MARKETING_ACCESS_ROLES], group: "Content" },
        { title: "Content", href: "/marketing/content", icon: FileText, roles: [...MARKETING_ACCESS_ROLES], group: "Content" },
        { title: "Approvals", href: "/marketing/approvals", icon: ShieldCheck, roles: [...MARKETING_ACCESS_ROLES], group: "Workflow" },
        { title: "Social analytics", href: "/marketing/social", icon: Share2, roles: [...MARKETING_ACCESS_ROLES], group: "Analytics" },
        { title: "Meta Ads", href: "/marketing/meta-ads", icon: Target, roles: [...MARKETING_ACCESS_ROLES], group: "Ads" },
        { title: "Google Ads", href: "/marketing/google-ads", icon: Search, roles: [...MARKETING_ACCESS_ROLES], group: "Ads" },
        { title: "SEO", href: "/marketing/seo", icon: BookOpen, roles: [...MARKETING_ACCESS_ROLES], group: "Analytics" },
        { title: "Performance", href: "/marketing/performance", icon: Users, roles: [...MARKETING_ACCESS_ROLES], group: "Team" },
        { title: "Reports", href: "/marketing/reports", icon: FileSpreadsheet, roles: [...MARKETING_ACCESS_ROLES], group: "Reports" },
      ],
    },

    // =========================
    // DELIVERY
    // =========================
    {
      label: "Delivery",
      railLabel: "Delivery",
      icon: Package,
      roles: ["super_admin", ...DEV_PORTAL_STAFF_ROLES],
      items: [
        {
          title: "Workspace",
          href: "/dev",
          icon: LayoutDashboard,
          roles: ["developer", "tester", "qa", "freelancer"],
          group: "Overview",
        },
        {
          title: "My projects",
          href: "/dev/projects",
          icon: Briefcase,
          roles: ["developer", "tester", "qa", "freelancer"],
          group: "Overview",
        },
        {
          title: "Daily logs",
          href: "/dev/logs",
          icon: Clock,
          roles: ["super_admin", ...DEV_PORTAL_STAFF_ROLES],
          group: "Work",
        },
        {
          title: "Tasks",
          href: "/dev/tasks",
          icon: ListTodo,
          roles: ["super_admin", ...DEV_PORTAL_STAFF_ROLES],
          group: "Work",
        },
        {
          title: "Bugs",
          href: "/dev/bugs",
          icon: Bug,
          roles: ["super_admin", ...DEV_PORTAL_STAFF_ROLES],
          badgeKey: "bugs",
          group: "Work",
        },
        {
          title: "Releases",
          href: "/dev/apk",
          icon: Smartphone,
          roles: ["super_admin", ...DEV_PORTAL_STAFF_ROLES],
          group: "Output",
        },
        {
          title: "Reports",
          href: "/dev/reports",
          icon: FileText,
          roles: ["super_admin", ...DEVELOPER_STAFF_ROLES],
          group: "Output",
        },
        {
          title: "My requests",
          href: "/dev/requests",
          icon: Inbox,
          roles: [...DEVELOPER_STAFF_ROLES],
          group: "Output",
        },
      ],
    },

    // =========================
    // COLLABORATION
    // =========================
    {
      label: "Collaboration",
      railLabel: "Collab",
      icon: MessageSquare,
      roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
      items: [
        {
          title: "Discussions",
          href: "/discussions",
          icon: MessageSquare,
          roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
        },
        {
          title: "Tickets",
          href: "/admin/tickets",
          icon: Ticket,
          roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
        },
      ],
    },

    // =========================
    // CLIENT
    // =========================
    {
      label: "Client",
      railLabel: "Client",
      icon: Building2,
      roles: ["client"],
      items: [
        {
          title: "Portal",
          href: "/client",
          icon: LayoutDashboard,
          roles: ["client"],
          group: "Overview",
        },
        {
          title: "Downloads",
          href: "/client/apk",
          icon: Smartphone,
          roles: ["client"],
          group: "Overview",
        },
        {
          title: "Analytics",
          href: "/client/analytics",
          icon: BarChart3,
          roles: ["client"],
          group: "Overview",
        },
        {
          title: "Team members",
          href: "/client/team",
          icon: Users,
          roles: ["client"],
          group: "Team",
        },
        {
          title: "Activity",
          href: "/client/team/activity",
          icon: ListTodo,
          roles: ["client"],
          group: "Team",
        },
      ],
    },

    // =========================
    // HRM
    // =========================
    {
      label: "HRM",
      railLabel: "HRM",
      icon: IdCard,
      roles: ["super_admin", "hr", ...HRM_EMPLOYEE_ROLES],
      items: [
        { title: "Dashboard", href: "/hrm", icon: LayoutDashboard, roles: ["super_admin", "hr", ...HRM_EMPLOYEE_ROLES], group: "Overview" },
        { title: "Departments", href: "/hrm/departments", icon: Building2, roles: [...HRM_ADMIN_ROLES], group: "Organization" },
        { title: "Employees", href: "/hrm/employees", icon: Users, roles: [...HRM_ADMIN_ROLES, "manager"], group: "Organization" },
        { title: "Recruitment", href: "/hrm/recruitment", icon: UserPlus, roles: [...HRM_ADMIN_ROLES], group: "Organization" },
        { title: "Onboarding", href: "/hrm/onboarding", icon: Rocket, roles: [...HRM_ADMIN_ROLES], group: "Organization" },
        { title: "Roles & permissions", href: "/hrm/roles", icon: Shield, roles: [...HRM_ADMIN_ROLES], group: "Organization" },

        { title: "Attendance", href: "/hrm/attendance", icon: ClipboardList, roles: [...HRM_ADMIN_ROLES, "manager"], group: "Time" },
        { title: "Leave", href: "/hrm/leave", icon: CalendarDays, roles: [...HRM_ADMIN_ROLES, "manager"], group: "Time" },
        { title: "WFH", href: "/hrm/wfh", icon: Briefcase, roles: [...HRM_ADMIN_ROLES, "manager"], group: "Time" },
        { title: "Shifts", href: "/hrm/shifts", icon: Clock, roles: [...HRM_ADMIN_ROLES], group: "Time" },
        { title: "Calendar", href: "/hrm/calendar", icon: CalendarClock, roles: [...HRM_ADMIN_ROLES], group: "Time" },
        { title: "Payroll", href: "/hrm/payroll", icon: Receipt, roles: [...HRM_ADMIN_ROLES], group: "Payroll" },
        { title: "Salary slips", href: "/hrm/salary-slips", icon: Receipt, roles: [...HRM_ADMIN_ROLES], group: "Payroll" },
        { title: "Documents", href: "/hrm/documents", icon: FolderOpen, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "Policies", href: "/hrm/policies", icon: FileText, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "Assets", href: "/hrm/assets", icon: Laptop, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "Exit workflow", href: "/hrm/exit", icon: LogOut, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "ID Cards", href: "/hrm/id-cards", icon: IdCard, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "Letters", href: "/hrm/letters", icon: ScrollText, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "Audit log", href: "/hrm/audit", icon: ShieldCheck, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "HRM settings", href: "/hrm/settings", icon: Settings, roles: [...HRM_ADMIN_ROLES], group: "Extended" },
        { title: "My attendance", href: "/hrm/my-attendance", icon: ClipboardList, roles: [...HRM_EMPLOYEE_ROLES], group: "Self-service" },
        { title: "My leave", href: "/hrm/my-leave", icon: CalendarDays, roles: [...HRM_EMPLOYEE_ROLES], group: "Self-service" },
        { title: "My WFH", href: "/hrm/my-wfh", icon: Briefcase, roles: [...HRM_EMPLOYEE_ROLES], group: "Self-service" },
        { title: "My payslips", href: "/hrm/my-payslips", icon: Receipt, roles: [...HRM_EMPLOYEE_ROLES], group: "Self-service" },
        { title: "Calendar", href: "/hrm/my-holidays", icon: CalendarClock, roles: [...HRM_EMPLOYEE_ROLES], group: "Self-service" },
      ],
    },

    // =========================
    // LEGAL (UI only — no backend yet)
    // =========================
    {
      label: "Legal",
      railLabel: "Legal",
      icon: Scale,
      roles: ["super_admin"],
      items: [
        { title: "Dashboard", href: "/legal", icon: LayoutDashboard, roles: ["super_admin"], group: "Overview" },
        { title: "Employee cases", href: "/legal/cases", icon: Briefcase, roles: ["super_admin"], group: "Matters" },
        { title: "Vendor disputes", href: "/legal/vendor-disputes", icon: Handshake, roles: ["super_admin"], group: "Matters" },
        { title: "Client matters", href: "/legal/client-matters", icon: Building2, roles: ["super_admin"], group: "Matters" },
        { title: "NDA repository", href: "/legal/nda", icon: FileWarning, roles: ["super_admin"], group: "Documents" },
        { title: "Agreements", href: "/legal/agreements", icon: FileText, roles: ["super_admin"], group: "Documents" },
        { title: "Legal notices", href: "/legal/notices", icon: Mail, roles: ["super_admin"], group: "Documents" },
        { title: "Court cases", href: "/legal/court-cases", icon: Gavel, roles: ["super_admin"], group: "Litigation" },
        { title: "Compliance", href: "/legal/compliance", icon: ShieldCheck, roles: ["super_admin"], group: "Governance" },
        { title: "Expenses", href: "/legal/expenses", icon: Wallet, roles: ["super_admin"], group: "Governance" },
      ],
    },

    // =========================
    // CA (CHARTERED ACCOUNTANT) (UI only — no backend yet)
    // =========================
    {
      label: "CA Master",
      railLabel: "CA",
      icon: Calculator,
      roles: [...CA_ACCESS_ROLES],
      items: [
        { title: "Dashboard", href: "/ca", icon: LayoutDashboard, roles: [...CA_ACCESS_ROLES], group: "Overview" },
        { title: "Compliance score", href: "/ca/compliance-score", icon: ShieldCheck, roles: [...CA_ACCESS_ROLES], group: "Overview" },
        { title: "Client payments", href: "/ca/client-payments", icon: CreditCard, roles: [...CA_ACCESS_ROLES], group: "Receivables" },
        { title: "Suspense account", href: "/ca/suspense", icon: AlertTriangle, roles: [...CA_ACCESS_ROLES], group: "Receivables" },
        { title: "Vendors", href: "/ca/vendors", icon: Building2, roles: [...CA_ACCESS_ROLES], group: "Payables" },
        { title: "Expenses", href: "/ca/expenses", icon: TrendingDown, roles: [...CA_ACCESS_ROLES], group: "Payables" },
        { title: "Bank reconciliation", href: "/ca/bank-reconciliation", icon: Landmark, roles: [...CA_ACCESS_ROLES], group: "Banking" },
        { title: "GST", href: "/ca/gst", icon: Receipt, roles: [...CA_ACCESS_ROLES], group: "Tax" },
        { title: "TDS", href: "/ca/tds", icon: Percent, roles: [...CA_ACCESS_ROLES], group: "Tax" },
        { title: "Company ITR", href: "/ca/company-itr", icon: FileText, roles: [...CA_ACCESS_ROLES], group: "Tax" },
        { title: "Director ITR", href: "/ca/director-itr", icon: UserCircle, roles: [...CA_ACCESS_ROLES], group: "Tax" },
        { title: "ROC compliance", href: "/ca/roc", icon: Scale, roles: [...CA_ACCESS_ROLES], group: "Corporate" },
        { title: "DIN / DSC", href: "/ca/din-dsc", icon: KeyRound, roles: [...CA_ACCESS_ROLES], group: "Corporate" },
        { title: "Documents", href: "/ca/documents", icon: FolderOpen, roles: [...CA_ACCESS_ROLES], group: "Governance" },
        { title: "Audit", href: "/ca/audit", icon: ShieldCheck, roles: [...CA_ACCESS_ROLES], group: "Governance" },
        { title: "Notices", href: "/ca/notices", icon: Mail, roles: [...CA_ACCESS_ROLES], group: "Governance" },
        { title: "Compliance calendar", href: "/ca/compliance-calendar", icon: CalendarDays, roles: [...CA_ACCESS_ROLES], group: "Governance" },
        { title: "Tasks", href: "/ca/tasks", icon: ListTodo, roles: [...CA_ACCESS_ROLES], group: "Governance" },
      ],
    },

    // =========================
    // FINANCE (UI only — no backend yet)
    // =========================
    {
      label: "Finance",
      railLabel: "Finance",
      icon: Landmark,
      roles: ["super_admin"],
      items: [
        { title: "Dashboard", href: "/finance", icon: LayoutDashboard, roles: ["super_admin"], group: "Overview" },
        { title: "Expenses", href: "/finance/expenses", icon: TrendingDown, roles: ["super_admin"], group: "Transactions" },
        { title: "Income", href: "/finance/income", icon: TrendingUp, roles: ["super_admin"], group: "Transactions" },
        { title: "Payments", href: "/finance/payments", icon: Wallet, roles: ["super_admin"], group: "Transactions" },
        { title: "Invoices", href: "/finance/invoices", icon: Receipt, roles: ["super_admin"], group: "Billing" },
        { title: "Payroll", href: "/finance/payroll", icon: Users, roles: ["super_admin"], group: "Billing" },
        { title: "Budgets", href: "/finance/budgets", icon: PiggyBank, roles: ["super_admin"], group: "Planning" },
        { title: "Ledgers", href: "/finance/ledgers", icon: BookOpen, roles: ["super_admin"], group: "Planning" },
        { title: "Tax", href: "/finance/tax", icon: Percent, roles: ["super_admin"], group: "Planning" },
        { title: "Reports (P&L)", href: "/finance/reports/pnl", icon: BarChart3, roles: ["super_admin"], group: "Reports" },
      ],
    },

    // =========================
    // ACCOUNT (LAST)
    // =========================
    {
      label: "Account",
      railLabel: "Account",
      icon: UserCircle,
      roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
      items: [
        {
          title: "Profile",
          href: "/profile",
          icon: UserCircle,
          roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
        },
        {
          title: "Notifications",
          href: "/notifications",
          icon: Bell,
          roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
          badgeKey: "notifications",
        },
        {
          title: "Settings",
          href: "/settings",
          icon: Settings,
          roles: ["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"],
        },
      ],
    },
  ];

  const isClientOnlySection = (section: NavSection) =>
    section.roles.length > 0 && section.roles.every((r) => r === "client");

  if (role === "client") {
    return all
      .filter((s) => s.roles.includes("client"))
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => i.roles.includes("client")),
      }))
      .filter((s) => s.items.length > 0);
  }

  return all.filter((s) => !isClientOnlySection(s));
}

export function isNavActive(pathname: string, href: string): boolean {
  const path = navPathOnly(pathname);
  const hrefPath = navPathOnly(href);

  if (hrefPath.startsWith("/settings/")) {
    return path === hrefPath;
  }

  if (hrefPath === "/settings") {
    return path === "/settings";
  }

  if (path !== hrefPath) {
    if (
      hrefPath === "/admin" ||
      hrefPath === "/dev" ||
      hrefPath === "/client" ||
      hrefPath === "/sales" ||
      hrefPath === "/legal" ||
      hrefPath === "/ca" ||
      hrefPath === "/finance" ||
      hrefPath === "/hrm" ||
      hrefPath === "/admin/roles" ||
      hrefPath === "/discussions"
    ) {
      return false;
    }
    return path.startsWith(hrefPath + "/");
  }

  return true;
}

export function isPathInSection(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isNavActive(pathname, item.href));
}

export function getSectionDefaultHref(section: NavSection): string | null {
  return section.items[0]?.href ?? null;
}

/** Which primary nav group contains the current route */
export function findActiveNavGroupLabel(sections: NavSection[], pathname: string): string | null {
  for (const section of sections) {
    if (section.items.some((item) => isNavActive(pathname, item.href))) {
      return section.label;
    }
  }
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    const account = sections.find((s) => s.label === "Account");
    if (account) return account.label;
  }
  return sections[0]?.label ?? null;
}
