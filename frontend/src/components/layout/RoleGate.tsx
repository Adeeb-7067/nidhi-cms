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
    if (
      pathOnly.startsWith("/sales") ||
      pathOnly.startsWith("/finance") ||
      pathOnly.startsWith("/ca") ||
      (pathOnly.startsWith("/dev/") && pathOnly !== "/dev/logs" && pathOnly !== "/dev/my-screenshots")
    ) {
      return <Redirect to="/marketing" replace />;
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
    if (
      permModule.startsWith("dev_") &&
      action === "view" &&
      isDevPortalRole(user.role)
    ) {
      return <>{children}</>;
    }
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
