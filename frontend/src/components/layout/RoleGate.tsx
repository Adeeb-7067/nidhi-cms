import React from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/user-roles";
import { isDevPortalRole } from "@/lib/navigation";
import { getProjectsListHref } from "@/lib/project-routes";
import { usePermissions } from "@/modules/permissions/usePermission";
import { resolveRoutePermission } from "@/lib/route-permissions";
import type { CmsAction } from "@/modules/permissions/constants";
import { Skeleton } from "@/components/ui/skeleton";

export function RoleGate({
  allowedRoles,
  module,
  action = "view",
  children,
}: {
  /** Fallback role allowlist when the route has no permission mapping (e.g. profile, settings). */
  allowedRoles?: UserRole[];
  /** CMS permission module — overrides auto-detect from URL. */
  module?: string;
  action?: CmsAction;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [location] = useLocation();
  const { can, isLoading } = usePermissions();

  const permModule = module ?? resolveRoutePermission(location);

  if (!user) return <Unauthorized />;

  if (user.role === "client") {
    if (allowedRoles?.includes("client")) return <>{children}</>;
    if (permModule === "client_portal") {
      if (isLoading) {
        return (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        );
      }
      if (can("client_portal", action)) return <>{children}</>;
    }
    return <Unauthorized />;
  }

  if (allowedRoles?.length === 1 && allowedRoles[0] === "client") {
    return <Unauthorized />;
  }

  const adminProjectDetailMatch = /^\/admin\/projects\/(\d+)/.exec(location.split("?")[0]);
  if (adminProjectDetailMatch && isDevPortalRole(user.role) && user.role !== "super_admin") {
    return <Redirect to={`/dev/projects/${adminProjectDetailMatch[1]}`} replace />;
  }

  if (user.role === "super_admin") {
    return <>{children}</>;
  }

  const pathOnly = location.split("?")[0];
  if (user.role === "bde") {
    if (
      pathOnly === "/sales" ||
      pathOnly === "/sales/settings" ||
      pathOnly === "/sales/team" ||
      pathOnly.startsWith("/sales/team/")
    ) {
      return <Redirect to="/sales/bde" replace />;
    }
  }

  if (user.role === "digital") {
    if (pathOnly.startsWith("/admin/") && pathOnly !== "/admin/tickets") {
      return <Redirect to="/marketing" replace />;
    }
    const financeFreelancersPath =
      pathOnly === "/finance/freelancers" ||
      pathOnly.startsWith("/finance/freelancers/") ||
      pathOnly === "/freelancers" ||
      pathOnly.startsWith("/freelancers/");
    if (
      pathOnly.startsWith("/sales") ||
      (pathOnly.startsWith("/finance") && !financeFreelancersPath) ||
      pathOnly.startsWith("/ca") ||
      (pathOnly.startsWith("/dev/") && pathOnly !== "/dev/logs" && pathOnly !== "/dev/my-screenshots")
    ) {
      return <Redirect to="/marketing" replace />;
    }
  }

  if (user.role === "ca") {
    const keepCaPath =
      pathOnly.startsWith("/ca") ||
      pathOnly.startsWith("/profile") ||
      pathOnly.startsWith("/notifications") ||
      pathOnly.startsWith("/settings") ||
      pathOnly.startsWith("/discussions") ||
      pathOnly === "/admin/tickets" ||
      pathOnly.startsWith("/hrm/my-");
    if (!keepCaPath && (pathOnly.startsWith("/admin") || pathOnly.startsWith("/sales") || pathOnly.startsWith("/marketing") || pathOnly.startsWith("/dev"))) {
      return <Redirect to="/ca" replace />;
    }
  }

  if (user.role === "freelancer") {
    // Staff hubs → freelancer home. Keep Collab tickets + work deep-links.
    const keepPath =
      pathOnly === "/admin/tickets" ||
      pathOnly.startsWith("/dev/") ||
      pathOnly.startsWith("/marketing/") ||
      pathOnly.startsWith("/discussions") ||
      pathOnly.startsWith("/freelancer") ||
      pathOnly.startsWith("/profile") ||
      pathOnly.startsWith("/notifications") ||
      pathOnly.startsWith("/settings");
    if (!keepPath) {
      return <Redirect to="/freelancer" replace />;
    }
  }

  if (permModule) {
    if (isLoading) {
      return (
        <div className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }
    if (can(permModule, action)) return <>{children}</>;
    // Delivery roles: allow admin_projects list via redirect helpers below, not a blank grant.
    if (
      permModule === "admin_projects" &&
      action === "view" &&
      isDevPortalRole(user.role) &&
      can("dev_projects", "view")
    ) {
      return <>{children}</>;
    }
    if (
      permModule === "admin_projects" &&
      action === "view" &&
      user.role === "bde" &&
      can("sales_customers", "view")
    ) {
      return <>{children}</>;
    }
    if (location === "/admin/projects" && isDevPortalRole(user.role)) {
      return <Redirect to={getProjectsListHref(user.role)} replace />;
    }
    return <Unauthorized />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    if (location === "/admin/projects" && isDevPortalRole(user.role)) {
      return <Redirect to={getProjectsListHref(user.role)} replace />;
    }
    return <Unauthorized />;
  }

  // Unmapped routes: deny admin hub mounts; allow role-only / public pages.
  const pathOnlyForDeny = location.split("?")[0];
  if (
    !allowedRoles &&
    (pathOnlyForDeny === "/admin" || pathOnlyForDeny.startsWith("/admin/"))
  ) {
    return <Unauthorized />;
  }

  return <>{children}</>;
}

function Unauthorized() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        You do not have permission to view this page.
      </p>
    </div>
  );
}
