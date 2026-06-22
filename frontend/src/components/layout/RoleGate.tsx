import React from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/user-roles";
import { isDevPortalRole } from "@/lib/navigation";
import { isHrmAdminRole } from "@/lib/user-roles";
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
  /** Legacy fallback for routes without a permission mapping (profile, notifications). */
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

  if (user && allowedRoles?.includes("client") && user.role === "client") {
    return allowedRoles.includes("client") ? <>{children}</> : (
      <Unauthorized />
    );
  }

  if (user && (user.role === "super_admin" || isHrmAdminRole(user.role))) {
    return <>{children}</>;
  }

  if (user && user.role !== "client" && permModule) {
    if (isLoading) {
      return (
        <div className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }
    if (can(permModule, action)) return <>{children}</>;
    return <Unauthorized />;
  }

  if (user && !allowedRoles?.includes(user.role as UserRole)) {
    if (
      location === "/admin/projects" &&
      isDevPortalRole(user.role)
    ) {
      return <Redirect to={getProjectsListHref(user.role)} replace />;
    }
  }

  if (!user || !allowedRoles?.includes(user.role as UserRole)) {
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
