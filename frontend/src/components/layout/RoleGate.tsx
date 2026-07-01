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
  /** Explicit role allowlist — checked before any admin bypass. */
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

  // Client portal pages
  if (user.role === "client") {
    return allowedRoles?.includes("client") ? <>{children}</> : <Unauthorized />;
  }

  // Hard allowedRoles gate — checked BEFORE admin bypass so it is always
  // respected regardless of role tier.
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    if (location === "/admin/projects" && isDevPortalRole(user.role)) {
      return <Redirect to={getProjectsListHref(user.role)} replace />;
    }
    return <Unauthorized />;
  }

  const adminProjectDetailMatch = /^\/admin\/projects\/(\d+)/.exec(location.split("?")[0]);
  if (adminProjectDetailMatch && isDevPortalRole(user.role) && user.role !== "super_admin") {
    return <Redirect to={`/dev/projects/${adminProjectDetailMatch[1]}`} replace />;
  }

  // super_admin bypasses the permission matrix entirely.
  // hr goes through the normal permission matrix below (their access is
  // defined via allowedRoles in PageOutlet and HRM permission modules).
  if (user.role === "super_admin") {
    return <>{children}</>;
  }

  // Permission matrix for other internal roles
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
      permModule === "admin_projects" &&
      action === "view" &&
      isDevPortalRole(user.role) &&
      can("dev_projects", "view")
    ) {
      return <>{children}</>;
    }
    return <Unauthorized />;
  }

  // No allowedRoles restriction and no permModule — any authenticated user
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
