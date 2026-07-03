import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/modules/permissions/usePermission";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Gate for the shared employee profile detail page.
 * Any internal staff with team/HR/sales view permission, HRM admins, or self can view.
 */
export function StaffProfileAccessGate({
  employeeId,
  children,
}: {
  employeeId: number;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { can, isLoading } = usePermissions();

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground text-sm">
        Sign in to view this profile.
      </div>
    );
  }

  if (user.role === "super_admin") {
    return <>{children}</>;
  }

  if (user.id === employeeId) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const canViewTeamProfile =
    can("admin_team", "view") ||
    can("hrm_employees", "view") ||
    can("sales_team", "view");

  if (!canViewTeamProfile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          You do not have permission to view this employee profile.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
