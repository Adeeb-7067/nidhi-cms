import { getProjectsListHref } from "@/lib/project-routes";
import type { UserRole } from "@/lib/navigation";

/** Page titles & descriptions — used by Navbar and optional AppLayout header */

export type RouteMeta = {
  title: string;
  description?: string;
  /** Page renders its own hero/header */
  hideHeader?: boolean;
};

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/admin": {
    title: "Dashboard",
    description: "Overview of projects, team activity, and items needing attention.",
    hideHeader: true,
  },
  "/admin/projects": {
    title: "Projects",
    description: "Browse and manage all client projects.",
  },
  "/admin/employees": {
    title: "Team",
    description: "Manage employees, roles, and access.",
  },
  "/admin/clients": {
    title: "Companies",
    description: "Company accounts and their projects.",
  },
  "/admin/requests": {
    title: "Requests",
    description: "Review and approve resource requests from the team.",
  },
  "/admin/tickets": {
    title: "Support tickets",
    description: "Track and resolve client and internal support issues.",
  },
  "/admin/discussions": {
    title: "Discussions",
    description: "Team and client conversation threads.",
  },
  "/admin/analytics": {
    title: "Analytics",
    description: "Agency-wide metrics and performance trends.",
  },
  "/settings": {
    title: "Settings",
    description: "Appearance, notifications, workspace, and account preferences.",
    hideHeader: true,
  },
  "/dev": {
    title: "Workspace",
    description: "Your projects, shortcuts, and recent activity.",
    hideHeader: true,
  },
  "/dev/projects": {
    title: "My projects",
    description: "Ongoing and maintenance projects assigned to you.",
    hideHeader: true,
  },
  "/dev/logs": {
    title: "Daily logs",
    description: "Record and review daily work logs.",
  },
  "/dev/tasks": {
    title: "Tasks",
    description: "Assign and track work items across the team.",
  },
  "/dev/bugs": {
    title: "Bug tracker",
    description: "Report, assign, and track bugs across projects.",
  },
  "/dev/apk": {
    title: "Releases",
    description: "Upload and distribute APK and build releases.",
  },
  "/dev/reports": {
    title: "Reports",
    description: "Generate and download project reports.",
  },
  "/dev/requests": {
    title: "My requests",
    description: "Resource requests you have submitted.",
  },
  "/client": {
    title: "Portal",
    description: "Your projects, documents, and updates.",
    hideHeader: true,
  },
  "/client/analytics": {
    title: "Analytics",
    description: "Progress and metrics for your projects.",
  },
  "/client/apk": {
    title: "Downloads",
    description: "Latest app builds shared with you.",
  },
  "/notifications": {
    title: "Notifications",
    description: "All alerts and updates in one place.",
  },
  "/profile": {
    title: "Profile",
    description: "Your account settings and preferences.",
    hideHeader: true,
  },
};

export type RouteBreadcrumb = {
  label: string;
  href?: string;
};

export function getRouteBreadcrumbs(pathname: string, role?: UserRole | string): RouteBreadcrumb[] {
  const meta = getRouteMeta(pathname);

  if (/^\/admin\/projects\/\d+$/.test(pathname) && role && role !== "super_admin") {
    const home =
      role === "client"
        ? { label: "Client", href: "/client" as const }
        : { label: "Dev", href: "/dev" as const };
    return [
      home,
      {
        label: role === "tester" || role === "qa" ? "My QA projects" : "My projects",
        href: getProjectsListHref(role),
      },
      { label: meta.title },
    ];
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: meta.title }];

  const zones: Record<string, { label: string; home: string }> = {
    admin: { label: "Admin", home: "/admin" },
    dev: { label: "Dev", home: "/dev" },
    client: { label: "Client", home: "/client" },
    settings: { label: "Settings", home: "/settings" },
    notifications: { label: "Alerts", home: "/notifications" },
    profile: { label: "Account", home: "/profile" },
  };

  const zone = parts[0];
  const zoneInfo = zones[zone];
  if (!zoneInfo) return [{ label: meta.title }];

  const crumbs: RouteBreadcrumb[] = [{ label: zoneInfo.label, href: zoneInfo.home }];
  if (pathname === zoneInfo.home) {
    crumbs.push({ label: meta.title });
    return crumbs;
  }

  let acc = `/${zone}`;
  for (let i = 1; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const isLast = i === parts.length - 1;
    if (/^\d+$/.test(parts[i])) {
      crumbs.push({ label: meta.title });
      break;
    }
    if (isLast) {
      crumbs.push({ label: meta.title });
    } else {
      crumbs.push({ label: getRouteMeta(acc).title, href: acc });
    }
  }
  return crumbs;
}

export function getRouteMeta(pathname: string): RouteMeta {
  if (STATIC_ROUTES[pathname]) return STATIC_ROUTES[pathname];

  if (/^\/admin\/projects\/\d+/.test(pathname)) {
    return {
      title: "Project",
      description: "Project overview, resources, and delivery.",
      hideHeader: true,
    };
  }

  if (/^\/dev\/tasks\/\d+/.test(pathname)) {
    return {
      title: "Task",
      description: "Task details, description, and properties.",
      hideHeader: true,
    };
  }

  return { title: "CMS", description: undefined };
}
