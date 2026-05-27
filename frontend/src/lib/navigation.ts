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
  LayoutGrid,
  Shield,
  UserCircle,
  ListTodo,
  TrendingUp,
  Target,
  Handshake,
  FileSpreadsheet,
  UserPlus,
  CalendarClock,
  Receipt,
  Wallet,
  Package,
  Layers,
} from "lucide-react";

export type UserRole = "super_admin" | "developer" | "tester" | "qa" | "client";

export function isDevPortalRole(role: UserRole | string | undefined): boolean {
  return role === "developer" || role === "tester" || role === "qa";
}

/** Tester legacy role and dedicated QA role share QA workflows (bugs, project test views). */
export function isQaStaffRole(role: UserRole | string | undefined): boolean {
  return role === "tester" || role === "qa";
}

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badgeKey?: "requests" | "bugs" | "notifications";
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
        { title: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["super_admin"] },
        { title: "Companies", href: "/admin/clients", icon: Building2, roles: ["super_admin"] },
        { title: "Projects", href: "/admin/projects", icon: Briefcase, roles: ["super_admin"] },
        { title: "Team", href: "/admin/employees", icon: Users, roles: ["super_admin"] },
        {
          title: "Requests",
          href: "/admin/requests",
          icon: Inbox,
          roles: ["super_admin"],
          badgeKey: "requests",
        },
        { title: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["super_admin"] },
      ],
    },

    // =========================
    // CRM & SALES
    // =========================
    {
      label: "CRM & Sales",
      railLabel: "Sales",
      icon: TrendingUp,
      roles: ["super_admin"],
      items: [
        { title: "Dashboard", href: "/sales", icon: LayoutDashboard, roles: ["super_admin"] },
        { title: "Lead management", href: "/sales/leads", icon: Target, roles: ["super_admin"] },
        { title: "Follow-ups & activities", href: "/sales/follow-ups", icon: CalendarClock, roles: ["super_admin"] },
        { title: "Proposals", href: "/sales/proposals", icon: FileSpreadsheet, roles: ["super_admin"] },
        { title: "Customers", href: "/sales/customers", icon: Handshake, roles: ["super_admin"] },
        { title: "Installments", href: "/sales/installments", icon: Layers, roles: ["super_admin"] },
        { title: "Products & services", href: "/sales/products", icon: Package, roles: ["super_admin"] },
        { title: "Invoices", href: "/sales/invoices", icon: Receipt, roles: ["super_admin"] },
        { title: "Payments", href: "/sales/payments", icon: Wallet, roles: ["super_admin"] },
        { title: "Sales reports", href: "/sales/reports", icon: BarChart3, roles: ["super_admin"] },
        { title: "Financial alerts", href: "/sales/notifications", icon: Bell, roles: ["super_admin"] },
        { title: "Sales team", href: "/sales/team", icon: UserPlus, roles: ["super_admin"] },
        { title: "Automation & settings", href: "/sales/settings", icon: Settings, roles: ["super_admin"] },
      ],
    },

    // =========================
    // DELIVERY
    // =========================
    {
      label: "Delivery",
      railLabel: "Delivery",
      icon: Package,
      roles: ["super_admin", "developer", "tester", "qa"],
      items: [
        {
          title: "Workspace",
          href: "/dev",
          icon: LayoutDashboard,
          roles: ["developer", "tester", "qa"],
        },
        {
          title: "My projects",
          href: "/dev/projects",
          icon: Briefcase,
          roles: ["developer", "tester", "qa"],
        },
        {
          title: "Tasks",
          href: "/dev/tasks",
          icon: ListTodo,
          roles: ["super_admin", "developer", "tester", "qa"],
        },
        {
          title: "Daily logs",
          href: "/dev/logs",
          icon: Clock,
          roles: ["super_admin", "developer", "tester", "qa"],
        },
        {
          title: "Bugs",
          href: "/dev/bugs",
          icon: Bug,
          roles: ["super_admin", "developer", "tester", "qa"],
          badgeKey: "bugs",
        },
        {
          title: "Releases",
          href: "/dev/apk",
          icon: Smartphone,
          roles: ["super_admin", "developer", "tester", "qa"],
        },
        {
          title: "Reports",
          href: "/dev/reports",
          icon: FileText,
          roles: ["super_admin", "developer"],
        },
        {
          title: "My requests",
          href: "/dev/requests",
          icon: Inbox,
          roles: ["developer"],
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
      roles: ["super_admin", "developer", "tester", "qa", "client"],
      items: [
        {
          title: "Tickets",
          href: "/admin/tickets",
          icon: Ticket,
          roles: ["super_admin", "developer", "tester", "qa", "client"],
        },
        {
          title: "Discussions",
          href: "/admin/discussions",
          icon: MessageSquare,
          roles: ["super_admin", "developer", "tester", "qa", "client"],
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
        },
        {
          title: "Downloads",
          href: "/client/apk",
          icon: Smartphone,
          roles: ["client"],
        },
        {
          title: "Analytics",
          href: "/client/analytics",
          icon: BarChart3,
          roles: ["client"],
        },
      ],
    },

    // =========================
    // ACCOUNT (LAST)
    // =========================
    {
      label: "Account",
      railLabel: "Account",
      icon: UserCircle,
      roles: ["super_admin", "developer", "tester", "qa", "client"],
      items: [
        {
          title: "Notifications",
          href: "/notifications",
          icon: Bell,
          roles: ["super_admin", "developer", "tester", "qa", "client"],
          badgeKey: "notifications",
        },
        {
          title: "Settings",
          href: "/settings",
          icon: Settings,
          roles: ["super_admin", "developer", "tester", "qa", "client"],
        },
      ],
    },
  ];

  return all
    .filter((s) => s.roles.includes(role))
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.roles.includes(role)),
    }))
    .filter((s) => s.items.length > 0);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/dev" || href === "/client" || href === "/sales") return false;
  return pathname.startsWith(href + "/") || pathname.startsWith(href);
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
