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
  Package,
  Shield,
  UserCircle,
  ListTodo,
} from "lucide-react";

export type UserRole = "super_admin" | "developer" | "tester" | "client";

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
    {
      label: "Menu",
      railLabel: "Menu",
      icon: LayoutGrid,
      roles: ["super_admin", "developer", "tester", "client"],
      items: [
        {
          title: role === "super_admin" ? "Dashboard" : role === "client" ? "Portal" : "Workspace",
          href: getHomeHref(role),
          icon: LayoutDashboard,
          roles: ["super_admin", "developer", "tester", "client"],
        },
        {
          title: "Projects",
          href: "/admin/projects",
          icon: Briefcase,
          roles: ["super_admin"],
        },
        {
          title: "Tickets",
          href: "/admin/tickets",
          icon: Ticket,
          roles: ["super_admin", "developer", "tester", "client"],
        },
        {
          title: "Discussions",
          href: "/admin/discussions",
          icon: MessageSquare,
          roles: ["super_admin", "developer", "tester", "client"],
        },
      ],
    },
    {
      label: "Delivery",
      railLabel: "Delivery",
      icon: Package,
      roles: ["super_admin", "developer", "tester"],
      items: [
        { title: "My projects", href: "/dev/projects", icon: Briefcase, roles: ["developer", "tester"] },
        { title: "Tasks", href: "/dev/tasks", icon: ListTodo, roles: ["super_admin", "developer", "tester"] },
        { title: "Daily logs", href: "/dev/logs", icon: Clock, roles: ["super_admin", "developer", "tester"] },
        { title: "Bugs", href: "/dev/bugs", icon: Bug, roles: ["super_admin", "developer", "tester"], badgeKey: "bugs" },
        { title: "Releases", href: "/dev/apk", icon: Smartphone, roles: ["super_admin", "developer", "tester"] },
        { title: "Reports", href: "/dev/reports", icon: FileText, roles: ["super_admin", "developer"] },
        { title: "My requests", href: "/dev/requests", icon: Inbox, roles: ["developer"] },
      ],
    },
    {
      label: "Manage",
      railLabel: "Manage",
      icon: Shield,
      roles: ["super_admin"],
      items: [
        { title: "Team", href: "/admin/employees", icon: Users, roles: ["super_admin"] },
        { title: "Companies", href: "/admin/clients", icon: Building2, roles: ["super_admin"] },
        { title: "Requests", href: "/admin/requests", icon: Inbox, roles: ["super_admin"], badgeKey: "requests" },
        { title: "Analytics", href: "/admin/analytics", icon: BarChart3, roles: ["super_admin"] },
      ],
    },
    {
      label: "Account",
      railLabel: "Account",
      icon: UserCircle,
      roles: ["super_admin", "developer", "tester", "client"],
      items: [
        {
          title: "Notifications",
          href: "/notifications",
          icon: Bell,
          roles: ["super_admin", "developer", "tester", "client"],
          badgeKey: "notifications",
        },
        {
          title: "Settings",
          href: "/settings",
          icon: Settings,
          roles: ["super_admin", "developer", "tester", "client"],
        },
      ],
    },
    {
      label: "Client",
      railLabel: "Client",
      icon: Building2,
      roles: ["client"],
      items: [
        { title: "Downloads", href: "/client/apk", icon: Smartphone, roles: ["client"] },
        { title: "Analytics", href: "/client/analytics", icon: BarChart3, roles: ["client"] },
      ],
    },
  ];

  return all
    .filter((s) => s.roles.includes(role))
    .map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) }))
    .filter((s) => s.items.length > 0);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/dev" || href === "/client") return false;
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
